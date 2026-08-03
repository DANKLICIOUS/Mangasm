import SwiftUI

// MARK: - MainTabView
// Replaces the default TabView with a ZStack layout:
//   bottom-layer: current feature screen (PlaceholderScreen for Tasks 11–16)
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
        HStack(alignment: .bottom, spacing: 0) {
            ForEach(AppTab.allCases) { tab in
                if tab == .aiMatch {
                    AIMatchTabButton(isActive: state.tab == .aiMatch) {
                        state.tab = .aiMatch
                    }
                } else {
                    RegularTabButton(tab: tab, isActive: state.tab == tab) {
                        state.tab = tab
                    }
                }
            }
        }
        .padding(.vertical, 9)
        .padding(.horizontal, 8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.75), lineWidth: 0.7)
        )
        .overlay(
            // Top rim bright highlight — prototype: inset 0 1px 0 rgba(255,255,255,.75)
            RoundedRectangle(cornerRadius: 24)
                .fill(LinearGradient(
                    colors: [.white.opacity(0.72), .clear],
                    startPoint: .top, endPoint: .init(x: 0.5, y: 0.25)
                ))
                .blendMode(.overlay)
                .allowsHitTesting(false)
        )
        // Prototype: 0 14px 40px -12px rgba(40,30,15,0.4)
        .shadow(color: Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.4),
                radius: 20, x: 0, y: 7)
        .padding(.horizontal, 14)
        .padding(.bottom, 14)
        .accessibilityIdentifier("main_tab_bar")   // stable marker: app entered
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
                    .frame(width: 21, height: 21)
                    .foregroundStyle(isActive ? MGColor.goldDeep : MGColor.inkSoft)
                    .shadow(color: isActive ? MGColor.gold.opacity(0.6) : .clear,
                            radius: 3.5, x: 0, y: 0)
                    .animation(.easeInOut(duration: 0.2), value: isActive)

                Text(label)
                    .font(MGFont.serif(10, .bold))
                    .tracking(10 * 0.08)
                    .foregroundStyle(isActive ? MGColor.goldDeep : MGColor.inkSoft)
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
        case .events:   return "sparkles"
        case .discover: return "square.grid.2x2"
        case .aiMatch:  return "lightbulb"     // unreachable — handled by AIMatchTabButton
        case .likes:    return "heart"
        case .profile:  return "person"
        }
    }

    private var label: String {
        switch tab {
        case .events:   return "Events"
        case .discover: return "Discover"
        case .aiMatch:  return "AI Match"
        case .likes:    return "Likes"
        case .profile:  return "Profile"
        }
    }
}

// MARK: - AIMatchTabButton
// Raised gold-gradient pill for the AI Match tab.
// Prototype: 44×44, r15, linear-gradient(135deg, GOLD_BRIGHT, GOLD_DEEP),
// gold shadow (glow when active), raised via negative Y offset.

private struct AIMatchTabButton: View {
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 15)
                    .fill(MGGradient.goldButton)
                    .frame(width: 44, height: 44)
                    .shadow(
                        color: isActive
                            ? MGColor.gold.opacity(0.9)
                            : Color(red: 201/255, green: 168/255, blue: 76/255).opacity(0.5),
                        radius: isActive ? 10 : 6,
                        x: 0,
                        y: isActive ? 0 : 3
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 15)
                            .fill(LinearGradient(
                                colors: [.white.opacity(0.6), .clear],
                                startPoint: .top,
                                endPoint: .center
                            ))
                            .allowsHitTesting(false)
                    )
                    .animation(.easeInOut(duration: 0.2), value: isActive)

                // Lamp icon — prototype: SVG stroke #3a2c08, strokeWidth 1.9
                // Approximation: SF Symbol lightbulb substituted for the prototype's
                // custom lamp path (M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5...)
                Image(systemName: isActive ? "lightbulb.fill" : "lightbulb")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 23, height: 23)
                    .foregroundStyle(Color(red: 58/255, green: 44/255, blue: 8/255))
            }
            // Raised above bar — negative Y so the pill visually pops
            .offset(y: -12)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}
