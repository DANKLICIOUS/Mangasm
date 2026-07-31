import Foundation
import Supabase

/// Dependency injection container. Screens receive this as an EnvironmentObject.
/// Real implementations replace each mock when Supabase/Stripe are wired in.
@MainActor
public final class AppEnvironment: ObservableObject {
    public let auth: any AuthService
    public let profile: any ProfileService
    public let matches: any MatchService
    public let chat: any ChatService
    public let events: any EventService
    public let reputation: any ReputationService
    public let safety: any SafetyService
    public let referrals: any ReferralService
    public let dateNight: any DateNightService
    public let weather: any WeatherProvider
    public let location: any LocationProvider
    /// Returns the current session's access token, or nil when signed out.
    /// Edge Function calls use this as the Bearer credential (auth: 'user').
    public let accessTokenProvider: (@Sendable () async -> String?)?

    public init(
        auth: any AuthService,
        profile: any ProfileService,
        matches: any MatchService,
        chat: any ChatService,
        events: any EventService,
        reputation: any ReputationService,
        safety: any SafetyService,
        referrals: any ReferralService,
        dateNight: any DateNightService = MockDateNightService(),
        weather: any WeatherProvider = MockWeatherProvider(),
        location: any LocationProvider = MockLocationProvider(),
        accessTokenProvider: (@Sendable () async -> String?)? = nil
    ) {
        self.auth = auth
        self.profile = profile
        self.matches = matches
        self.chat = chat
        self.events = events
        self.reputation = reputation
        self.safety = safety
        self.referrals = referrals
        self.dateNight = dateNight
        self.weather = weather
        self.location = location
        self.accessTokenProvider = accessTokenProvider
    }

    /// Pre-built mock environment for previews, tests, and Simulator runs.
    public static let mock = AppEnvironment(
        auth: MockAuthService(),
        profile: MockProfileService(),
        matches: MockMatchService(),
        chat: MockChatService(),
        events: MockEventService(),
        reputation: MockReputationService(),
        safety: MockSafetyService(),
        referrals: MockReferralService(),
        dateNight: MockDateNightService()
    )

    /// Live auth + profile + chat + safety when Supabase keys are configured.
    /// Events / reputation remain mock until their live services ship.
    /// DateNight uses Yelp + Ticketmaster when keys are present; otherwise mock fixtures.
    public static func makeDefault() -> AppEnvironment {
        let dateNight: any DateNightService = {
            if let dn = DateNightConfig.fromInfoPlist() {
                return LiveDateNightService(config: dn)
            }
            return MockDateNightService()
        }()

        guard let config = SupabaseConfig.fromInfoPlist() else {
            #if DEBUG
            // Previews, tests, and Simulator runs without secrets use mocks.
            return AppEnvironment(
                auth: MockAuthService(),
                profile: MockProfileService(),
                matches: MockMatchService(),
                chat: MockChatService(),
                events: MockEventService(),
                reputation: MockReputationService(),
                safety: MockSafetyService(),
                referrals: MockReferralService(),
                dateNight: dateNight
            )
            #else
            // A Release binary without Supabase config would silently ship
            // all-mock services — every safety control would be fake in front
            // of App Review (blocker B3, phase1-auth spec §Architecture.3).
            fatalError("SupabaseConfig missing from Info.plist — Release builds must not fall back to mock services.")
            #endif
        }
        let client = SupabaseClient(supabaseURL: config.url, supabaseKey: config.publishableKey)
        return AppEnvironment(
            auth: SupabaseAuthService(client: client, projectURL: config.url, publishableKey: config.publishableKey),
            profile: SupabaseProfileService(client: client),
            matches: SupabaseMatchService(client: client),
            chat: SupabaseChatService(client: client),
            events: MockEventService(),
            reputation: MockReputationService(),
            safety: SupabaseSafetyService(client: client),
            referrals: SupabaseReferralService(
                client: client,
                projectURL: config.url,
                publishableKey: config.publishableKey
            ),
            dateNight: dateNight,
            weather: LiveWeatherProvider(),
            location: LiveLocationProvider(),
            accessTokenProvider: { (try? await client.auth.session)?.accessToken }
        )
    }
}
