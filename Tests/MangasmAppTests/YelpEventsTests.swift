import XCTest
@testable import MangasmApp

/// Yelp Fusion Events:
/// GET /v3/events/{id}  e.g. /v3/events/awesome-event
/// GET /v3/events?latitude=&longitude=&radius=
final class YelpEventsTests: XCTestCase {

    func testEventLookupURLMatchesCurlShape() {
        let url = YelpFusionClient.eventURL(eventID: "awesome-event")
        XCTAssertEqual(url.host, "api.yelp.com")
        XCTAssertEqual(url.path, "/v3/events/awesome-event")
    }

    func testEventsSearchURLIncludesLatLon() {
        let center = GeoCoordinate(latitude: 37.786882, longitude: -122.399972)
        let url = YelpFusionClient.eventsSearchURL(center: center, radiusMiles: 10)
        XCTAssertEqual(url.path, "/v3/events")
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!
        let map = Dictionary(uniqueKeysWithValues: items.map { ($0.name, $0.value ?? "") })
        XCTAssertEqual(map["latitude"], "37.786882")
        XCTAssertEqual(map["longitude"], "-122.399972")
        XCTAssertNotNil(map["radius"])
    }

    func testDecodeSingleEventToDateNightPlace() throws {
        let json = """
        {
          "id": "awesome-event",
          "name": "Awesome Event",
          "description": "A great night out for two.",
          "event_site_url": "https://www.yelp.com/events/awesome-event",
          "image_url": "https://s3-media.fl.yelpcdn.com/event/photo.jpg",
          "time_start": "2026-08-01T19:00:00-07:00",
          "is_free": false,
          "is_canceled": false,
          "category": "nightlife",
          "location": {
            "city": "San Francisco",
            "address1": "123 Market St",
            "display_address": ["123 Market St", "San Francisco, CA 94105"]
          },
          "latitude": 37.786882,
          "longitude": -122.399972
        }
        """.data(using: .utf8)!

        let place = try YelpFusionClient.decodeEvent(from: json)
        XCTAssertEqual(place.id, "yelp-event:awesome-event")
        XCTAssertEqual(place.name, "Awesome Event")
        XCTAssertEqual(place.category, .event)
        XCTAssertEqual(place.provider, "yelp")
        XCTAssertEqual(place.bookingURL.host, "www.yelp.com")
        XCTAssertEqual(place.coordinate.latitude, 37.786882, accuracy: 0.0001)
        XCTAssertTrue(place.subtitle.contains("San Francisco") || place.subtitle.contains("Event"))
    }

    func testDecodeEventsSearchList() throws {
        let json = """
        {
          "events": [
            {
              "id": "e1",
              "name": "Rooftop Jazz",
              "event_site_url": "https://www.yelp.com/events/e1",
              "time_start": "2026-09-01T20:00:00-07:00",
              "latitude": 37.79,
              "longitude": -122.40,
              "location": { "city": "San Francisco" },
              "category": "music"
            }
          ],
          "total": 1
        }
        """.data(using: .utf8)!

        let places = try YelpFusionClient.decodeEvents(from: json)
        XCTAssertEqual(places.count, 1)
        XCTAssertEqual(places[0].id, "yelp-event:e1")
        XCTAssertEqual(places[0].name, "Rooftop Jazz")
    }

    func testEventRequestUsesBearerAndPath() async throws {
        let fixture = """
        {
          "id": "awesome-event",
          "name": "Awesome Event",
          "event_site_url": "https://www.yelp.com/events/awesome-event",
          "latitude": 37.786882,
          "longitude": -122.399972,
          "location": { "city": "San Francisco" }
        }
        """.data(using: .utf8)!

        let http = StubHTTPClient { request in
            XCTAssertEqual(request.url?.path, "/v3/events/awesome-event")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-key-12345")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/json")
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (fixture, response)
        }

        let client = YelpFusionClient(apiKey: "test-key-12345", http: http)
        let place = try await client.event(id: "awesome-event")
        XCTAssertEqual(place.name, "Awesome Event")
    }

    func testEmptyEventIDThrows() async {
        let client = YelpFusionClient(apiKey: "test-key-12345", http: StubHTTPClient { _ in
            XCTFail("no network")
            throw URLError(.badURL)
        })
        do {
            _ = try await client.event(id: "  ")
            XCTFail("expected error")
        } catch let error as DateNightError {
            guard case .network = error else { return XCTFail("\(error)") }
        } catch {
            XCTFail("\(error)")
        }
    }
}
