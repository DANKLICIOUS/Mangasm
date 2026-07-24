import Foundation

/// Yelp Fusion — Business Search, Events, Autocomplete, Reviews (max 3). Booking = deep-link.
public struct YelpFusionClient: Sendable {
    public static let businessSearchBaseURL = URL(string: "https://api.yelp.com/v3/businesses/search")!
    public static let autocompleteBaseURL = URL(string: "https://api.yelp.com/v3/autocomplete")!
    public static let eventsSearchBaseURL = URL(string: "https://api.yelp.com/v3/events")!
    public static let maxReviews = 3

    /// Alias for docs / call sites that expect the Fusion search endpoint constant.
    public static var searchURL: URL { businessSearchBaseURL }

    private let apiKey: String
    private let http: any HTTPClient

    public init(apiKey: String, http: any HTTPClient = URLSessionHTTPClient()) {
        self.apiKey = apiKey
        self.http = http
    }

    // MARK: - Autocomplete
    // GET https://api.yelp.com/v3/autocomplete?text=del&latitude=…&longitude=…

    public static func autocompleteURL(text: String, center: GeoCoordinate) -> URL {
        var components = URLComponents(url: autocompleteBaseURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "text", value: text),
            URLQueryItem(name: "latitude", value: String(center.latitude)),
            URLQueryItem(name: "longitude", value: String(center.longitude)),
        ]
        return components.url ?? autocompleteBaseURL
    }

    public func autocomplete(text: String, center: GeoCoordinate) async throws -> YelpAutocompleteResult {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw DateNightError.network("Yelp autocomplete requires non-empty text")
        }
        guard DateNightConfig.isUsableKey(apiKey) else {
            throw DateNightError.configMissing("YELP_API_KEY")
        }

        let url = Self.autocompleteURL(text: trimmed, center: center)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 15

        let (data, response) = try await http.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw DateNightError.network("Yelp autocomplete HTTP \(httpResponse.statusCode): \(body.prefix(200))")
        }
        return try Self.decodeAutocomplete(from: data)
    }

    public static func decodeAutocomplete(from data: Data) throws -> YelpAutocompleteResult {
        do {
            return try JSONDecoder().decode(YelpAutocompleteResult.self, from: data)
        } catch {
            throw DateNightError.decoding("Yelp autocomplete: \(error.localizedDescription)")
        }
    }

    // MARK: - Business search
    // GET https://api.yelp.com/v3/businesses/search?term=delis&latitude=37.786882&longitude=-122.399972

    /// Builds the Fusion business search URL (keyword + lat/lon + DateNight defaults).
    /// Example: `?term=delis&latitude=37.786882&longitude=-122.399972`
    public static func businessSearchURL(
        center: GeoCoordinate,
        radiusMiles: Double = DualProximity.defaultMaxMiles,
        limit: Int = 20,
        term: String? = nil
    ) -> URL {
        var components = URLComponents(url: businessSearchBaseURL, resolvingAgainstBaseURL: false)!
        let radiusMeters = min(40_000, max(100, Int((radiusMiles * 1609.344).rounded())))
        var items: [URLQueryItem] = [
            URLQueryItem(name: "latitude", value: String(center.latitude)),
            URLQueryItem(name: "longitude", value: String(center.longitude)),
            URLQueryItem(name: "radius", value: String(radiusMeters)),
            URLQueryItem(name: "categories", value: "restaurants"),
            URLQueryItem(name: "limit", value: String(min(50, max(1, limit)))),
            URLQueryItem(name: "sort_by", value: "best_match"),
        ]
        if let term {
            let t = term.trimmingCharacters(in: .whitespacesAndNewlines)
            if !t.isEmpty {
                items.insert(URLQueryItem(name: "term", value: t), at: 0)
            }
        }
        components.queryItems = items
        return components.url ?? businessSearchBaseURL
    }

    /// Convenience alias used in tests and call sites.
    public static func searchURL(
        center: GeoCoordinate,
        radiusMiles: Double = DualProximity.defaultMaxMiles,
        limit: Int = 20,
        term: String? = nil
    ) -> URL {
        businessSearchURL(center: center, radiusMiles: radiusMiles, limit: limit, term: term)
    }

    public func search(
        center: GeoCoordinate,
        radiusMiles: Double,
        limit: Int = 20,
        term: String? = nil
    ) async throws -> [DateNightPlace] {
        guard DateNightConfig.isUsableKey(apiKey) else {
            throw DateNightError.configMissing("YELP_API_KEY")
        }

        let url = Self.businessSearchURL(center: center, radiusMiles: radiusMiles, limit: limit, term: term)

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 20

        let (data, response) = try await http.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw DateNightError.network("Yelp HTTP \(httpResponse.statusCode): \(body.prefix(200))")
        }
        return try Self.decodePlaces(from: data)
    }

    // MARK: - Decode search (testable)

    public static func decodePlaces(from data: Data) throws -> [DateNightPlace] {
        let decoded: YelpSearchResponse
        do {
            decoded = try JSONDecoder().decode(YelpSearchResponse.self, from: data)
        } catch {
            throw DateNightError.decoding("Yelp: \(error.localizedDescription)")
        }
        return decoded.businesses.compactMap { $0.asDateNightPlace() }
    }

    // MARK: - Events
    // GET https://api.yelp.com/v3/events/{id}
    // curl: --url https://api.yelp.com/v3/events/awesome-event -H 'Authorization: Bearer API_KEY'

    /// Builds `…/v3/events/{id}` with path-safe encoding.
    public static func eventURL(eventID: String) -> URL {
        let trimmed = eventID.trimmingCharacters(in: .whitespacesAndNewlines)
        var allowed = CharacterSet.urlPathAllowed
        allowed.remove(charactersIn: "/")
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: allowed) ?? trimmed
        return URL(string: "https://api.yelp.com/v3/events/\(encoded)")!
    }

    /// Events Search: `GET /v3/events?latitude=&longitude=&radius=` (radius in meters).
    public static func eventsSearchURL(
        center: GeoCoordinate,
        radiusMiles: Double = DualProximity.defaultMaxMiles,
        limit: Int = 20
    ) -> URL {
        var components = URLComponents(url: eventsSearchBaseURL, resolvingAgainstBaseURL: false)!
        let radiusMeters = min(40_000, max(100, Int((radiusMiles * 1609.344).rounded())))
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(center.latitude)),
            URLQueryItem(name: "longitude", value: String(center.longitude)),
            URLQueryItem(name: "radius", value: String(radiusMeters)),
            URLQueryItem(name: "limit", value: String(min(50, max(1, limit)))),
            URLQueryItem(name: "sort_on", value: "time_start"),
            URLQueryItem(name: "sort_by", value: "asc"),
        ]
        return components.url ?? eventsSearchBaseURL
    }

    public func event(id eventID: String) async throws -> DateNightPlace {
        let trimmed = eventID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw DateNightError.network("Yelp event lookup requires an event id")
        }
        guard DateNightConfig.isUsableKey(apiKey) else {
            throw DateNightError.configMissing("YELP_API_KEY")
        }

        let url = Self.eventURL(eventID: trimmed)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "accept")
        request.timeoutInterval = 15

        let (data, response) = try await http.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw DateNightError.network("Yelp event HTTP \(httpResponse.statusCode): \(body.prefix(200))")
        }
        return try Self.decodeEvent(from: data)
    }

    public func searchEvents(
        center: GeoCoordinate,
        radiusMiles: Double,
        limit: Int = 20
    ) async throws -> [DateNightPlace] {
        guard DateNightConfig.isUsableKey(apiKey) else {
            throw DateNightError.configMissing("YELP_API_KEY")
        }

        let url = Self.eventsSearchURL(center: center, radiusMiles: radiusMiles, limit: limit)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "accept")
        request.timeoutInterval = 20

        let (data, response) = try await http.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw DateNightError.network("Yelp events HTTP \(httpResponse.statusCode): \(body.prefix(200))")
        }
        return try Self.decodeEvents(from: data)
    }

    public static func decodeEvent(from data: Data) throws -> DateNightPlace {
        let dto: YelpEventDTO
        do {
            dto = try JSONDecoder().decode(YelpEventDTO.self, from: data)
        } catch {
            throw DateNightError.decoding("Yelp event: \(error.localizedDescription)")
        }
        guard let place = dto.asDateNightPlace() else {
            throw DateNightError.decoding("Yelp event missing id/name/coordinates")
        }
        return place
    }

    public static func decodeEvents(from data: Data) throws -> [DateNightPlace] {
        let decoded: YelpEventsSearchResponse
        do {
            decoded = try JSONDecoder().decode(YelpEventsSearchResponse.self, from: data)
        } catch {
            throw DateNightError.decoding("Yelp events: \(error.localizedDescription)")
        }
        return (decoded.events ?? []).compactMap { $0.asDateNightPlace() }
    }

    // MARK: - Reviews (up to 3)
    // GET https://api.yelp.com/v3/businesses/{id}/reviews
    // e.g. /v3/businesses/north-india-restaurant-san-francisco/reviews

    /// Builds `…/v3/businesses/{id}/reviews` with path-safe encoding.
    public static func reviewsURL(businessID: String) -> URL {
        let trimmed = businessID.trimmingCharacters(in: .whitespacesAndNewlines)
        var allowed = CharacterSet.urlPathAllowed
        allowed.remove(charactersIn: "/")
        let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: allowed) ?? trimmed
        return URL(string: "https://api.yelp.com/v3/businesses/\(encoded)/reviews")!
    }

    /// Strips the `yelp:` prefix from `DateNightPlace.id` when present.
    public static func yelpBusinessID(fromPlaceID placeID: String) -> String? {
        if placeID.hasPrefix("yelp:") {
            let raw = String(placeID.dropFirst("yelp:".count))
            return raw.isEmpty ? nil : raw
        }
        if placeID.hasPrefix("tm:") || placeID.hasPrefix("mock:") {
            return nil
        }
        // Bare alias (e.g. north-india-restaurant-san-francisco)
        let t = placeID.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }

    public func reviews(businessID: String, locale: String? = nil) async throws -> YelpReviewsResult {
        let trimmed = businessID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw DateNightError.network("Yelp reviews require a business id")
        }
        guard DateNightConfig.isUsableKey(apiKey) else {
            throw DateNightError.configMissing("YELP_API_KEY")
        }

        var url = Self.reviewsURL(businessID: trimmed)
        if let locale, !locale.isEmpty {
            var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            components.queryItems = [URLQueryItem(name: "locale", value: locale)]
            if let withLocale = components.url { url = withLocale }
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 15

        let (data, response) = try await http.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw DateNightError.network("Yelp reviews HTTP \(httpResponse.statusCode): \(body.prefix(200))")
        }
        return try Self.decodeReviews(from: data)
    }

    /// Convenience: load reviews for a DateNight place id (`yelp:…` or bare alias).
    public func reviews(forPlaceID placeID: String, locale: String? = nil) async throws -> YelpReviewsResult {
        guard let businessID = Self.yelpBusinessID(fromPlaceID: placeID) else {
            throw DateNightError.network("Not a Yelp place id: \(placeID)")
        }
        return try await reviews(businessID: businessID, locale: locale)
    }

    public static func decodeReviews(from data: Data) throws -> YelpReviewsResult {
        let decoded: YelpReviewsDTO
        do {
            decoded = try JSONDecoder().decode(YelpReviewsDTO.self, from: data)
        } catch {
            throw DateNightError.decoding("Yelp reviews: \(error.localizedDescription)")
        }
        let capped = Array(decoded.reviews.prefix(maxReviews)).map { $0.asReview() }
        return YelpReviewsResult(
            reviews: capped,
            total: decoded.total ?? capped.count,
            possibleLanguages: decoded.possible_languages ?? []
        )
    }
}

// MARK: - Reviews models

public struct YelpReviewsResult: Sendable, Equatable {
    public var reviews: [YelpReview]
    public var total: Int
    public var possibleLanguages: [String]

    public init(reviews: [YelpReview], total: Int, possibleLanguages: [String] = []) {
        self.reviews = Array(reviews.prefix(YelpFusionClient.maxReviews))
        self.total = total
        self.possibleLanguages = possibleLanguages
    }
}

/// One Yelp Fusion review. Live payload uses `url` + `user` (no top-level `id`).
public struct YelpReview: Identifiable, Sendable, Equatable, Hashable {
    public var id: String
    public var text: String
    public var rating: Int
    public var timeCreated: String
    public var userName: String
    public var userImageURL: URL?
    /// Deep-link to this review on yelp.com (includes `hrid`).
    public var url: URL?

    public init(
        id: String,
        text: String,
        rating: Int,
        timeCreated: String = "",
        userName: String,
        userImageURL: URL? = nil,
        url: URL? = nil
    ) {
        self.id = id
        self.text = text
        self.rating = rating
        self.timeCreated = timeCreated
        self.userName = userName
        self.userImageURL = userImageURL
        self.url = url
    }
}

private struct YelpReviewsDTO: Decodable, Sendable {
    let reviews: [YelpReviewDTO]
    let total: Int?
    let possible_languages: [String]?
}

/// Matches live Fusion reviews JSON, e.g. North India SF fixture:
/// `{ "url", "text", "user": { "image_url", "name" }, "rating" }` (+ optional legacy fields).
private struct YelpReviewDTO: Decodable, Sendable {
    let id: String?
    let url: String?
    let text: String?
    let rating: Int?
    let time_created: String?
    let user: YelpReviewUserDTO?

    func asReview() -> YelpReview {
        let reviewURL = Self.usableURL(url)
        let image = Self.usableURL(user?.image_url)
        let stableID = id
            ?? Self.hrid(from: reviewURL)
            ?? text.map { String($0.prefix(32)) }
            ?? UUID().uuidString
        return YelpReview(
            id: stableID,
            text: text ?? "",
            rating: rating ?? 0,
            timeCreated: time_created ?? "",
            userName: user?.name ?? "Yelp user",
            userImageURL: image,
            url: reviewURL
        )
    }

    private static func usableURL(_ raw: String?) -> URL? {
        guard let raw else { return nil }
        let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty, let u = URL(string: t), u.scheme != nil else { return nil }
        return u
    }

    /// Extract `hrid` query item from review deep-link for a stable Identifiable id.
    private static func hrid(from url: URL?) -> String? {
        guard let url,
              let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems,
              let hrid = items.first(where: { $0.name == "hrid" })?.value,
              !hrid.isEmpty
        else { return nil }
        return hrid
    }
}

private struct YelpReviewUserDTO: Decodable, Sendable {
    let id: String?
    let profile_url: String?
    let image_url: String?
    let name: String?
}

// MARK: - Autocomplete models

public struct YelpAutocompleteResult: Decodable, Sendable, Equatable {
    public var terms: [YelpAutocompleteTerm]
    public var businesses: [YelpAutocompleteBusiness]
    public var categories: [YelpAutocompleteCategory]

    public init(
        terms: [YelpAutocompleteTerm] = [],
        businesses: [YelpAutocompleteBusiness] = [],
        categories: [YelpAutocompleteCategory] = []
    ) {
        self.terms = terms
        self.businesses = businesses
        self.categories = categories
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        terms = try c.decodeIfPresent([YelpAutocompleteTerm].self, forKey: .terms) ?? []
        businesses = try c.decodeIfPresent([YelpAutocompleteBusiness].self, forKey: .businesses) ?? []
        categories = try c.decodeIfPresent([YelpAutocompleteCategory].self, forKey: .categories) ?? []
    }

    private enum CodingKeys: String, CodingKey {
        case terms, businesses, categories
    }
}

public struct YelpAutocompleteTerm: Decodable, Sendable, Equatable {
    public var text: String
    public init(text: String) { self.text = text }
}

public struct YelpAutocompleteBusiness: Decodable, Sendable, Equatable, Identifiable {
    public var id: String
    public var name: String
    public init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}

public struct YelpAutocompleteCategory: Decodable, Sendable, Equatable {
    public var alias: String
    public var title: String
    public init(alias: String, title: String) {
        self.alias = alias
        self.title = title
    }
}

// MARK: - DTOs

private struct YelpSearchResponse: Decodable, Sendable {
    let businesses: [YelpBusiness]
}

private struct YelpBusiness: Decodable, Sendable {
    let id: String
    let name: String
    let url: String?
    let categories: [YelpCategory]?
    let coordinates: YelpCoordinates?
    let location: YelpLocation?
    let rating: Double?
    let review_count: Int?

    func asDateNightPlace() -> DateNightPlace? {
        guard
            let coordinates,
            let lat = coordinates.latitude,
            let lon = coordinates.longitude,
            let urlString = url,
            let bookingURL = URL(string: urlString)
        else { return nil }

        let city = location?.city ?? location?.address1 ?? "Nearby"
        let cat = categories?.first?.title ?? "Restaurant"
        let ratingText: String
        if let rating {
            ratingText = String(format: "★ %.1f", rating)
        } else {
            ratingText = "Restaurant"
        }
        let reviews = review_count.map { " · \($0) reviews" } ?? ""
        let subtitle = "\(cat) · \(city) · \(ratingText)\(reviews)"

        return DateNightPlace(
            id: "yelp:\(id)",
            category: .restaurant,
            name: name,
            subtitle: subtitle,
            coordinate: GeoCoordinate(latitude: lat, longitude: lon),
            bookingURL: bookingURL,
            provider: "yelp"
        )
    }
}

private struct YelpCategory: Decodable, Sendable {
    let alias: String?
    let title: String?
}

private struct YelpCoordinates: Decodable, Sendable {
    let latitude: Double?
    let longitude: Double?
}

private struct YelpLocation: Decodable, Sendable {
    let city: String?
    let address1: String?
}

// MARK: - Event DTOs

private struct YelpEventsSearchResponse: Decodable, Sendable {
    let events: [YelpEventDTO]?
    let total: Int?
}

private struct YelpEventDTO: Decodable, Sendable {
    let id: String?
    let name: String?
    let description: String?
    let event_site_url: String?
    let image_url: String?
    let time_start: String?
    let is_free: Bool?
    let is_canceled: Bool?
    let category: String?
    let location: YelpEventLocation?
    let latitude: Double?
    let longitude: Double?

    func asDateNightPlace() -> DateNightPlace? {
        guard
            let id,
            let name,
            !(is_canceled ?? false)
        else { return nil }

        let lat = latitude ?? location?.coordinateLatitude
        let lon = longitude ?? location?.coordinateLongitude
        guard let lat, let lon else { return nil }

        let booking: URL
        if let s = event_site_url, let u = URL(string: s) {
            booking = u
        } else if let u = URL(string: "https://www.yelp.com/events/\(id)") {
            booking = u
        } else {
            return nil
        }

        let city = location?.city ?? "Nearby"
        let when = time_start.map { String($0.prefix(16)).replacingOccurrences(of: "T", with: " ") } ?? "Upcoming"
        let free = (is_free == true) ? " · Free" : ""
        let cat = category.map { $0.replacingOccurrences(of: "_", with: " ") } ?? "Event"
        let subtitle = "\(cat) · \(when) · \(city)\(free)"

        return DateNightPlace(
            id: "yelp-event:\(id)",
            category: .event,
            name: name,
            subtitle: subtitle,
            coordinate: GeoCoordinate(latitude: lat, longitude: lon),
            bookingURL: booking,
            provider: "yelp"
        )
    }
}

private struct YelpEventLocation: Decodable, Sendable {
    let city: String?
    let address1: String?
    let display_address: [String]?
    let latitude: Double?
    let longitude: Double?
    /// Some payloads nest coords under `coordinate` or as strings — keep simple Doubles.
    let cross_streets: String?

    var coordinateLatitude: Double? { latitude }
    var coordinateLongitude: Double? { longitude }
}
