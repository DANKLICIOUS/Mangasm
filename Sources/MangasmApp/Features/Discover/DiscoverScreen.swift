import SwiftUI

// MARK: - DiscoverScreen
// Spec §5.4 — Discover screen with Nearby sub-tab (map + user grid),
// Communities + Events sub-tab stubs (Task 14), and Likes mode (grid only).
// Prototype: mangasm-profile.jsx DiscoverScreen; mangasm-events.jsx DiscoverTabs.
//
// Data: sourced from env.matches.nearby() (MockMatchService returns Candidate.samples
// minus the featured slot — typically 4 candidates). Pin coords assigned by index
// using the prototype's percentage positions (PINS array from mangasm-profile.jsx).
// Approximations vs prototype:
//   • 4–5 grid cards (not 6) — real service returns Candidate.samples count minus featured.
//   • Match% 94/90/87/83 from Candidate.samples → 3 hot (≥85), not 2 as in prototype.
//   • "Andre" (d6) not present — no corresponding Candidate in the seed data.
//   • Likes mode shows prefix(4) of nearby() candidates.

struct DiscoverScreen: View {
    enum Mode { case nearby, likes }

    let mode: Mode

    @EnvironmentObject var state: AppState
    @EnvironmentObject var env: AppEnvironment

    @State private var subTab: SubTab = .nearby

    // Search query folded in from the retired standalone Search tab. Filters the
    // Nearby people grid by name. (The bespoke shell has no NavigationStack/TabView
    // to host SwiftUI's `.searchable`, and the fixed custom TopBar would occlude a
    // native search bar, so search is surfaced as an inline field styled to match.)
    @State private var searchText: String = ""

    enum SubTab: String, CaseIterable { case nearby, communities, events }

    // Prototype PINS — percentage coords on the fake map (mangasm-profile.jsx PINS array).
    // Assigned by index position, not by candidate id (prototype ids d1–d5 ≠ Candidate ids m1–m5).
    private static let pinCoordsByIndex: [CGPoint] = [
        CGPoint(x: 0.30, y: 0.34),   // candidate[0]
        CGPoint(x: 0.62, y: 0.26),   // candidate[1]
        CGPoint(x: 0.48, y: 0.58),   // candidate[2]
        CGPoint(x: 0.78, y: 0.62),   // candidate[3]
        CGPoint(x: 0.18, y: 0.70),   // candidate[4] — if present
    ]

    private var candidates: [Candidate] {
        env.matches.nearby()
    }

    private var listCandidates: [Candidate] {
        let base = mode == .likes ? Array(candidates.prefix(4)) : candidates
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return base }
        return base.filter { $0.name.localizedCaseInsensitiveContains(query) }
    }

    private var mapPins: [MapPinData] {
        candidates.enumerated().compactMap { (i, candidate) in
            guard i < Self.pinCoordsByIndex.count else { return nil }
            let coords = Self.pinCoordsByIndex[i]
            return MapPinData(candidate: candidate, xPct: coords.x, yPct: coords.y)
        }
    }

    var body: some View {
        ZStack {
            // ── Backdrop ────────────────────────────────────────────────────
            LamborghiniBackground(night: state.night)
            WeatherFX(kind: state.weather, night: state.night)

            // ── Scroll content ──────────────────────────────────────────────
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    // Tabs — only shown in nearby/discover mode, not likes
                    if mode != .likes {
                        DiscoverTabsControl(selected: $subTab)
                            .padding(.bottom, 14)

                        // Search field — folded in from the retired Search tab.
                        // Only relevant to the people (Nearby) grid.
                        if subTab == .nearby {
                            DiscoverSearchField(text: $searchText)
                                .padding(.bottom, 14)
                        }
                    }

                    // Sub-tab content
                    switch (mode == .likes ? SubTab.nearby : subTab) {
                    case .communities:
                        CommunitiesView()

                    case .events:
                        EventsView(premium: state.premium)

                    case .nearby:
                        // Nearby / Likes grid content
                        NearbyContent(
                            candidates: listCandidates,
                            pins: mapPins,
                            showMap: mode == .nearby,
                            isLikes: mode == .likes
                        )
                    }
                }
                .padding(.top, 150)
                .padding(.horizontal, 14)
                .padding(.bottom, 96)
            }
        }
        .ignoresSafeArea()
    }
}

// MARK: - NearbyContent
// Section label + online count, optional fake map, then 2-col user grid.
private struct NearbyContent: View {
    let candidates: [Candidate]
    let pins: [MapPinData]
    let showMap: Bool
    let isLikes: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Section header
            HStack(alignment: .firstTextBaseline) {
                SectionLabel(isLikes ? "LIKED YOU" : "NEARBY")
                Spacer()
                Text(isLikes ? "4 admirers" : "2,847 online")
                    .font(MGFont.mono(8))
                    .foregroundStyle(MGColor.inkFaint)
            }
            .padding(.bottom, 12)

            // Fake map — only in nearby mode
            if showMap {
                MGCard(radius: 20) {
                    FakeMap(pins: pins)
                        .frame(height: 200)
                }
                .padding(.bottom, 14)
            }

            // 4-column grid — denser face grid
            LazyVGrid(
                columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4),
                spacing: 6
            ) {
                ForEach(candidates) { candidate in
                    UserGridCard(candidate: candidate)
                }
            }
        }
    }
}

// MARK: - UserGridCard
// Prototype: holo-border r18 card, image 150pt tall, gradient overlay bottom,
// match-% glass badge top-right (gold border if ≥85), name serif + dist/pos overlay bottom.
// Tapping sets state.selectedMatch — Task 13 will navigate to detail.
private struct UserGridCard: View {
    let candidate: Candidate
    @EnvironmentObject var state: AppState

    private var isHot: Bool { candidate.matchPct >= 85 }

    var body: some View {
        Button {
            state.selectedMatch = candidate
            // TODO(Task 13): navigate to match detail
        } label: {
            ZStack {
                // Holo border
                RoundedRectangle(cornerRadius: 18)
                    .fill(MGGradient.holo)
                    .shadow(
                        color: Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.4),
                        radius: 6, x: 0, y: 4   // smaller shadow so cards don't bleed past the edge
                    )

                // Inner glass surface
                RoundedRectangle(cornerRadius: 17)
                    .fill(.ultraThinMaterial)
                    .padding(1)

                // Image + overlays
                ZStack(alignment: .topTrailing) {
                    ZStack(alignment: .bottom) {
                        // Photo
                        AsyncImage(url: URL(string: candidate.avatarURL ?? "")) { phase in
                            switch phase {
                            case .success(let img):
                                img
                                    .resizable()
                                    .scaledToFill()
                            default:
                                LinearGradient(
                                    colors: [MGColor.goldBright.opacity(0.3), MGColor.goldDeep.opacity(0.5)],
                                    startPoint: .topLeading, endPoint: .bottomTrailing
                                )
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)

                        // Bottom gradient overlay
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0.42),
                                .init(color: Color(red: 20/255, green: 16/255, blue: 12/255).opacity(0.82), location: 1),
                            ],
                            startPoint: .top, endPoint: .bottom
                        )

                        // Name + online dot + dist / pos
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 5) {
                                Text(candidate.name)
                                    .font(MGFont.serif(12, .bold))
                                    .foregroundStyle(.white)
                                    .lineLimit(1)
                                    .shadow(color: .black.opacity(0.6), radius: 2, x: 0, y: 1)
                                Circle()
                                    .fill(MGColor.spotify)
                                    .frame(width: 5, height: 5)
                                    .shadow(color: MGColor.spotify.opacity(1), radius: 3)
                            }
                            HStack {
                                Text(candidate.distanceLabel)
                                    .font(MGFont.mono(7.5))
                                    .foregroundStyle(.white.opacity(0.78))
                                Spacer()
                                Text(candidate.position)
                                    .font(MGFont.mono(7.5))
                                    .foregroundStyle(MGColor.goldBright)
                            }
                        }
                        .padding(.horizontal, 6)
                        .padding(.bottom, 6)
                    }

                    // Match-% badge — top right
                    Text("\(candidate.matchPct)%")
                        .font(MGFont.serif(9, .bold))
                        .foregroundStyle(MGGradient.goldHeading)
                        .padding(.vertical, 2)
                        .padding(.horizontal, 5)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(
                                    isHot ? AnyShapeStyle(MGColor.gold) : AnyShapeStyle(Color.white.opacity(0.7)),
                                    lineWidth: isHot ? 1.0 : 0.7
                                )
                        )
                        .padding(.top, 7)
                        .padding(.trailing, 7)
                }
                .frame(height: 120)
                .clipShape(RoundedRectangle(cornerRadius: 17))
                .padding(1)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - DiscoverSearchField
// Inline search field folded in from the retired standalone Search tab. Glass-styled
// to match the shell (the custom TopBar overlay precludes a native `.searchable` bar).
private struct DiscoverSearchField: View {
    @Binding var text: String

    var body: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MGColor.inkSoft)

            TextField(
                "",
                text: $text,
                prompt: Text("Search people nearby")
                    .foregroundColor(MGColor.inkFaint)
            )
            .font(MGFont.sans(12, .regular))
            .foregroundStyle(MGColor.ink)
            #if os(iOS)
            .textInputAutocapitalization(.never)
            .submitLabel(.search)
            #endif
            .autocorrectionDisabled(true)
            .accessibilityIdentifier("discover_search_field")

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(MGColor.inkFaint)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .glassBackground(14)
    }
}

// MARK: - DiscoverTabsControl
// Segmented pill control: Nearby / Communities / Events.
// Prototype: glass container pad 4, r15; active pill gold gradient r11; Cormorant 700/12.
private struct DiscoverTabsControl: View {
    @Binding var selected: DiscoverScreen.SubTab

    var body: some View {
        HStack(spacing: 4) {
            ForEach(DiscoverScreen.SubTab.allCases, id: \.self) { tab in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selected = tab }
                } label: {
                    Text(tabLabel(tab))
                        .font(MGFont.serif(12, .bold))
                        .tracking(12 * 0.05)
                        .foregroundStyle(
                            selected == tab
                                ? AnyShapeStyle(MGColor.goldText)
                                : AnyShapeStyle(MGColor.inkSoft)
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 4)
                        .background {
                            if selected == tab {
                                RoundedRectangle(cornerRadius: 11)
                                    .fill(MGGradient.goldButton)
                                    .shadow(color: MGColor.gold.opacity(0.7), radius: 6, x: 0, y: 4)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 11)
                                            .fill(LinearGradient(
                                                colors: [.white.opacity(0.5), .clear],
                                                startPoint: .top, endPoint: .center
                                            ))
                                            .allowsHitTesting(false)
                                    )
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .glassBackground(15)
    }

    private func tabLabel(_ tab: DiscoverScreen.SubTab) -> String {
        switch tab {
        case .nearby:      return "Nearby"
        case .communities: return "Communities"
        case .events:      return "Events"
        }
    }
}

