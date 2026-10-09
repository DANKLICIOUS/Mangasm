import Foundation

/// Server-aligned Community Reputation unlock bands for cosmetic ProfileStyle themes.
///
/// Score is the source of truth. Tier labels match the intended backend contract:
/// `new` (<40), `building` (40+), `reliable` (65+), `verified` (85+).
///
/// Distinct from the older display-only `RepTier` (`new`…`legend`) in `Models.swift`.
public enum ReputationUnlockTier: String, CaseIterable, Sendable, Codable, Hashable {
    case new
    case building
    case reliable
    case verified

    public var minScore: Int {
        switch self {
        case .new: return 0
        case .building: return 40
        case .reliable: return 65
        case .verified: return 85
        }
    }

    public var displayName: String {
        switch self {
        case .new: return "New"
        case .building: return "Building"
        case .reliable: return "Reliable"
        case .verified: return "Verified"
        }
    }

    /// Styles unlocked at this band, inclusive of lower bands.
    public var unlockedStyleIds: [ProfileStyleId] {
        switch self {
        case .new:
            return [.calmStudio]
        case .building:
            return [.calmStudio, .aspirational]
        case .reliable:
            return [.calmStudio, .aspirational, .precisionTech, .digitalFlow]
        case .verified:
            return Array(ProfileStyleId.allCases)
        }
    }

    public static func from(score: Int) -> ReputationUnlockTier {
        let s = ProfileStyleCatalog.clampScore(score)
        if s >= Self.verified.minScore { return .verified }
        if s >= Self.reliable.minScore { return .reliable }
        if s >= Self.building.minScore { return .building }
        return .new
    }

    /// Parse a server `tier` string. Prefer numeric score when both are present.
    public static func parse(_ raw: String?) -> ReputationUnlockTier? {
        guard let raw else { return nil }
        let key = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch key {
        case "new": return .new
        case "building": return .building
        case "reliable": return .reliable
        case "verified": return .verified
        // Legacy `reputation_scores.tier` values from migration 0002
        case "rising": return .new
        case "veteran": return .building
        case "elite": return .reliable
        case "legend": return .verified
        default: return nil
        }
    }
}
