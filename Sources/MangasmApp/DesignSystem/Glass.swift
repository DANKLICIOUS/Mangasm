import SwiftUI

/// Legacy glass API — body delegates to `mgPolishGlass` so Profile and shared
/// chrome share one shine system (no duplicate ad-hoc glass stacks).
struct GlassBackground: ViewModifier {
    let radius: CGFloat
    var glow: Bool = false
    func body(content: Content) -> some View {
        content
            .mgPolishGlass(radius: radius, glow: glow)
    }
}

public extension View {
    func glassBackground(_ radius: CGFloat, glow: Bool = false) -> some View {
        modifier(GlassBackground(radius: radius, glow: glow))
    }
}
