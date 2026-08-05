import SwiftUI

// MARK: - TopBar
// Prototype ref: mangasm-screens.jsx TopBar()
// Layout: absolute top, left/right 14pt insets, top 46pt.
// Left: REPUTATION label + big serif number + tier badge + weather pill.
// Center: Mangasm gold serif logo.
// Right: PRIVATE badge + settings button.
// Non-button content is .allowsHitTesting(false) to pass touches through to content.

public struct TopBar: View {
    let weather: Weather
    let night: Bool                    // Reserved for future glass night variant
    let onSettings: () -> Void
    let onMessages: () -> Void

    @EnvironmentObject private var state: AppState

    public init(
        weather: Weather,
        night: Bool = false,
        onSettings: @escaping () -> Void,
        onMessages: @escaping () -> Void = {}
    ) {
        self.weather = weather
        self.night = night
        self.onSettings = onSettings
        self.onMessages = onMessages
    }

    public var body: some View {
        HStack(alignment: .top, spacing: 0) {

            // ── Left: community reputation + weather ──
            VStack(alignment: .leading, spacing: 8) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("REPUTATION")
                        .font(MGFont.mono(7.5))
                        .tracking(7.5 * 0.22)
                        .foregroundStyle(styleTheme.textSecondary)

                    HStack(alignment: .lastTextBaseline, spacing: 6) {
                        Text("\(state.profile.repScore)")
                            .font(MGFont.serif(38, .bold))
                            .foregroundStyle(styleTheme.accent)
                            .shadow(color: styleTheme.accent.opacity(0.30), radius: 5, x: 0, y: 1)
                            .shadow(color: .white.opacity(0.4), radius: 0.5, x: 0, y: 1)
                            .lineHeight(0.8)

                        HStack(spacing: 4) {
                            ProfileStyleBadgeMini(styleId: state.profileStyle.activeConfig.styleId)
                            Text(styleBadgeLabel)
                                .font(.custom("CormorantGaramond-Bold", size: 12).italic())
                                .fontWeight(.semibold)
                                .foregroundStyle(styleTheme.accentSecondary)
                                .lineLimit(1)
                        }
                    }
                }
                .allowsHitTesting(false)

                // Weather pill — prototype shows location "Dubai" hardcoded
                TopBarWeatherPill(weather: weather)
                    .allowsHitTesting(false)
            }

            Spacer()

            // ── Center: Mangasm logo ──
            VStack {
                Text("Mangasm")
                    .font(MGFont.serif(31, .bold))
                    .tracking(31 * 0.01)
                    .foregroundStyle(MGGradient.goldHeading)
                    .shadow(color: MGColor.gold.opacity(0.40), radius: 6, x: 0, y: 1)
                    .shadow(color: .white.opacity(0.5), radius: 1, x: 0, y: 1)
                    .padding(.top, 2)
            }
            .allowsHitTesting(false)

            Spacer()

            // ── Right: PRIVATE badge + settings ──
            VStack(alignment: .trailing, spacing: 8) {
                // PRIVATE badge — glass pill with lock icon
                VStack(spacing: 3) {
                    Text("PRIVATE")
                        .font(MGFont.serif(10.5, .bold))
                        .tracking(10.5 * 0.14)
                        .foregroundStyle(MGColor.goldDeep)

                    // Lock icon (SVG path: M6 10V8a6 6 0 0 1 12 0v2 + rect + circle)
                    Image(systemName: "lock.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 13, height: 13)
                        .foregroundStyle(MGColor.goldDeep)
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 11)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 13))
                .overlay(
                    RoundedRectangle(cornerRadius: 13)
                        .stroke(MGColor.gold.opacity(0.47), lineWidth: 1)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 13)
                        .fill(LinearGradient(colors: [.white.opacity(0.72), .clear],
                                            startPoint: .top, endPoint: .center))
                        .blendMode(.overlay)
                        .allowsHitTesting(false)
                )
                .shadow(color: Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.4),
                        radius: 8, x: 0, y: 6)
                .allowsHitTesting(false)

                // Messages button — glass square button (envelope icon)
                Button(action: onMessages) {
                    Image(systemName: "envelope")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 14, height: 14)
                        .foregroundStyle(MGColor.goldDeep)
                        .frame(width: 30, height: 30)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(MGColor.gold.opacity(0.33), lineWidth: 0.7)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("messages_button")
                .accessibilityLabel("Messages")

                // Settings button — glass square button
                Button(action: onSettings) {
                    Image(systemName: "gearshape")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 14, height: 14)
                        .foregroundStyle(MGColor.goldDeep)
                        .frame(width: 30, height: 30)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(MGColor.gold.opacity(0.33), lineWidth: 0.7)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("settings_button")
                .accessibilityLabel("Settings")
            }
        }
        .padding(.horizontal, 14)
        .padding(.top, 46)
    }

    private var styleBadgeLabel: String {
        state.profileStyle.activeConfig.badgeName
    }

    private var styleTheme: ProfileStyleTheme {
        ProfileStyleTheme.theme(for: state.profileStyle.activeConfig.styleId)
    }
}

// MARK: - TopBarWeatherPill
// Prototype ref: mangasm-fx.jsx WeatherPill()
// Location pin + "Dubai" (hardcoded per prototype) + temp + weather glyph.
// Approximation: city is hardcoded "Dubai" matching the prototype; real implementation
// would pull from location context. temp strings mapped locally (Weather enum has no temp).
private struct TopBarWeatherPill: View {
    let weather: Weather

    private var temp: String {
        switch weather {
        case .clear:     return "28°"
        case .cloudy:    return "24°"
        case .rain:      return "19°"
        case .heavyRain: return "17°"
        case .snow:      return "−2°"
        case .sleet:     return "1°"
        }
    }

    var body: some View {
        Pill {
            // Location pin
            Image(systemName: "mappin.and.ellipse")
                .resizable()
                .scaledToFit()
                .frame(width: 10, height: 10)
                .foregroundStyle(MGColor.goldDeep)

            // City label
            Text("Dubai")
                .font(MGFont.mono(8))
                .tracking(8 * 0.05)
                .foregroundStyle(MGColor.inkSoft)

            // Temperature
            Text(temp)
                .font(MGFont.serif(12, .bold))
                .foregroundStyle(MGColor.goldDeep)
                .lineLimit(1)

            // Weather glyph SF symbol substitution
            // Approximation: SF Symbols used instead of prototype SVG paths
            Image(systemName: weatherSFSymbol)
                .resizable()
                .scaledToFit()
                .frame(width: 11, height: 11)
                .foregroundStyle(MGColor.goldDeep)
        }
    }

    private var weatherSFSymbol: String {
        switch weather {
        case .clear:     return "sun.max"
        case .cloudy:    return "cloud"
        case .rain:      return "cloud.drizzle"
        case .heavyRain: return "cloud.heavyrain"
        case .snow:      return "snowflake"
        case .sleet:     return "cloud.sleet"
        }
    }
}

// MARK: - Line height helper
// SwiftUI Text doesn't support CSS lineHeight directly; track the lineHeight modifier
// is absorbed into the serif font's natural metrics — no-op placeholder.
private extension View {
    func lineHeight(_ ratio: CGFloat) -> some View { self }
}
