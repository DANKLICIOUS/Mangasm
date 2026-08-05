import SwiftUI

// MARK: - MatchDetailScreen
// Spec §5.5 — fuller candidate profile presented as a sheet.
// Prototype ref: mangasm-match.jsx MatchDetailScreen().
//
// Backdrop: included here because .sheet() does NOT inherit the parent tab view
// backdrop — the sheet gets a system default background. Including it here ensures
// both Discover and AIMatch entry points render the same glass-over-lambo aesthetic.
//
// "Message" button: calls onMessage(); caller is responsible for routing.
// MainTabView passes { /* TODO(Task 15): route to chat */ } per brief.

public struct MatchDetailScreen: View {
    let candidate: Candidate
    let onMessage: () -> Void

    @EnvironmentObject var state: AppState
    @EnvironmentObject var env: AppEnvironment
    @Environment(\.dismiss) private var dismiss
    @State private var liked = false
    @State private var showReportReasons: Bool = false
    @State private var reportConfirmMessage: String = ""
    @State private var showReportConfirm: Bool = false
    @State private var showPhotoReportReasons: Bool = false
    @State private var showPhotoReportConfirm: Bool = false

    public init(candidate: Candidate, onMessage: @escaping () -> Void) {
        self.candidate = candidate
        self.onMessage = onMessage
    }

    public var body: some View {
        ZStack {
            // ── Backdrop ─────────────────────────────────────────────────────
            LamborghiniBackground(night: state.night)
            WeatherFX(kind: state.weather, night: state.night)

            // ── Scroll content ───────────────────────────────────────────────
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    // Navigation row: back button (leading) + overflow menu (trailing)
                    HStack {
                        Button {
                            dismiss()
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(MGColor.gold)
                                Text("Matches")
                                    .font(MGFont.serif(14, .bold))
                                    .tracking(14 * 0.06)
                                    .foregroundStyle(MGColor.gold)
                            }
                            .padding(.vertical, 7)
                            .padding(.leading, 9)
                            .padding(.trailing, 13)
                            .glassBackground(12, glow: false)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(MGColor.gold.opacity(0.33), lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)

                        Spacer()

                        // Block / Report overflow menu
                        Menu {
                            Button(role: .destructive) {
                                env.safety.block(candidate.id)
                                // Keep chat list in balance: blocked member's thread is purged.
                                env.chat.removeConversation(for: candidate.id)
                                dismiss()
                            } label: {
                                Label("Block \(candidate.name)", systemImage: "hand.raised")
                            }
                            Button {
                                showReportReasons = true
                            } label: {
                                Label("Report…", systemImage: "flag")
                            }
                        } label: {
                            Image(systemName: "ellipsis")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(MGColor.gold)
                                .frame(width: 36, height: 36)
                                .glassBackground(12, glow: false)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(MGColor.gold.opacity(0.33), lineWidth: 1)
                                )
                        }
                        .confirmationDialog(
                            "Report \(candidate.name)",
                            isPresented: $showReportReasons,
                            titleVisibility: .visible
                        ) {
                            ForEach(ReportReason.allCases, id: \.self) { reason in
                                Button(reason.label) {
                                    env.safety.report(candidate.id, reason: reason.label)
                                    reportConfirmMessage = "Thank you. Your report has been submitted."
                                    showReportConfirm = true
                                }
                            }
                            Button("Cancel", role: .cancel) {}
                        } message: {
                            Text("Select a reason for your report.")
                        }
                        .alert("Report Submitted", isPresented: $showReportConfirm) {
                            Button("OK") {}
                        } message: {
                            Text(reportConfirmMessage)
                        }
                    }

                    // ── Hero photo card ───────────────────────────────────────
                    heroCard

                    // ── Compatibility card ────────────────────────────────────
                    compatCard

                    // ── About section ─────────────────────────────────────────
                    aboutSection

                    // ── Action buttons ────────────────────────────────────────
                    actionRow

                    Spacer().frame(height: 40)
                }
                .padding(.horizontal, 14)
                .padding(.top, 56) // space below status bar / drag handle
            }
        }
        .ignoresSafeArea()
    }

    // MARK: - Hero card

    private var heroCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24)
                .fill(MGGradient.holo)
                .shadow(color: .black.opacity(0.72), radius: 30, x: 0, y: 24)

            ZStack(alignment: .bottom) {
                // Photo — 300pt tall
                AsyncImage(url: candidate.avatarURL.flatMap { URL(string: $0.replacingOccurrences(of: "w=240&h=240", with: "w=600&h=600")) }) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        Rectangle().fill(MGColor.gold.opacity(0.15))
                            .overlay(
                                Image(systemName: "person.fill")
                                    .font(.system(size: 80))
                                    .foregroundStyle(MGColor.gold.opacity(0.4))
                            )
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 300)
                .clipped()

                // Cinematic gradient overlay
                LinearGradient(
                    stops: [
                        .init(color: Color.black.opacity(0.12), location: 0),
                        .init(color: .clear, location: 0.32),
                        .init(color: .clear, location: 0.48),
                        .init(color: Color.black.opacity(0.9), location: 1),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Match % badge top-right
                VStack {
                    HStack {
                        // Report this photo (Guideline 1.2 — individual photo UGC).
                        Menu {
                            Button {
                                showPhotoReportReasons = true
                            } label: {
                                Label("Report photo…", systemImage: "flag")
                            }
                        } label: {
                            Image(systemName: "flag")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(MGColor.gold)
                                .padding(.vertical, 5)
                                .padding(.horizontal, 9)
                                .glassBackground(12, glow: false)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(MGColor.gold.opacity(0.66), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)

                        Spacer()
                        HStack(spacing: 4) {
                            Text("\(candidate.matchPct)%")
                                .font(MGFont.serif(16, .bold))
                                .foregroundStyle(MGGradient.goldHeading)
                            Text("MATCH")
                                .font(MGFont.mono(7))
                                .tracking(7 * 0.12)
                                .foregroundStyle(MGColor.inkFaint)
                        }
                        .padding(.vertical, 5)
                        .padding(.horizontal, 11)
                        .glassBackground(12, glow: false)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(MGColor.gold.opacity(0.66), lineWidth: 1)
                        )
                    }
                    Spacer()
                }
                .padding(12)
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                // Name / position / distance / astro chips bottom
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .center, spacing: 8) {
                        Text("\(candidate.name) \(candidate.age)")
                            .font(MGFont.serif(30, .bold))
                            .foregroundStyle(.white)
                            .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)

                        // Online dot
                        Circle()
                            .fill(MGColor.spotify)
                            .frame(width: 9, height: 9)
                            .shadow(color: MGColor.spotify.opacity(0.8), radius: 4)
                    }

                    HStack(spacing: 7) {
                        Chip(candidate.position, tone: .gold)
                        Chip("\(candidate.distanceLabel) away")
                        Chip(candidate.astro)
                    }
                }
                .padding(.horizontal, 15)
                .padding(.bottom, 13)
            }
            .clipShape(RoundedRectangle(cornerRadius: 23))
        }
        .confirmationDialog(
            "Report this photo",
            isPresented: $showPhotoReportReasons,
            titleVisibility: .visible
        ) {
            ForEach(ReportReason.allCases, id: \.self) { reason in
                Button(reason.label) {
                    env.safety.reportContent(
                        .photo,
                        contentID: candidate.avatarURL ?? candidate.id,
                        reportedUserID: candidate.id,
                        reason: reason.label
                    )
                    showPhotoReportConfirm = true
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Select a reason for reporting this photo.")
        }
        .alert("Report Submitted", isPresented: $showPhotoReportConfirm) {
            Button("OK") {}
        } message: {
            Text("Thank you. Your report has been submitted.")
        }
    }

    // MARK: - Compatibility card

    private var compatCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(MGGradient.holo)

            VStack(alignment: .leading, spacing: 0) {
                // Ring + tagline row
                HStack(alignment: .center, spacing: 12) {
                    // Larger ring (72pt)
                    CompatibilityRing(percent: candidate.matchPct, size: 72, label: "COMPAT")
                        .id(candidate.id + "_detail")

                    VStack(alignment: .leading, spacing: 3) {
                        Text("Cosmically aligned")
                            .font(MGFont.serif(17, .bold))
                            .foregroundStyle(MGGradient.goldHeading)
                            .shadow(color: MGColor.gold.opacity(0.30), radius: 5, x: 0, y: 1)

                        Text("Esoteric & behavioral signals point the same way — rare.")
                            .font(MGFont.sans(10, .light))
                            .foregroundStyle(MGColor.inkSoft)
                            .lineSpacing(2)
                    }
                }
                .padding(.bottom, 8)

                // Breakdown rows
                CompatRow(
                    label: "ASTROLOGY",
                    you: state.profile.astro,
                    them: candidate.astro,
                    ok: true,
                    note: candidate.notes.astro
                )
                CompatRow(
                    label: "LIFE PATH",
                    you: "\(state.profile.lifePath)",
                    them: "\(candidate.lifePath)",
                    ok: true,
                    note: candidate.notes.numerology
                )
                CompatRow(
                    label: "CHINESE ZODIAC",
                    you: state.profile.chinese,
                    them: candidate.chinese,
                    ok: true,
                    note: candidate.notes.chinese
                )
                CompatRow(
                    label: "SHARED",
                    you: state.profile.position,
                    them: candidate.position,
                    ok: true,
                    note: "Also into \(candidate.sharedInterests.joined(separator: ", "))"
                )
            }
            .padding(14)
            .glassBackground(19)
            .padding(1.2)
        }
    }

    // MARK: - About section

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("ABOUT \(candidate.name.uppercased())")
                .font(MGFont.mono(7.5))
                .tracking(7.5 * 0.16)
                .foregroundStyle(MGColor.gold)
                .padding(.bottom, 7)

            Text(candidate.bio)
                .font(MGFont.sans(11.5, .light))
                .foregroundStyle(MGColor.inkSoft.opacity(0.8))
                .lineSpacing(4)

            FlowLayout(spacing: 6, lineSpacing: 6)
                .callAsFunction {
                    ForEach(candidate.hobbies, id: \.self) { hobby in
                        Chip(hobby)
                    }
                }
                .padding(.top, 11)
        }
        .padding(14)
        .glassBackground(18)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(MGColor.ink.opacity(0.12), lineWidth: 1)
        )
    }

    // MARK: - Action buttons row

    private var actionRow: some View {
        HStack(spacing: 9) {
            // Message — gold gradient CTA
            Button {
                onMessage()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "bubble.left")
                        .font(.system(size: 16, weight: .regular))
                        .foregroundStyle(MGColor.goldText)
                    Text("Message")
                        .font(MGFont.serif(16, .bold))
                        .tracking(16 * 0.06)
                        .foregroundStyle(MGColor.goldText)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(MGGradient.goldButton, in: RoundedRectangle(cornerRadius: 14))
                .shadow(color: MGColor.gold.opacity(0.8), radius: 10, x: 0, y: 6)
            }
            .buttonStyle(.plain)

            // Thumbs-up (like) — local visual state until a real "like" service lands.
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) { liked.toggle() }
            } label: {
                Image(systemName: liked ? "hand.thumbsup.fill" : "hand.thumbsup")
                    .font(.system(size: 19, weight: .regular))
                    .foregroundStyle(liked ? MGColor.goldText : MGColor.gold)
                    .frame(width: 52, height: 52)
                    .background {
                        if liked {
                            RoundedRectangle(cornerRadius: 14).fill(MGGradient.goldButton)
                        } else {
                            Color.clear.glassBackground(14, glow: false)
                        }
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(MGColor.gold.opacity(liked ? 0 : 0.44), lineWidth: 1)
                    )
                    .shadow(color: MGColor.gold.opacity(liked ? 0.6 : 0), radius: 12)
                    .scaleEffect(liked ? 1.06 : 1)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(liked ? "Liked" : "Like")

            // Pass (X)
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .accessibilityLabel("Pass")
                    .font(.system(size: 17, weight: .regular))
                    .foregroundStyle(MGColor.inkSoft)
                    .frame(width: 52, height: 52)
                    .background(Color.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(MGColor.ink.opacity(0.16), lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - FlowLayout callAsFunction shim
// FlowLayout is a Layout (iOS 16/macOS 13 only). Use it with ViewBuilder via its
// callAsFunction pattern (standard SwiftUI Layout API).
private extension FlowLayout {
    func callAsFunction<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        AnyLayout(self).callAsFunction(content)
    }
}
