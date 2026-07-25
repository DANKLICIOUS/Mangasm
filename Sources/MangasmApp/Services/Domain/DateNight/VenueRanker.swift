import Foundation

/// Weights for `VenueRanker.rank`. Sum need not equal 1 — scores are only compared.
public struct VenueWeights: Sendable, Equatable {
    public var dist: Double   // close to everyone (mean anchor distance)
    public var fair: Double   // fair to everyone (small travel spread)
    public var fit: Double    // matches the triad's shared interests

    public init(dist: Double, fair: Double, fit: Double) {
        self.dist = dist
        self.fair = fair
        self.fit = fit
    }

    public static let `default` = VenueWeights(dist: 0.5, fair: 0.25, fit: 0.25)
}

/// Stage 4 of the Group DateNight algorithm: rank the eligible venues.
///
/// Pure and I/O-free. Keeps only venues within `maxMiles` of every anchor
/// (defensive re-check via `MultiProximity`), then orders them by a blend of
/// closeness, travel fairness, and interest fit. Best first.
///
/// Note: `DateNightPlace` carries no availability / rating / price today, so those
/// factors from the design are omitted until the place model is enriched; ranking
/// here uses only what the data supports (geometry + interest keywords).
public enum VenueRanker {

    public static func rank(
        _ places: [DateNightPlace],
        anchors: [GeoCoordinate],
        maxMiles: Double = MultiProximity.defaultMaxMiles,
        triadInterests: Set<String> = [],
        weights: VenueWeights = .default
    ) -> [DateNightPlace] {
        guard !anchors.isEmpty else { return [] }
        let eligible = MultiProximity.filter(places: places, anchors: anchors, maxMiles: maxMiles)
        let interests = Set(triadInterests.map { $0.lowercased() })

        return eligible
            .map { (place: $0, score: score($0, anchors: anchors, maxMiles: maxMiles, interests: interests, weights: weights)) }
            .sorted {
                if $0.score != $1.score { return $0.score > $1.score }
                return $0.place.name.localizedCaseInsensitiveCompare($1.place.name) == .orderedAscending
            }
            .map(\.place)
    }

    // MARK: - Scoring

    private static func score(
        _ place: DateNightPlace, anchors: [GeoCoordinate], maxMiles: Double,
        interests: Set<String>, weights: VenueWeights
    ) -> Double {
        let ds = anchors.map { GeoCoordinate.miles(from: place.coordinate, to: $0) }
        let mean = ds.reduce(0, +) / Double(ds.count)
        let spread = (ds.max() ?? 0) - (ds.min() ?? 0)

        let closeness = clamp01(1 - mean / max(maxMiles, 0.001))
        let fairness = clamp01(1 - spread / max(maxMiles, 0.001))
        let fit = interestFit(place, interests: interests)

        return weights.dist * closeness
            + weights.fair * fairness
            + weights.fit * fit
    }

    /// Fraction of the triad's interests that appear (case-insensitive) in the
    /// venue name or subtitle. 0 when the triad has no shared interests.
    static func interestFit(_ place: DateNightPlace, interests: Set<String>) -> Double {
        guard !interests.isEmpty else { return 0 }
        let haystack = "\(place.name) \(place.subtitle)".lowercased()
        let hits = interests.filter { haystack.contains($0) }.count
        return Double(hits) / Double(interests.count)
    }
}

@inline(__always) private func clamp01(_ x: Double) -> Double { min(1, max(0, x)) }
