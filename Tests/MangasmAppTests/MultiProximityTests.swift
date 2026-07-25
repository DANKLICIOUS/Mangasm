import XCTest
@testable import MangasmApp

/// Domain tests for N-party group DateNight proximity (`MultiProximity`).
/// Verifies (a) exact reduction to `DualProximity` for a party of 2, and
/// (b) triad feasibility / eligibility, including the pairwise-close-but-jointly-far trap.
final class MultiProximityTests: XCTestCase {

    // Downtown Miami-ish anchors (same fixtures as DateNightGeoTests for readability).
    private let miami = GeoCoordinate(latitude: 25.7617, longitude: -80.1918)
    private let miamiBeach = GeoCoordinate(latitude: 25.7907, longitude: -80.1300)       // ~4 mi from miami
    private let coralGables = GeoCoordinate(latitude: 25.7215, longitude: -80.2684)       // ~5.5 mi from miami
    private let fortLauderdale = GeoCoordinate(latitude: 26.1224, longitude: -80.1373)    // ~25 mi from miami

    // MARK: - Reduction to DualProximity (party of 2)

    func testTwoAnchorCenterEqualsMidpoint() {
        guard let c = MultiProximity.center(of: [miami, miamiBeach]) else {
            return XCTFail("expected a center")
        }
        let mid = DualProximity.midpoint(viewer: miami, match: miamiBeach)
        XCTAssertEqual(c.latitude, mid.latitude, accuracy: 0.02)
        XCTAssertEqual(c.longitude, mid.longitude, accuracy: 0.02)
    }

    func testTwoAnchorMecRadiusEqualsHalfSeparation() {
        guard let mec = MultiProximity.minEnclosingCircle(of: [miami, fortLauderdale]) else {
            return XCTFail("expected a circle")
        }
        let half = GeoCoordinate.miles(from: miami, to: fortLauderdale) / 2
        XCTAssertEqual(mec.radiusMiles, half, accuracy: 0.25)
    }

    func testTwoAnchorFeasibilityMatchesDualProximity() {
        // Close pair: feasible for both rules.
        XCTAssertTrue(MultiProximity.feasible(anchors: [miami, miamiBeach]))
        XCTAssertFalse(DualProximity.usersTooFarApart(viewer: miami, match: miamiBeach))
        // Far pair (~25 mi > 2×10): infeasible for both.
        XCTAssertFalse(MultiProximity.feasible(anchors: [miami, fortLauderdale]))
        XCTAssertTrue(DualProximity.usersTooFarApart(viewer: miami, match: fortLauderdale))
    }

    func testTwoAnchorSearchRadiusMatchesDualProximity() {
        let a = MultiProximity.searchRadiusMiles(anchors: [miami, miamiBeach])
        let b = DualProximity.searchRadiusMiles(viewer: miami, match: miamiBeach)
        XCTAssertNotNil(a); XCTAssertNotNil(b)
        XCTAssertEqual(a!, b!, accuracy: 0.25)
    }

    // MARK: - Triad feasibility

    func testTightTriadIsFeasible() {
        // Miami, Miami Beach, Coral Gables are all within ~6 mi of each other.
        let triad = [miami, miamiBeach, coralGables]
        XCTAssertTrue(MultiProximity.feasible(anchors: triad, maxMiles: 10))
        XCTAssertNotNil(MultiProximity.center(of: triad))
        XCTAssertNotNil(MultiProximity.searchRadiusMiles(anchors: triad, maxMiles: 10))
    }

    func testTriadWithOneFarAnchorIsInfeasible() {
        // Fort Lauderdale (~25 mi north) can't share a 10-mi venue with the Miami pair.
        let triad = [miami, miamiBeach, fortLauderdale]
        XCTAssertFalse(MultiProximity.feasible(anchors: triad, maxMiles: 10))
        XCTAssertNil(MultiProximity.searchRadiusMiles(anchors: triad, maxMiles: 10))
    }

    func testParameterizedRadiusUnlocksAFarTriad() {
        // The "x miles" parameter: widen to 15 mi and the same triad becomes feasible.
        let triad = [miami, miamiBeach, fortLauderdale]
        XCTAssertFalse(MultiProximity.feasible(anchors: triad, maxMiles: 10))
        XCTAssertTrue(MultiProximity.feasible(anchors: triad, maxMiles: 15))
    }

    // MARK: - The N≥3 trap: pairwise-close does NOT imply jointly-servable

    func testPairwiseCloseButJointlyFarIsInfeasible() {
        // Equilateral triangle, circumradius 11 mi (vertices 120° apart on a common center).
        // Side = 11·√3 ≈ 19 mi, so every PAIR is within 2×10=20 mi (each pair individually
        // passes DualProximity) — yet the circumradius (11) exceeds 10, so NO venue sits
        // within 10 mi of all three. This is the N≥3 trap a naive pairwise check misses.
        let center = GeoCoordinate(latitude: 25.9, longitude: -80.2)
        let a = GeoCoordinate.offset(from: center, milesNorth: 11, milesEast: 0)
        let b = GeoCoordinate.offset(from: center, milesNorth: -5.5, milesEast: 9.526)
        let c = GeoCoordinate.offset(from: center, milesNorth: -5.5, milesEast: -9.526)

        // Every pair is within 20 mi (each pair would individually pass DualProximity).
        XCTAssertFalse(DualProximity.usersTooFarApart(viewer: a, match: b))
        XCTAssertFalse(DualProximity.usersTooFarApart(viewer: b, match: c))
        XCTAssertFalse(DualProximity.usersTooFarApart(viewer: a, match: c))

        // But jointly there is no 10-mi venue for all three.
        XCTAssertFalse(MultiProximity.feasible(anchors: [a, b, c], maxMiles: 10))
        // The MEC center is ~12 mi from each, exceeding 10.
        let mec = MultiProximity.minEnclosingCircle(of: [a, b, c])!
        XCTAssertGreaterThan(mec.radiusMiles, 10)
    }

    // MARK: - Eligibility filtering

    func testFilterKeepsOnlyVenuesWithinRangeOfAllThree() {
        let triad = [miami, miamiBeach, coralGables]
        let centerCoord = MultiProximity.center(of: triad)!
        let good = DateNightPlace.fixture(id: "good", name: "Central Bar",
                                          coordinate: centerCoord, category: .restaurant)
        let bad = DateNightPlace.fixture(id: "bad", name: "Far Club",
                                         coordinate: fortLauderdale, category: .event)
        let kept = MultiProximity.filter(places: [good, bad], anchors: triad, maxMiles: 10)
        XCTAssertEqual(kept.map(\.id), ["good"])
    }

    // MARK: - Degenerate inputs

    func testEmptyAnchorsAreInfeasible() {
        XCTAssertFalse(MultiProximity.feasible(anchors: []))
        XCTAssertNil(MultiProximity.center(of: []))
        XCTAssertNil(MultiProximity.minEnclosingCircle(of: []))
    }

    func testSingleAnchorHasZeroRadiusAndItselfAsCenter() {
        let mec = MultiProximity.minEnclosingCircle(of: [miami])
        XCTAssertEqual(mec?.radiusMiles, 0)
        XCTAssertEqual(mec?.center, miami)
    }
}
