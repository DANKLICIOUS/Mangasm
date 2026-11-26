import SwiftUI

// MARK: - MainTabView
// Replaces the default TabView with a ZStack layout:
//   bottom-layer: current feature screen
//   top overlay:  GlassTabBar pinned to bottom
//   top overlay:  TopBar pinned to top

struct MainTabView: View {
    @EnvironmentObject var state: AppState
    @EnvironmentObject var env: AppEnvironment

    var body: some View {
        ZStack {
            // ── Current screen ──
            currentScreen
                .ignoresSafeArea()
        }
        // TopBar overlay — shown on all app screens
        .overlay(alignment: .top) {
            TopBar(
                weather: state.weather,
                night: state.night,
                onSettings: {
                    state.showSettings = true
                },
                onMessages: {
                    state.showChatList = true
                }
            )
        }
        // Glass tab bar overlay — pinned to bottom
        .overlay(alignment: .bottom) {
            GlassTabBar()
        }
        .ignoresSafeArea()
        // Resolve weather from the device's location once, when the app shell appears.
        .task {
            await state.refreshWeather(weather: env.weather, location: env.location)
        }
        // Match detail sheet — shared entry point for AIMatch and Discover taps.
        // Candidate is Identifiable, so .sheet(item:) drives presentation automatically.
        .sheet(item: $state.selectedMatch) { candidate in
            MatchDetailScreen(candidate: candidate) {
                // Route to chat: resolve/create conversation, dismiss detail, open thread
                let convo = env.chat.conversation(
                    for: candidate.id,
                    name: candidate.name,
                    avatarURL: candidate.avatarURL
                )
                state.selectedMatch = nil
                DispatchQueue.main.async {
                    state.activeChat = convo
                }
            }
            .environmentObject(state)
            .environmentObject(env)
        }
        // Chat thread — fullScreenCover on iOS, sheet on macOS (fullScreenCover is iOS-only)
        #if os(iOS)
        .fullScreenCover(item: $state.activeChat) { conversation in
            ChatThreadScreen(conversation: conversation) {
                state.activeChat = nil
            }
            .environmentObject(state)
            .environmentObject(env)
        }
        #else
        .sheet(item: $state.activeChat) { conversation in
            ChatThreadScreen(conversation: conversation) {
                state.activeChat = nil
            }
            .environmentObject(state)
            .environmentObject(env)
        }
        #endif
        // Chat list sheet
        .sheet(isPresented: $state.showChatList) {
            ChatListScreen(
                onOpen: { conversation in
                    state.showChatList = false
                    DispatchQueue.main.async { state.activeChat = conversation }
                },
                onClose: {
                    state.showChatList = false
                }
            )
            .environmentObject(state)
            .environmentObject(env)
        }
        // Settings sheet — Task 16
        .sheet(isPresented: $state.showSettings) {
            SettingsScreen(onClose: {
                env.profile.apply(profile: state.profile, visibility: state.visibility)
                state.showSettings = false
                Task { try? await env.profile.saveToServer() }
            })
                .environmentObject(state)
                .environmentObject(env)
        }
    }

    @ViewBuilder
    private var currentScreen: some View {
        switch state.tab {
        case .events:   EventsScreen()
        case .discover: DiscoverScreen(mode: .nearby)
        case .aiMatch:  AIMatchScreen()
        case .likes:    DiscoverScreen(mode: .likes)
        case .profile:  ProfileScreen()
        }
    }
}

// MARK: - GlassTabBar
// Prototype ref: mangasm-shell.jsx TabBar()
// Layout: left 14pt, right 14pt, bottom 14pt insets; radius 24; glass; shadow.
// Items: Events / Discover / AI Match (raised gold pill) / Likes / Profile.
// Active icon + label = MGColor.goldDeep + glow; inactive = inkSoft.
// AI Match: raised gold-gradient pill (MGGradient.goldButton), negative Y offset.
//
// Approximation: SF Symbols used instead of prototype SVG path data.
//   Events   → "sparkles"
//   Discover → "square.grid.2x2"
//   AI Match → "lightbulb" (lamp icon per prototype d-string)
//   Likes    → "heart"
//   Profile  → "person"

private struct GlassTabBar: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        HStack(alignment: .center, spacing: 0) {
            ForEach(AppTab.allCases) { tab in
                RegularTabButton(tab: tab, isActive: state.tab == tab) {
                    state.tab = tab
                }
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 10)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().stroke(Color.white.opacity(0.85), lineWidth: 0.8))
        .shadow(color: Color.black.opacity(0.12), radius: 18, y: 8)
        .padding(.horizontal, 28)
        .padding(.bottom, 18)
        .accessibilityIdentifier("main_tab_bar")
    }
}

// MARK: - RegularTabButton
// Standard tab item: icon (21pt) + label (10pt serif).

private struct RegularTabButton: View {
    let tab: AppTab
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 20, height: 20)
                    .foregroundStyle(isActive ? Color.black.opacity(0.78) : Color.black.opacity(0.38))
                    .animation(.easeInOut(duration: 0.2), value: isActive)

                Text(label)
                    .font(MGFont.sans(9, .semibold))
                    .foregroundStyle(isActive ? Color.black.opacity(0.72) : Color.black.opacity(0.36))
                    .animation(.easeInOut(duration: 0.2), value: isActive)
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }

    private var icon: String {
        switch tab {
        case .events:   return "house"
        case .discover: return "magnifyingglass"
        case .aiMatch:  return "plus"
        case .likes:    return "heart"
        case .profile:  return "person"
        }
    }

    private var label: String {
        switch tab {
        case .events:   return "Events"
        case .discover: return "Search"
        case .aiMatch:  return "Add"
        case .likes:    return "Heart"
        case .profile:  return "You"
        }
    }
}

