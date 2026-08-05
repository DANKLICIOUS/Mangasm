import Foundation
import Supabase

// MARK: - SafetyError
public enum SafetyError: LocalizedError, Sendable {
    case notAuthenticated
    case invalidUserID
    case server(String)

    public var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "Sign in to manage safety settings."
        case .invalidUserID:  return "Invalid user reference."
        case .server(let msg): return msg
        }
    }
}

// MARK: - SupabaseSafetyService
@MainActor
public final class SupabaseSafetyService: SafetyService {
    private let client: SupabaseClient
    private var blockedIDs: Set<String> = []

    public init(client: SupabaseClient) {
        self.client = client
    }

    public func block(_ userID: String) {
        blockedIDs.insert(userID)
        Task { await persistBlock(userID: userID) }
    }

    public func unblock(_ userID: String) {
        blockedIDs.remove(userID)
        Task { await persistUnblock(userID: userID) }
    }

    public func isBlocked(_ userID: String) -> Bool {
        blockedIDs.contains(userID)
    }

    public func report(_ userID: String, reason: String) {
        Task { await persistReport(userID: userID, reason: reason) }
    }

    public func reportContent(
        _ type: ReportContentType,
        contentID: String,
        reportedUserID: String?,
        reason: String
    ) {
        Task {
            await persistContentReport(
                type: type,
                contentID: contentID,
                reportedUserID: reportedUserID,
                reason: reason
            )
        }
    }

    /// Hydrate local block cache from `blocks` (call after sign-in).
    public func loadFromServer() async {
        guard let viewerID = try? await currentUserID() else { return }

        struct BlockRow: Decodable { let blocked_id: UUID }

        guard let rows: [BlockRow] = try? await client
            .from("blocks")
            .select("blocked_id")
            .eq("blocker_id", value: viewerID.uuidString)
            .execute()
            .value else { return }

        blockedIDs = Set(rows.map { $0.blocked_id.uuidString })
    }

    private func persistBlock(userID: String) async {
        guard let blockerID = try? await currentUserID(),
              let blockedID = UUID(uuidString: userID) else { return }

        struct BlockInsert: Encodable {
            let blocker_id: UUID
            let blocked_id: UUID
        }

        _ = try? await client
            .from("blocks")
            .insert(BlockInsert(blocker_id: blockerID, blocked_id: blockedID))
            .execute()
    }

    private func persistUnblock(userID: String) async {
        guard let blockerID = try? await currentUserID(),
              let blockedID = UUID(uuidString: userID) else { return }

        _ = try? await client
            .from("blocks")
            .delete()
            .eq("blocker_id", value: blockerID.uuidString)
            .eq("blocked_id", value: blockedID.uuidString)
            .execute()
    }

    private func persistReport(userID: String, reason: String) async {
        guard let reporterID = try? await currentUserID(),
              let targetID = UUID(uuidString: userID) else { return }

        let reasonDB = SafetyReasonMapper.dbValue(from: reason)

        // Backend SoT uses `reported_id`; older iOS migrations used `target_id`.
        // Try backend shape first, then fall back so live project schema either way.
        struct ReportBackend: Encodable {
            let reporter_id: UUID
            let reported_id: UUID
            let reason: String
            let details: String
        }
        struct ReportLegacy: Encodable {
            let reporter_id: UUID
            let target_id: UUID
            let reason: String
            let details: String
        }

        do {
            try await client
                .from("reports")
                .insert(ReportBackend(
                    reporter_id: reporterID,
                    reported_id: targetID,
                    reason: reasonDB,
                    details: reason
                ))
                .execute()
        } catch {
            _ = try? await client
                .from("reports")
                .insert(ReportLegacy(
                    reporter_id: reporterID,
                    target_id: targetID,
                    reason: reasonDB,
                    details: reason
                ))
                .execute()
        }
    }

    /// Persist a content-scoped report (photo/event/…) into `reports`, setting
    /// `content_type` + `content_id` (migration 0011). `target_id` is nullable
    /// there, so an event with no host UUID still records. Falls back to a
    /// content-less insert if the columns aren't present in the live schema yet.
    private func persistContentReport(
        type: ReportContentType,
        contentID: String,
        reportedUserID: String?,
        reason: String
    ) async {
        guard let reporterID = try? await currentUserID() else { return }
        let targetID = reportedUserID.flatMap { UUID(uuidString: $0) }
        let reasonDB = SafetyReasonMapper.dbValue(from: reason)

        struct ContentReport: Encodable {
            let reporter_id: UUID
            let reported_id: UUID?
            let target_id: UUID?
            let reason: String
            let details: String
            let content_type: String
            let content_id: String
        }

        do {
            try await client
                .from("reports")
                .insert(ContentReport(
                    reporter_id: reporterID,
                    reported_id: targetID,
                    target_id: targetID,
                    reason: reasonDB,
                    details: reason,
                    content_type: type.rawValue,
                    content_id: contentID
                ))
                .execute()
        } catch {
            // Schema without content columns / with a NOT NULL target: fall back
            // to a plain profile report when we at least have a target user.
            if let targetID {
                await persistReport(userID: targetID.uuidString, reason: reason)
            } else {
                print("[SupabaseSafetyService] content report failed: \(error)")
            }
        }
    }

    private func currentUserID() async throws -> UUID {
        do {
            return try await client.auth.session.user.id
        } catch {
            throw SafetyError.notAuthenticated
        }
    }

}

// MARK: - SafetyReasonMapper
enum SafetyReasonMapper {
    static func dbValue(from labelOrRaw: String) -> String {
        if let match = ReportReason.allCases.first(where: { $0.label == labelOrRaw || $0.rawValue == labelOrRaw }) {
            switch match {
            case .harassment:  return "harassment"
            case .spam:        return "spam"
            case .fakeProfile: return "fake_profile"
            case .underage:    return "underage"
            case .other:       return "other"
            }
        }
        return "other"
    }
}