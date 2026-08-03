import Foundation

public struct ProfileStyleState: Sendable, Equatable {
    public var reputationScore: Int
    public var preferredStyleId: ProfileStyleId?
    public var seenUnlockIds: Set<ProfileStyleId>

    public init(
        reputationScore: Int = 0,
        preferredStyleId: ProfileStyleId? = nil,
        seenUnlockIds: Set<ProfileStyleId> = []
    ) {
        self.reputationScore = ProfileStyleCatalog.clampScore(reputationScore)
        self.preferredStyleId = preferredStyleId
        self.seenUnlockIds = seenUnlockIds
    }

    public var activeConfig: ProfileStyleConfig {
        if let preferred = preferredStyleId,
           ProfileStyleCatalog.isUnlocked(preferred, score: reputationScore)
        {
            return ProfileStyleCatalog.config(id: preferred)
        }
        return ProfileStyleCatalog.defaultStyle(score: reputationScore)
    }

    /// Updates score; returns configs newly unlocked that were not yet in `seenUnlockIds`.
    @discardableResult
    public mutating func applyScoreChange(_ newScore: Int) -> [ProfileStyleConfig] {
        let previous = reputationScore
        let next = ProfileStyleCatalog.clampScore(newScore)
        let previousIds = Set(ProfileStyleCatalog.available(score: previous).map(\.styleId))
        let nextConfigs = ProfileStyleCatalog.available(score: next)
        let newly = nextConfigs.filter {
            !previousIds.contains($0.styleId) && !seenUnlockIds.contains($0.styleId)
        }
        reputationScore = next
        for c in nextConfigs {
            seenUnlockIds.insert(c.styleId)
        }
        return newly
    }

    /// Call once after loading persisted state so existing high scores don't spam all toasts.
    public mutating func seedSeenWithCurrentUnlocks() {
        for c in ProfileStyleCatalog.available(score: reputationScore) {
            seenUnlockIds.insert(c.styleId)
        }
    }

    @discardableResult
    public mutating func selectPreferred(_ id: ProfileStyleId) -> Bool {
        guard ProfileStyleCatalog.isUnlocked(id, score: reputationScore) else { return false }
        preferredStyleId = id
        return true
    }
}
