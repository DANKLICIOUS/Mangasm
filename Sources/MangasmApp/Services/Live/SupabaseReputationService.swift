import Foundation
import Supabase

/// Live Community Reputation aligned to mangasm-backend `docs/PROFILE_STYLE.md`.
///
/// Canonical contract (backend PR #10 / migration `0009_profile_style.sql`):
/// - Read: RPC `my_profile_style()` → `score`, `tier`, `unlocked_style_ids`, `selected_style_id`
/// - Write: `UPDATE profiles.selected_style_id` (enum; default `calmStudio`)
/// - Unlocks come from the RPC list, not the local 0/21/41/61/81 catalog
/// - Illegal writes raise `check_violation` / RLS; demotion does not clear a chosen style
///
/// Do **not** `db push` this repo’s `supabase/` tree onto the same project as
/// `DANKLICIOUS/mangasm-backend` (divergent migration lineage).
///
/// If the RPC / column are not deployed yet, fall back to `reputation_scores`
/// (read-only score/tier/photo_gate) + local unlock map, then UserDefaults.
public final class SupabaseReputationService: ReputationService, @unchecked Sendable {
    public static let myProfileStyleRPC = "my_profile_style"
    public static let scoresTable = "reputation_scores"

    private let client: SupabaseClient
    private let lock = NSLock()
    private var cache: [UUID: ReputationSnapshot] = [:]

    private var hasMyProfileStyleRPC = true
    private var hasSelectedStyleOnProfiles = true
    private var hasReputationTable = true

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

        if hasMyProfileStyleRPC, let snap = await fetchMyProfileStyle(userID: userID) {
            var hydrated = snap
            if let gate = await fetchPhotoGate(userID: userID) {
                hydrated.photoGate = gate
            }
            store(hydrated)
            return
        }

        if let snap = await fetchFallbackSnapshot(userID: userID) {
            store(snap)
        }
    }

    public func selectStyle(_ id: ProfileStyleId) async throws {
        let userID = try await currentUserID()
        let cached = snapshot(for: userID)
        if let cached, !cached.isUnlocked(id) {
            throw ReputationError.styleLocked
        }

        guard hasSelectedStyleOnProfiles else {
            updateCacheSelected(userID: userID, id: id)
            return
        }

        do {
            try await persistSelectedStyle(userID: userID, id: id)
            updateCacheSelected(userID: userID, id: id)
        } catch {
            switch ReputationSchemaProbe.diagnose(error) {
            case .styleLocked:
                throw ReputationError.styleLocked
            case .missingColumn:
                hasSelectedStyleOnProfiles = false
                updateCacheSelected(userID: userID, id: id)
            case .missingRPC, .missingTable, .other:
                throw ReputationError.server(error.localizedDescription)
            }
        }
    }

    // MARK: - Fetch

    private func fetchMyProfileStyle(userID: UUID) async -> ReputationSnapshot? {
        do {
            let row: ReputationScoreMapper.MyProfileStyleRow = try await client
                .rpc(Self.myProfileStyleRPC)
                .single()
                .execute()
                .value
            return ReputationScoreMapper.snapshot(from: row, userId: userID)
        } catch {
            if let rows: [ReputationScoreMapper.MyProfileStyleRow] = try? await client
                .rpc(Self.myProfileStyleRPC)
                .execute()
                .value,
               let row = rows.first
            {
                return ReputationScoreMapper.snapshot(from: row, userId: userID)
            }
            switch ReputationSchemaProbe.diagnose(error) {
            case .missingRPC, .missingTable:
                hasMyProfileStyleRPC = false
            case .missingColumn, .styleLocked, .other:
                break
            }
            return nil
        }
    }

    private func fetchPhotoGate(userID: UUID) async -> Int? {
        guard hasReputationTable else { return nil }
        do {
            let row: ReputationScoreMapper.PhotoGateRow = try await client
                .from(Self.scoresTable)
                .select("photo_gate")
                .eq("user_id", value: userID.uuidString)
                .single()
                .execute()
                .value
            return row.photo_gate
        } catch {
            if ReputationSchemaProbe.diagnose(error) == .missingTable {
                hasReputationTable = false
            }
            return nil
        }
    }

    private func fetchFallbackSnapshot(userID: UUID) async -> ReputationSnapshot? {
        var score = 0
        var tier: String?
        var photoGate = 50

        if hasReputationTable {
            struct ScoreOnly: Decodable, Sendable {
                var score: Int?
                var tier: String?
                var photo_gate: Int?
            }
            do {
                let row: ScoreOnly = try await client
                    .from(Self.scoresTable)
                    .select("score,tier,photo_gate")
                    .eq("user_id", value: userID.uuidString)
                    .single()
                    .execute()
                    .value
                score = row.score ?? 0
                tier = row.tier
                photoGate = row.photo_gate ?? 50
            } catch {
                if ReputationSchemaProbe.diagnose(error) == .missingTable {
                    hasReputationTable = false
                }
            }
        }

        if hasSelectedStyleOnProfiles {
            do {
                let row: ReputationScoreMapper.ProfileFallbackRow = try await client
                    .from("profiles")
                    .select("id,selected_style_id")
                    .eq("id", value: userID.uuidString)
                    .single()
                    .execute()
                    .value
                var snap = ReputationScoreMapper.snapshot(from: row, score: score, tier: tier)
                snap.photoGate = photoGate
                return snap
            } catch {
                if ReputationSchemaProbe.diagnose(error) == .missingColumn {
                    hasSelectedStyleOnProfiles = false
                }
            }
        }

        return ReputationSnapshot(userId: userID, score: score, photoGate: photoGate, tier: ReputationUnlockTier.parse(tier))
    }

    // MARK: - Persist

    private func persistSelectedStyle(userID: UUID, id: ProfileStyleId) async throws {
        struct Payload: Encodable, Sendable {
            let selected_style_id: String
        }
        struct Written: Decodable, Sendable {
            let selected_style_id: String
        }
        let written: Written = try await client
            .from("profiles")
            .update(Payload(selected_style_id: id.rawValue))
            .eq("id", value: userID.uuidString)
            .select("selected_style_id")
            .single()
            .execute()
            .value
        if written.selected_style_id != id.rawValue {
            throw ReputationError.styleLocked
        }
    }

    // MARK: - Cache

    private func store(_ snap: ReputationSnapshot) {
        lock.lock()
        cache[snap.userId] = snap
        lock.unlock()
    }

    private func updateCacheSelected(userID: UUID, id: ProfileStyleId) {
        var snap = snapshot(for: userID) ?? ReputationSnapshot(userId: userID, score: 0)
        snap.selectedStyleId = id
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
