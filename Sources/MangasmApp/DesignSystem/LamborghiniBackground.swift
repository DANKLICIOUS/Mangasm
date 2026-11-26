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
    let url = Bundle.module.url(forResource: name, withExtension: ext)
        ?? Bundle.module.url(forResource: name, withExtension: ext, subdirectory: "themes")
    guard let url else { return nil }
    #if canImport(UIKit)
    if let img = UIImage(contentsOfFile: url.path) { return Image(uiImage: img) }
    #elseif canImport(AppKit)
    if let img = NSImage(contentsOf: url) { return Image(nsImage: img) }
    #endif
    return nil
}

// MARK: - LamborghiniBackground
// Live wrapper plate is `wrapper_hero` (founder glass-on-beach mock).
// Skull Island then the older Lambo plate remain fallbacks.

public struct LamborghiniBackground: View {
    public let night: Bool

    public init(night: Bool) {
        self.night = night
    }

    public var body: some View {
        GeometryReader { geo in
            ZStack {
                if let hero = bundledFileImage(WrapperChrome.plateName, "jpg")
                    ?? bundledFileImage("skull_island_hero", "jpg")
                    ?? bundledFileImage("lambo_hero", "jpg")
                {
                    hero
                        .resizable()
                        .scaledToFill()
                        .frame(width: geo.size.width, height: geo.size.height, alignment: .center)
                        .clipped()
                        .colorMultiply(Color(white: night ? 0.78 : 1.0))
                        .saturation(night ? 0.92 : 1.02)
                } else {
                    LinearGradient(
                        colors: [WrapperChrome.sky, Color(hex: "#C8E4F6"), WrapperChrome.sand],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }

                // Soft iridescent top wash — matches the mock's pearlescent glass, not a night grade.
                LinearGradient(
                    stops: [
                        .init(color: Color.white.opacity(night ? 0.08 : 0.22), location: 0),
                        .init(color: Color.clear, location: 0.38),
                        .init(color: Color.black.opacity(night ? 0.28 : 0.08), location: 1),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
    }
}
