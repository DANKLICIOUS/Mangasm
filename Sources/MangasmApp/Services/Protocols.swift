import Foundation

// MARK: - AuthService
/// Handles authentication and account lifecycle (Phase 1 — Supabase Auth).
@MainActor
public protocol AuthService {
    func signInWithApple(consent: OnboardingConsent) async throws
    func signInWithGoogle(consent: OnboardingConsent) async throws
    func signInWithPhone(consent: OnboardingConsent) async throws
    /// Email/password sign-in — required so App Review can use a demo account
    /// (reviewers cannot use Sign in with Apple). Sign-in only; accounts are
    /// provisioned server-side (phase1-auth spec §4a, decision Q3).
    func signInWithEmail(email: String, password: String, consent: OnboardingConsent) async throws
    /// Previews/tests when no Supabase config is present.
    func enterMock(consent: OnboardingConsent) async throws
    /// Permanently deletes the current account and all associated data (Guideline 5.1.1(v)).
    func deleteAccount() async throws
}

// MARK: - WeatherProvider
/// Resolves the ambient `Weather` from a coordinate — WeatherKit-backed when live,
/// deterministic heuristic as fallback. Non-throwing: weather must never break the UI.
public protocol WeatherProvider: Sendable {
    func current(at coordinate: GeoCoordinate) async -> Weather
}

// MARK: - LocationProvider
/// One-shot, best-effort device coordinate; `nil` when unavailable or permission denied.
public protocol LocationProvider: Sendable {
    func currentCoordinate() async -> GeoCoordinate?
}

// MARK: - ReferralService
/// Records a cartoon referral code after sign-up (validate-referral edge function).
@MainActor
public protocol ReferralService {
    func redeem(code: String) async throws -> ReferralRedeemResult
}

// MARK: - ProfileService
/// Reads and writes the current user's profile (in-memory cache; live impl syncs to `profiles`).
@MainActor
public protocol ProfileService {
    func current() -> Profile
    func currentVisibility() -> Visibility
    /// Replaces the in-memory cache (used by Settings bindings before save).
    func apply(profile: Profile, visibility: Visibility)
    /// Pulls the signed-in user's row from Supabase. No-op for mocks.
    func loadFromServer() async throws
    /// Persists editable fields to Supabase. No-op for mocks.
    func saveToServer() async throws
}

// MARK: - MatchService
/// Provides featured candidate and nearby candidates; refresh cycles the featured slot.
@MainActor
public protocol MatchService {
    func featured() -> Candidate
    func nearby() -> [Candidate]
    func refresh()
    /// Loads discover candidates from `profiles` / `match_results`. No-op for mocks.
    func loadFromServer(viewerHobbies: [String]) async throws
}

// MARK: - ChatService
/// Provides conversations and messages; supports sending new messages.
/// Main-actor isolated so live SupabaseChatService can share UI-thread cache safely.
@MainActor
public protocol ChatService {
    func conversations() -> [Conversation]
    func messages(for conversationID: String) -> [Message]
    func send(_ text: String, to conversationID: String)
    /// Immediately removes local conversation history for a blocked member.
    /// The live backend must also exclude this member from future messaging.
    func removeConversation(for candidateID: String)
    /// Find an existing conversation for a candidate, or create a new empty one.
    func conversation(for candidateID: String, name: String, avatarURL: String?) -> Conversation
}

// MARK: - EventService
/// Provides events and communities; supports RSVP.
public protocol EventService {
    func events() -> [EventItem]
    func communities() -> [Community]
    func rsvp(_ eventID: String)
}

// MARK: - ReputationService
/// Reputation scoring and photo-gating logic.
public protocol ReputationService {
    func score(for profileID: UUID) -> Int
    func canViewPhotos(viewerScore: Int, targetGate: Int) -> Bool
}

// MARK: - SafetyService
/// Block/report actions required by App Store Guideline 1.2 (UGC safety).
@MainActor
public protocol SafetyService {
    func block(_ userID: String)
    func unblock(_ userID: String)
    func isBlocked(_ userID: String) -> Bool
    func report(_ userID: String, reason: String)
}

// MARK: - ReportReason
/// Enumerated report categories. "underage" is especially critical for an 18+ app.
public enum ReportReason: String, CaseIterable, Sendable {
    case harassment
    case spam
    case fakeProfile
    case underage
    case other

    public var label: String {
        switch self {
        case .harassment:  return "Harassment"
        case .spam:        return "Spam"
        case .fakeProfile: return "Fake Profile"
        case .underage:    return "Underage (under 18)"
        case .other:       return "Other"
        }
    }
}
