import Foundation

// MARK: - Category

public enum DateNightCategory: String, Sendable, Hashable, Codable, CaseIterable {
    case restaurant
    case event
    case festival

    public var label: String {
        switch self {
        case .restaurant: return "Restaurant"
        case .event: return "Event"
        case .festival: return "Festival"
        }
    }

    public var systemImage: String {
        switch self {
        case .restaurant: return "fork.knife"
        case .event: return "ticket"
        case .festival: return "music.note.list"
        }
    }
}

// MARK: - Place

/// Unified restaurant / event / festival card for DateNight discovery.
public struct DateNightPlace: Identifiable, Sendable, Hashable, Codable {
    public let id: String
    public var category: DateNightCategory
    public var name: String
    public var subtitle: String
    public var coordinate: GeoCoordinate
    public var bookingURL: URL
    public var provider: String

    public init(
        id: String,
        category: DateNightCategory,
        name: String,
        subtitle: String,
        coordinate: GeoCoordinate,
        bookingURL: URL,
        provider: String
    ) {
        self.id = id
        self.category = category
        self.name = name
        self.subtitle = subtitle
        self.coordinate = coordinate
        self.bookingURL = bookingURL
        self.provider = provider
    }

    /// Deterministic fixture for tests / mock service.
    public static func fixture(
        id: String,
        name: String,
        coordinate: GeoCoordinate,
        category: DateNightCategory,
        bookingURL: URL = URL(string: "https://example.com/book")!
    ) -> DateNightPlace {
        DateNightPlace(
            id: id,
            category: category,
            name: name,
            subtitle: "\(category.label) · party of 2",
            coordinate: coordinate,
            bookingURL: bookingURL,
            provider: "fixture"
        )
    }
}

// MARK: - Query

public struct DateNightQuery: Sendable, Equatable {
    public static let partySize = 2

    public var viewer: GeoCoordinate
    public var match: GeoCoordinate
    public var categories: Set<DateNightCategory>
    /// Yelp Fusion `term` keyword (e.g. "delis"). Empty/nil = open restaurant search.
    public var term: String?

    public init(
        viewer: GeoCoordinate,
        match: GeoCoordinate,
        categories: Set<DateNightCategory> = Set(DateNightCategory.allCases),
        term: String? = nil
    ) {
        self.viewer = viewer
        self.match = match
        self.categories = categories
        self.term = term
    }

    public var center: GeoCoordinate {
        DualProximity.midpoint(viewer: viewer, match: match)
    }

    public var searchRadiusMiles: Double? {
        DualProximity.searchRadiusMiles(viewer: viewer, match: match)
    }
}

// MARK: - Errors

public enum DateNightError: Error, Sendable, Equatable, LocalizedError {
    case missingAnchor(role: String)
    case tooFarApart
    case configMissing(String)
    case network(String)
    case decoding(String)
    case empty

    public var errorDescription: String? {
        switch self {
        case .missingAnchor(let role):
            return "Add a ZIP or turn on location for \(role) so we can find dates within 10 miles of you both."
        case .tooFarApart:
            return "You're more than 20 miles apart — no place sits within 10 miles of both of you."
        case .configMissing(let key):
            return "DateNight isn't configured (\(key))."
        case .network(let message):
            return message
        case .decoding(let message):
            return "Could not read discovery results (\(message))."
        case .empty:
            return "No restaurants or events within 10 miles of both of you."
        }
    }
}

// MARK: - Service protocol

public protocol DateNightService: Sendable {
    func discover(_ query: DateNightQuery) async throws -> [DateNightPlace]
}
