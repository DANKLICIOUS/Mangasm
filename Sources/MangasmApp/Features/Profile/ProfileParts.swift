import SwiftUI

// MARK: - Anthem
/// Spotify-style anthem row with an animated Equalizer.
/// Prototype: mangasm-screens.jsx Anthem() — glass button, Spotify green dot + Equalizer,
/// track title + artist, outer Equalizer on right. Static values (no Spotify API).
struct Anthem: View {
    var body: some View {
        HStack(spacing: 11) {
            // Album art placeholder — 42×42 rounded rect
            RoundedRectangle(cornerRadius: 9)
                .fill(MGColor.ink.opacity(0.10))
                .frame(width: 42, height: 42)
                .overlay(
                    Image(systemName: "music.note")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 16, height: 16)
                        .foregroundStyle(MGColor.inkFaint)
                )

            // Track info
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    // Spotify dot with equalizer
                    ZStack {
                        Circle()
                            .fill(MGColor.spotify)
                            .frame(width: 13, height: 13)
                        Equalizer(color: Color(red: 6/255, green: 20/255, blue: 11/255), n: 3)
                            .scaleEffect(0.6)
                    }
                    Text("MY ANTHEM")
                        .font(MGFont.mono(7))
                        .tracking(7 * 0.16)
                        .foregroundStyle(MGColor.spotify)
                }
                Text("Midnight City")
                    .font(MGFont.sans(12.5, .bold))
                    .foregroundStyle(MGColor.ink)
                    .lineLimit(1)
                Text("M83")
                    .font(MGFont.sans(10, .regular))
                    .foregroundStyle(MGColor.inkSoft)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Right equalizer
            Equalizer(color: MGColor.spotify, n: 4)
        }
        .padding(.horizontal, 11)
        .padding(.vertical, 9)
        .mgPolishGlass(radius: 14, glow: false, lift: .lift)
        .padding(.top, 12)
    }
}

// MARK: - SocialRow
/// IG / X handle pill. Prototype: mangasm-screens.jsx Social() — glass pill, gold border, handle text.
struct SocialRow: View {
    enum Kind { case ig, x }
    let kind: Kind
    let handle: String

    var body: some View {
        HStack(spacing: 7) {
            icon
            Text("@\(handle)")
                .font(MGFont.sans(11, .bold))
                .foregroundStyle(MGColor.ink)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 11)
        .padding(.vertical, 7)
        .mgPolishGlass(radius: 11, glow: false, lift: .contact)
    }

    @ViewBuilder
    private var icon: some View {
        switch kind {
        case .ig:
            // Instagram icon: rounded rect + circle + dot
            Canvas { ctx, size in
                let s = min(size.width, size.height)
                let r = s * 0.28
                let rect = CGRect(x: 0, y: 0, width: s, height: s)
                // Outer rounded rect
                let path = Path(roundedRect: rect, cornerRadius: r)
                ctx.stroke(path, with: .color(MGColor.gold), style: StrokeStyle(lineWidth: s * 0.12))
                // Inner circle
                let inset = s * 0.29
                let circlePath = Path(ellipseIn: CGRect(x: inset, y: inset,
                                                        width: s - 2 * inset,
                                                        height: s - 2 * inset))
                ctx.stroke(circlePath, with: .color(MGColor.gold), style: StrokeStyle(lineWidth: s * 0.11))
                // Corner dot
                let dotSize = s * 0.12
                let dotPath = Path(ellipseIn: CGRect(x: s * 0.71, y: s * 0.17, width: dotSize, height: dotSize))
                ctx.fill(dotPath, with: .color(MGColor.gold))
            }
            .frame(width: 14, height: 14)

        case .x:
            // X (Twitter) icon: simplified X shape
            Canvas { ctx, size in
                let s = min(size.width, size.height)
                // Two diagonal paths forming X: prototype uses SVG path for the X logo
                var p1 = Path()
                p1.move(to: CGPoint(x: s * 0.05, y: s * 0.05))
                p1.addLine(to: CGPoint(x: s * 0.95, y: s * 0.95))
                var p2 = Path()
                p2.move(to: CGPoint(x: s * 0.95, y: s * 0.05))
                p2.addLine(to: CGPoint(x: s * 0.05, y: s * 0.95))
                ctx.stroke(p1, with: .color(MGColor.gold), style: StrokeStyle(lineWidth: s * 0.13, lineCap: .round))
                ctx.stroke(p2, with: .color(MGColor.gold), style: StrokeStyle(lineWidth: s * 0.13, lineCap: .round))
            }
            .frame(width: 13, height: 13)
        }
    }
}
