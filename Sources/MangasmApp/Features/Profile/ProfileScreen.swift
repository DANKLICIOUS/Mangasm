import SwiftUI

// MARK: - ProfileScreen
/// Main profile view — spec §5.3, top → bottom.
/// Backdrop: LamborghiniBackground + WeatherFX.
/// Scroll insets: ~150 top / 14 sides / 96 bottom (matches prototype Scroll wrapper).
struct ProfileScreen: View {
    @EnvironmentObject var state: AppState
    @EnvironmentObject var env: AppEnvironment

    private var styleId: ProfileStyleId {
        state.profileStyle.activeConfig.styleId
    }

    var body: some View {
        ZStack {
            // Hybrid: style fallback gradient + optional hero plate (+ rain for digitalFlow)
            ProfileStyleBackground(styleId: styleId)
            // Legacy Lambo plate under low opacity when style is aspirational-adjacent
            LamborghiniBackground(night: state.night)
                .opacity(styleId == .aspirational || styleId == .calmStudio ? 0.35 : 0.12)
            WeatherFX(kind: state.weather, night: state.night)
                .opacity(0.55)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 14) {
                    VouchesAIStrip(
                        vouches: state.profile.vouches,
                        aiMatch: state.profile.aiMatch
                    )

                    if state.visibility.headline, !state.profile.headline.isEmpty {
                        HeadlineView(text: state.profile.headline)
                    }

                    ProfileCard(
                        profile: state.profile,
                        visibility: state.visibility,
                        premium: state.premium,
                        canSeePhotos: env.reputation.canViewPhotos(
                            viewerScore: state.profile.repScore,
                            targetGate: 50
                        )
                    )
                }
                .padding(.top, 150)
                .padding(.horizontal, 14)
                .padding(.bottom, 96)
            }

            ProfileUnlockToastHost()
        }
        .ignoresSafeArea()
        .onAppear { state.syncProfileStyleWithReputation() }
        .onChange(of: state.profile.repScore) { _, _ in
            state.syncProfileStyleWithReputation()
        }
    }
}

// MARK: - VouchesAIStrip
/// Vouches count pill + AI match pill. Prototype: left glass pill, right gold-bordered pill.
private struct VouchesAIStrip: View {
    let vouches: Int
    let aiMatch: Double

    var body: some View {
        HStack {
            // Vouches pill
            HStack(spacing: 7) {
                // Star icon
                Image(systemName: "star.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 12, height: 12)
                    .foregroundStyle(MGColor.goldDeep)

                Text(formatted(vouches))
                    .font(MGFont.sans(11, .bold))
                    .foregroundStyle(MGColor.ink)

                Text("VOUCHES")
                    .font(MGFont.mono(7.5))
                    .tracking(7.5 * 0.10)
                    .foregroundStyle(MGColor.inkFaint)
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 11)
            .background(.ultraThinMaterial.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.7), lineWidth: 0.7)
            )

            Spacer()

            // AI Match pill
            HStack(spacing: 8) {
                Text(aiMatchString)
                    .font(MGFont.serif(21, .bold))
                    .foregroundStyle(MGGradient.goldHeading)
                    .shadow(color: MGColor.gold.opacity(0.40), radius: 5, x: 0, y: 1)
                    .shadow(color: Color.white.opacity(0.4), radius: 0.5, x: 0, y: 1)

                VStack(alignment: .leading, spacing: 0) {
                    Text("AI")
                        .font(MGFont.mono(6.5))
                        .tracking(6.5 * 0.12)
                        .foregroundStyle(MGColor.inkSoft)
                    Text("MATCH")
                        .font(MGFont.mono(6.5))
                        .tracking(6.5 * 0.12)
                        .foregroundStyle(MGColor.inkSoft)
                }
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 12)
            .background(.ultraThinMaterial.opacity(0.5), in: RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(MGColor.gold.opacity(0.4), lineWidth: 1)
            )
            .shadow(color: MGColor.gold.opacity(0.6), radius: 8, x: 0, y: 3)
        }
    }

    private var aiMatchString: String {
        // aiMatch is a Double like 98.0 — display as integer
        String(Int(aiMatch.rounded()))
    }

    private func formatted(_ n: Int) -> String {
        if n >= 1000 {
            let k = Double(n) / 1000.0
            return String(format: "%.1fk", k).replacingOccurrences(of: ".0k", with: "k")
        }
        return "\(n)"
    }
}

// MARK: - HeadlineView
/// Italic gold headline centered above the profile card. Prototype: serif italic 700/19.
private struct HeadlineView: View {
    let text: String

    var body: some View {
        Text("\u{201C}\(text)\u{201D}")
            .font(MGFont.serif(19, .bold))
            .italic()
            .foregroundStyle(MGGradient.goldHeading)
            .shadow(color: MGColor.gold.opacity(0.40), radius: 5, x: 0, y: 1)
            .shadow(color: Color.white.opacity(0.4), radius: 0.5, x: 0, y: 1)
            .multilineTextAlignment(.center)
            .padding(.top, 2)
    }
}

// MARK: - ProfileCard
/// Holo-bordered card: avatar + name/age/Seal, location, chips, bio, hobbies, INTO,
/// Socials, anthem, E2E footer, photos section.
private struct ProfileCard: View {
    let profile: Profile
    let visibility: Visibility
    let premium: Bool
    let canSeePhotos: Bool

    var body: some View {
        MGCard(radius: 26) {
            VStack(alignment: .leading, spacing: 0) {
                AvatarNameRow(profile: profile, visibility: visibility)

                // Bio
                Text(profile.bio)
                    .font(MGFont.sans(11.5, .regular))
                    .foregroundStyle(MGColor.inkSoft)
                    .lineSpacing(11.5 * 0.55)
                    .multilineTextAlignment(.leading)
                    .padding(.top, 13)

                // Bio counter
                HStack {
                    Spacer()
                    Text("\(profile.bio.count)/\(Profile.bioMax(premium: premium))\(premium ? " · M+" : "")")
                        .font(MGFont.mono(7))
                        .foregroundStyle(premium ? MGColor.goldDeep : MGColor.inkFaint)
                }
                .padding(.top, 3)

                // Hobbies
                if visibility.hobbies, !profile.hobbies.isEmpty {
                    VStack(alignment: .leading, spacing: 7) {
                        Text("HOBBIES")
                            .font(MGFont.mono(7.5))
                            .tracking(7.5 * 0.14)
                            .foregroundStyle(MGColor.inkFaint)
                        FlowChips(items: profile.hobbies, tone: .neutral)
                    }
                    .padding(.top, 11)
                }

                // INTO (double-gated: visibility + premium)
                if visibility.into, premium, !profile.into.isEmpty {
                    VStack(alignment: .leading, spacing: 7) {
                        Text("INTO")
                            .font(MGFont.mono(7.5))
                            .tracking(7.5 * 0.14)
                            .foregroundStyle(MGColor.inkFaint)
                        FlowChips(items: profile.into, tone: .gold)
                    }
                    .padding(.top, 11)
                }

                // Socials — require at least one platform to be visible AND have a non-empty handle
                // (avoids empty HStack + phantom padding when flags are on but handles are blank)
                let showIG = visibility.instagram && !profile.instagram.isEmpty
                let showX  = visibility.x && !profile.x.isEmpty
                if visibility.socials, showIG || showX {
                    HStack(spacing: 8) {
                        if showIG {
                            SocialRow(kind: .ig, handle: profile.instagram)
                        }
                        if showX {
                            SocialRow(kind: .x, handle: profile.x)
                        }
                    }
                    .padding(.top, 11)
                }

                // Anthem
                if visibility.anthem {
                    Anthem()
                }

                // E2E + Privacy-zone footer
                E2EFooter()

                // Photos section (vis.photos outer gate + reputation gate)
                if visibility.photos {
                    PhotosSection(photos: profile.photos, canView: canSeePhotos)
                }
            }
            .padding(.horizontal, 15)
            .padding(.vertical, 15)
        }
        .padding(.bottom, 4)
    }
}

// MARK: - AvatarNameRow
/// 72px avatar with gold ring + Spotify badge, name + age + Seal, location, chips.
private struct AvatarNameRow: View {
    let profile: Profile
    let visibility: Visibility

    var body: some View {
        HStack(alignment: .center, spacing: 13) {
            // Avatar
            ZStack(alignment: .bottomTrailing) {
                AsyncImage(url: URL(string: profile.avatarURL ?? "")) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable()
                            .scaledToFill()
                            .frame(width: 72, height: 72)
                            .clipShape(Circle())
                    default:
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color(red: 60/255, green: 48/255, blue: 35/255),
                                        Color(red: 40/255, green: 30/255, blue: 20/255)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 72, height: 72)
                    }
                }
                .frame(width: 72, height: 72)
                // Gold ring overlay (mask-based; approximated as Circle stroke in SwiftUI)
                .overlay(
                    Circle()
                        .strokeBorder(
                            LinearGradient(
                                colors: [MGColor.goldBright, MGColor.goldDeep],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 2.5
                        )
                        .shadow(color: MGColor.gold.opacity(0.45), radius: 7)
                )

                // Spotify badge
                Circle()
                    .fill(MGColor.spotify)
                    .frame(width: 15, height: 15)
                    .overlay(Circle().stroke(Color.white.opacity(0.9), lineWidth: 2))
                    .shadow(color: MGColor.spotify.opacity(1), radius: 4)
                    .offset(x: -2, y: -2)
            }
            .frame(width: 72, height: 72)

            // Name / age / seal / location / chips
            VStack(alignment: .leading, spacing: 0) {
                // Name + age + Seal
                HStack(alignment: .center, spacing: 4) {
                    Text("\(profile.name) \(profile.age)")
                        .font(MGFont.serif(27, .bold))
                        .foregroundStyle(MGColor.ink)
                        .lineLimit(1)
                    Seal(size: 17)
                }

                // Location
                Text(profile.location)
                    .font(MGFont.sans(10.5, .regular))
                    .foregroundStyle(MGColor.inkSoft)
                    .padding(.top, 2)

                // Chips row
                HStack(spacing: 6) {
                    if visibility.position {
                        Chip(profile.position, tone: .gold)
                    }
                    Chip("Elite", tone: .gold)
                    Chip("4.2k MGC")
                }
                .padding(.top, 8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - FlowChips
/// Wrapping chip layout backed by the reusable `FlowLayout` from the design system.
/// Chips flow left-to-right and wrap to the next line based on actual measured widths —
/// no fixed row count, handles labels of any length correctly.
private struct FlowChips: View {
    let items: [String]
    let tone: Chip.Tone

    var body: some View {
        FlowLayout(spacing: 6, lineSpacing: 7) {
            ForEach(items, id: \.self) { item in
                Chip(item, tone: tone)
            }
        }
    }
}

// MARK: - E2EFooter
/// Transport-encryption + privacy zone footer row. Lock icon + mono labels.
/// Label is "Encrypted in transit" — NOT end-to-end yet. Switch to "End-to-End
/// Encrypted" only once real E2E (X25519/CryptoKit) ships, per roadmap Decision B.
private struct E2EFooter: View {
    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: "lock.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 12, height: 12)
                .foregroundStyle(MGColor.goldDeep)

            Text("Encrypted in Transit")
                .font(MGFont.mono(8))
                .foregroundStyle(MGColor.inkSoft)

            Circle()
                .fill(MGColor.inkFaint)
                .frame(width: 3, height: 3)

            Text("Privacy Zones Active")
                .font(MGFont.mono(8))
                .foregroundStyle(MGColor.goldDeep)
        }
        .padding(.top, 12)
    }
}

// MARK: - PhotosSection
/// Reputation-gated photos grid. Shows circular thumb grid if canView, else locked placeholder.
private struct PhotosSection: View {
    let photos: [String]
    let canView: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack {
                Text("PHOTOS")
                    .font(MGFont.serif(15, .bold))
                    .tracking(15 * 0.18)
                    .foregroundStyle(MGColor.ink)
                Spacer()
                Text("reputation-gated")
                    .font(MGFont.mono(7.5))
                    .foregroundStyle(MGColor.inkFaint)
            }
            .padding(.top, 14)

            if canView {
                HStack(spacing: 12) {
                    ForEach(photos.prefix(3), id: \.self) { urlString in
                        PhotoThumb(urlString: urlString)
                    }
                    // Add button
                    AddPhotoButton()
                }
            } else {
                LockedPhotosPlaceholder()
            }
        }
    }
}

// MARK: - PhotoThumb
/// Circular photo thumbnail with gold ring. Uses AsyncImage; placeholder = dark gradient circle.
private struct PhotoThumb: View {
    let urlString: String

    var body: some View {
        ZStack {
            AsyncImage(url: URL(string: urlString)) { phase in
                switch phase {
                case .success(let img):
                    img.resizable()
                        .scaledToFill()
                        .frame(width: 58, height: 58)
                        .clipShape(Circle())
                default:
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 50/255, green: 40/255, blue: 28/255),
                                    Color(red: 30/255, green: 22/255, blue: 14/255)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 58, height: 58)
                }
            }
            .frame(width: 58, height: 58)
            .overlay(
                Circle()
                    .strokeBorder(
                        LinearGradient(
                            colors: [MGColor.gold, MGColor.goldDeep],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 2
                    )
            )
        }
        .frame(width: 58, height: 58)
    }
}

// MARK: - AddPhotoButton
/// Gold-dashed circle with plus icon. Prototype: dashed border, 8% gold bg.
private struct AddPhotoButton: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(MGColor.gold.opacity(0.08))
                .frame(width: 58, height: 58)
                .overlay(
                    Circle()
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
                        .foregroundStyle(MGColor.gold.opacity(0.5))
                )
            Image(systemName: "plus.circle")
                .resizable()
                .scaledToFit()
                .frame(width: 17, height: 17)
                .foregroundStyle(MGColor.goldDeep)
        }
        .frame(width: 58, height: 58)
    }
}

// MARK: - LockedPhotosPlaceholder
/// Blurred/locked state shown when reputation gate is not met.
private struct LockedPhotosPlaceholder: View {
    var body: some View {
        HStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { _ in
                ZStack {
                    Circle()
                        .fill(MGColor.ink.opacity(0.15))
                        .frame(width: 58, height: 58)
                        .overlay(
                            Circle()
                                .strokeBorder(MGColor.gold.opacity(0.2), lineWidth: 1)
                        )
                    Image(systemName: "lock.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 18, height: 18)
                        .foregroundStyle(MGColor.inkFaint)
                }
                .frame(width: 58, height: 58)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("Reputation locked")
                    .font(MGFont.mono(8))
                    .foregroundStyle(MGColor.inkSoft)
                Text("Score 50+ to unlock")
                    .font(MGFont.mono(7))
                    .foregroundStyle(MGColor.inkFaint)
            }
            Spacer()
        }
        .padding(.vertical, 6)
    }
}
