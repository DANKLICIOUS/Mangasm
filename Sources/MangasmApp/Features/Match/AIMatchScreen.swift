import SwiftUI

// MARK: - AIMatchScreen
// Spec §5.5 — AI Matchmaking screen.
// Prototype ref: mangasm-match.jsx AIMatchScreen().
//
// Refresh mechanism: local `tick` drives body re-evaluation after env.matches.refresh()
// because MockMatchService.refresh() is not @Published (services are `let` in AppEnvironment).
// Tap "Request 3 new suggestions" → refresh() + tick++ → body re-runs → new featured/trio.
//
// Detail presentation: all card taps set state.selectedMatch — the .sheet lives in MainTabView.
//
// Venue icon approximation: Venue.iconPath is an SVG d-string; SF Symbols substituted
// (fork.knife → Dinner; sunrise → Sunrise). Documented below.

struct AIMatchScreen: View {
    @EnvironmentObject var state: AppState
    @EnvironmentObject var env: AppEnvironment

    // Local tick forces body re-evaluation after each refresh() call
    @State private var tick: Int = 0

    private var featured: Candidate {
        env.matches.featured()
    }

    private var trio: [Candidate] {
        Array(env.matches.nearby().prefix(3))
    }

    var body: some View {
        ZStack {
            // ── Backdrop ─────────────────────────────────────────────────────
            LamborghiniBackground(night: state.night)
            WeatherFX(kind: state.weather, night: state.night)

            // ── Scroll content ───────────────────────────────────────────────
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    // Top padding for TopBar overlap
                    Spacer().frame(height: 150)

                    // ── Header ────────────────────────────────────────────────
                    headerSection

                    // ── Featured match card ───────────────────────────────────
                    featuredCard

                    // ── Refresh button ────────────────────────────────────────
                    refreshButton

                    // ── Trio grid ─────────────────────────────────────────────
                    trioGrid

                    // ── DateNight discovery (Yelp + Ticketmaster, dual 10-mi, deep-link) ──
                    DateNightSection(
                        matchName: featured.name,
                        matchCoordinate: featured.geoCoordinate,
                        onMessage: {
                            let convo = env.chat.conversation(
                                for: featured.id,
                                name: featured.name,
                                avatarURL: featured.avatarURL
                            )
                            state.activeChat = convo
                        }
                    )

                    // Bottom padding for tab bar
                    Spacer().frame(height: 96)
                }
                .padding(.horizontal, 14)
            }
        }
        .ignoresSafeArea()
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 10) {
            HStack(spacing: 7) {
                Image(systemName: "lightbulb")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 18, height: 18)
                    .foregroundStyle(MGColor.gold)

                Text("AI MATCHMAKING")
                    .font(MGFont.serif(22, .bold))
                    .foregroundStyle(MGGradient.goldHeading)
                    .shadow(color: MGColor.gold.opacity(0.30), radius: 5, x: 0, y: 1)
            }

            Text("Our engine blends your profile, who you browse, and esoteric compatibility to find the few who truly fit.")
                .font(MGFont.sans(10.5, .light))
                .foregroundStyle(MGColor.inkSoft)
                .multilineTextAlignment(.center)
                .lineSpacing(3)
                .frame(maxWidth: 280)

            // Factor chips — scrollable row
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 5) {
                    ForEach(
                        ["Your data", "Browsing", "Astrology", "Numerology", "Chinese zodiac"],
                        id: \.self
                    ) { label in
                        Chip(label, tone: .gold)
                    }
                }
                .padding(.horizontal, 2)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Featured card

    private var featuredCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 22)
                .fill(MGGradient.holo)
                .shadow(color: .black.opacity(0.72), radius: 27, x: 0, y: 22)

            VStack(alignment: .leading, spacing: 0) {
                // TODAY'S TOP MATCH label
                Text("TODAY'S TOP MATCH")
                    .font(MGFont.mono(7.5))
                    .tracking(7.5 * 0.18)
                    .foregroundStyle(MGColor.gold)
                    .padding(.bottom, 10)

                // Photo + name/dist + ring row
                HStack(alignment: .center, spacing: 12) {
                    // Avatar
                    CandidateAvatar(url: featured.avatarURL, size: 64, ring: true)

                    // Name / distance / shared chips
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(featured.name) \(featured.age)")
                            .font(MGFont.serif(22, .bold))
                            .foregroundStyle(MGColor.ink)

                        Text("\(featured.distanceLabel) away · \(featured.position)")
                            .font(MGFont.sans(10, .light))
                            .foregroundStyle(MGColor.inkSoft)

                        // Shared interest chips
                        HStack(spacing: 5) {
                            ForEach(featured.sharedInterests, id: \.self) { s in
                                Chip(s)
                            }
                        }
                    }

                    Spacer(minLength: 0)

                    // Compatibility ring — key on featured.id so it re-animates on refresh
                    CompatibilityRing(percent: featured.matchPct, size: 64)
                        .id(featured.id + "\(tick)")
                }

                // Compat breakdown rows
                VStack(spacing: 0) {
                    CompatRow(
                        label: "ASTROLOGY",
                        you: state.profile.astro,
                        them: featured.astro,
                        ok: true,
                        note: featured.notes.astro
                    )
                    CompatRow(
                        label: "LIFE PATH",
                        you: "\(state.profile.lifePath)",
                        them: "\(featured.lifePath)",
                        ok: true,
                        note: featured.notes.numerology
                    )
                    CompatRow(
                        label: "CHINESE ZODIAC",
                        you: state.profile.chinese,
                        them: featured.chinese,
                        ok: true,
                        note: featured.notes.chinese
                    )
                }
                .padding(.top, 10)

                // VIEW FULL PROFILE →
                Button {
                    state.selectedMatch = featured
                } label: {
                    HStack(spacing: 5) {
                        Spacer()
                        Text("VIEW FULL PROFILE")
                            .font(MGFont.mono(8))
                            .tracking(8 * 0.12)
                            .foregroundStyle(MGColor.gold)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(MGColor.gold)
                    }
                }
                .buttonStyle(.plain)
                .padding(.top, 11)
            }
            .padding(14)
            .glassBackground(21)
            .padding(1.3)
        }
        // Make the whole card tappable to open detail
        .contentShape(Rectangle())
        .onTapGesture {
            state.selectedMatch = featured
        }
    }

    // MARK: - Refresh button

    private var refreshButton: some View {
        Button {
            env.matches.refresh()
            tick += 1
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(MGColor.gold)
                Text("Request 3 new suggestions")
                    .font(MGFont.serif(15, .bold))
                    .tracking(15 * 0.08)
                    .foregroundStyle(MGGradient.goldHeading)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .glassBackground(14, glow: true)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(MGColor.gold.opacity(0.55), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .shadow(color: MGColor.gold.opacity(0.6), radius: 9, x: 0, y: 0)
    }

    // MARK: - Trio grid

    private var trioGrid: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: 9),
                GridItem(.flexible(), spacing: 9),
                GridItem(.flexible(), spacing: 9),
            ],
            spacing: 9
        ) {
            ForEach(trio) { candidate in
                TrioCard(candidate: candidate) {
                    state.selectedMatch = candidate
                }
            }
        }
    }
}

// MARK: - TrioCard

/// Small grid card for the 3-candidate trio below the featured card.
/// Prototype: 84px tall image + gradient fade + name/match% overlay.
private struct TrioCard: View {
    let candidate: Candidate
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .bottomLeading) {
                // Photo
                TrioPhotoCell(url: candidate.avatarURL, height: 84)

                // Gradient fade
                LinearGradient(
                    colors: [.clear, Color.black.opacity(0.85)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Name + match %
                VStack(alignment: .leading, spacing: 1) {
                    Text(candidate.name)
                        .font(MGFont.serif(13, .bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text("\(candidate.matchPct)% · \(candidate.position)")
                        .font(MGFont.mono(6.5))
                        .foregroundStyle(MGColor.gold)
                }
                .padding(.leading, 6)
                .padding(.bottom, 5)
            }
            .frame(height: 84)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(MGColor.ink.opacity(0.12), lineWidth: 1)
            )
            .glassBackground(14)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - VenueCard

/// RSVP venue card with idle / requested / declined states.
/// Prototype: VenueCard() in mangasm-match.jsx.
/// Icon approximation: Venue.iconPath is an SVG d-string; SF Symbols substituted:
///   "Dinner" kind → "fork.knife"
///   "Sunrise" kind → "sunrise"
///   All others → "mappin.circle"
struct VenueCard: View {
    let venue: Venue
    let matchName: String
    let onMessage: () -> Void

    enum VenueState { case idle, requested, declined }
    @State private var cardState: VenueState = .idle

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
            RoundedRectangle(cornerRadius: 16)
                .stroke(MGColor.gold.opacity(0.20), lineWidth: 1)

            VStack(spacing: 0) {
                // Info row
                HStack(alignment: .center, spacing: 11) {
                    // Icon badge
                    ZStack {
                        RoundedRectangle(cornerRadius: 11)
                            .fill(MGColor.gold.opacity(0.12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 11)
                                    .stroke(MGColor.gold.opacity(0.44), lineWidth: 1)
                            )
                            .frame(width: 38, height: 38)
                        Image(systemName: venueIcon)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 19, height: 19)
                            .foregroundStyle(MGColor.gold)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(venue.kind.uppercased()) · RSVP DATE")
                            .font(MGFont.mono(7))
                            .tracking(7 * 0.16)
                            .foregroundStyle(MGColor.gold)
                        Text(venue.name)
                            .font(MGFont.serif(15, .bold))
                            .foregroundStyle(MGColor.ink)
                            .lineLimit(1)
                        Text(venue.subtitle)
                            .font(MGFont.sans(9.5, .light))
                            .foregroundStyle(MGColor.inkSoft)
                    }

                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .padding(.top, 11)
                .padding(.bottom, cardState == .idle ? 0 : 11)

                // Action area
                switch cardState {
                case .idle:
                    // RSVP / Message / Decline buttons
                    HStack(spacing: 7) {
                        Button {
                            cardState = .requested
                        } label: {
                            Text("RSVP")
                                .font(MGFont.serif(13, .bold))
                                .tracking(13 * 0.08)
                                .foregroundStyle(MGColor.goldText)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(MGGradient.goldButton, in: RoundedRectangle(cornerRadius: 10))
                                .shadow(color: MGColor.gold.opacity(0.7), radius: 7, x: 0, y: 4)
                        }
                        .buttonStyle(.plain)

                        Button {
                            onMessage()
                        } label: {
                            Text("Message")
                                .font(MGFont.sans(10, .semibold))
                                .foregroundStyle(MGColor.ink)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 12)
                                .glassBackground(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(MGColor.ink.opacity(0.16), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)

                        Button {
                            cardState = .declined
                        } label: {
                            Text("Decline")
                                .font(MGFont.sans(10, .semibold))
                                .foregroundStyle(MGColor.inkFaint)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 11)
                                .background(Color.clear)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(Color.white.opacity(0.14), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 11)
                    .padding(.top, 0)

                case .requested:
                    HStack(spacing: 7) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(MGColor.spotify)
                        Text("Reservation requested · awaiting \(matchName)")
                            .font(MGFont.sans(10, .semibold))
                            .foregroundStyle(MGColor.ink)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(MGColor.spotify.opacity(0.12))
                    .overlay(alignment: .top) {
                        Rectangle()
                            .fill(MGColor.spotify.opacity(0.20))
                            .frame(height: 1)
                    }

                case .declined:
                    Text("Declined — we'll suggest another spot.")
                        .font(MGFont.sans(10, .regular))
                        .foregroundStyle(MGColor.inkSoft)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 9)
                        .overlay(alignment: .top) {
                            Rectangle()
                                .fill(MGColor.ink.opacity(0.09))
                                .frame(height: 1)
                        }
                }
            }
        }
        .opacity(cardState == .declined ? 0.45 : 1)
        .animation(.easeInOut(duration: 0.2), value: cardState == .declined)
    }

    private var venueIcon: String {
        switch venue.kind.lowercased() {
        case "dinner":  return "fork.knife"
        case "sunrise": return "sunrise"
        default:        return "mappin.circle"
        }
    }
}

// MARK: - CandidateAvatar

/// Circular avatar with gold ring option, graceful placeholder.
/// Approximation: SVG d-string path icons are not feasible; SF Symbols substituted.
private struct CandidateAvatar: View {
    let url: String?
    let size: CGFloat
    let ring: Bool

    var body: some View {
        AsyncImage(url: url.flatMap { URL(string: $0) }) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(Circle())
            default:
                Circle()
                    .fill(MGColor.gold.opacity(0.15))
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.system(size: size * 0.4))
                            .foregroundStyle(MGColor.gold.opacity(0.5))
                    )
                    .frame(width: size, height: size)
            }
        }
        .frame(width: size, height: size)
        .overlay(
            Circle()
                .stroke(ring ? MGColor.gold : Color.clear, lineWidth: 2)
                .shadow(color: ring ? MGColor.gold.opacity(0.5) : .clear, radius: 7)
        )
    }
}

// MARK: - TrioPhotoCell
/// Fills available width for the trio card photo, with fade/overlay laid on top.
private struct TrioPhotoCell: View {
    let url: String?
    let height: CGFloat

    var body: some View {
        AsyncImage(url: url.flatMap { URL(string: $0) }) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: height)
                    .clipped()
            default:
                Rectangle()
                    .fill(MGColor.gold.opacity(0.15))
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.system(size: height * 0.4))
                            .foregroundStyle(MGColor.gold.opacity(0.5))
                    )
                    .frame(maxWidth: .infinity)
                    .frame(height: height)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
    }
}
