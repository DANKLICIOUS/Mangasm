import SwiftUI

// MARK: - MGPolish
/// App Store–level shine tokens. "Polish" = dusty shoe brought back to life —
/// edges, bevels, shadows — not a redesign. Keep ProfileStyle themes intact.
public enum MGPolish {
    public enum Lift: Sendable {
        case contact  // tight ground contact
        case lift     // card / pill elevation
        case float    // hero card float
    }

    /// Hairline edge weight (0.5–0.7pt band).
    public static let hairline: CGFloat = 0.6

    public static func edgeStroke(glow: Bool = false) -> Color {
        glow ? MGColor.gold.opacity(0.55) : Color.white.opacity(0.72)
    }

    public static func shadowColor(_ lift: Lift) -> Color {
        switch lift {
        case .contact: return Color.black.opacity(0.28)
        case .lift:    return Color.black.opacity(0.32)
        case .float:   return Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.52)
        }
    }

    public static func shadowRadius(_ lift: Lift) -> CGFloat {
        switch lift {
        case .contact: return 3
        case .lift:    return 10
        case .float:   return 22
        }
    }

    public static func shadowY(_ lift: Lift) -> CGFloat {
        switch lift {
        case .contact: return 1.5
        case .lift:    return 6
        case .float:   return 18
        }
    }
}

// MARK: - Edge + bevel

struct MGPolishEdgeModifier: ViewModifier {
    let radius: CGFloat
    var glow: Bool = false

    func body(content: Content) -> some View {
        content
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .strokeBorder(MGPolish.edgeStroke(glow: glow), lineWidth: MGPolish.hairline)
            )
            // Inner bevel: top-white → bottom-ink
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.55),
                                Color.white.opacity(0.08),
                                Color.black.opacity(0.22)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 0.9
                    )
                    .blendMode(.overlay)
                    .allowsHitTesting(false)
            )
    }
}

// MARK: - Lift shadow

struct MGPolishLiftModifier: ViewModifier {
    let lift: MGPolish.Lift
    /// Warm gold key — ONLY for existing gold/glass chrome, not global.
    var warmKey: Bool = false

    func body(content: Content) -> some View {
        content
            // Cool ambient
            .shadow(
                color: MGPolish.shadowColor(lift),
                radius: MGPolish.shadowRadius(lift),
                x: 0,
                y: MGPolish.shadowY(lift)
            )
            // Warm key (opt-in)
            .shadow(
                color: warmKey ? MGColor.gold.opacity(0.18) : Color.clear,
                radius: lift == .float ? 12 : 6,
                x: 0,
                y: 2
            )
    }
}

// MARK: - Specular glass chrome (shine pass over ultraThinMaterial)

struct MGPolishGlassModifier: ViewModifier {
    let radius: CGFloat
    var glow: Bool = false
    var lift: MGPolish.Lift = .lift

    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: radius))
            .modifier(MGPolishEdgeModifier(radius: radius, glow: glow))
            // Specular top-edge wash (softLight)
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .fill(
                        LinearGradient(
                            colors: [.white.opacity(0.78), .white.opacity(0.12), .clear],
                            startPoint: .top,
                            endPoint: .center
                        )
                    )
                    .blendMode(.softLight)
                    .allowsHitTesting(false)
            )
            .modifier(MGPolishLiftModifier(lift: lift, warmKey: glow))
    }
}

public extension View {
    /// Hairline edge + inner bevel. Layout-neutral shine.
    func mgPolishEdge(radius: CGFloat, glow: Bool = false) -> some View {
        modifier(MGPolishEdgeModifier(radius: radius, glow: glow))
    }

    /// Contact / lift / float shadow ladder.
    func mgPolishLift(_ lift: MGPolish.Lift = .lift, warmKey: Bool = false) -> some View {
        modifier(MGPolishLiftModifier(lift: lift, warmKey: warmKey))
    }

    /// Specular glass chrome (replaces ad-hoc ultraThin + stroke stacks on Profile).
    func mgPolishGlass(radius: CGFloat, glow: Bool = false, lift: MGPolish.Lift = .lift) -> some View {
        modifier(MGPolishGlassModifier(radius: radius, glow: glow, lift: lift))
    }
}
