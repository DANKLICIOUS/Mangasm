import Foundation

/// Weights for `GroupDateMatcher.selectPairs`. Sum need not equal 1 — scores are
/// only compared against each other.
public struct MatchWeights: Sendable, Equatable {
    public var compat: Double   // both are strong matches (avg matchPct)
    public var shared: Double   // 3-way interest overlap (viewer + both)
    public var fair: Double     // nobody sits far more off-center than the others
    public var slack: Double    // roomy eligible region → more venue choice

    public init(compat: Double, shared: Double, fair: Double, slack: Double) {
        self.compat = compat
        self.shared = shared
        self.fair = fair
        self.slack = slack
    }

    public static let `default` = MatchWeights(compat: 0.4, shared: 0.25, fair: 0.2, slack: 0.15)
}

/// A scored, geo-feasible pair of matches to invite alongside the viewer.
public struct CandidatePair: Sendable, Equatable {
    public let first: Candidate
    public let second: Candidate
    /// `[viewer, first, second]` — the anchor set a venue must satisfy.
    public let anchors: [GeoCoordinate]
    public let score: Double
    /// Provider search slack (miles) for this triad; larger = more venue choice.
    public let searchRadiusMiles: Double

    public init(first: Candidate, second: Candidate, anchors: [GeoCoordinate],
                score: Double, searchRadiusMiles: Double) {
        self.first = first
        self.second = second
        self.anchors = anchors
        self.score = score
        self.searchRadiusMiles = searchRadiusMiles
    }
}

/// Stage 0 of the Group DateNight algorithm: choose which **two** matches to invite.
///
/// Pure and I/O-free. Enumerates every unordered pair of placeable candidates, keeps
/// only the geo-**feasible** triads (a venue exists within `maxMiles` of all three —
/// see `MultiProximity`), scores them, and returns the top `limit`, best first.
public enum GroupDateMatcher {

    public static func selectPairs(
        viewer: GeoCoordinate,
        viewerInterests: Set<String> = [],
        candidates: [Candidate],
        maxMiles: Double = MultiProximity.defaultMaxMiles,
        weights: MatchWeights = .default,
        limit: Int = 5
    ) -> [CandidatePair] {
        guard limit > 0 else { return [] }

        // Only candidates with a known location can anchor a venue search.
        let placeable = candidates.filter { $0.geoCoordinate != nil }
        guard placeable.count >= 2 else { return [] }

        var pairs: [CandidatePair] = []
        for i in 0..<placeable.count {
            for j in (i + 1)..<placeable.count {
                let a = placeable[i], b = placeable[j]
                guard let ga = a.geoCoordinate, let gb = b.geoCoordinate else { continue }
                let anchors = [viewer, ga, gb]

                guard MultiProximity.feasible(anchors: anchors, maxMiles: maxMiles),
                      let slack = MultiProximity.searchRadiusMiles(anchors: anchors, maxMiles: maxMiles)
                else { continue }

                let score = pairScore(
                    a: a, b: b, anchors: anchors,
                    viewerInterests: viewerInterests,
                    maxMiles: maxMiles, slack: slack, weights: weights
                )
                pairs.append(CandidatePair(first: a, second: b, anchors: anchors,
                                           score: score, searchRadiusMiles: slack))
            }
        }

        // Best first; deterministic tie-break by the two names so output is stable.
        pairs.sort {
            if $0.score != $1.score { return $0.score > $1.score }
            return ($0.first.name, $0.second.name) < ($1.first.name, $1.second.name)
        }
        return Array(pairs.prefix(limit))
    }

    // MARK: - Scoring

    private static func pairScore(
        a: Candidate, b: Candidate, anchors: [GeoCoordinate],
        viewerInterests: Set<String>, maxMiles: Double, slack: Double,
        weights: MatchWeights
    ) -> Double {
        let compat = Double(a.matchPct + b.matchPct) / 2.0 / 100.0

        let shared = threeWayInterestOverlap(
            viewerInterests, interests(of: a), interests(of: b)
        )

        // Fairness: how tightly the three anchors cluster around their MEC center.
        let fair: Double
        if let center = MultiProximity.center(of: anchors) {
            let ds = anchors.map { GeoCoordinate.miles(from: $0, to: center) }
            let spread = (ds.max() ?? 0) - (ds.min() ?? 0)
            fair = clamp01(1 - spread / max(maxMiles, 0.001))
        } else {
            fair = 0
        }

        let slackScore = clamp01(slack / max(maxMiles, 0.001))

        return weights.compat * compat
            + weights.shared * shared
            + weights.fair * fair
            + weights.slack * slackScore
    }

    static func interests(of c: Candidate) -> Set<String> {
        Set((c.sharedInterests + c.hobbies).map { $0.lowercased() })
    }

    /// |A∩B∩C| / |A∪B∪C|, i.e. how much all three have in common. 0 when the union is empty.
    static func threeWayInterestOverlap(_ a: Set<String>, _ b: Set<String>, _ c: Set<String>) -> Double {
        let union = a.union(b).union(c)
        guard !union.isEmpty else { return 0 }
        let common = a.intersection(b).intersection(c)
        return Double(common.count) / Double(union.count)
    }
}

@inline(__always) private func clamp01(_ x: Double) -> Double { min(1, max(0, x)) }
