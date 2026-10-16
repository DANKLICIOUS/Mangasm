import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// Loads a RAW resource file (not an asset catalog) from the package bundle as
/// a SwiftUI `Image`. `Image(name:bundle:)` only finds asset-catalog images, so
/// a bundled hero JPEG silently renders empty with that initializer.
func bundledFileImage(_ name: String, _ ext: String) -> Image? {
    guard let url = Bundle.module.url(forResource: name, withExtension: ext) else { return nil }
    #if canImport(UIKit)
    if let img = UIImage(contentsOfFile: url.path) { return Image(uiImage: img) }
    #elseif canImport(AppKit)
    if let img = NSImage(contentsOf: url) { return Image(nsImage: img) }
    #endif
    return nil
}

// MARK: - LamborghiniBackground
// App chrome plate. Skull Island (`skull_island_hero`) is the Guideline 4.3
// significant-change identity; the older Lambo plate remains a fallback.

public struct LamborghiniBackground: View {
    public let night: Bool

    public init(night: Bool) {
        self.night = night
    }

    public var body: some View {
        GeometryReader { geo in
            ZStack {
                if let hero = bundledFileImage("skull_island_hero", "jpg")
                    ?? bundledFileImage("lambo_hero", "jpg")
                {
                    hero
                        .resizable()
                        .scaledToFill()
                        .frame(width: geo.size.width, height: geo.size.height, alignment: .bottom)
                        .clipped()
                        .colorMultiply(Color(white: night ? 0.72 : 1.0))
                        .saturation(night ? 1.12 : 1.08)
                        .contrast(night ? 1.06 : 1.02)
                } else {
                    LinearGradient(
                        stops: [
                            .init(color: MGColor.jungleInk, location: 0),
                            .init(color: MGColor.jungleCanopy, location: 0.45),
                            .init(color: MGColor.jungleInk, location: 1),
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                }

                JungleMistOverlay()
                    .blendMode(.screen)
                    .opacity(night ? 0.28 : 0.18)

                if night {
                    LinearGradient(
                        stops: [
                            .init(color: MGColor.jungleInk.opacity(0.55), location: 0),
                            .init(color: MGColor.jungleInk.opacity(0.12), location: 0.38),
                            .init(color: MGColor.jungleInk.opacity(0.28), location: 0.72),
                            .init(color: Color.black.opacity(0.72), location: 1),
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                } else {
                    LinearGradient(
                        stops: [
                            .init(color: MGColor.jungleInk.opacity(0.22), location: 0),
                            .init(color: Color.clear, location: 0.42),
                            .init(color: MGColor.jungleInk.opacity(0.10), location: 0.76),
                            .init(color: Color.black.opacity(0.28), location: 1),
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                }

                RadialGradient(
                    colors: [
                        MGColor.campfire.opacity(night ? 0.28 : 0.16),
                        Color.clear,
                    ],
                    center: .init(x: 0.42, y: 0.78),
                    startRadius: 0,
                    endRadius: geo.size.width * 0.85
                )
                .blendMode(.screen)

                RadialGradient(
                    colors: [
                        Color.clear,
                        Color.black.opacity(night ? 0.58 : 0.30),
                    ],
                    center: .center,
                    startRadius: geo.size.width * 0.28,
                    endRadius: geo.size.width * 0.82
                )
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
    }
}

/// Soft horizontal fog bands — Skull Island atmosphere instead of carbon fibre.
private struct JungleMistOverlay: View {
    var body: some View {
        Canvas { ctx, size in
            let bands = 5
            for i in 0..<bands {
                let y = size.height * (0.18 + CGFloat(i) * 0.14)
                let rect = CGRect(x: -20, y: y, width: size.width + 40, height: 28)
                ctx.fill(
                    Path(ellipseIn: rect),
                    with: .color(Color.white.opacity(0.04 + Double(i) * 0.01))
                )
            }
        }
        .allowsHitTesting(false)
    }
}
