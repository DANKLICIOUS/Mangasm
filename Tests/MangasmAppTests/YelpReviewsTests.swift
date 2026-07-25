import XCTest
@testable import MangasmApp

/// Yelp Fusion Business Reviews (max 3):
/// GET /v3/businesses/{id}/reviews
/// e.g. /v3/businesses/north-india-restaurant-san-francisco/reviews
final class YelpReviewsTests: XCTestCase {

    func testReviewsURLMatchesYelpShape() {
        let url = YelpFusionClient.reviewsURL(businessID: "north-india-restaurant-san-francisco")
        XCTAssertEqual(url.host, "api.yelp.com")
        XCTAssertEqual(url.path, "/v3/businesses/north-india-restaurant-san-francisco/reviews")
    }

    func testReviewsURLEncodesSpecialCharactersInID() {
        let url = YelpFusionClient.reviewsURL(businessID: "foo/bar biz")
        // Raw absoluteString must percent-encode space and slash (path decodes when read).
        XCTAssertTrue(url.absoluteString.contains("businesses/"))
        XCTAssertTrue(url.absoluteString.hasSuffix("/reviews"))
        XCTAssertTrue(url.absoluteString.contains("%20") || url.absoluteString.contains("%2F"))
        XCTAssertFalse(url.absoluteString.contains("bar biz"))
    }

    func testDecodeNorthIndiaReviewsFixture() throws {
        // Real Fusion shape (North India SF) — no id/time_created; has review url.
        let json = """
        {
          "reviews": [
            {
              "url": "https://www.yelp.com/biz/north-india-restaurant-san-francisco?hrid=AeVAkQgueu6JtYtU4r3Jrg",
              "text": "This place is really pretty and I really love this place. My friends and me came here yesterday. The food is superb, the service is impeccable (mostly) and...",
              "user": {
                "image_url": "",
                "name": "Hoang V."
              },
              "rating": 5
            },
            {
              "url": "https://www.yelp.com/biz/north-india-restaurant-san-francisco?hrid=6tsz9tl7HAiOcYj_fGrsCg",
              "text": "Went there for the first time Saturday Evening,everything is great, the ambiance is outstanding for this location, tried the mulliatawny soup for starters...",
              "user": {
                "image_url": "http://s3-media2.fl.yelpcdn.com/photo/O1ZuPKBhwxHAT60XZksWHQ/o.jpg",
                "name": "Winston P."
              },
              "rating": 5
            },
            {
              "url": "https://www.yelp.com/biz/north-india-restaurant-san-francisco?hrid=3b3-zDKfomV-1qR3Z0jmQw",
              "text": "I came in here for the $9.95 lunch buffet the day after it opened.  It is the old Tara space and I like how it has been opened up to accommodate many more...",
              "user": {
                "image_url": "http://s3-media1.fl.yelpcdn.com/photo/bQRonQWaxInb7eKAtMjf3A/o.jpg",
                "name": "Ronita J."
              },
              "rating": 4
            }
          ],
          "total": 3
        }
        """.data(using: .utf8)!

        let result = try YelpFusionClient.decodeReviews(from: json)
        XCTAssertEqual(result.total, 3)
        XCTAssertEqual(result.reviews.count, 3)
        XCTAssertEqual(result.reviews[0].userName, "Hoang V.")
        XCTAssertEqual(result.reviews[0].rating, 5)
        XCTAssertNil(result.reviews[0].userImageURL, "empty image_url → nil")
        XCTAssertEqual(
            result.reviews[0].url?.absoluteString,
            "https://www.yelp.com/biz/north-india-restaurant-san-francisco?hrid=AeVAkQgueu6JtYtU4r3Jrg"
        )
        XCTAssertEqual(result.reviews[0].id, "AeVAkQgueu6JtYtU4r3Jrg")
        XCTAssertEqual(result.reviews[1].userName, "Winston P.")
        XCTAssertNotNil(result.reviews[1].userImageURL)
        XCTAssertEqual(result.reviews[2].rating, 4)
        XCTAssertTrue(result.reviews[0].text.contains("really pretty"))
    }

    func testDecodeReviewsCapsAtThreeWhenAPIReturnsMore() throws {
        let json = """
        {
          "reviews": [
            { "url": "https://www.yelp.com/biz/x?hrid=a", "text": "1", "rating": 5, "user": { "name": "A", "image_url": "" } },
            { "url": "https://www.yelp.com/biz/x?hrid=b", "text": "2", "rating": 4, "user": { "name": "B", "image_url": "" } },
            { "url": "https://www.yelp.com/biz/x?hrid=c", "text": "3", "rating": 3, "user": { "name": "C", "image_url": "" } },
            { "url": "https://www.yelp.com/biz/x?hrid=d", "text": "4", "rating": 2, "user": { "name": "D", "image_url": "" } }
          ],
          "total": 99
        }
        """.data(using: .utf8)!
        let result = try YelpFusionClient.decodeReviews(from: json)
        XCTAssertEqual(result.reviews.count, 3)
        XCTAssertEqual(result.total, 99)
    }

    func testReviewsRequestUsesBearerAndBusinessPath() async throws {
        let fixture = """
        {
          "reviews": [
            {
              "url": "https://www.yelp.com/biz/north-india-restaurant-san-francisco?hrid=AeVAkQgueu6JtYtU4r3Jrg",
              "text": "North India is excellent.",
              "rating": 5,
              "user": { "image_url": "", "name": "Hoang V." }
            }
          ],
          "total": 3
        }
        """.data(using: .utf8)!

        let http = StubHTTPClient { request in
            XCTAssertEqual(
                request.url?.path,
                "/v3/businesses/north-india-restaurant-san-francisco/reviews"
            )
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
        let result = try await client.reviews(businessID: "north-india-restaurant-san-francisco")
        XCTAssertEqual(result.reviews.count, 1)
        XCTAssertEqual(result.reviews[0].text, "North India is excellent.")
        XCTAssertEqual(result.reviews[0].userName, "Hoang V.")
        XCTAssertEqual(result.total, 3)
    }

    func testEmptyBusinessIDThrows() async {
        let client = YelpFusionClient(apiKey: "test-key-12345", http: StubHTTPClient { _ in
            XCTFail("should not hit network")
            throw URLError(.badURL)
        })
        do {
            _ = try await client.reviews(businessID: "  ")
            XCTFail("expected error")
        } catch let error as DateNightError {
            guard case .network = error else {
                return XCTFail("wrong \(error)")
            }
        } catch {
            XCTFail("unexpected \(error)")
        }
    }

    func testStripYelpPrefixFromDateNightPlaceID() {
        XCTAssertEqual(
            YelpFusionClient.yelpBusinessID(fromPlaceID: "yelp:north-india-restaurant-san-francisco"),
            "north-india-restaurant-san-francisco"
        )
        XCTAssertEqual(
            YelpFusionClient.yelpBusinessID(fromPlaceID: "north-india-restaurant-san-francisco"),
            "north-india-restaurant-san-francisco"
        )
        XCTAssertNil(YelpFusionClient.yelpBusinessID(fromPlaceID: "tm:event-1"))
    }
}
