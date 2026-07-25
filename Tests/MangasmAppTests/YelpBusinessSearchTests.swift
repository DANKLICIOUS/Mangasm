import XCTest
@testable import MangasmApp

/// Yelp Fusion Business Search with keyword:
/// GET /v3/businesses/search?term=delis&latitude=37.786882&longitude=-122.399972
final class YelpBusinessSearchTests: XCTestCase {

    private let sf = GeoCoordinate(latitude: 37.786882, longitude: -122.399972)

    func testSearchURLIncludesTermLatLon() {
        let url = YelpFusionClient.searchURL(
            center: sf,
            radiusMiles: 10,
            limit: 20,
            term: "delis"
        )
        XCTAssertEqual(url.host, "api.yelp.com")
        XCTAssertEqual(url.path, "/v3/businesses/search")
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!
        let map = Dictionary(uniqueKeysWithValues: items.map { ($0.name, $0.value ?? "") })
        XCTAssertEqual(map["term"], "delis")
        XCTAssertEqual(map["latitude"], "37.786882")
        XCTAssertEqual(map["longitude"], "-122.399972")
        XCTAssertNotNil(map["radius"])
        XCTAssertEqual(map["categories"], "restaurants")
    }

    func testSearchURLOmitsEmptyTerm() {
        let url = YelpFusionClient.searchURL(center: sf, radiusMiles: 10, limit: 20, term: "  ")
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!
        XCTAssertFalse(items.contains { $0.name == "term" })
    }

    func testSearchRequestSendsBearerAndTerm() async throws {
        let fixture = """
        {
          "businesses": [
            {
              "id": "deli-1",
              "name": "Molinari Delicatessen",
              "url": "https://www.yelp.com/biz/molinari-delicatessen-san-francisco",
              "categories": [{"alias": "delis", "title": "Delis"}],
              "coordinates": {"latitude": 37.798, "longitude": -122.408},
              "location": {"city": "San Francisco", "address1": "373 Columbus Ave"},
              "rating": 4.5,
              "review_count": 1200
            }
          ]
        }
        """.data(using: .utf8)!

        let http = StubHTTPClient { request in
            XCTAssertEqual(request.url?.path, "/v3/businesses/search")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-key-12345")
            let items = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!.queryItems!
            let map = Dictionary(uniqueKeysWithValues: items.map { ($0.name, $0.value ?? "") })
            XCTAssertEqual(map["term"], "delis")
            XCTAssertEqual(map["latitude"], "37.786882")
            XCTAssertEqual(map["longitude"], "-122.399972")
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (fixture, response)
        }

        let client = YelpFusionClient(apiKey: "test-key-12345", http: http)
        let places = try await client.search(center: sf, radiusMiles: 10, term: "delis")
        XCTAssertEqual(places.count, 1)
        XCTAssertEqual(places[0].name, "Molinari Delicatessen")
        XCTAssertEqual(places[0].category, .restaurant)
        XCTAssertTrue(places[0].bookingURL.absoluteString.contains("yelp.com"))
    }

    func testLiveServicePassesTermToYelp() async throws {
        let fixture = """
        {"businesses":[{
          "id":"d1","name":"Deli Spot",
          "url":"https://www.yelp.com/biz/deli-spot",
          "coordinates":{"latitude":37.7869,"longitude":-122.4000},
          "location":{"city":"San Francisco"},
          "categories":[{"title":"Delis"}]
        }]}
        """.data(using: .utf8)!

        let http = StubHTTPClient { request in
            let path = request.url?.path ?? ""
            if path.contains("autocomplete") {
                let empty = #"{"terms":[],"businesses":[],"categories":[]}"#.data(using: .utf8)!
                return (empty, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
            }
            // business search
            let items = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!.queryItems!
            XCTAssertTrue(items.contains { $0.name == "term" && $0.value == "delis" })
            return (fixture, HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!)
        }

        // Ticketmaster key unusable so only Yelp runs
        let config = DateNightConfig(yelpAPIKey: "test-key-12345", ticketmasterAPIKey: "")
        let service = LiveDateNightService(config: config, http: http)
        let viewer = GeoCoordinate(latitude: 37.786882, longitude: -122.399972)
        let match = GeoCoordinate(latitude: 37.79, longitude: -122.40)
        let query = DateNightQuery(
            viewer: viewer,
            match: match,
            categories: [.restaurant],
            term: "delis"
        )
        let places = try await service.discover(query)
        XCTAssertEqual(places.map(\.name), ["Deli Spot"])
    }
}
