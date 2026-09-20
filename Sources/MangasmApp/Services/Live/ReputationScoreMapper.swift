import Foundation

/// Pure mapping from `my_profile_style()` / `reputation_scores` onto `ReputationSnapshot`.
enum ReputationScoreMapper {
    /// `public.my_profile_style()` — canonical live round-trip.
    struct MyProfileStyleRow: Decodable, Sendable {
        var score: Int
        var tier: String
        var unlocked_style_ids: [String]
        var selected_style_id: String
    }

    struct ScoreRow: Decodable, Sendable {
        var user_id: UUID
        var score: Int?
        var tier: String?
        var photo_gate: Int?
        var selected_style_id: String?
        var preferred_style: String?
        var preferred_style_id: String?
        var unlocked_styles: [String]?
        var unlocked: [String]?
    }

    struct ProfileFallbackRow: Decodable, Sendable {
        var id: UUID
        var selected_style_id: String?
        var photo_gate: Int?
    }

    struct PhotoGateRow: Decodable, Sendable {
        var photo_gate: Int?
    }

    static func parseStyleId(_ raw: String?) -> ProfileStyleId? {
        guard let raw, !raw.isEmpty else { return nil }
        if let id = ProfileStyleId(rawValue: raw) { return id }
        return ProfileStyleId(legacyThemeAlias: raw)
    }

    static func parseStyleIds(_ raw: [String]?) -> [ProfileStyleId]? {
        guard let raw else { return nil }
        let parsed = raw.compactMap(parseStyleId)
        return parsed.isEmpty ? nil : parsed
    }

    static func snapshot(from row: MyProfileStyleRow, userId: UUID, photoGate: Int = 50) -> ReputationSnapshot {
        let ids = parseStyleIds(row.unlocked_style_ids) ?? [.calmStudio]
        return ReputationSnapshot(
            userId: userId,
            score: row.score,
            photoGate: photoGate,
            tier: ReputationUnlockTier.parse(row.tier),
            selectedStyleId: parseStyleId(row.selected_style_id) ?? .calmStudio,
            unlockedStyleIds: ids,
            unlocksFromServer: true
        )
    }

    static func snapshot(from row: ScoreRow) -> ReputationSnapshot {
        let score = row.score ?? 0
        let serverUnlocks = parseStyleIds(row.unlocked_styles) ?? parseStyleIds(row.unlocked)
        return ReputationSnapshot(
            userId: row.user_id,
            score: score,
            photoGate: row.photo_gate ?? 50,
            tier: ReputationUnlockTier.parse(row.tier),
            selectedStyleId: parseStyleId(row.selected_style_id)
                ?? parseStyleId(row.preferred_style_id)
                ?? parseStyleId(row.preferred_style),
            unlockedStyleIds: serverUnlocks,
            unlocksFromServer: serverUnlocks != nil
        )
    }

    static func snapshot(from row: ProfileFallbackRow, score: Int, tier: String?) -> ReputationSnapshot {
        ReputationSnapshot(
            userId: row.id,
            score: score,
            photoGate: row.photo_gate ?? 50,
            tier: ReputationUnlockTier.parse(tier),
            selectedStyleId: parseStyleId(row.selected_style_id) ?? .calmStudio
        )
    }
}
