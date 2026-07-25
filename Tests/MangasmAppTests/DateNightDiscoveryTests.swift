import XCTest
@testable import MangasmApp

/// Discovery pipeline: dual filter, Yelp/TM decoding fixtures, mock service.
final class DateNightDiscoveryTests: XCTestCase {

    private let miami = GeoCoordinate(latitude: 25.7617, longitude: -80.1918)
    private let beach = GeoCoordinate(latitude: 25.7907, longitude: -80.1300)

    // MARK: - Filter pipeline

    func testFilterKeepsOnlyDualEligiblePlaces() {
        let nearBoth = DateNightPlace.fixture(
            id: "near",
            name: "Ossiano",
            coordinate: GeoCoordinate(latitude: 25.776, longitude: -80.16),
            category: .restaurant
        )
        let far = DateNightPlace.fixture(
            id: "far",
            name: "Far Away",
            coordinate: GeoCoordinate(latitude: 26.1224, longitude: -80.1373),
            category: .restaurant
        )
        let kept = DualProximity.filter(
            places: [nearBoth, far],
            viewer: miami,
            match: beach
        )
        XCTAssertEqual(kept.map(\.id), ["near"])
    }

    // MARK: - Yelp decode

    func testYelpBusinessesDecodeToDateNightPlaces() throws {
        let json = """
        {
          "businesses": [
            {
              "id": "yelp-1",
              "name": "Kyū",
              "url": "https://www.yelp.com/biz/kyu-miami",
              "categories": [{"alias": "japanese", "title": "Japanese"}],
              "coordinates": {"latitude": 25.799, "longitude": -80.193},
              "location": {"city": "Miami", "address1": "1 SE 3rd Ave"},
              "rating": 4.5,
              "review_count": 1200
            }
          ]
        }
        """.data(using: .utf8)!

        let places = try YelpFusionClient.decodePlaces(from: json)
        XCTAssertEqual(places.count, 1)
        XCTAssertEqual(places[0].id, "yelp:yelp-1")
        XCTAssertEqual(places[0].category, .restaurant)
        XCTAssertEqual(places[0].name, "Kyū")
        XCTAssertEqual(places[0].bookingURL.absoluteString, "https://www.yelp.com/biz/kyu-miami")
        XCTAssertEqual(places[0].coordinate.latitude, 25.799, accuracy: 0.0001)
    }

    // MARK: - Ticketmaster decode

    func testTicketmasterEventsDecodeToDateNightPlaces() throws {
        let json = """
        {
          "_embedded": {
            "events": [
              {
                "id": "tm-1",
                "name": "Ultra Music Festival",
                "url": "https://www.ticketmaster.com/event/tm-1",
                "classifications": [
                  {"segment": {"name": "Music"}, "genre": {"name": "Dance/Electronic"}, "subGenre": {"name": "Festival"}}
                ],
                "dates": {"start": {"localDate": "2026-03-20", "localTime": "16:00:00"}},
                "_embedded": {
                  "venues": [
                    {
                      "name": "Bayfront Park",
                      "city": {"name": "Miami"},
                      "location": {"latitude": "25.778", "longitude": "-80.186"}
                    }
                  ]
                }
              }
            ]
          }
        }
        """.data(using: .utf8)!

        let places = try TicketmasterDiscoveryClient.decodePlaces(from: json)
        XCTAssertEqual(places.count, 1)
        XCTAssertEqual(places[0].id, "tm:tm-1")
        XCTAssertEqual(places[0].category, .festival)
        XCTAssertEqual(places[0].name, "Ultra Music Festival")
        XCTAssertEqual(places[0].bookingURL.host, "www.ticketmaster.com")
        XCTAssertEqual(places[0].coordinate.latitude, 25.778, accuracy: 0.001)
    }

    func testTicketmasterConcertIsEventNotFestival() throws {
        let json = """
        {
          "_embedded": {
            "events": [
              {
                "id": "tm-2",
                "name": "Jazz Night",
                "url": "https://www.ticketmaster.com/event/tm-2",
                "classifications": [
                  {"segment": {"name": "Music"}, "genre": {"name": "Jazz"}, "subGenre": {"name": "Jazz"}}
                ],
                "dates": {"start": {"localDate": "2026-08-01"}},
                "_embedded": {
                  "venues": [
                    {
                      "name": "Adrienne Arsht",
                      "city": {"name": "Miami"},
                      "location": {"latitude": "25.79", "longitude": "-80.19"}
                    }
                  ]
                }
              }
            ]
          }
        }
        """.data(using: .utf8)!

        let places = try TicketmasterDiscoveryClient.decodePlaces(from: json)
        XCTAssertEqual(places[0].category, .event)
    }

    // MARK: - Mock service

    func testMockServiceReturnsOnlyDualEligible() async throws {
        let service = MockDateNightService(
            fixtures: [
                DateNightPlace.fixture(
                    id: "near",
                    name: "Near",
                    coordinate: GeoCoordinate(latitude: 25.776, longitude: -80.16),
                    category: .restaurant
                ),
                DateNightPlace.fixture(
                    id: "far",
                    name: "Far",
                    coordinate: GeoCoordinate(latitude: 26.12, longitude: -80.14),
                    category: .event
                ),
            ]
        )
        let query = DateNightQuery(viewer: miami, match: beach)
        let results = try await service.discover(query)
        XCTAssertEqual(results.map(\.id), ["near"])
    }

    func testMockServiceThrowsWhenUsersTooFar() async {
        let service = MockDateNightService(fixtures: [])
        let query = DateNightQuery(
            viewer: miami,
            match: GeoCoordinate(latitude: 26.1224, longitude: -80.1373)
        )
        do {
            _ = try await service.discover(query)
            XCTFail("expected tooFarApart")
        } catch let error as DateNightError {
            guard case .tooFarApart = error else {
                return XCTFail("wrong error \(error)")
            }
        } catch {
            XCTFail("unexpected \(error)")
        }
    }

    // MARK: - Party size

    func testOneToOneQueryPartySizeIsTwo() {
        XCTAssertEqual(DateNightQuery(viewer: miami, match: beach).partySize, 2)
    }

    func testGroupQueryPartySizeMatchesAnchorCount() {
        let query = DateNightQuery(anchors: [miami, beach, miami], maxMiles: 12)
        XCTAssertEqual(query.partySize, 3)
    }
}
