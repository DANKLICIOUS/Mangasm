import Foundation

/// Offline / preview discovery with dual-proximity enforcement.
public struct MockDateNightService: DateNightService {
    private let fixtures: [DateNightPlace]

    public init(fixtures: [DateNightPlace]? = nil) {
        if let fixtures {
            self.fixtures = fixtures
        } else {
            // Default Miami-ish samples for Simulator when API keys absent.
            let center = GeoCoordinate(latitude: 25.776, longitude: -80.16)
            self.fixtures = [
                DateNightPlace(
                    id: "mock:ossiano",
                    category: .restaurant,
                    name: "Ossiano · Atlantis",
                    subtitle: "Restaurant · Underwater fine dining · party of 2",
                    coordinate: center,
                    bookingURL: URL(string: "https://www.yelp.com/biz/ossiano-dubai")!,
                    provider: "mock"
                ),
                DateNightPlace(
                    id: "mock:kyū",
                    category: .restaurant,
                    name: "Kyū",
                    subtitle: "Restaurant · Japanese · Miami · ★ 4.5",
                    coordinate: GeoCoordinate(latitude: 25.779, longitude: -80.19),
                    bookingURL: URL(string: "https://www.yelp.com/biz/kyu-miami")!,
                    provider: "mock"
                ),
                DateNightPlace(
                    id: "mock:ultra",
                    category: .festival,
                    name: "Ultra Music Festival",
                    subtitle: "Festival · Bayfront Park, Miami",
                    coordinate: GeoCoordinate(latitude: 25.778, longitude: -80.186),
                    bookingURL: URL(string: "https://www.ticketmaster.com/")!,
                    provider: "mock"
                ),
                DateNightPlace(
                    id: "mock:jazz",
                    category: .event,
                    name: "Jazz Night",
                    subtitle: "Event · Adrienne Arsht, Miami",
                    coordinate: GeoCoordinate(latitude: 25.791, longitude: -80.189),
                    bookingURL: URL(string: "https://www.ticketmaster.com/")!,
                    provider: "mock"
                ),
            ]
        }
    }

    public func discover(_ query: DateNightQuery) async throws -> [DateNightPlace] {
        if DualProximity.usersTooFarApart(viewer: query.viewer, match: query.match) {
            throw DateNightError.tooFarApart
        }
        let filtered = DualProximity.filter(
            places: fixtures,
            viewer: query.viewer,
            match: query.match
        )
        .filter { query.categories.contains($0.category) }

        if filtered.isEmpty { throw DateNightError.empty }
        return filtered
    }
}
