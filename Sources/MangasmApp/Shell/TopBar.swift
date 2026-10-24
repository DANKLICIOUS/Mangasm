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
            VStack(alignment: .leading, spacing: 10) {
                Text("Mangasm")
                    .font(MGFont.serif(34, .bold))
                    .tracking(34 * 0.01)
                    .foregroundStyle(WrapperChrome.cream)
                    .shadow(color: .black.opacity(0.18), radius: 8, y: 2)
                    .allowsHitTesting(false)

                VStack(alignment: .leading, spacing: 2) {
                    Text("REPUTATION")
                        .font(MGFont.sans(11, .semibold))
                        .tracking(1.4)
                        .foregroundStyle(WrapperChrome.cream.opacity(0.78))

                    HStack(alignment: .lastTextBaseline, spacing: 8) {
                        Text("\(state.profile.repScore)")
                            .font(MGFont.serif(42, .bold))
                            .foregroundStyle(WrapperChrome.cream)
                            .shadow(color: .black.opacity(0.18), radius: 6, y: 1)
                            .lineHeight(0.8)

                        Text(styleBadgeLabel)
                            .font(MGFont.serif(13, .semibold))
                            .italic()
                            .foregroundStyle(WrapperChrome.cream.opacity(0.72))
                    }
                }
                .allowsHitTesting(false)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 10) {
                VStack(spacing: 4) {
                    Text("PRIVATE")
                        .font(MGFont.sans(11, .semibold))
                        .tracking(1.6)
                        .foregroundStyle(WrapperChrome.cream)
                    Image(systemName: "lock")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 16, height: 16)
                        .foregroundStyle(WrapperChrome.cream.opacity(0.92))
                }
                .allowsHitTesting(false)

                HStack(spacing: 8) {
                    Button(action: onMessages) {
                        Image(systemName: "envelope")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 14, height: 14)
                            .foregroundStyle(Color.black.opacity(0.55))
                            .frame(width: 30, height: 30)
                            .background(.ultraThinMaterial, in: Circle())
                            .overlay(Circle().stroke(Color.white.opacity(0.7), lineWidth: 0.7))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("messages_button")
                    .accessibilityLabel("Messages")

                    Button(action: onSettings) {
                        Image(systemName: "gearshape")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 14, height: 14)
                            .foregroundStyle(Color.black.opacity(0.55))
                            .frame(width: 30, height: 30)
                            .background(.ultraThinMaterial, in: Circle())
                            .overlay(Circle().stroke(Color.white.opacity(0.7), lineWidth: 0.7))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("settings_button")
                    .accessibilityLabel("Settings")
                }
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 52)
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
