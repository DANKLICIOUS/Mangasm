import Foundation

#if os(iOS)
import WeatherKit
import CoreLocation
#endif

/// Resolves the app `Weather` from a coordinate via Apple WeatherKit on iOS,
/// falling back to `WeatherHeuristic` when WeatherKit can't answer (no entitlement,
/// offline, or non-iOS build). Never throws — weather must never break the UI.
///
/// NOTE: WeatherKit requires the **WeatherKit capability** on the App ID + the
/// entitlement in the build. Without it, `weather(for:)` throws and we silently
/// fall back to the heuristic.
public struct LiveWeatherProvider: WeatherProvider {
    public init() {}

    public func current(at coordinate: GeoCoordinate) async -> Weather {
        #if os(iOS)
        if #available(iOS 16.0, *) {
            do {
                let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
                let current = try await WeatherKit.WeatherService.shared.weather(for: location, including: .current)
                return Weather(condition: current.condition)
            } catch {
                return WeatherHeuristic.estimate(at: coordinate)
            }
        }
        #endif
        return WeatherHeuristic.estimate(at: coordinate)
    }
}

#if os(iOS)
@available(iOS 16.0, *)
extension Weather {
    /// Collapse WeatherKit's fine-grained `WeatherCondition` into the app's 6 visual
    /// states. Unlisted / future conditions fall through to `.clear`.
    init(condition: WeatherCondition) {
        switch condition {
        case .clear, .mostlyClear:
            self = .clear
        case .cloudy, .mostlyCloudy, .partlyCloudy, .foggy, .haze:
            self = .cloudy
        case .drizzle, .rain, .thunderstorms, .isolatedThunderstorms, .scatteredThunderstorms:
            self = .rain
        case .heavyRain, .freezingRain, .freezingDrizzle:
            self = .heavyRain
        case .sleet, .hail, .wintryMix:
            self = .sleet
        case .snow, .heavySnow, .blizzard, .flurries, .blowingSnow:
            self = .snow
        default:
            self = .clear
        }
    }
}
#endif
