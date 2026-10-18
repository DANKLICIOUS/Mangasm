import SwiftUI

// MARK: - MapPin (data)
// Each pin carries a candidate reference + percentage-based position on the map canvas.
// Prototype pin coords from mangasm-profile.jsx PINS array.
struct MapPinData {
    let candidate: Candidate
    let xPct: CGFloat   // 0–1, left to right
    let yPct: CGFloat   // 0–1, top to bottom
}

// MARK: - FakeMap
// Prototype: mangasm-profile.jsx, the faux map block (~lines 173–207).
// Base: linear-gradient(150deg, #eef2f4, #e6ece6 50%, #f1ece2)
// Street lines: SVG <g> with thick (#c8cfd2, sw7) and thin (#d6dbd2, sw2.5) paths.
// Radial gold glow: radial-gradient top-center, rgba(201,168,76,0.12).
// Pins: glass pill + avatar circle; hot (≥85) gets gold border + glow + gold ring.
// Privacy badge: bottom-left green dot + "Privacy zone · neighborhood only".
struct FakeMap: View {
    let pins: [MapPinData]

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height

            ZStack(alignment: .bottomLeading) {
                // ── Base gradient ───────────────────────────────────────────
                LinearGradient(
                    stops: [
                        .init(color: Color(red: 0.933, green: 0.949, blue: 0.957), location: 0),
                        .init(color: Color(red: 0.902, green: 0.925, blue: 0.902), location: 0.5),
                        .init(color: Color(red: 0.945, green: 0.925, blue: 0.886), location: 1),
                    ],
                    startPoint: UnitPoint(x: 0.17, y: 0),   // 150deg ≈ bottom-left bias
                    endPoint:   UnitPoint(x: 0.83, y: 1)
                )

                // ── Street lines ────────────────────────────────────────────
                // Thick roads (stroke #c8cfd2, width ~7 in a 320×200 viewBox → scale to actual)
                let scaleX = w / 320
                let scaleY = h / 200

                Canvas { ctx, size in
                    // Thick roads
                    let thickColor = Color(red: 0.784, green: 0.812, blue: 0.824)
                    let thinColor  = Color(red: 0.839, green: 0.859, blue: 0.824)

                    // Thick strokes — prototype paths in 320×200 space
                    let thickPaths: [(CGPoint, CGPoint, CGPoint, CGPoint)] = [
                        (CGPoint(x: -10, y: 60), CGPoint(x: 120, y: 50), CGPoint(x: 200, y: 90), CGPoint(x: 340, y: 70)),
                        (CGPoint(x: 40,  y: -10), CGPoint(x: 70,  y: 90), CGPoint(x: 50,  y: 220), CGPoint(x: 50, y: 220)),
                        (CGPoint(x: 150, y: -10), CGPoint(x: 170, y: 100), CGPoint(x: 240, y: 220), CGPoint(x: 240, y: 220)),
                        (CGPoint(x: -10, y: 140), CGPoint(x: 130, y: 150), CGPoint(x: 260, y: 130), CGPoint(x: 340, y: 150)),
                        (CGPoint(x: 250, y: -10), CGPoint(x: 270, y: 80), CGPoint(x: 260, y: 220), CGPoint(x: 260, y: 220)),
                    ]

                    for pts in thickPaths {
                        var p = Path()
                        p.move(to: CGPoint(x: pts.0.x * scaleX, y: pts.0.y * scaleY))
                        p.addLine(to: CGPoint(x: pts.1.x * scaleX, y: pts.1.y * scaleY))
                        if pts.2 != pts.1 {
                            p.addLine(to: CGPoint(x: pts.2.x * scaleX, y: pts.2.y * scaleY))
                        }
                        if pts.3 != pts.2 {
                            p.addLine(to: CGPoint(x: pts.3.x * scaleX, y: pts.3.y * scaleY))
                        }
                        ctx.stroke(p, with: .color(thickColor), style: StrokeStyle(lineWidth: 7 * min(scaleX, scaleY), lineCap: .round))
                    }

                    // Thin strokes
                    let thinLines: [(CGPoint, CGPoint)] = [
                        (CGPoint(x: 0,   y: 30),  CGPoint(x: 320, y: 20)),
                        (CGPoint(x: 0,   y: 110), CGPoint(x: 320, y: 100)),
                        (CGPoint(x: 100, y: 0),   CGPoint(x: 120, y: 200)),
                        (CGPoint(x: 210, y: 0),   CGPoint(x: 225, y: 200)),
                    ]
                    for line in thinLines {
                        var p = Path()
                        p.move(to: CGPoint(x: line.0.x * scaleX, y: line.0.y * scaleY))
                        p.addLine(to: CGPoint(x: line.1.x * scaleX, y: line.1.y * scaleY))
                        ctx.stroke(p, with: .color(thinColor), style: StrokeStyle(lineWidth: 2.5 * min(scaleX, scaleY)))
                    }
                }
                .opacity(0.5)

                // ── Radial gold glow ────────────────────────────────────────
                // prototype: radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.12), transparent 55%)
                RadialGradient(
                    colors: [MGColor.gold.opacity(0.12), .clear],
                    center: .init(x: 0.5, y: 0),
                    startRadius: 0,
                    endRadius: w * 0.6
                )
                .allowsHitTesting(false)

                // ── Pins ────────────────────────────────────────────────────
                ForEach(pins, id: \.candidate.id) { pin in
                    MapPinView(pin: pin)
                        .position(
                            x: pin.xPct * w,
                            y: pin.yPct * h
                        )
                }

                // ── Privacy zone badge ──────────────────────────────────────
                HStack(spacing: 5) {
                    Circle()
                        .fill(MGColor.spotify)
                        .frame(width: 6, height: 6)
                        .shadow(color: MGColor.spotify.opacity(1), radius: 3)
                    Text("Privacy zone · neighborhood only")
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(MGColor.inkSoft)
                }
                .padding(.vertical, 4)
                .padding(.horizontal, 9)
                .glassBackground(10)
                .padding(.leading, 10)
                .padding(.bottom, 9)
            }
            .clipped()
        }
    }
}

// MARK: - MapPinView
// Glass pill: avatar circle (with optional gold ring if hot) + match% label.
// Prototype: pill container glass(true, 0.7); hot = 1.5px GOLD border + gold glow ring;
// cool = 0.7px white border; avatar 26×26 circle; match% mono 8pt; stem 2×8 line below.
private struct MapPinView: View {
    let pin: MapPinData

    private var hot: Bool { pin.candidate.matchPct >= 85 }

    var body: some View {
        VStack(spacing: 0) {
            // Pill
            HStack(spacing: 5) {
                // Avatar circle with optional gold ring
                ZStack {
                    if hot {
                        // Gold ring behind avatar
                        Circle()
                            .fill(LinearGradient(
                                colors: [MGColor.goldBright, MGColor.goldDeep],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            ))
                            .frame(width: 30, height: 30)
                    }
                    AsyncImage(url: URL(string: pin.candidate.avatarURL ?? "")) { phase in
                        switch phase {
                        case .success(let img):
                            img.resizable().scaledToFill()
                        default:
                            Circle()
                                .fill(LinearGradient(
                                    colors: [MGColor.goldBright.opacity(0.5), MGColor.goldDeep.opacity(0.5)],
                                    startPoint: .topLeading, endPoint: .bottomTrailing
                                ))
                        }
                    }
                    .frame(width: 26, height: 26)
                    .clipShape(Circle())
                }
                .frame(width: hot ? 30 : 26, height: hot ? 30 : 26)

                Text("\(pin.candidate.matchPct)%")
                    .font(MGFont.mono(8).weight(.bold))
                    .foregroundStyle(hot ? MGColor.goldDeep : MGColor.inkSoft)
            }
            .padding(.vertical, 3)
            .padding(.leading, 3)
            .padding(.trailing, 8)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(
                Capsule()
                    .stroke(
                        hot ? AnyShapeStyle(LinearGradient(colors: [MGColor.gold, MGColor.goldDeep], startPoint: .topLeading, endPoint: .bottomTrailing))
                             : AnyShapeStyle(Color.white.opacity(0.8)),
                        lineWidth: hot ? 1.5 : 0.7
                    )
            )
            .shadow(
                color: hot ? MGColor.gold.opacity(0.7) : Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.35),
                radius: hot ? 7 : 6,
                x: 0, y: 4
            )
            // Gold outer glow ring for hot pins
            .overlay(
                Capsule()
                    .stroke(MGColor.gold.opacity(hot ? 0.15 : 0), lineWidth: hot ? 6 : 0)
                    .blur(radius: hot ? 4 : 0)
            )

            // Stem
            Rectangle()
                .fill(hot ? MGColor.gold : Color.white.opacity(0.85))
                .frame(width: 2, height: 8)
        }
    }
}
