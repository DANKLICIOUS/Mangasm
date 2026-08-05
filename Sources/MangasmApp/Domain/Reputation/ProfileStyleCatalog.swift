import Foundation

public enum ProfileStyleId: String, CaseIterable, Codable, Sendable, Hashable {
    case calmStudio
    case aspirational
    case precisionTech
    case digitalFlow
    case boldExpression

    /// Cross-platform / RN ThemeProvider aliases (`bobRoss`, `lambo`, …).
    public var legacyThemeAlias: String {
        switch self {
        case .calmStudio: return "bobRoss"
        case .aspirational: return "lambo"
        case .precisionTech: return "cyborg"
        case .digitalFlow: return "matrix"
        case .boldExpression: return "gothGlam"
        }
    }

    public init?(legacyThemeAlias alias: String) {
        switch alias {
        case "bobRoss": self = .calmStudio
        case "lambo": self = .aspirational
        case "cyborg": self = .precisionTech
        case "matrix": self = .digitalFlow
        case "gothGlam": self = .boldExpression
        default: return nil
        }
    }
}

public struct ProfileStyleConfig: Sendable, Equatable, Identifiable {
    public var id: ProfileStyleId { styleId }
    public let styleId: ProfileStyleId
    public let minScore: Int
    public let badgeName: String
    public let displayName: String
    public let heroAssetName: String

    public init(
        styleId: ProfileStyleId,
        minScore: Int,
        badgeName: String,
        displayName: String,
        heroAssetName: String
    ) {
        self.styleId = styleId
        self.minScore = minScore
        self.badgeName = badgeName
        self.displayName = displayName
        self.heroAssetName = heroAssetName
    }
}

public enum ProfileStyleCatalog {
    public static let all: [ProfileStyleConfig] = [
        .init(
            styleId: .calmStudio,
            minScore: 0,
            badgeName: "New Member",
            displayName: "Calm Studio",
            heroAssetName: "style-hero-calmStudio"
        ),
        .init(
            styleId: .aspirational,
            minScore: 21,
            badgeName: "Rising Member",
            displayName: "Aspirational",
            heroAssetName: "style-hero-aspirational"
        ),
        .init(
            styleId: .precisionTech,
            minScore: 41,
            badgeName: "Trusted Member",
            displayName: "Precision Tech",
            heroAssetName: "style-hero-precisionTech"
        ),
        .init(
            styleId: .digitalFlow,
            minScore: 61,
            badgeName: "Community Leader",
            displayName: "Digital Flow",
            heroAssetName: "style-hero-digitalFlow"
        ),
        .init(
            styleId: .boldExpression,
            minScore: 81,
            badgeName: "Elite Verified",
            displayName: "Bold Expression",
            heroAssetName: "style-hero-boldExpression"
        ),
    ]

    public static func clampScore(_ score: Int) -> Int {
        min(100, max(0, score))
    }

    public static func available(score: Int) -> [ProfileStyleConfig] {
        let s = clampScore(score)
        return all.filter { s >= $0.minScore }
    }

    public static func defaultStyle(score: Int) -> ProfileStyleConfig {
        available(score: score).last ?? all[0]
    }

    public static func config(id: ProfileStyleId) -> ProfileStyleConfig {
        all.first { $0.styleId == id } ?? all[0]
    }

    public static func isUnlocked(_ id: ProfileStyleId, score: Int) -> Bool {
        clampScore(score) >= config(id: id).minScore
    }

    /// Canonical App Review / settings explainer (cosmetic unlocks only).
    public static let communityReputationExplainer =
        "Community Reputation grows when you complete verification, receive positive feedback, finish safety education, and help keep Mangasm safe. Higher reputation unlocks cosmetic profile styles only — never messages, adult visibility, or sexual features."
}
