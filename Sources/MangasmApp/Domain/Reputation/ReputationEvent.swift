import Foundation

/// Allowlisted reputation events only — App Store / Play safe.
/// Forbidden: match_count, message_volume, sexual_activity, romantic_engagement.
public enum ReputationEventKind: String, CaseIterable, Codable, Sendable {
    case verificationComplete = "verification_complete"
    case positiveRatingReceived = "positive_rating_received"
    case helpfulReport = "helpful_report"
    case safetyModuleComplete = "safety_module_complete"
    case cleanTenureBonus = "clean_tenure_bonus"
    case penaltyViolation = "penalty_violation"
    case inactivityDecay = "inactivity_decay"

    public var isForbiddenIfMisused: Bool { false }

    /// Max points attributable to this kind in the component model (documentation + soft caps).
    public var componentCap: Int {
        switch self {
        case .verificationComplete: return 15
        case .positiveRatingReceived: return 40
        case .helpfulReport: return 20
        case .safetyModuleComplete: return 10
        case .cleanTenureBonus: return 5
        case .penaltyViolation: return 30
        case .inactivityDecay: return 15
        }
    }
}

public struct ReputationEvent: Sendable, Equatable, Codable {
    public let kind: ReputationEventKind
    public let delta: Int
    public let note: String

    public init(kind: ReputationEventKind, delta: Int, note: String = "") {
        self.kind = kind
        // Hard anti-gaming clamp per event
        self.delta = min(20, max(-20, delta))
        self.note = note
    }
}

/// Rejects forbidden metric kinds if ever passed as raw strings from an API.
public enum ReputationEventPolicy {
    public static let forbiddenKinds: Set<String> = [
        "match_count",
        "message_volume",
        "sexual_activity",
        "romantic_engagement",
        "swipe_count",
        "hookup",
    ]

    public static func isAllowed(rawKind: String) -> Bool {
        if forbiddenKinds.contains(rawKind) { return false }
        return ReputationEventKind(rawValue: rawKind) != nil
    }
}
