import Foundation

/// Live DateNight discovery: Yelp restaurants + Ticketmaster events/festivals,
/// dual-proximity filtered (≤10 mi of both), booking via deep-links only.
public struct LiveDateNightService: DateNightService {
    private let config: DateNightConfig
    private let yelp: YelpFusionClient
    private let ticketmaster: TicketmasterDiscoveryClient

    public init(config: DateNightConfig, http: any HTTPClient = URLSessionHTTPClient()) {
        self.config = config
        self.yelp = YelpFusionClient(apiKey: config.yelpAPIKey, http: http)
        self.ticketmaster = TicketmasterDiscoveryClient(apiKey: config.ticketmasterAPIKey, http: http)
    }

    public func discover(_ query: DateNightQuery) async throws -> [DateNightPlace] {
        guard MultiProximity.feasible(anchors: query.anchors, maxMiles: query.maxMiles) else {
            throw DateNightError.tooFarApart
        }
        guard let radius = query.searchRadiusMiles, let center = query.center else {
            throw DateNightError.tooFarApart
        }

        var collected: [DateNightPlace] = []
        var lastNetwork: DateNightError?

        if query.categories.contains(.restaurant), DateNightConfig.isUsableKey(config.yelpAPIKey) {
            do {
                let restaurants = try await yelp.search(
                    center: center,
                    radiusMiles: radius,
                    term: query.term
                )
                collected.append(contentsOf: restaurants)
            } catch let error as DateNightError {
                lastNetwork = error
            }
        }

        let wantsLive = query.categories.contains(.event) || query.categories.contains(.festival)

        // Yelp local events (GET /v3/events + optional /v3/events/{id})
        if wantsLive, DateNightConfig.isUsableKey(config.yelpAPIKey) {
            do {
                let yelpEvents = try await yelp.searchEvents(center: center, radiusMiles: radius)
                collected.append(contentsOf: yelpEvents)
            } catch let error as DateNightError {
                lastNetwork = error
            }
        }

        // Ticketmaster events + festivals (when key present)
        if wantsLive, DateNightConfig.isUsableKey(config.ticketmasterAPIKey) {
            do {
                let live = try await ticketmaster.search(center: center, radiusMiles: radius)
                collected.append(contentsOf: live)
            } catch let error as DateNightError {
                lastNetwork = error
            }
        }

        let filtered = MultiProximity.filter(
            places: collected,
            anchors: query.anchors,
            maxMiles: query.maxMiles
        )
        .filter { query.categories.contains($0.category) }
        .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }

        if filtered.isEmpty {
            if let lastNetwork { throw lastNetwork }
            throw DateNightError.empty
        }
        return filtered
    }
}
