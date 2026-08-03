import Foundation

/// Transparent Trust / Community Reputation formula (0–100).
///
/// Design principles (SDT + App Store):
/// - **No variable-ratio core score** — deterministic, rule-based, competence-oriented.
/// - **Autonomy** — transparent rules; user controls cosmetic themes.
/// - **Competence** — clear components and human-readable explanations.
/// - **Relatedness** — weight on positive ratings, helpful reports, welcoming community.
///
/// Light optional VR may only be used for non-score delight (animations), never for TrustScore.
public struct TrustScoreComponents: Sendable, Equatable {
    public var baseVerification: Int      // 0...15
    public var profileCompleteness: Int   // 0...10
    public var positiveFeedback: Int      // 0...40
    public var communityContribution: Int // 0...20
    public var safetyActions: Int         // 0...10
    public var penalties: Int             // 0...30 (subtracted)
    public var inactivityDecay: Int       // 0...15 (subtracted)

    public init(
        baseVerification: Int = 0,
        profileCompleteness: Int = 0,
        positiveFeedback: Int = 0,
        communityContribution: Int = 0,
        safetyActions: Int = 0,
        penalties: Int = 0,
        inactivityDecay: Int = 0
    ) {
        self.baseVerification = min(15, max(0, baseVerification))
        self.profileCompleteness = min(10, max(0, profileCompleteness))
        self.positiveFeedback = min(40, max(0, positiveFeedback))
        self.communityContribution = min(20, max(0, communityContribution))
        self.safetyActions = min(10, max(0, safetyActions))
        self.penalties = min(30, max(0, penalties))
        self.inactivityDecay = min(15, max(0, inactivityDecay))
    }

    public var total: Int {
        let raw =
            baseVerification
            + profileCompleteness
            + positiveFeedback
            + communityContribution
            + safetyActions
            - penalties
            - inactivityDecay
        return ProfileStyleCatalog.clampScore(raw)
    }
}

public enum TrustScoreFormula {
    /// Compute score from component model.
    public static func score(from components: TrustScoreComponents) -> Int {
        components.total
    }

    /// Apply a single allowlisted event to components (pure).
    public static func apply(
        event: ReputationEvent,
        to components: TrustScoreComponents
    ) -> TrustScoreComponents {
        var c = components
        switch event.kind {
        case .verificationComplete:
            c.baseVerification = min(15, c.baseVerification + max(0, event.delta))
        case .positiveRatingReceived:
            c.positiveFeedback = min(40, c.positiveFeedback + max(0, event.delta))
        case .helpfulReport:
            c.communityContribution = min(20, c.communityContribution + max(0, event.delta))
        case .safetyModuleComplete:
            c.safetyActions = min(10, c.safetyActions + max(0, event.delta))
        case .cleanTenureBonus:
            // Soft relatedness/competence — small positive only
            c.communityContribution = min(20, c.communityContribution + max(0, min(5, event.delta)))
        case .penaltyViolation:
            c.penalties = min(30, c.penalties + max(0, abs(event.delta)))
        case .inactivityDecay:
            // Mild decay only — SDT: avoid harsh punishment for breaks
            c.inactivityDecay = min(15, c.inactivityDecay + max(0, abs(event.delta)))
        }
        return c
    }

    /// Fold a list of events from empty baseline.
    public static func score(events: [ReputationEvent]) -> Int {
        var c = TrustScoreComponents()
        for e in events {
            c = apply(event: e, to: c)
        }
        return score(from: c)
    }

    /// Human-readable line for UI (competence + relatedness feedback).
    public static func explanation(for event: ReputationEvent) -> String {
        switch event.kind {
        case .verificationComplete:
            return "+\(event.delta) from completing verification — you’re building a trusted presence."
        case .positiveRatingReceived:
            return "+\(event.delta) from positive community feedback — thoughtful interactions matter."
        case .helpfulReport:
            return "+\(event.delta) for a helpful safety report that was upheld — thank you for protecting the community."
        case .safetyModuleComplete:
            return "+\(event.delta) from finishing safety education."
        case .cleanTenureBonus:
            return "+\(event.delta) for consistent respectful use."
        case .penaltyViolation:
            return "−\(abs(event.delta)) from a confirmed policy violation (appealable)."
        case .inactivityDecay:
            return "−\(abs(event.delta)) mild inactivity adjustment after a long break — return anytime."
        }
    }

    /// Progress 0...1 toward next style unlock threshold.
    public static func progressToNextStyle(score: Int) -> (next: ProfileStyleConfig?, progress: Double) {
        let s = ProfileStyleCatalog.clampScore(score)
        let remaining = ProfileStyleCatalog.all.filter { $0.minScore > s }
        guard let next = remaining.first else {
            return (nil, 1)
        }
        let prevFloor = ProfileStyleCatalog.all.last { $0.minScore <= s }?.minScore ?? 0
        let span = max(1, next.minScore - prevFloor)
        let prog = Double(s - prevFloor) / Double(span)
        return (next, min(1, max(0, prog)))
    }
}
