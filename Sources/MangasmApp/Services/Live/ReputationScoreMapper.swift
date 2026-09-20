import Foundation

/// Pure mapping from `reputation_scores` / profile fallback rows onto `ReputationSnapshot`.
enum ReputationScoreMapper {
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
        var rep_score: Int?
        var selected_style_id: String?
        var preferred_style: String?
        var preferred_style_id: String?
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

    static func snapshot(from row: ProfileFallbackRow) -> ReputationSnapshot {
        ReputationSnapshot(
            userId: row.id,
            score: row.rep_score ?? 0,
            photoGate: 50,
            selectedStyleId: parseStyleId(row.selected_style_id)
                ?? parseStyleId(row.preferred_style_id)
                ?? parseStyleId(row.preferred_style)
        )
    }
}
