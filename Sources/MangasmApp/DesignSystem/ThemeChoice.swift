import SwiftUI

/// Four App Review identity choices in `/themes`. Live shell chrome is the
/// founder glass wrapper (`wrapper_hero`), not one of these four.
/// Storage id for reputation styles stays `calmStudio`.
public enum ThemeChoiceId: String, CaseIterable, Sendable, Codable {
    case viral
    case effective
    case fantasy
    case steampunk

    public var displayName: String {
        switch self {
        case .viral: return "Afterglow"
        case .effective: return "Long Table"
        case .fantasy: return "Aether"
        case .steampunk: return "Inkhouse"
        }
    }

    public var lane: String {
        switch self {
        case .viral: return "Viral · most popular"
        case .effective: return "Effective · most used"
        case .fantasy: return "Fantasy · futuristic"
        case .steampunk: return "Steampunk · gothic punk tattoo"
        }
    }

    public var heroAssetName: String {
        rawValue
    }
}

public struct ThemeChoicePalette: Sendable {
    public let background: Color
    public let text: Color
    public let accent: Color
    public let accentSecondary: Color
    public let ctaFill: Color
    public let ctaText: Color

    public static func palette(for id: ThemeChoiceId) -> ThemeChoicePalette {
        switch id {
        case .viral:
            return .init(
                background: Color(hex: "#0A0A0C"),
                text: .white,
                accent: Color(hex: "#F2FF3A"),
                accentSecondary: Color(hex: "#FF2D7A"),
                ctaFill: Color(hex: "#F2FF3A"),
                ctaText: Color(hex: "#111111")
            )
        case .effective:
            return .init(
                background: Color(hex: "#1C1916"),
                text: Color(hex: "#F4F1EA"),
                accent: Color(hex: "#C45C26"),
                accentSecondary: Color(hex: "#E8C4A2"),
                ctaFill: Color(hex: "#C45C26"),
                ctaText: .white
            )
        case .fantasy:
            return .init(
                background: Color(hex: "#070B14"),
                text: Color(hex: "#D8F6FF"),
                accent: Color(hex: "#3AD0FF"),
                accentSecondary: Color(hex: "#A78BFA"),
                ctaFill: Color(hex: "#070B14"),
                ctaText: Color(hex: "#3AD0FF")
            )
        case .steampunk:
            return .init(
                background: Color(hex: "#100808"),
                text: Color(hex: "#F3E6C8"),
                accent: Color(hex: "#C4A36A"),
                accentSecondary: Color(hex: "#6B1D2A"),
                ctaFill: Color(hex: "#6B1D2A"),
                ctaText: Color(hex: "#F3E6C8")
            )
        }
    }
}
