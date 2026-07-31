import Foundation

/// Deterministic season/latitude weather estimate — the fallback used when Apple
/// WeatherKit is unavailable (no entitlement, offline, or non-iOS build). Pure and
/// testable: no clock or location hardware, `month` is injectable.
public enum WeatherHeuristic {
    public static func estimate(
        at coordinate: GeoCoordinate,
        month: Int = Calendar.current.component(.month, from: Date())
    ) -> Weather {
        let absLat = abs(coordinate.latitude)
        // Local winter? Northern hemisphere: Dec–Feb. Southern: Jun–Aug.
        let northern = coordinate.latitude >= 0
        let isWinter = northern ? (month == 12 || month <= 2) : (month >= 6 && month <= 8)

        switch absLat {
        case 66...:    return isWinter ? .snow : .cloudy   // polar
        case 45..<66:  return isWinter ? .snow : .clear    // cold temperate
        case 23..<45:  return isWinter ? .rain : .clear    // temperate
        default:       return .clear                       // tropics — skew clear
        }
    }
}
