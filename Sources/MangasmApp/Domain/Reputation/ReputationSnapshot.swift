import Foundation

/// Cached Community Reputation row used by live + mock services.
public struct ReputationSnapshot: Sendable, Equatable {
    public var userId: UUID
    public var score: Int
    public var photoGate: Int
    public var tier: ReputationUnlockTier
    public var selectedStyleId: ProfileStyleId?
    /// Styles the server says are unlocked. When `unlocksFromServer` is false, this
    /// is derived from score via `ReputationUnlockTier`.
    public var unlockedStyleIds: [ProfileStyleId]
    public var unlocksFromServer: Bool

    public init(
        userId: UUID,
        score: Int,
        photoGate: Int = 50,
        tier: ReputationUnlockTier? = nil,
        selectedStyleId: ProfileStyleId? = nil,
        unlockedStyleIds: [ProfileStyleId]? = nil,
        unlocksFromServer: Bool = false
    ) {
        let clamped = ProfileStyleCatalog.clampScore(score)
        self.userId = userId
        self.score = clamped
        self.photoGate = max(0, photoGate)
        self.tier = tier ?? ReputationUnlockTier.from(score: clamped)
        self.selectedStyleId = selectedStyleId
        if let unlockedStyleIds, unlocksFromServer {
            self.unlockedStyleIds = unlockedStyleIds
            self.unlocksFromServer = true
        } else {
            self.unlockedStyleIds = ReputationUnlockTier.from(score: clamped).unlockedStyleIds
            self.unlocksFromServer = false
        }
    }

    public func isUnlocked(_ id: ProfileStyleId) -> Bool {
        unlockedStyleIds.contains(id)
    }
}

public enum ReputationError: LocalizedError, Sendable, Equatable {
    case notAuthenticated
    case styleLocked
    case server(String)

    public var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Sign in to update Community Reputation styles."
        case .styleLocked:
            return "This style is not unlocked yet. Community Reputation on the server is the source of truth."
        case .server(let message):
            return message
        }
    }
}
