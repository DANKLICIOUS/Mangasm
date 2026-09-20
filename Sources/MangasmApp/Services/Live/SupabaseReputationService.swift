import Foundation
import Supabase

/// Live Community Reputation: reads `reputation_scores`, persists `selected_style_id`.
///
/// Intended backend contract (sibling `mangasm-backend`; may land after this client):
/// - Table `reputation_scores` (`user_id`, `score`, `tier`, `photo_gate`, `selected_style_id`)
/// - RPC `set_selected_style(p_style_id text)` — rejects locked styles
///
/// Missing columns / RPC / table are probed once per session and fall back:
/// RPC → `reputation_scores.selected_style_id` → `profiles.selected_style_id` /
/// `profiles.preferred_style` → local-only (UserDefaults via AppState).
public final class SupabaseReputationService: ReputationService, @unchecked Sendable {
    public static let setStyleRPC = "set_selected_style"
    public static let scoresTable = "reputation_scores"

    private let client: SupabaseClient
    private let lock = NSLock()
    private var cache: [UUID: ReputationSnapshot] = [:]

    private var hasReputationTable = true
    private var hasSelectedStyleOnScores = true
    private var hasSetStyleRPC = true
    private var hasSelectedStyleOnProfiles = true
    private var hasPreferredStyleOnProfiles = true

    public init(client: SupabaseClient) {
        self.client = client
    }

    public func score(for profileID: UUID) -> Int {
        snapshot(for: profileID)?.score ?? 0
    }

    public func canViewPhotos(viewerScore: Int, targetGate: Int) -> Bool {
        viewerScore >= targetGate
    }

    public func photoGate(for profileID: UUID) -> Int {
        snapshot(for: profileID)?.photoGate ?? 50
    }

    public func snapshot(for profileID: UUID) -> ReputationSnapshot? {
        lock.lock(); defer { lock.unlock() }
        return cache[profileID]
    }

    public func loadFromServer() async {
        guard let userID = try? await currentUserID() else { return }

        if hasReputationTable {
            if hasSelectedStyleOnScores,
               let snap = await fetchScoreRow(userID: userID, includeSelectedStyle: true)
            {
                store(snap)
                return
            }
            if let snap = await fetchScoreRow(userID: userID, includeSelectedStyle: false) {
                store(snap)
                return
            }
        }

        if let snap = await fetchProfileFallback(userID: userID) {
            store(snap)
        }
    }

    public func selectStyle(_ id: ProfileStyleId) async throws {
        let userID = try await currentUserID()
        let cached = snapshot(for: userID)
        // No snapshot yet (load pending / table missing): skip the local lock
        // and let the server or column fallbacks decide. An empty cache must
        // not pretend the member is New (score 0) and revert a valid pick.
        if let cached, !cached.isUnlocked(id) {
            throw ReputationError.styleLocked
        }
        let current = cached ?? ReputationSnapshot(userId: userID, score: 0)

        if hasSetStyleRPC {
            do {
                try await invokeSetStyleRPC(id)
                updateCache(userID: userID, selected: id, score: current.score, photoGate: current.photoGate)
                return
            } catch {
                switch ReputationSchemaProbe.diagnose(error) {
                case .styleLocked:
                    throw ReputationError.styleLocked
                case .missingRPC:
                    hasSetStyleRPC = false
                case .missingColumn, .missingTable, .other:
                    // RPC may exist but write path failed; try column updates.
                    if ReputationSchemaProbe.diagnose(error) == .other {
                        throw ReputationError.server(error.localizedDescription)
                    }
                    hasSetStyleRPC = false
                }
            }
        }

        if hasReputationTable && hasSelectedStyleOnScores {
            do {
                try await updateScoresSelectedStyle(userID: userID, id: id)
                updateCache(userID: userID, selected: id, score: current.score, photoGate: current.photoGate)
                return
            } catch {
                switch ReputationSchemaProbe.diagnose(error) {
                case .styleLocked:
                    throw ReputationError.styleLocked
                case .missingColumn:
                    hasSelectedStyleOnScores = false
                case .missingTable:
                    hasReputationTable = false
                case .missingRPC, .other:
                    throw ReputationError.server(error.localizedDescription)
                }
            }
        }

        if hasSelectedStyleOnProfiles {
            do {
                try await updateProfileStyleColumn(userID: userID, column: "selected_style_id", id: id)
                updateCache(userID: userID, selected: id, score: current.score, photoGate: current.photoGate)
                return
            } catch {
                switch ReputationSchemaProbe.diagnose(error) {
                case .styleLocked:
                    throw ReputationError.styleLocked
                case .missingColumn:
                    hasSelectedStyleOnProfiles = false
                case .missingRPC, .missingTable, .other:
                    break
                }
            }
        }

        if hasPreferredStyleOnProfiles {
            do {
                try await updateProfileStyleColumn(userID: userID, column: "preferred_style", id: id)
                updateCache(userID: userID, selected: id, score: current.score, photoGate: current.photoGate)
                return
            } catch {
                switch ReputationSchemaProbe.diagnose(error) {
                case .styleLocked:
                    throw ReputationError.styleLocked
                case .missingColumn:
                    hasPreferredStyleOnProfiles = false
                case .missingRPC, .missingTable, .other:
                    throw ReputationError.server(error.localizedDescription)
                }
            }
        }

        // Schema not deployed yet — local persist (AppState / UserDefaults) still applies.
        updateCache(userID: userID, selected: id, score: current.score, photoGate: current.photoGate)
    }

    // MARK: - Fetch

    private func fetchScoreRow(userID: UUID, includeSelectedStyle: Bool) async -> ReputationSnapshot? {
        let columns = includeSelectedStyle
            ? "user_id,score,tier,photo_gate,selected_style_id"
            : "user_id,score,tier,photo_gate"
        do {
            let row: ReputationScoreMapper.ScoreRow = try await client
                .from(Self.scoresTable)
                .select(columns)
                .eq("user_id", value: userID.uuidString)
                .single()
                .execute()
                .value
            return ReputationScoreMapper.snapshot(from: row)
        } catch {
            switch ReputationSchemaProbe.diagnose(error) {
            case .missingColumn:
                if includeSelectedStyle { hasSelectedStyleOnScores = false }
            case .missingTable:
                hasReputationTable = false
            case .missingRPC, .styleLocked, .other:
                break
            }
            return nil
        }
    }

    private func fetchProfileFallback(userID: UUID) async -> ReputationSnapshot? {
        let selects = [
            hasSelectedStyleOnProfiles
                ? "id,rep_score,selected_style_id,preferred_style,preferred_style_id"
                : "id,rep_score,preferred_style,preferred_style_id",
            "id,rep_score,preferred_style",
            "id,rep_score",
        ]
        for select in selects {
            do {
                let row: ReputationScoreMapper.ProfileFallbackRow = try await client
                    .from("profiles")
                    .select(select)
                    .eq("id", value: userID.uuidString)
                    .single()
                    .execute()
                    .value
                return ReputationScoreMapper.snapshot(from: row)
            } catch {
                if ReputationSchemaProbe.diagnose(error) == .missingColumn {
                    if select.contains("selected_style_id") {
                        hasSelectedStyleOnProfiles = false
                    }
                    if select.contains("preferred_style") {
                        hasPreferredStyleOnProfiles = false
                    }
                    continue
                }
                return nil
            }
        }
        return nil
    }

    // MARK: - Persist

    private func invokeSetStyleRPC(_ id: ProfileStyleId) async throws {
        struct Params: Encodable, Sendable {
            let p_style_id: String
        }
        _ = try await client
            .rpc(Self.setStyleRPC, params: Params(p_style_id: id.rawValue))
            .execute()
    }

    private func updateScoresSelectedStyle(userID: UUID, id: ProfileStyleId) async throws {
        struct Payload: Encodable, Sendable {
            let selected_style_id: String
        }
        try await client
            .from(Self.scoresTable)
            .update(Payload(selected_style_id: id.rawValue))
            .eq("user_id", value: userID.uuidString)
            .execute()
    }

    private func updateProfileStyleColumn(userID: UUID, column: String, id: ProfileStyleId) async throws {
        // Encode a single known column without inventing dynamic CodingKeys.
        if column == "preferred_style" {
            struct Payload: Encodable, Sendable { let preferred_style: String }
            try await client
                .from("profiles")
                .update(Payload(preferred_style: id.rawValue))
                .eq("id", value: userID.uuidString)
                .execute()
        } else {
            struct Payload: Encodable, Sendable { let selected_style_id: String }
            try await client
                .from("profiles")
                .update(Payload(selected_style_id: id.rawValue))
                .eq("id", value: userID.uuidString)
                .execute()
        }
    }

    // MARK: - Cache

    private func store(_ snap: ReputationSnapshot) {
        lock.lock()
        cache[snap.userId] = snap
        lock.unlock()
    }

    private func updateCache(userID: UUID, selected: ProfileStyleId, score: Int, photoGate: Int) {
        var snap = snapshot(for: userID) ?? ReputationSnapshot(userId: userID, score: score, photoGate: photoGate)
        snap.selectedStyleId = selected
        snap.score = ProfileStyleCatalog.clampScore(score)
        snap.photoGate = photoGate
        if !snap.unlocksFromServer {
            snap.unlockedStyleIds = ReputationUnlockTier.from(score: snap.score).unlockedStyleIds
            snap.tier = ReputationUnlockTier.from(score: snap.score)
        }
        store(snap)
    }

    private func currentUserID() async throws -> UUID {
        do {
            return try await client.auth.session.user.id
        } catch {
            throw ReputationError.notAuthenticated
        }
    }
}
