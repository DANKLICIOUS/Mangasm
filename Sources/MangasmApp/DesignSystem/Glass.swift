import SwiftUI

/// Shared glass-sheet tokens. Sign-in and other overlays dim
/// `.ultraThinMaterial` so landmark photography still reads through.
enum GlassMorphosis {
    static let materialOpacity: Double = 0.92
}

struct GlassBackground: ViewModifier {
    let radius: CGFloat
    var glow: Bool = false
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: radius))
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .stroke(glow ? MGColor.gold.opacity(0.53) : Color.white.opacity(0.7),
                            lineWidth: glow ? 1 : 0.7)
            )
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .fill(LinearGradient(colors: [.white.opacity(0.72), .clear],
                                         startPoint: .top, endPoint: .center))
                    .blendMode(.overlay).allowsHitTesting(false)
            )
            .shadow(color: .black.opacity(0.25), radius: 16, y: 8)
    }
}

public extension View {
    func glassBackground(_ radius: CGFloat, glow: Bool = false) -> some View {
        modifier(GlassBackground(radius: radius, glow: glow))
    }
}
