import Foundation

/// N-party proximity for **group DateNight** (viewer + K matches, e.g. a triad).
///
/// Generalizes `DualProximity` (party-of-2) to any number of anchors. A venue is
/// *eligible* when it sits within `maxMiles` of **every** anchor. The whole party
/// can be served **iff the minimum enclosing circle (MEC) of the anchors has
/// radius ≤ `maxMiles`** — the MEC center is the point that minimizes the worst
/// distance anyone travels, so it is the natural place to center provider search.
///
/// For 2 anchors this reduces exactly to `DualProximity`:
///   - MEC center  == midpoint
///   - MEC radius  == separation / 2
///   - feasible    == separation ≤ 2·maxMiles
///   - searchRadius == maxMiles − separation/2
///
/// Geometry is computed on a local equirectangular projection (miles east/north of
/// the anchors' centroid) — accurate for the short, city-scale baselines DateNight
/// uses. Final eligibility is re-checked with haversine (`GeoCoordinate.miles`) so
/// it stays consistent with the rest of the DateNight stack.
public enum MultiProximity {

    public static let defaultMaxMiles: Double = DualProximity.defaultMaxMiles

    // MARK: - Feasibility & center

    /// True when some point lies within `maxMiles` of every anchor
    /// (⇔ the minimum enclosing circle radius ≤ `maxMiles`).
    public static func feasible(
        anchors: [GeoCoordinate],
        maxMiles: Double = defaultMaxMiles
    ) -> Bool {
        guard let mec = minEnclosingCircle(of: anchors) else { return false }
        return mec.radiusMiles <= maxMiles + 1e-6
    }

    /// The point that minimizes the maximum distance to any anchor (MEC center).
    /// `nil` for an empty anchor set.
    public static func center(of anchors: [GeoCoordinate]) -> GeoCoordinate? {
        minEnclosingCircle(of: anchors)?.center
    }

    /// Provider search radius (miles) around `center(of:)`: a disk of this radius is
    /// guaranteed to lie inside the region eligible for *all* anchors. `nil` when the
    /// party is infeasible (no common venue within `maxMiles` of everyone).
    ///
    /// Proof: for a point x within (maxMiles − mecRadius) of the MEC center C, and any
    /// anchor a, `dist(x,a) ≤ dist(x,C) + dist(C,a) ≤ (maxMiles − mecRadius) + mecRadius
    /// = maxMiles`. Floored at 1 mile so provider queries never degenerate to a point.
    public static func searchRadiusMiles(
        anchors: [GeoCoordinate],
        maxMiles: Double = defaultMaxMiles
    ) -> Double? {
        guard let mec = minEnclosingCircle(of: anchors), mec.radiusMiles <= maxMiles + 1e-6 else {
            return nil
        }
        return max(1.0, maxMiles - mec.radiusMiles)
    }

    // MARK: - Eligibility

    /// A venue is eligible when it is within `maxMiles` of **every** anchor.
    public static func isEligible(
        place: GeoCoordinate,
        anchors: [GeoCoordinate],
        maxMiles: Double = defaultMaxMiles
    ) -> Bool {
        guard !anchors.isEmpty else { return false }
        return anchors.allSatisfy { GeoCoordinate.miles(from: place, to: $0) <= maxMiles + 1e-6 }
    }

    public static func filter(
        places: [DateNightPlace],
        anchors: [GeoCoordinate],
        maxMiles: Double = defaultMaxMiles
    ) -> [DateNightPlace] {
        places.filter { isEligible(place: $0.coordinate, anchors: anchors, maxMiles: maxMiles) }
    }

    // MARK: - Minimum enclosing circle

    /// Smallest circle covering all anchors, as (center coordinate, radius in miles).
    /// Deterministic brute force over the circles defined by any pair (as diameter)
    /// or any triple (circumcircle) — the MEC is always pinned by 2 or 3 points.
    /// O(n³) build × O(n) cover-check; n is a dating party (a handful), so this is trivial.
    public static func minEnclosingCircle(
        of anchors: [GeoCoordinate]
    ) -> (center: GeoCoordinate, radiusMiles: Double)? {
        guard let first = anchors.first else { return nil }
        if anchors.count == 1 { return (first, 0) }

        // Local equirectangular projection about the centroid.
        let refLat = anchors.map(\.latitude).reduce(0, +) / Double(anchors.count)
        let refLon = anchors.map(\.longitude).reduce(0, +) / Double(anchors.count)
        let milesPerDegLat = 69.0
        let milesPerDegLon = max(0.01, 69.0 * cos(refLat * .pi / 180))

        func toPlane(_ c: GeoCoordinate) -> P {
            P(x: (c.longitude - refLon) * milesPerDegLon,
              y: (c.latitude - refLat) * milesPerDegLat)
        }
        func fromPlane(_ p: P) -> GeoCoordinate {
            GeoCoordinate(latitude: refLat + p.y / milesPerDegLat,
                          longitude: refLon + p.x / milesPerDegLon)
        }

        let pts = anchors.map(toPlane)
        let eps = 1e-9
        func covers(_ c: P, _ r: Double) -> Bool {
            pts.allSatisfy { $0.dist(to: c) <= r + 1e-7 }
        }

        var best: (c: P, r: Double)?
        func consider(_ c: P, _ r: Double) {
            guard covers(c, r) else { return }
            if best == nil || r < best!.r { best = (c, r) }
        }

        // Pairs as diameters.
        for i in 0..<pts.count {
            for j in (i + 1)..<pts.count {
                let c = pts[i].mid(pts[j])
                consider(c, pts[i].dist(to: c))
            }
        }
        // Triples as circumcircles.
        for i in 0..<pts.count {
            for j in (i + 1)..<pts.count {
                for k in (j + 1)..<pts.count {
                    if let cc = P.circumcircle(pts[i], pts[j], pts[k], eps: eps) {
                        consider(cc.c, cc.r)
                    }
                }
            }
        }

        guard let b = best else { return nil }
        return (fromPlane(b.c), b.r)
    }

    // MARK: - Planar helpers

    private struct P {
        var x: Double
        var y: Double
        func dist(to o: P) -> Double { hypot(x - o.x, y - o.y) }
        func mid(_ o: P) -> P { P(x: (x + o.x) / 2, y: (y + o.y) / 2) }

        /// Circumcircle of three planar points; `nil` if (near-)collinear.
        static func circumcircle(_ a: P, _ b: P, _ c: P, eps: Double) -> (c: P, r: Double)? {
            let d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
            guard abs(d) > eps else { return nil }
            let a2 = a.x * a.x + a.y * a.y
            let b2 = b.x * b.x + b.y * b.y
            let c2 = c.x * c.x + c.y * c.y
            let ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d
            let uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d
            let center = P(x: ux, y: uy)
            return (center, center.dist(to: a))
        }
    }
}
