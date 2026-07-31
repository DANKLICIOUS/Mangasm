import SwiftUI

public struct MangasmRootView: View {
    @StateObject private var state = AppState()
    @StateObject private var env = AppEnvironment.makeDefault()
    @StateObject private var store = StoreKitStore()

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
            await store.loadProducts()
            await store.updatePurchasedProducts()
        }
        .onOpenURL { url in
            if let code = ReferralCode.parse(from: url) {
                state.captureReferralCode(code)
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
