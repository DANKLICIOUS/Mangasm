import SwiftUI
import Supabase

public struct MangasmRootView: View {
    @StateObject private var state = AppState()
    @StateObject private var env = AppEnvironment.makeDefault()
    @StateObject private var store = StoreKitStore()

    /// True while a password-recovery deep link is being completed.
    @State private var showNewPasswordSheet = false

    public init() {}

    public var body: some View {
        Group {
            switch state.phase {
            case .launch: LaunchFlow { state.enterApp() }
            case .app:    MainTabView()
            }
        }
        .environmentObject(state)
        .environmentObject(env)
        .environmentObject(store)
        // Server premium wins once known; StoreKit is optimistic until then.
        .onChange(of: store.isPremium) { _, isPremium in
            state.premium = PremiumResolver.isPremium(
                serverVerified: env.profile.current().premium,
                localEntitlement: isPremium
            )
        }
        .onChange(of: state.phase) { _, phase in
            guard phase == .app else { return }
            Task { await Self.syncProfileFromServer(state: state, env: env, store: store) }
        }
        .task {
            if let config = SupabaseConfig.fromInfoPlist() {
                store.verifyBaseURL = config.url.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
                store.authTokenProvider = env.accessTokenProvider
            }
            // Restore a Keychain-persisted Supabase session on launch: valid
            // (refreshable) session → straight into the app; anything else stays
            // on the launch flow.
            if env.auth is SupabaseAuthService, await env.auth.restoreSession() {
                state.enterApp()
            }
            await store.loadProducts()
            await store.updatePurchasedProducts()
        }
        // Token refresh failure / server-side revocation → back to login.
        .task { await observeAuthState() }
        .sheet(isPresented: $showNewPasswordSheet) {
            NewPasswordView {
                showNewPasswordSheet = false
                state.enterApp()
            }
            .environmentObject(env)
        }
        .onOpenURL { url in
            if AuthDeepLink.isAuthCallback(url) {
                Task { @MainActor in
                    guard await env.auth.handleAuthURL(url) else { return }
                    // Recovery links also fire the .passwordRecovery auth event
                    // (handled in observeAuthState); confirmation links just
                    // establish a session and proceed into the app.
                    if !showNewPasswordSheet, state.phase == .launch {
                        state.enterApp()
                    }
                }
                return
            }
            if let code = ReferralCode.parse(from: url) {
                state.captureReferralCode(code)
            }
        }
    }

    /// Watches Supabase auth events. `.signedOut` (expired/revoked refresh
    /// token, remote sign-out) while in the app resets to login;
    /// `.passwordRecovery` (reset magic link) opens the new-password sheet.
    private func observeAuthState() async {
        guard let supabase = env.supabaseClient else { return }
        for await (event, _) in supabase.auth.authStateChanges {
            switch event {
            case .signedOut:
                if state.phase == .app { state.resetForSignOut() }
            case .passwordRecovery:
                showNewPasswordSheet = true
            default:
                break
            }
        }
    }

    @MainActor
    private static func syncProfileFromServer(
        state: AppState,
        env: AppEnvironment,
        store: StoreKitStore
    ) async {
        do {
            try await env.profile.loadFromServer()
            state.profile = env.profile.current()
            state.visibility = env.profile.currentVisibility()
            try? await env.matches.loadFromServer(viewerHobbies: state.profile.hobbies)
            if let safety = env.safety as? SupabaseSafetyService {
                await safety.loadFromServer()
            }
            if let chat = env.chat as? SupabaseChatService {
                await chat.loadFromServer()
            }
            state.premium = PremiumResolver.isPremium(
                serverVerified: state.profile.premium,
                localEntitlement: store.isPremium
            )
        } catch {
            // Stay on mock/seed data when offline or pre-auth; live auth still gates real entry.
        }
    }
}
