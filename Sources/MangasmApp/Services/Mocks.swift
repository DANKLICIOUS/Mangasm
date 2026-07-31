import Foundation

// MARK: - MockAuthService
public final class MockAuthService: AuthService {
    /// Number of times deleteAccount() was invoked — lets tests assert the
    /// destructive action reached the service layer.
    public private(set) var deleteAccountCallCount = 0

    public init() {}

    public func signInWithApple(consent: OnboardingConsent) async throws {
        try await enterMock(consent: consent)
    }

    public func signInWithGoogle(consent: OnboardingConsent) async throws {
        try await enterMock(consent: consent)
    }

    public func signInWithPhone(consent: OnboardingConsent) async throws {
        try await enterMock(consent: consent)
    }

    public func signInWithEmail(email: String, password: String, consent: OnboardingConsent) async throws {
        try await enterMock(consent: consent)
    }

    public func enterMock(consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
    }

    public func deleteAccount() async throws {
        deleteAccountCallCount += 1
    }
}

// MARK: - MockReferralService
@MainActor
public final class MockReferralService: ReferralService {
    public private(set) var lastRedeemedCode: String?

    public init() {}

    public func redeem(code: String) async throws -> ReferralRedeemResult {
        lastRedeemedCode = code
        return ReferralRedeemResult(ok: true, code: code.uppercased(), reward: nil)
    }
}

// MARK: - MockProfileService
@MainActor
public final class MockProfileService: ProfileService {
    private var profile: Profile = .sample
    private var visibility: Visibility = .sample

    public init() {}

    public func current() -> Profile { profile }

    public func currentVisibility() -> Visibility { visibility }

    public func apply(profile: Profile, visibility: Visibility) {
        self.profile = profile
        self.visibility = visibility
    }

    public func loadFromServer() async throws {}

    public func saveToServer() async throws {}
}

// MARK: - MockMatchService
@MainActor
public final class MockMatchService: MatchService {
    private let candidates: [Candidate] = Candidate.samples
    private var featuredIndex: Int = 0

    public init() {}

    public func featured() -> Candidate {
        candidates[featuredIndex % candidates.count]
    }

    public func nearby() -> [Candidate] {
        // All candidates except the featured one
        candidates.filter { $0.id != featured().id }
    }

    public func refresh() {
        featuredIndex = (featuredIndex + 1) % candidates.count
    }

    public func loadFromServer(viewerHobbies: [String]) async throws {
        _ = viewerHobbies
    }
}

// MARK: - MockChatService
@MainActor
public final class MockChatService: ChatService {
    private let inbox: ChatInboxCache

    public init() {
        self.inbox = ChatInboxCache(conversations: Conversation.samples)
    }

    public func conversations() -> [Conversation] { inbox.conversations() }

    public func messages(for conversationID: String) -> [Message] {
        inbox.messages(for: conversationID)
    }

    public func removeConversation(for candidateID: String) {
        inbox.removeConversation(for: candidateID)
    }

    public func send(_ text: String, to conversationID: String) {
        _ = inbox.send(text, to: conversationID)
    }

    /// Returns the existing conversation matching the candidateID, or creates and stores a new one.
    @discardableResult
    public func conversation(for candidateID: String, name: String, avatarURL: String?) -> Conversation {
        // Keep sample-style ids (`conv-m1`) for seeded candidates; stable UUID form for new peers.
        inbox.conversation(for: candidateID, name: name, avatarURL: avatarURL) { id in
            Conversation.samples.contains(where: { $0.candidateID == id })
                ? (Conversation.samples.first { $0.candidateID == id }!.id)
                : "conv-\(id)"
        }
    }
}

// MARK: - MockEventService
public final class MockEventService: EventService {
    private var eventList: [EventItem] = EventItem.samples
    private var rsvpedIDs: Set<String> = []

    public init() {}

    public func events() -> [EventItem] { eventList }

    public func communities() -> [Community] { Community.samples }

    public func rsvp(_ eventID: String) {
        guard !rsvpedIDs.contains(eventID) else { return }
        rsvpedIDs.insert(eventID)
        if let idx = eventList.firstIndex(where: { $0.id == eventID }) {
            eventList[idx].going += 1
        }
    }
}

// MARK: - MockReputationService
public final class MockReputationService: ReputationService {
    public init() {}

    public func score(for profileID: UUID) -> Int {
        // Returns the sample profile's score as a stand-in for any ID
        Profile.sample.repScore
    }

    public func canViewPhotos(viewerScore: Int, targetGate: Int) -> Bool {
        viewerScore >= targetGate
    }
}

// MARK: - MockSafetyService
public final class MockSafetyService: SafetyService {
    private var blockedIDs: Set<String> = []
    private var reportLog: [(userID: String, reason: String)] = []

    public init() {}

    public func block(_ userID: String) {
        blockedIDs.insert(userID)
        print("[MockSafetyService] blocked \(userID)")
    }

    public func unblock(_ userID: String) {
        blockedIDs.remove(userID)
        print("[MockSafetyService] unblocked \(userID)")
    }

    public func isBlocked(_ userID: String) -> Bool {
        blockedIDs.contains(userID)
    }

    public func report(_ userID: String, reason: String) {
        reportLog.append((userID: userID, reason: reason))
        print("[MockSafetyService] reported \(userID) for: \(reason)")
    }
}

// MARK: - MockWeatherProvider
/// Returns a fixed stub condition (default `.clear`) so previews/tests are deterministic.
public struct MockWeatherProvider: WeatherProvider {
    public var stub: Weather
    public init(stub: Weather = .clear) { self.stub = stub }
    public func current(at coordinate: GeoCoordinate) async -> Weather { stub }
}

// MARK: - MockLocationProvider
/// Returns a fixed coordinate (default Miami, matching DateNight fixtures); pass `nil`
/// to simulate a denied/unavailable location.
public struct MockLocationProvider: LocationProvider {
    public var coordinate: GeoCoordinate?
    public init(coordinate: GeoCoordinate? = GeoCoordinate(latitude: 25.7617, longitude: -80.1918)) {
        self.coordinate = coordinate
    }
    public func currentCoordinate() async -> GeoCoordinate? { coordinate }
}
