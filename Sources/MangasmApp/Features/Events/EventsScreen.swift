import SwiftUI

// MARK: - EventsScreen
// Top-level tab root for Events (promoted from a Discover sub-tab as part of the
// App Store Guideline 4.3 remediation — Events is the app's real differentiator and
// is now the first tab + default landing screen).
//
// Mirrors DiscoverScreen's shell: Lamborghini backdrop + weather FX + scroll content,
// with the same top/horizontal/bottom insets so it sits correctly beneath the shared
// TopBar overlay and above the GlassTabBar.
//
// Lands users on populated, hosted community activity: a segmented Events / Communities
// control (defaulting to Events, which carries the host CTA + live event list), reusing
// the existing EventsView and CommunitiesView unchanged so all host-approval and
// sub-view behaviour is preserved.

struct EventsScreen: View {
    @EnvironmentObject var state: AppState
    @EnvironmentObject var env: AppEnvironment

    enum Section: String, CaseIterable { case events, communities }

    @State private var section: Section = .events

    var body: some View {
        ZStack {
            // ── Backdrop ────────────────────────────────────────────────────
            LamborghiniBackground(night: state.night)
            WeatherFX(kind: state.weather, night: state.night)

            // ── Scroll content ──────────────────────────────────────────────
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    EventsSectionControl(selected: $section)
                        .padding(.bottom, 14)

                    switch section {
                    case .events:
                        EventsView(premium: state.premium)
                    case .communities:
                        CommunitiesView()
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

// MARK: - EventsSectionControl
// Two-option segmented pill control: Events / Communities.
// Matches DiscoverTabsControl styling (glass container pad 4, r15; active gold pill r11).
private struct EventsSectionControl: View {
    @Binding var selected: EventsScreen.Section

    var body: some View {
        HStack(spacing: 4) {
            ForEach(EventsScreen.Section.allCases, id: \.self) { section in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { selected = section }
                } label: {
                    Text(label(section))
                        .font(MGFont.serif(12, .bold))
                        .tracking(12 * 0.05)
                        .foregroundStyle(
                            selected == section
                                ? AnyShapeStyle(MGColor.goldText)
                                : AnyShapeStyle(MGColor.inkSoft)
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 4)
                        .background {
                            if selected == section {
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

    private func label(_ section: EventsScreen.Section) -> String {
        switch section {
        case .events:      return "Events"
        case .communities: return "Communities"
        }
    }
}
