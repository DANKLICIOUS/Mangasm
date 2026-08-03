import SwiftUI

public struct ProfileStyleTheme: Sendable {
    public let accent: Color
    public let accentSecondary: Color
    public let cardFill: Color
    public let cardStroke: Color
    public let textPrimary: Color
    public let textSecondary: Color
    public let ringColors: [Color]
    public let fallbackGradient: [Color]

    public static func theme(for id: ProfileStyleId) -> ProfileStyleTheme {
        switch id {
        case .calmStudio:
            return .init(
                accent: Color(hex: "#7BAF7B"),
                accentSecondary: Color(hex: "#E8D5A3"),
                cardFill: Color.white.opacity(0.72),
                cardStroke: Color(hex: "#C9B896").opacity(0.6),
                textPrimary: Color(hex: "#2A2117"),
                textSecondary: Color(hex: "#2A2117").opacity(0.7),
                ringColors: [Color(hex: "#A8D5A2"), Color(hex: "#E8D5A3")],
                fallbackGradient: [Color(hex: "#B8D4E8"), Color(hex: "#E8F0D8"), Color(hex: "#F5E6C8")]
            )
        case .aspirational:
            return .init(
                accent: Color(hex: "#0B6B3A"),
                accentSecondary: Color(hex: "#C9A84C"),
                cardFill: Color.black.opacity(0.35),
                cardStroke: Color(hex: "#C9A84C").opacity(0.5),
                textPrimary: .white,
                textSecondary: .white.opacity(0.75),
                ringColors: [Color(hex: "#C9A84C"), Color(hex: "#0B6B3A")],
                fallbackGradient: [
                    Color(hex: "#0A2F1C"), Color(hex: "#1A5C3A"), Color(hex: "#C9A84C").opacity(0.4),
                ]
            )
        case .precisionTech:
            return .init(
                accent: Color(hex: "#3AD0FF"),
                accentSecondary: Color(hex: "#A8B4C0"),
                cardFill: Color.black.opacity(0.45),
                cardStroke: Color(hex: "#3AD0FF").opacity(0.45),
                textPrimary: .white,
                textSecondary: Color(hex: "#B8C8D8"),
                ringColors: [Color(hex: "#3AD0FF"), Color(hex: "#E8EEF2")],
                fallbackGradient: [
                    Color(hex: "#0A1018"), Color(hex: "#123040"), Color(hex: "#3AD0FF").opacity(0.35),
                ]
            )
        case .digitalFlow:
            return .init(
                accent: Color(hex: "#00FF66"),
                accentSecondary: Color(hex: "#003B1A"),
                cardFill: Color.black.opacity(0.55),
                cardStroke: Color(hex: "#00FF66").opacity(0.4),
                textPrimary: Color(hex: "#D0FFD8"),
                textSecondary: Color(hex: "#80C898"),
                ringColors: [Color(hex: "#00FF66"), Color(hex: "#003B1A")],
                fallbackGradient: [Color.black, Color(hex: "#001A0A"), Color(hex: "#00FF66").opacity(0.25)]
            )
        case .boldExpression:
            return .init(
                accent: Color(hex: "#A78BFA"),
                accentSecondary: Color(hex: "#C0C0C8"),
                cardFill: Color.black.opacity(0.5),
                cardStroke: Color(hex: "#A78BFA").opacity(0.45),
                textPrimary: .white,
                textSecondary: Color(hex: "#D4C4F0"),
                ringColors: [Color(hex: "#A78BFA"), Color(hex: "#C0C0C8")],
                fallbackGradient: [
                    Color(hex: "#0A0612"), Color(hex: "#2A1040"), Color(hex: "#A78BFA").opacity(0.35),
                ]
            )
        }
    }
}
