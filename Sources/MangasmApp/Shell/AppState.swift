import SwiftUI

public enum AppPhase { case launch, app }

public enum AppTab: String, CaseIterable, Identifiable {
    // Order defines the tab-bar layout (5 tabs; aiMatch is the centre raised pill).
    // Events is promoted to a top-level tab and is the default landing tab.
    // The former standalone `search` tab was a duplicate of Discover and has been
    // removed — its search affordance is folded into Discover.
    case events, discover, aiMatch, likes, profile
    public var id: String { rawValue }
}

@MainActor
public final class AppState: ObservableObject {
    @Published public var phase: AppPhase = .launch
    @Published public var tab: AppTab = .events
    @Published public var night = false
    @Published public var premium = false
    @Published public var weather: Weather = .clear   // resolved from device location at launch (was a manual toggle)
    /// Guards against re-resolving weather on every view appearance.
    private var weatherResolved = false
    @Published public var selectedMatch: Candidate? = nil
    @Published public var activeChat: Conversation? = nil
    @Published public var showChatList: Bool = false
    @Published public var showSettings: Bool = false
    @Published public var profile: Profile = .sample
    @Published public var visibility: Visibility = .sample
    /// Set when the full-screen 18+ gate is confirmed (pre-fills sign-in consent).
    @Published public var ageGateAffirmed = false
    /// Deep link / promo invite code, persisted until sign-in redeems it.
    @Published public var pendingReferralCode: String {
        didSet { UserDefaults.standard.set(pendingReferralCode, forKey: Self.pendingReferralKey) }
    }

    /// Community Reputation cosmetic styles (hybrid themes).
    @Published public var profileStyle: ProfileStyleState
    /// One-shot unlock toast queue (cleared by UI after display).
    @Published public var pendingStyleUnlocks: [ProfileStyleConfig] = []

    private static let pendingReferralKey = "pendingReferralCode"
    private let styleStore: any ProfileStyleStore

    public init(styleStore: (any ProfileStyleStore)? = nil) {
        pendingReferralCode = UserDefaults.standard.string(forKey: Self.pendingReferralKey) ?? ""
        let store = styleStore ?? UserDefaultsProfileStyleStore()
        self.styleStore = store
        var style = ProfileStyleState(
            reputationScore: Profile.sample.repScore,
            preferredStyleId: store.loadPreferred(),
            seenUnlockIds: store.loadSeenUnlockIds()
        )
        if store.loadSeenUnlockIds().isEmpty {
            style.seedSeenWithCurrentUnlocks()
            store.saveSeenUnlockIds(style.seenUnlockIds)
        } else {
            // Align score with profile; no toast on cold launch
            _ = style.applyScoreChange(Profile.sample.repScore)
            store.saveSeenUnlockIds(style.seenUnlockIds)
        }
        self.profileStyle = style
    }

    /// Call whenever `profile.repScore` may have changed (sign-in, refresh).
    public func syncProfileStyleWithReputation() {
        let toast = profileStyle.applyScoreChange(profile.repScore)
        styleStore.saveSeenUnlockIds(profileStyle.seenUnlockIds)
        if !toast.isEmpty {
            pendingStyleUnlocks = toast
        }
        // Widget App Group bridge (no-op if group not provisioned yet)
        if let d = UserDefaults(suiteName: "group.com.mangasm.app") {
            d.set(profile.repScore, forKey: "mangasm.widget.repScore")
            d.set(profileStyle.activeConfig.styleId.rawValue, forKey: "mangasm.widget.styleId")
        }
    }

    public func setPreferredStyle(_ id: ProfileStyleId) {
        if profileStyle.selectPreferred(id) {
            styleStore.savePreferred(id)
            objectWillChange.send()
        }
    }

    public func clearPendingStyleUnlocks() {
        pendingStyleUnlocks = []
    }

    public func captureReferralCode(_ raw: String) {
        pendingReferralCode = ReferralCode.normalize(raw) ?? raw.uppercased()
    }

    public func clearPendingReferralCode() {
        pendingReferralCode = ""
    }
    public func enterApp() { phase = .app }

    /// Clears the local session after account deletion or sign-out: drops the
    /// in-memory profile/visibility, revokes premium, closes any open sheets, and
    /// returns to the launch flow. Sensitive in-memory data (fetishes, etc.) must
    /// not survive a deletion — server-side erasure is handled by the AuthService.
    public func resetForSignOut() {
        phase = .launch
        tab = .events
        premium = false
        selectedMatch = nil
        activeChat = nil
        showChatList = false
        showSettings = false
        profile = .sample
        visibility = .sample
        ageGateAffirmed = false
        clearPendingReferralCode()
        pendingStyleUnlocks = []
        syncProfileStyleWithReputation()
    }

    /// Resolve the ambient weather from the device's location — once. Silent on
    /// failure (permission denied or no fix): the default clear-day weather stays,
    /// so the UI never blocks on location.
    public func refreshWeather(weather: any WeatherProvider, location: any LocationProvider) async {
        guard !weatherResolved else { return }
        guard let coordinate = await location.currentCoordinate() else { return }
        self.weather = await weather.current(at: coordinate)
        weatherResolved = true
    }
}
