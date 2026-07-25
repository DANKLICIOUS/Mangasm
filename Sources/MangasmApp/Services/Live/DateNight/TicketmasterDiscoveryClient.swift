import Foundation

/// Ticketmaster Discovery API — events and festivals (Live Nation inventory).
/// Ticketing is deep-link only via event `url`.
public struct TicketmasterDiscoveryClient: Sendable {
    public static let eventsURL = URL(string: "https://app.ticketmaster.com/discovery/v2/events.json")!

    private let apiKey: String
    private let http: any HTTPClient

    public init(apiKey: String, http: any HTTPClient = URLSessionHTTPClient()) {
        self.apiKey = apiKey
        self.http = http
    }

    public func search(
        center: GeoCoordinate,
        radiusMiles: Double,
        size: Int = 20
    ) async throws -> [DateNightPlace] {
        guard DateNightConfig.isUsableKey(apiKey) else {
            throw DateNightError.configMissing("TICKETMASTER_API_KEY")
        }

        var components = URLComponents(url: Self.eventsURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "apikey", value: apiKey),
            URLQueryItem(name: "latlong", value: "\(center.latitude),\(center.longitude)"),
            URLQueryItem(name: "radius", value: String(format: "%.1f", max(1, radiusMiles))),
            URLQueryItem(name: "unit", value: "miles"),
            URLQueryItem(name: "size", value: String(min(50, max(1, size)))),
            URLQueryItem(name: "sort", value: "date,asc"),
        ]
        guard let url = components.url else {
            throw DateNightError.network("Invalid Ticketmaster URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 20

        let (data, response) = try await http.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw DateNightError.network("Ticketmaster HTTP \(httpResponse.statusCode): \(body.prefix(200))")
        }
        return try Self.decodePlaces(from: data)
    }

    // MARK: - Decode (testable)

    public static func decodePlaces(from data: Data) throws -> [DateNightPlace] {
        let decoded: TMDiscoveryResponse
        do {
            decoded = try JSONDecoder().decode(TMDiscoveryResponse.self, from: data)
        } catch {
            throw DateNightError.decoding("Ticketmaster: \(error.localizedDescription)")
        }
        return (decoded.embedded?.events ?? []).compactMap { $0.asDateNightPlace() }
    }
}

// MARK: - DTOs

private struct TMDiscoveryResponse: Decodable, Sendable {
    let embedded: TMEmbedded?

    enum CodingKeys: String, CodingKey {
        case embedded = "_embedded"
    }
}

private struct TMEmbedded: Decodable, Sendable {
    let events: [TMEvent]?
}

private struct TMEvent: Decodable, Sendable {
    let id: String
    let name: String
    let url: String?
    let classifications: [TMClassification]?
    let dates: TMDates?
    let embedded: TMEventEmbedded?

    enum CodingKeys: String, CodingKey {
        case id, name, url, classifications, dates
        case embedded = "_embedded"
    }

    func asDateNightPlace() -> DateNightPlace? {
        guard
            let urlString = url,
            let bookingURL = URL(string: urlString),
            let venue = embedded?.venues?.first,
            let latStr = venue.location?.latitude,
            let lonStr = venue.location?.longitude,
            let lat = Double(latStr),
            let lon = Double(lonStr)
        else { return nil }

        let when = dates?.start?.display ?? "Upcoming"
        let city = venue.city?.name ?? venue.name ?? "Nearby"
        let venueName = venue.name ?? "Venue"
        let category = Self.inferCategory(classifications)
        let subtitle = "\(category.label) · \(when) · \(venueName), \(city)"

        return DateNightPlace(
            id: "tm:\(id)",
            category: category,
            name: name,
            subtitle: subtitle,
            coordinate: GeoCoordinate(latitude: lat, longitude: lon),
            bookingURL: bookingURL,
            provider: "ticketmaster"
        )
    }

    private static func inferCategory(_ classifications: [TMClassification]?) -> DateNightCategory {
        let blob = (classifications ?? [])
            .flatMap { c -> [String] in
                [c.segment?.name, c.genre?.name, c.subGenre?.name].compactMap { $0 }
            }
            .joined(separator: " ")
            .lowercased()
        if blob.contains("festival") { return .festival }
        return .event
    }
}

private struct TMClassification: Decodable, Sendable {
    let segment: TMNamed?
    let genre: TMNamed?
    let subGenre: TMNamed?
}

private struct TMNamed: Decodable, Sendable {
    let name: String?
}

private struct TMDates: Decodable, Sendable {
    let start: TMStart?
}

private struct TMStart: Decodable, Sendable {
    let localDate: String?
    let localTime: String?

    var display: String {
        switch (localDate, localTime) {
        case let (d?, t?): return "\(d) · \(String(t.prefix(5)))"
        case let (d?, nil): return d
        default: return "Upcoming"
        }
    }
}

private struct TMEventEmbedded: Decodable, Sendable {
    let venues: [TMVenue]?
}

private struct TMVenue: Decodable, Sendable {
    let name: String?
    let city: TMNamed?
    let location: TMLocation?
}

private struct TMLocation: Decodable, Sendable {
    let latitude: String?
    let longitude: String?
}
