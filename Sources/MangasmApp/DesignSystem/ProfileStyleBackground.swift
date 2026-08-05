import SwiftUI

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

public struct ProfileStyleBackground: View {
    public let styleId: ProfileStyleId
    public var showRain: Bool

    public init(styleId: ProfileStyleId, showRain: Bool = true) {
        self.styleId = styleId
        self.showRain = showRain
    }

    public var body: some View {
        let theme = ProfileStyleTheme.theme(for: styleId)
        let config = ProfileStyleCatalog.config(id: styleId)
        ZStack {
            LinearGradient(
                colors: theme.fallbackGradient,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            if let hero = Self.heroImage(named: config.heroAssetName) {
                hero
                    .resizable()
                    .scaledToFill()
                    .opacity(0.55)
                    .clipped()
            }
            if styleId == .digitalFlow && showRain {
                DigitalRainOverlay()
                    .opacity(0.35)
                    .allowsHitTesting(false)
            }
            LinearGradient(
                colors: [.black.opacity(0.12), .black.opacity(0.42)],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        .ignoresSafeArea()
    }

    private static func heroImage(named name: String) -> Image? {
        // Prefer SPM resource bundle (Resources/style-hero-*.jpg), then main catalog.
        if let url = Bundle.module.url(forResource: name, withExtension: "jpg")
            ?? Bundle.module.url(forResource: name, withExtension: "png")
        {
            #if canImport(UIKit)
            if let ui = UIImage(contentsOfFile: url.path) {
                return Image(uiImage: ui)
            }
            #elseif canImport(AppKit)
            if let ns = NSImage(contentsOf: url) {
                return Image(nsImage: ns)
            }
            #endif
        }
        #if canImport(UIKit)
        if let ui = UIImage(named: name) {
            return Image(uiImage: ui)
        }
        #endif
        return nil
    }
}

/// Lightweight green “rain” — static when Reduce Motion is on.
struct DigitalRainOverlay: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: reduceMotion ? 60 : 0.08, paused: reduceMotion)) { timeline in
            Canvas { context, size in
                let cols = max(1, Int(size.width / 14))
                let t = timeline.date.timeIntervalSinceReferenceDate
                for c in 0..<cols {
                    let x = CGFloat(c) * 14 + 4
                    let seed = Double(c) * 12.3
                    let y: CGFloat
                    if reduceMotion {
                        y = CGFloat(c % 7) * 40
                    } else {
                        y = CGFloat((t * 40 + seed).truncatingRemainder(dividingBy: Double(size.height + 40)))
                    }
                    let rect = CGRect(x: x, y: y - 40, width: 2, height: 28)
                    context.fill(Path(rect), with: .color(Color(hex: "#00FF66").opacity(0.5)))
                }
            }
        }
    }
}
