import Foundation

/// Deep façade: one resolve seam for Community Reputation cosmetic styles.
/// Call sites should prefer this over assembling Catalog + State + Theme ad hoc.
public struct ActiveStyle: Sendable, Equatable {
    public let score: Int
    public let config: ProfileStyleConfig
    public let preferredStyleId: ProfileStyleId?
    public let seenUnlockIds: Set<ProfileStyleId>

    public var styleId: ProfileStyleId { config.styleId }
    public var badgeName: String { config.badgeName }
    public var displayName: String { config.displayName }
    public var heroAssetName: String { config.heroAssetName }
    public var rnThemeId: String { config.styleId.legacyThemeAlias }
}

public enum CommunityReputationStyle {
    /// Resolve active style from score + optional preferred (if still unlocked).
    public static func resolve(
        score: Int,
        preferred: ProfileStyleId?,
        seenUnlockIds: Set<ProfileStyleId> = []
    ) -> ActiveStyle {
        var state = ProfileStyleState(
            reputationScore: score,
            preferredStyleId: preferred,
            seenUnlockIds: seenUnlockIds
        )
        return ActiveStyle(
            score: state.reputationScore,
            config: state.activeConfig,
            preferredStyleId: state.preferredStyleId,
            seenUnlockIds: state.seenUnlockIds
        )
    }

    /// Apply a new score; returns updated state + newly unlocked configs for toast.
    public static func applyScore(
        to state: inout ProfileStyleState,
        newScore: Int
    ) -> [ProfileStyleConfig] {
        state.applyScoreChange(newScore)
    }

    public static func selectPreferred(
        _ id: ProfileStyleId,
        state: inout ProfileStyleState
    ) -> Bool {
        state.selectPreferred(id)
    }

    public static var explainer: String {
        ProfileStyleCatalog.communityReputationExplainer
    }

    public static var howItWorksBullets: [String] {
        [
            "Complete verification (phone, photo, ID when available).",
            "Receive positive ratings from other members.",
            "Help the community with upheld reports and welcoming new members.",
            "Finish safety education modules.",
            "Stay active with respectful use — mild decay only after long inactivity.",
            "Higher scores unlock cosmetic profile styles only. Never messages or adult features.",
            "You can always switch among any styles you have unlocked.",
        ]
    }
}
