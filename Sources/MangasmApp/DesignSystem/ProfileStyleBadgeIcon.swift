import SwiftUI

/// Circular Community Reputation badge icons (24–40pt).
/// No baked-in text; App Store–safe silhouettes only.
public struct ProfileStyleBadgeIcon: View {
    public let styleId: ProfileStyleId
    public var size: CGFloat

    public init(styleId: ProfileStyleId, size: CGFloat = 32) {
        self.styleId = styleId
        self.size = size
    }

    public var body: some View {
        let theme = ProfileStyleTheme.theme(for: styleId)
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: theme.ringColors,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Circle()
                .strokeBorder(theme.accent.opacity(0.55), lineWidth: max(1, size * 0.04))
            Image(systemName: symbolName)
                .font(.system(size: size * 0.42, weight: .semibold))
                .foregroundStyle(iconForeground)
                .symbolRenderingMode(.hierarchical)
        }
        .frame(width: size, height: size)
        .shadow(color: theme.accent.opacity(0.25), radius: size * 0.08, y: size * 0.04)
        .accessibilityLabel(ProfileStyleCatalog.config(id: styleId).badgeName)
    }

    private var symbolName: String {
        switch styleId {
        case .calmStudio: return "leaf.fill"
        case .aspirational: return "arrow.up.right.circle.fill"
        case .precisionTech: return "checkmark.shield.fill"
        case .digitalFlow: return "point.3.connected.trianglepath.dotted"
        case .boldExpression: return "star.circle.fill"
        }
    }

    private var iconForeground: Color {
        switch styleId {
        case .calmStudio: return Color(hex: "#2A2117")
        case .aspirational, .precisionTech, .digitalFlow, .boldExpression: return .white
        }
    }
}

/// Mini variant for TopBar / nav (24pt).
public struct ProfileStyleBadgeMini: View {
    public let styleId: ProfileStyleId

    public init(styleId: ProfileStyleId) {
        self.styleId = styleId
    }

    public var body: some View {
        ProfileStyleBadgeIcon(styleId: styleId, size: 24)
    }
}
