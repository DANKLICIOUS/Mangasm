import XCTest
@testable import MangasmApp

/// Yelp Fusion Autocomplete — GET /v3/autocomplete
final class YelpAutocompleteTests: XCTestCase {

    func testDecodeAutocompleteTermsBusinessesCategories() throws {
        // Shape from Yelp Fusion autocomplete docs / sample responses.
        let json = """
        {
          "terms": [
            { "text": "Delivery" }
          ],
          "businesses": [
            {
              "id": "E8RJkjfdcwgtyoPMjQ_Olg",
              "name": "Four Barrel Coffee"
            }
          ],
          "categories": [
            {
              "alias": "delis",
              "title": "Delis"
            }
          ]
        }
        """.data(using: .utf8)!

        let result = try YelpFusionClient.decodeAutocomplete(from: json)
        XCTAssertEqual(result.terms.map(\.text), ["Delivery"])
        XCTAssertEqual(result.businesses.count, 1)
        XCTAssertEqual(result.businesses[0].id, "E8RJkjfdcwgtyoPMjQ_Olg")
        XCTAssertEqual(result.businesses[0].name, "Four Barrel Coffee")
        XCTAssertEqual(result.categories.map(\.alias), ["delis"])
        XCTAssertEqual(result.categories.map(\.title), ["Delis"])
    }

    func testBuildAutocompleteURLMatchesYelpShape() {
        let center = GeoCoordinate(latitude: 37.786882, longitude: -122.399972)
        let url = YelpFusionClient.autocompleteURL(text: "del", center: center)
        XCTAssertEqual(url.path, "/v3/autocomplete")
        XCTAssertEqual(url.host, "api.yelp.com")
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!
        let map = Dictionary(uniqueKeysWithValues: items.map { ($0.name, $0.value ?? "") })
        XCTAssertEqual(map["text"], "del")
        XCTAssertEqual(map["latitude"], "37.786882")
        XCTAssertEqual(map["longitude"], "-122.399972")
    }

    func testAutocompleteRequestUsesBearerAndReturnsDecoded() async throws {
        let fixture = """
        {"terms":[{"text":"Delivery"}],"businesses":[{"id":"b1","name":"Deli House"}],"categories":[{"alias":"delis","title":"Delis"}]}
        """.data(using: .utf8)!

        let http = StubHTTPClient { request in
            XCTAssertEqual(request.url?.path, "/v3/autocomplete")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-key-12345")
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (fixture, response)
        }

        let client = YelpFusionClient(apiKey: "test-key-12345", http: http)
        let result = try await client.autocomplete(
            text: "del",
            center: GeoCoordinate(latitude: 37.786882, longitude: -122.399972)
        )
        XCTAssertEqual(result.businesses.first?.name, "Deli House")
        XCTAssertEqual(result.terms.first?.text, "Delivery")
    }

    func testAutocompleteEmptyTextThrows() async {
        let client = YelpFusionClient(apiKey: "test-key-12345", http: StubHTTPClient { _ in
            XCTFail("should not hit network")
            throw URLError(.badURL)
        })
        do {
            _ = try await client.autocomplete(
                text: "  ",
                center: GeoCoordinate(latitude: 37.78, longitude: -122.39)
            )
            XCTFail("expected error")
        } catch let error as DateNightError {
            guard case .network = error else {
                return XCTFail("wrong \(error)")
            }
        } catch {
            XCTFail("unexpected \(error)")
        }
    }
}
