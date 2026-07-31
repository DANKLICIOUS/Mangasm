import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

// MARK: - SettingsScreen
// Prototype ref: mangasm-screens.jsx Field + Switch components, §5.8 Settings spec.
// Presents as a sheet from MainTabView. Binds directly to AppState.profile
// and AppState.visibility. Demo section toggles night/premium and changes weather.

public struct SettingsScreen: View {
    let onClose: () -> Void

    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var env: AppEnvironment
    @EnvironmentObject private var store: StoreKitStore

    // Local string bindings for non-String profile fields
    @State private var ageText: String = ""
    @State private var hobbiesText: String = ""
    @State private var showDeleteConfirm: Bool = false

    public init(onClose: @escaping () -> Void) {
        self.onClose = onClose
    }

    public var body: some View {
        ZStack {
            // Dark glass backdrop consistent with the app
            Color(red: 14/255, green: 10/255, blue: 6/255)
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {

                    // ── Header ──
                    HStack {
                        Text("Settings")
                            .font(MGFont.serif(26, .bold))
                            .foregroundStyle(MGGradient.goldHeading)
                            .shadow(color: MGColor.gold.opacity(0.30), radius: 5, x: 0, y: 1)

                        Spacer()

                        // Done / close button
                        Button(action: onClose) {
                            Image(systemName: "xmark")
                                .resizable()
                                .scaledToFit()
                                .accessibilityLabel("Close")
                                .frame(width: 13, height: 13)
                                .foregroundStyle(MGColor.goldDeep)
                                .frame(width: 44, height: 44)   // ≥44pt min touch target (a11y)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(MGColor.gold.opacity(0.33), lineWidth: 0.7)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 24)
                    .padding(.bottom, 16)

                    // ── Profile Fields ──
                    SectionLabel("Profile")
                        .padding(.horizontal, 16)

                    MGCard {
                        VStack(spacing: 0) {
                            SettingsField(
                                label: "NAME",
                                text: $state.profile.name
                            )
                            Divider().opacity(0.2).padding(.horizontal, 13)

                            SettingsField(
                                label: "AGE",
                                text: $ageText,
                                hint: "Your age in years"
                            )
                            .onChange(of: ageText) { _, newVal in
                                if let parsed = parseAge(newVal) {
                                    state.profile.age = parsed
                                }
                            }
                            Divider().opacity(0.2).padding(.horizontal, 13)

                            SettingsField(
                                label: "LOCATION",
                                text: $state.profile.location,
                                hint: "City or city → city"
                            )
                            Divider().opacity(0.2).padding(.horizontal, 13)

                            SettingsField(
                                label: "HEADLINE",
                                text: $state.profile.headline,
                                max: 80
                            )
                            Divider().opacity(0.2).padding(.horizontal, 13)

                            SettingsField(
                                label: "BIO",
                                text: $state.profile.bio,
                                max: Profile.bioMax(premium: state.premium),
                                hint: state.premium ? "M+ · up to 600 chars" : "Up to 300 chars · upgrade for 600"
                            )
                            Divider().opacity(0.2).padding(.horizontal, 13)

                            SettingsField(
                                label: "INSTAGRAM",
                                text: $state.profile.instagram,
                                sanitize: { $0.replacingOccurrences(of: "@", with: "") },
                                hint: "Handle without @"
                            )
                            Divider().opacity(0.2).padding(.horizontal, 13)

                            SettingsField(
                                label: "X / TWITTER",
                                text: $state.profile.x,
                                sanitize: { $0.replacingOccurrences(of: "@", with: "") },
                                hint: "Handle without @"
                            )
                            Divider().opacity(0.2).padding(.horizontal, 13)

                            SettingsField(
                                label: "HOBBIES",
                                text: $hobbiesText,
                                hint: "Comma-separated, e.g. Sailing, Mixology"
                            )
                            .onChange(of: hobbiesText) { _, newVal in
                                state.profile.hobbies = parseHobbies(newVal)
                            }
                            Divider().opacity(0.2).padding(.horizontal, 13)

                            SettingsField(
                                label: "POSITION",
                                text: $state.profile.position,
                                hint: "Top · Vers · Bottom"
                            )
                        }
                    }
                    .padding(.horizontal, 14)

                    // ── Visibility Toggles ──
                    SectionLabel("Visibility")
                        .padding(.horizontal, 16)
                        .padding(.top, 20)

                    MGCard {
                        VStack(spacing: 0) {
                            VisibilityToggleRow(label: "Headline",  isOn: $state.visibility.headline)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            VisibilityToggleRow(label: "Hobbies",   isOn: $state.visibility.hobbies)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            VisibilityToggleRow(label: "Position",  isOn: $state.visibility.position)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            // "Into" (fetishes) is gated behind premium
                            VisibilityToggleRow(
                                label: "Into",
                                isOn: $state.visibility.into,
                                locked: !state.premium,
                                lockedHint: "M+ required"
                            )
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            VisibilityToggleRow(label: "Socials",   isOn: $state.visibility.socials)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            VisibilityToggleRow(label: "Instagram", isOn: $state.visibility.instagram)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            VisibilityToggleRow(label: "X / Twitter", isOn: $state.visibility.x)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            VisibilityToggleRow(label: "Anthem",    isOn: $state.visibility.anthem)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            VisibilityToggleRow(label: "Photos",    isOn: $state.visibility.photos)
                        }
                    }
                    .padding(.horizontal, 14)

                    // ── Subscription Section ──
                    SectionLabel("Subscription")
                        .padding(.horizontal, 16)
                        .padding(.top, 20)

                    MGCard {
                        VStack(spacing: 0) {
                            // Restore Purchases / Manage Subscription
                            Button {
                                Task { await store.restore() }
                            } label: {
                                HStack {
                                    Text("Restore Purchases")
                                        .font(MGFont.sans(14, .semibold))
                                        .foregroundStyle(MGColor.inkSoft)
                                    Spacer()
                                    Image(systemName: "arrow.clockwise")
                                        .font(.system(size: 15, weight: .regular))
                                        .foregroundStyle(MGColor.goldDeep)
                                }
                                .padding(.vertical, 13)
                                .padding(.horizontal, 13)
                            }
                            .buttonStyle(.plain)

                            Divider().opacity(0.2).padding(.horizontal, 13)

                            // Manage subscription in System Settings
                            Button {
                                #if os(iOS)
                                if let url = URL(string: "itms-apps://apps.apple.com/account/subscriptions") {
                                    UIApplication.shared.open(url)
                                }
                                #endif
                            } label: {
                                HStack {
                                    Text("Manage Subscription")
                                        .font(MGFont.sans(14, .semibold))
                                        .foregroundStyle(MGColor.inkSoft)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 13, weight: .regular))
                                        .foregroundStyle(MGColor.inkFaint)
                                }
                                .padding(.vertical, 13)
                                .padding(.horizontal, 13)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 14)

                    // ── Referral Team ──
                    if !state.profile.referralCode.isEmpty {
                        SectionLabel("Referral Team")
                            .padding(.horizontal, 16)
                            .padding(.top, 20)

                        MGCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("YOUR CODE")
                                    .font(MGFont.mono(8.5))
                                    .tracking(8.5 * 0.1)
                                    .foregroundStyle(MGColor.inkFaint)

                                Text(state.profile.referralCode)
                                    .font(MGFont.serif(28, .bold))
                                    .foregroundStyle(MGGradient.goldHeading)

                                Text("\(state.profile.referralCount) successful invites · 5 = 1 free M+ month")
                                    .font(MGFont.mono(8))
                                    .foregroundStyle(MGColor.inkFaint)

                                if let shareURL = ReferralCode.promoURL(for: state.profile.referralCode) {
                                    ShareLink(item: shareURL, subject: Text("Join Mangasm Referral Team")) {
                                        HStack {
                                            Text("Share invite link")
                                                .font(MGFont.sans(14, .semibold))
                                                .foregroundStyle(MGColor.inkSoft)
                                            Spacer()
                                            Image(systemName: "square.and.arrow.up")
                                                .foregroundStyle(MGColor.goldDeep)
                                        }
                                        .padding(.vertical, 10)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(13)
                        }
                        .padding(.horizontal, 14)
                    }

                    // ── Demo / Preview Section ──
                    SectionLabel("Preview")
                        .padding(.horizontal, 16)
                        .padding(.top, 20)

                    MGCard {
                        VStack(spacing: 0) {
                            VisibilityToggleRow(label: "Night mode", isOn: $state.night)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            #if DEBUG
                            // (debug) bypasses StoreKit for simulator/preview testing only —
                            // compiled out of release builds so it can never unlock M+ in production.
                            VisibilityToggleRow(label: "(debug) M+ Premium", isOn: $state.premium)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            #endif

                            // Weather — now resolved automatically from your location
                            // (WeatherKit). Read-only readout; no longer a manual picker.
                            VStack(alignment: .leading, spacing: 9) {
                                Text("WEATHER")
                                    .font(MGFont.mono(8.5))
                                    .tracking(8.5 * 0.1)
                                    .foregroundStyle(MGColor.inkFaint)
                                CurrentWeatherReadout(weather: state.weather)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 13)
                            .padding(.horizontal, 13)
                        }
                    }
                    .padding(.horizontal, 14)

                    // ── Legal & Support ──
                    SectionLabel("Legal")
                        .padding(.horizontal, 16)
                        .padding(.top, 20)

                    MGCard {
                        VStack(spacing: 0) {
                            SettingsLinkRow(title: "Privacy Policy", url: LegalURLs.privacy)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            SettingsLinkRow(title: "Community Guidelines", url: LegalURLs.terms)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            SettingsLinkRow(title: "Moderation Policy", url: LegalURLs.moderation)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            SettingsLinkRow(title: "Support", url: LegalURLs.support)
                            Divider().opacity(0.2).padding(.horizontal, 13)
                            SettingsLinkRow(title: LegalURLs.aiLabel, url: LegalURLs.ai)
                        }
                    }
                    .padding(.horizontal, 14)

                    // ── Account Actions ──
                    SectionLabel("Account")
                        .padding(.horizontal, 16)
                        .padding(.top, 20)

                    MGCard {
                        VStack(spacing: 0) {
                            // Sign Out
                            Button {
                                onClose()
                                state.phase = .launch
                            } label: {
                                HStack {
                                    Text("Sign Out")
                                        .font(MGFont.sans(14, .semibold))
                                        .foregroundStyle(MGColor.inkSoft)
                                    Spacer()
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                        .font(.system(size: 15, weight: .regular))
                                        .foregroundStyle(MGColor.inkSoft)
                                }
                                .padding(.vertical, 13)
                                .padding(.horizontal, 13)
                            }
                            .buttonStyle(.plain)

                            Divider().opacity(0.2).padding(.horizontal, 13)

                            // Delete Account — destructive
                            Button {
                                showDeleteConfirm = true
                            } label: {
                                HStack {
                                    Text("Delete Account")
                                        .font(MGFont.sans(14, .semibold))
                                        .foregroundStyle(Color(red: 192/255, green: 57/255, blue: 43/255))
                                    Spacer()
                                    Image(systemName: "trash")
                                        .font(.system(size: 15, weight: .regular))
                                        .foregroundStyle(Color(red: 192/255, green: 57/255, blue: 43/255))
                                }
                                .padding(.vertical, 13)
                                .padding(.horizontal, 13)
                            }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("delete_account_row")
                            // Distinct label so the destructive dialog button ("Delete
                            // Account") is unambiguous in UI tests.
                            .accessibilityLabel("Open delete account confirmation")
                            .confirmationDialog(
                                "Delete Account",
                                isPresented: $showDeleteConfirm,
                                titleVisibility: .visible
                            ) {
                                Button("Delete Account", role: .destructive) {
                                    Task { @MainActor in
                                        try? await env.auth.deleteAccount()
                                        onClose()
                                        state.resetForSignOut()
                                    }
                                }
                                Button("Cancel", role: .cancel) {}
                            } message: {
                                Text("This permanently deletes your account and data. This cannot be undone.")
                            }
                        }
                    }
                    .padding(.horizontal, 14)

                    // Bottom padding so last card clears the nav area
                    Spacer(minLength: 48)
                }
            }
        }
        .onAppear {
            ageText = "\(state.profile.age)"
            hobbiesText = state.profile.hobbies.joined(separator: ", ")
        }
    }
}

// MARK: - SettingsField
// Reusable row: mono label (top-left) + optional char counter (top-right) +
// TextField (glass) + optional hint line.
// sanitize: optional closure run on every keystroke to clean the value.

private struct SettingsField: View {
    let label: String
    @Binding var text: String
    var max: Int? = nil
    var sanitize: ((String) -> String)? = nil
    var hint: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Label row + optional counter
            HStack(alignment: .lastTextBaseline) {
                Text(label)
                    .font(MGFont.mono(8.5))
                    .tracking(8.5 * 0.1)
                    .foregroundStyle(MGColor.inkFaint)

                Spacer()

                if let max {
                    let count = text.count
                    let overLimit = count > max
                    Text("\(count)/\(max)")
                        .font(MGFont.mono(8))
                        .foregroundStyle(overLimit
                            ? Color(red: 192/255, green: 57/255, blue: 43/255)
                            : MGColor.inkFaint)
                        .animation(.easeInOut(duration: 0.15), value: overLimit)
                }
            }

            // TextField with glass styling
            TextField("", text: Binding(
                get: { text },
                set: { newVal in
                    text = sanitize?(newVal) ?? newVal
                }
            ))
            .font(MGFont.sans(13, .semibold))
            .foregroundStyle(MGColor.ink)
            .padding(.vertical, 8)
            .padding(.horizontal, 10)
            .background(Color.white.opacity(0.55), in: RoundedRectangle(cornerRadius: 9))
            .overlay(
                RoundedRectangle(cornerRadius: 9)
                    .stroke(MGColor.gold.opacity(0.33), lineWidth: 1)
            )
            .padding(.top, 6)

            // Optional hint line
            if let hint {
                Text(hint)
                    .font(MGFont.mono(7.5))
                    .foregroundStyle(MGColor.inkFaint)
                    .padding(.top, 4)
            }
        }
        .padding(.vertical, 11)
        .padding(.horizontal, 13)
    }
}

// MARK: - VisibilityToggleRow
// Label (left) + optional locked-hint + MGSwitch (right).
// When locked: switch is dimmed (MGSwitch handles opacity=0.55) and non-interactive.
// When lockedHint is provided, it appears as a small annotation next to the label.

private struct VisibilityToggleRow: View {
    let label: String
    @Binding var isOn: Bool
    var locked: Bool = false
    var lockedHint: String? = nil

    var body: some View {
        HStack {
            Text(label)
                .font(MGFont.sans(13, .semibold))
                .foregroundStyle(locked ? MGColor.inkFaint : MGColor.inkSoft)

            if locked, let hint = lockedHint {
                Text(hint)
                    .font(MGFont.mono(7.5))
                    .foregroundStyle(MGColor.gold.opacity(0.6))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(MGColor.gold.opacity(0.1), in: RoundedRectangle(cornerRadius: 5))
            }

            Spacer()

            MGSwitch(isOn: $isOn, locked: locked)
        }
        .padding(.vertical, 13)
        .padding(.horizontal, 13)
    }
}

// MARK: - SettingsLinkRow

private struct SettingsLinkRow: View {
    let title: String
    let url: String

    var body: some View {
        if let destination = URL(string: url) {
            Link(destination: destination) {
                HStack {
                    Text(title)
                        .font(MGFont.sans(14, .semibold))
                        .foregroundStyle(MGColor.inkSoft)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(MGColor.inkFaint)
                }
                .padding(.vertical, 13)
                .padding(.horizontal, 13)
            }
        }
    }
}

// MARK: - Helpers

/// Parses an age string to a valid Int (accepts 1–129; returns nil otherwise).
/// Pure function — testable without view state.
func parseAge(_ text: String) -> Int? {
    guard let val = Int(text.trimmingCharacters(in: .whitespaces)), val > 0, val < 130 else {
        return nil
    }
    return val
}

/// Parses a comma-separated hobby string into a trimmed [String] array.
func parseHobbies(_ text: String) -> [String] {
    text.split(separator: ",")
        .map { $0.trimmingCharacters(in: .whitespaces) }
        .filter { !$0.isEmpty }
}

// MARK: - Current weather readout
// Read-only pill showing the weather resolved from the device's location.
// Replaced the manual chip picker — weather is now automatic (WeatherKit).
private struct CurrentWeatherReadout: View {
    let weather: Weather

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: weather.sfSymbol)
                .font(.system(size: 13, weight: .semibold))
                .symbolRenderingMode(.monochrome)
                .foregroundStyle(MGColor.goldText)
            Text(weather.settingsLabel)
                .font(MGFont.mono(9, .medium))
                .tracking(0.6)
                .foregroundStyle(MGColor.goldText)
            Spacer(minLength: 0)
            Text("AUTO · YOUR LOCATION")
                .font(MGFont.mono(7.5))
                .tracking(0.8)
                .foregroundStyle(MGColor.inkFaint)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background {
            Capsule().fill(MGColor.ink.opacity(0.05))
                .overlay(Capsule().strokeBorder(MGColor.inkFaint.opacity(0.25), lineWidth: 1))
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Current weather: \(weather.settingsLabel), from your location")
    }
}

// MARK: - Weather display label
private extension Weather {
    var settingsLabel: String {
        switch self {
        case .clear:     return "Clear"
        case .cloudy:    return "Cloudy"
        case .rain:      return "Rain"
        case .heavyRain: return "Heavy Rain"
        case .sleet:     return "Sleet"
        case .snow:      return "Snow"
        }
    }
}
