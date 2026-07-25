import XCTest
@testable import MangasmApp

/// Stage 4 planner tests: ranking eligible venues by closeness, fairness, interest fit.
final class VenueRankerTests: XCTestCase {

    private let miami = GeoCoordinate(latitude: 25.7617, longitude: -80.1918)
    private let miamiBeach = GeoCoordinate(latitude: 25.7907, longitude: -80.1300)
    private let coralGables = GeoCoordinate(latitude: 25.7215, longitude: -80.2684)
    private let fortLauderdale = GeoCoordinate(latitude: 26.1224, longitude: -80.1373)

    private var triad: [GeoCoordinate] { [miami, miamiBeach, coralGables] }

    private func place(_ id: String, at c: GeoCoordinate, _ category: DateNightCategory = .restaurant) -> DateNightPlace {
        DateNightPlace.fixture(id: id, name: id, coordinate: c, category: category)
    }

    func testCentralVenueOutranksEdgeVenue() {
        let center = MultiProximity.center(of: triad)!
        let central = place("Central", at: center)
        let edge = place("Edge", at: miamiBeach)   // sits on an anchor → higher mean + spread

        let ranked = VenueRanker.rank([edge, central], anchors: triad, maxMiles: 10)
        XCTAssertEqual(ranked.map(\.id), ["Central", "Edge"])
    }

    func testIneligibleVenueIsDropped() {
        let center = MultiProximity.center(of: triad)!
        let good = place("Good", at: center)
        let tooFar = place("TooFar", at: fortLauderdale)   // >10 mi from Miami anchor

        let ranked = VenueRanker.rank([good, tooFar], anchors: triad, maxMiles: 10)
        XCTAssertEqual(ranked.map(\.id), ["Good"])
    }

    func testInterestFitBreaksTiesTowardMatchingVenue() {
        // Two venues at the SAME coordinate → identical geometry; interest fit decides.
        let center = MultiProximity.center(of: triad)!
        let match = DateNightPlace(
            id: "match", category: .event, name: "House Music Night",
            subtitle: "Event · rooftop", coordinate: center,
            bookingURL: URL(string: "https://x")!, provider: "test"
        )
        let plain = DateNightPlace(
            id: "plain", category: .event, name: "Quiet Cafe",
            subtitle: "Event · corner", coordinate: center,
            bookingURL: URL(string: "https://x")!, provider: "test"
        )
        let ranked = VenueRanker.rank([plain, match], anchors: triad, maxMiles: 10,
                                      triadInterests: ["house music"])
        XCTAssertEqual(ranked.map(\.id), ["match", "plain"])
    }

    func testInterestFitFraction() {
        let p = DateNightPlace.fixture(id: "p", name: "Sailing & House Music Bar",
                                       coordinate: miami, category: .restaurant)
        XCTAssertEqual(VenueRanker.interestFit(p, interests: ["sailing", "house music"]), 1.0, accuracy: 1e-9)
        XCTAssertEqual(VenueRanker.interestFit(p, interests: ["sailing", "vinyl"]), 0.5, accuracy: 1e-9)
        XCTAssertEqual(VenueRanker.interestFit(p, interests: []), 0)
    }

    func testEmptyAnchorsReturnsEmpty() {
        let ranked = VenueRanker.rank([place("X", at: miami)], anchors: [], maxMiles: 10)
        XCTAssertTrue(ranked.isEmpty)
    }

    func testWeightsShiftRanking() {
        // With fit weighted to zero and pure geometry, the central venue wins even if the
        // edge venue name matches interests.
        let center = MultiProximity.center(of: triad)!
        let centralPlain = place("Central", at: center)
        let edgeMatch = DateNightPlace(
            id: "EdgeMatch", category: .restaurant, name: "House Music House",
            subtitle: "Restaurant", coordinate: miamiBeach,
            bookingURL: URL(string: "https://x")!, provider: "test"
        )
        let geoOnly = VenueWeights(dist: 1, fair: 0, fit: 0)
        let ranked = VenueRanker.rank([edgeMatch, centralPlain], anchors: triad, maxMiles: 10,
                                      triadInterests: ["house music"], weights: geoOnly)
        XCTAssertEqual(ranked.first?.id, "Central")
    }
}
