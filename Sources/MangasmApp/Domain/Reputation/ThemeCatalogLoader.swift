import Foundation

/// Loads `theme-catalog.json` (SSOT) when bundled; falls back to compiled catalog.
public enum ThemeCatalogLoader {
    public struct CatalogFile: Codable, Sendable {
        public let version: Int
        public let framing: String
        public let explainer: String
        public let styles: [StyleRow]
        public let allowedScoreDrivers: [String]
        public let forbiddenScoreDrivers: [String]

        public struct StyleRow: Codable, Sendable {
            public let swiftId: String
            public let rnId: String
            public let minScore: Int
            public let badgeName: String
            public let displayName: String
            public let heroAsset: String
            public let badgeSymbol: String
        }
    }

    public static func loadBundled() -> CatalogFile? {
        let urls = [
            Bundle.module.url(forResource: "theme-catalog", withExtension: "json"),
            Bundle.main.url(forResource: "theme-catalog", withExtension: "json"),
        ].compactMap { $0 }
        for url in urls {
            if let data = try? Data(contentsOf: url),
               let file = try? JSONDecoder().decode(CatalogFile.self, from: data)
            {
                return file
            }
        }
        return nil
    }

    /// Parity check: JSON styles match compiled ProfileStyleCatalog thresholds & names.
    public static func parityIssues(against file: CatalogFile) -> [String] {
        var issues: [String] = []
        let compiled = ProfileStyleCatalog.all
        if file.styles.count != compiled.count {
            issues.append("style count mismatch json=\(file.styles.count) compiled=\(compiled.count)")
        }
        for (row, cfg) in zip(file.styles, compiled) {
            if row.swiftId != cfg.styleId.rawValue {
                issues.append("swiftId \(row.swiftId) != \(cfg.styleId.rawValue)")
            }
            if row.minScore != cfg.minScore {
                issues.append("\(row.swiftId) minScore \(row.minScore) != \(cfg.minScore)")
            }
            if row.badgeName != cfg.badgeName {
                issues.append("\(row.swiftId) badgeName mismatch")
            }
            if row.rnId != cfg.styleId.legacyThemeAlias {
                issues.append("\(row.swiftId) rnId \(row.rnId) != \(cfg.styleId.legacyThemeAlias)")
            }
        }
        for forbidden in file.forbiddenScoreDrivers {
            if ReputationEventPolicy.forbiddenKinds.contains(forbidden) == false
                && ["match_count", "message_volume", "sexual_activity", "romantic_engagement"].contains(forbidden)
            {
                // still ok if listed
            }
            if ReputationEventKind(rawValue: forbidden) != nil {
                issues.append("forbidden driver collides with allowlisted kind \(forbidden)")
            }
        }
        return issues
    }
}
