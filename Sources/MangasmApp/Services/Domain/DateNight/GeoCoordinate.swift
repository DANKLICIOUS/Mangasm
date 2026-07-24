import Foundation

/// WGS-84 coordinate used by DateNight dual-proximity rules.
public struct GeoCoordinate: Sendable, Hashable, Equatable, Codable {
    public var latitude: Double
    public var longitude: Double

    public init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }

    /// Great-circle distance in statute miles (haversine).
    public static func miles(from a: GeoCoordinate, to b: GeoCoordinate) -> Double {
        let earthRadiusMiles = 3958.7613
        let lat1 = a.latitude * .pi / 180
        let lat2 = b.latitude * .pi / 180
        let dLat = (b.latitude - a.latitude) * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let h = sin(dLat / 2) * sin(dLat / 2)
            + cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2)
        let c = 2 * atan2(sqrt(h), sqrt(max(0, 1 - h)))
        return earthRadiusMiles * c
    }

    /// Test/helper: offset by miles north/east (small-distance equirectangular).
    public static func offset(from origin: GeoCoordinate, milesNorth: Double, milesEast: Double) -> GeoCoordinate {
        let milesPerDegreeLat = 69.0
        let milesPerDegreeLon = max(0.01, 69.0 * cos(origin.latitude * .pi / 180))
        return GeoCoordinate(
            latitude: origin.latitude + milesNorth / milesPerDegreeLat,
            longitude: origin.longitude + milesEast / milesPerDegreeLon
        )
    }
}

// MARK: - GeoAnchor

/// Location supplied by a user: GPS preferred when present, else US ZIP.
public struct GeoAnchor: Sendable, Equatable {
    public enum Source: Sendable, Equatable {
        case gps
        case zip
        case none
    }

    public var gps: GeoCoordinate?
    public var zipCode: String?

    public init(gps: GeoCoordinate?, zipCode: String?) {
        self.gps = gps
        self.zipCode = Self.normalizedZip(zipCode)
    }

    public var preferredSource: Source {
        if gps != nil { return .gps }
        if zipCode != nil { return .zip }
        return .none
    }

    /// Resolves to a coordinate. `zipLookup` is injected so unit tests stay offline.
    public func resolvedCoordinate(zipLookup: (String) -> GeoCoordinate?) -> GeoCoordinate? {
        if let gps { return gps }
        guard let zipCode else { return nil }
        return zipLookup(zipCode)
    }

    public static func normalizedZip(_ raw: String?) -> String? {
        guard let raw else { return nil }
        let digits = raw.filter(\.isNumber)
        guard digits.count == 5 || digits.count == 9 else { return nil }
        return String(digits.prefix(5))
    }
}

// MARK: - DualProximity

/// Party-of-2 rule: place must sit within `maxMiles` of **both** people.
public enum DualProximity {
    public static let defaultMaxMiles: Double = 10.0

    public static func isEligible(
        place: GeoCoordinate,
        viewer: GeoCoordinate,
        match: GeoCoordinate,
        maxMiles: Double = defaultMaxMiles
    ) -> Bool {
        GeoCoordinate.miles(from: place, to: viewer) <= maxMiles
            && GeoCoordinate.miles(from: place, to: match) <= maxMiles
    }

    /// Two circles of radius R intersect only if separation ≤ 2R.
    public static func usersTooFarApart(
        viewer: GeoCoordinate,
        match: GeoCoordinate,
        maxMiles: Double = defaultMaxMiles
    ) -> Bool {
        GeoCoordinate.miles(from: viewer, to: match) > (maxMiles * 2)
    }

    public static func midpoint(viewer: GeoCoordinate, match: GeoCoordinate) -> GeoCoordinate {
        GeoCoordinate(
            latitude: (viewer.latitude + match.latitude) / 2,
            longitude: (viewer.longitude + match.longitude) / 2
        )
    }

    /// Provider search radius (miles). `nil` when intersection is empty.
    public static func searchRadiusMiles(
        viewer: GeoCoordinate,
        match: GeoCoordinate,
        maxMiles: Double = defaultMaxMiles
    ) -> Double? {
        let d = GeoCoordinate.miles(from: viewer, to: match)
        guard d <= maxMiles * 2 else { return nil }
        return max(1.0, maxMiles - d / 2)
    }

    public static func filter(
        places: [DateNightPlace],
        viewer: GeoCoordinate,
        match: GeoCoordinate,
        maxMiles: Double = defaultMaxMiles
    ) -> [DateNightPlace] {
        places.filter {
            isEligible(place: $0.coordinate, viewer: viewer, match: match, maxMiles: maxMiles)
        }
    }
}
