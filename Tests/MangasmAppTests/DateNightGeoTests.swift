import XCTest
@testable import MangasmApp

/// RED→GREEN domain tests for DateNight dual-proximity geo (≤10 mi of both).
final class DateNightGeoTests: XCTestCase {

    // ~1 degree latitude ≈ 69 miles; use known short baselines.
    // Downtown Miami-ish anchors for readable fixtures.
    private let miami = GeoCoordinate(latitude: 25.7617, longitude: -80.1918)
    private let miamiBeach = GeoCoordinate(latitude: 25.7907, longitude: -80.1300) // ~4 mi
    private let fortLauderdale = GeoCoordinate(latitude: 26.1224, longitude: -80.1373) // ~25 mi

    // MARK: - Haversine

    func testMilesBetweenSamePointIsZero() {
        XCTAssertEqual(GeoCoordinate.miles(from: miami, to: miami), 0, accuracy: 0.01)
    }

    func testMilesBetweenMiamiAndBeachIsUnderFive() {
        let d = GeoCoordinate.miles(from: miami, to: miamiBeach)
        XCTAssertGreaterThan(d, 2)
        XCTAssertLessThan(d, 6)
    }

    func testMilesBetweenMiamiAndFortLauderdaleIsOverTwenty() {
        let d = GeoCoordinate.miles(from: miami, to: fortLauderdale)
        XCTAssertGreaterThan(d, 20)
    }

    // MARK: - Dual proximity (party of 2, 10 mi both)

    func testPlaceNearBothIsEligible() {
        // Midpoint-ish between miami and beach
        let place = GeoCoordinate(latitude: 25.776, longitude: -80.16)
        XCTAssertTrue(
            DualProximity.isEligible(place: place, viewer: miami, match: miamiBeach)
        )
    }

    func testPlaceNearOnlyOneIsNotEligible() {
        // Close to Fort Lauderdale — far from Miami Beach pair when viewer is miami
        let place = fortLauderdale
        XCTAssertFalse(
            DualProximity.isEligible(place: place, viewer: miami, match: miamiBeach)
        )
    }

    func testTenMilesBoundaryInclusive() {
        // Equirectangular offset ≈ haversine within ~0.2 mi at this latitude.
        let justInside = GeoCoordinate.offset(from: miami, milesNorth: 9.7, milesEast: 0)
        let justOutside = GeoCoordinate.offset(from: miami, milesNorth: 10.5, milesEast: 0)
        XCTAssertLessThanOrEqual(GeoCoordinate.miles(from: miami, to: justInside), 10)
        XCTAssertGreaterThan(GeoCoordinate.miles(from: miami, to: justOutside), 10)
        XCTAssertTrue(
            DualProximity.isEligible(place: justInside, viewer: miami, match: miami, maxMiles: 10)
        )
        XCTAssertFalse(
            DualProximity.isEligible(place: justOutside, viewer: miami, match: miami, maxMiles: 10)
        )
    }

    func testUsersMoreThanTwentyMilesApartHaveEmptyIntersection() {
        XCTAssertTrue(DualProximity.usersTooFarApart(viewer: miami, match: fortLauderdale))
        XCTAssertFalse(DualProximity.usersTooFarApart(viewer: miami, match: miamiBeach))
    }

    func testSearchRadiusShrinksWithUserSeparation() {
        // d≈4 mi → radius = 10 - 2 = 8
        let r = DualProximity.searchRadiusMiles(viewer: miami, match: miamiBeach)
        XCTAssertNotNil(r)
        XCTAssertEqual(r!, 8, accuracy: 1.5)
    }

    func testSearchRadiusNilWhenTooFar() {
        XCTAssertNil(DualProximity.searchRadiusMiles(viewer: miami, match: fortLauderdale))
    }

    func testMidpointBetweenTwoAnchors() {
        let mid = DualProximity.midpoint(viewer: miami, match: miamiBeach)
        XCTAssertEqual(mid.latitude, (miami.latitude + miamiBeach.latitude) / 2, accuracy: 0.0001)
        XCTAssertEqual(mid.longitude, (miami.longitude + miamiBeach.longitude) / 2, accuracy: 0.0001)
    }

    // MARK: - Anchor resolution preference

    func testGPSPreferredOverZipWhenBothPresent() {
        let anchor = GeoAnchor(
            gps: miami,
            zipCode: "33101"
        )
        XCTAssertEqual(anchor.preferredSource, .gps)
        XCTAssertEqual(anchor.resolvedCoordinate(zipLookup: { _ in fortLauderdale }), miami)
    }

    func testZipUsedWhenNoGPS() {
        let anchor = GeoAnchor(gps: nil, zipCode: "33101")
        XCTAssertEqual(anchor.preferredSource, .zip)
        let resolved = anchor.resolvedCoordinate(zipLookup: { _ in miami })
        XCTAssertEqual(resolved, miami)
    }

    func testMissingLocationFailsClosed() {
        let anchor = GeoAnchor(gps: nil, zipCode: nil)
        XCTAssertNil(anchor.resolvedCoordinate(zipLookup: { _ in miami }))
    }

    func testInvalidZipFailsClosed() {
        let anchor = GeoAnchor(gps: nil, zipCode: "nope")
        XCTAssertNil(anchor.resolvedCoordinate(zipLookup: { _ in nil }))
    }
}
