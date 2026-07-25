import Foundation

/// API keys for DateNight providers. Loaded from Info.plist (Secrets.xcconfig).
public struct DateNightConfig: Sendable, Equatable {
    public var yelpAPIKey: String
    public var ticketmasterAPIKey: String

    public init(yelpAPIKey: String, ticketmasterAPIKey: String) {
        self.yelpAPIKey = yelpAPIKey
        self.ticketmasterAPIKey = ticketmasterAPIKey
    }

    public var isUsable: Bool {
        Self.isUsableKey(yelpAPIKey) || Self.isUsableKey(ticketmasterAPIKey)
    }

    public static func fromInfoPlist(_ bundle: Bundle = .main) -> DateNightConfig? {
        let info = bundle.infoDictionary
        let yelp = (info?["YELP_API_KEY"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let tm = (info?["TICKETMASTER_API_KEY"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let config = DateNightConfig(yelpAPIKey: yelp, ticketmasterAPIKey: tm)
        return config.isUsable ? config : nil
    }

    public static func isUsableKey(_ raw: String) -> Bool {
        let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard t.count >= 8 else { return false }
        if t.hasPrefix("$(") { return false }
        if t.uppercased().contains("REPLACE") { return false }
        if t.uppercased().contains("YOUR_") { return false }
        return true
    }
}
