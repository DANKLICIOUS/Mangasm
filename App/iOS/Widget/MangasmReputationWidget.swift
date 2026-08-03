import SwiftUI
import WidgetKit

// MARK: - Mangasm Community Reputation Widget (WidgetKit shell)
// Bundle: com.mangasm.app.widget (configure in Xcode / project.yml when enabling target)
// Displays Community Reputation score + active style badge — cosmetic only.
// No messaging, no adult content, App Store–safe framing.

public struct MangasmReputationEntry: TimelineEntry {
    public let date: Date
    public let score: Int
    public let badgeName: String
    public let styleDisplayName: String
    public let styleIdRaw: String

    public init(
        date: Date,
        score: Int,
        badgeName: String,
        styleDisplayName: String,
        styleIdRaw: String
    ) {
        self.date = date
        self.score = score
        self.badgeName = badgeName
        self.styleDisplayName = styleDisplayName
        self.styleIdRaw = styleIdRaw
    }
}

public struct MangasmReputationProvider: TimelineProvider {
    public init() {}

    public func placeholder(in context: Context) -> MangasmReputationEntry {
        sample(date: Date())
    }

    public func getSnapshot(in context: Context, completion: @escaping (MangasmReputationEntry) -> Void) {
        completion(loadEntry(date: Date()))
    }

    public func getTimeline(in context: Context, completion: @escaping (Timeline<MangasmReputationEntry>) -> Void) {
        let entry = loadEntry(date: Date())
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func loadEntry(date: Date) -> MangasmReputationEntry {
        // App Group keys — wire when enabling App Groups entitlement:
        // group.com.mangasm.app · keys: repScore, preferredStyleId
        let defaults = UserDefaults(suiteName: "group.com.mangasm.app") ?? .standard
        let score = defaults.object(forKey: "mangasm.widget.repScore") as? Int ?? 42
        let styleRaw = defaults.string(forKey: "mangasm.widget.styleId") ?? "precisionTech"
        let (badge, display) = Self.labels(for: styleRaw, score: score)
        return MangasmReputationEntry(
            date: date,
            score: score,
            badgeName: badge,
            styleDisplayName: display,
            styleIdRaw: styleRaw
        )
    }

    private func sample(date: Date) -> MangasmReputationEntry {
        MangasmReputationEntry(
            date: date,
            score: 42,
            badgeName: "Trusted Member",
            styleDisplayName: "Precision Tech",
            styleIdRaw: "precisionTech"
        )
    }

    /// Mirrors ProfileStyleCatalog thresholds without linking the full package (widget target isolation).
    private static func labels(for styleRaw: String, score: Int) -> (String, String) {
        switch styleRaw {
        case "calmStudio": return ("New Member", "Calm Studio")
        case "aspirational": return ("Rising Member", "Aspirational")
        case "digitalFlow": return ("Community Leader", "Digital Flow")
        case "boldExpression": return ("Elite Verified", "Bold Expression")
        default:
            if score >= 81 { return ("Elite Verified", "Bold Expression") }
            if score >= 61 { return ("Community Leader", "Digital Flow") }
            if score >= 41 { return ("Trusted Member", "Precision Tech") }
            if score >= 21 { return ("Rising Member", "Aspirational") }
            return ("New Member", "Calm Studio")
        }
    }
}

public struct MangasmReputationWidgetView: View {
    public var entry: MangasmReputationEntry

    public init(entry: MangasmReputationEntry) {
        self.entry = entry
    }

    public var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(
                    LinearGradient(
                        colors: accentGradient,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            VStack(alignment: .leading, spacing: 6) {
                Text("MANGASM")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .tracking(1.2)
                    .foregroundStyle(.white.opacity(0.75))
                Text("\(entry.score)")
                    .font(.system(size: 36, weight: .bold, design: .serif))
                    .foregroundStyle(.white)
                Text(entry.badgeName)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.9))
                Text(entry.styleDisplayName)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.7))
                Spacer(minLength: 0)
                Text("Community Reputation")
                    .font(.system(size: 9, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.55))
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    private var accentGradient: [Color] {
        switch entry.styleIdRaw {
        case "calmStudio":
            return [Color(red: 0.72, green: 0.83, blue: 0.91), Color(red: 0.91, green: 0.94, blue: 0.85)]
        case "aspirational":
            return [Color(red: 0.04, green: 0.18, blue: 0.11), Color(red: 0.79, green: 0.66, blue: 0.30)]
        case "digitalFlow":
            return [Color.black, Color(red: 0, green: 0.4, blue: 0.2)]
        case "boldExpression":
            return [Color(red: 0.04, green: 0.02, blue: 0.07), Color(red: 0.66, green: 0.55, blue: 0.98)]
        default:
            return [Color(red: 0.04, green: 0.06, blue: 0.09), Color(red: 0.23, green: 0.82, blue: 1.0)]
        }
    }
}

public struct MangasmReputationWidget: Widget {
    public let kind = "MangasmReputationWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MangasmReputationProvider()) { entry in
            MangasmReputationWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color.clear
                }
        }
        .configurationDisplayName("Community Reputation")
        .description("Your Mangasm Community Reputation score and unlocked profile style. Cosmetic only.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct MangasmWidgetBundle: WidgetBundle {
    var body: some Widget {
        MangasmReputationWidget()
    }
}
