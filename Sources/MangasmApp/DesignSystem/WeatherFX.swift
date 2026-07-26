import SwiftUI

// MARK: - Weather Enum
// Defined here (Task 4). Task 5+ must NOT redefine it.
public enum Weather: String, CaseIterable, Sendable {
    case clear, cloudy, rain, heavyRain, sleet, snow

    /// Cute glyph for pills and the weather selector (single source of truth).
    public var sfSymbol: String {
        switch self {
        case .clear:     return "sun.max.fill"
        case .cloudy:    return "cloud.fill"
        case .rain:      return "cloud.drizzle.fill"
        case .heavyRain: return "cloud.heavyrain.fill"
        case .sleet:     return "cloud.sleet.fill"
        case .snow:      return "snowflake"
        }
    }
}

// MARK: - Deterministic particle helpers
// Seeded hash: maps (index, salt) → Double in [0, 1).
// Uses splitmix64-style mixing so each field gets an independent,
// stable distribution with no global RNG state.
private func hash(_ i: Int, _ salt: UInt64) -> Double {
    var x = UInt64(bitPattern: Int64(i)) &+ salt
    x = (x ^ (x >> 30)) &* 0xBF58476D1CE4E5B9
    x = (x ^ (x >> 27)) &* 0x94D049BB133111EB
    x = x ^ (x >> 31)
    return Double(x) / Double(UInt64.max)
}

// MARK: - Rain
// Two depth layers: far (blurred, 40–64 drops) and near (sharp, 18–30 drops).
// Particle positions are seeded from index; animation phase derived from TimelineView date.
private struct Rain: View {
    let heavy: Bool

    // Static params derived deterministically from index.
    private struct Drop {
        let left: Double   // 0–106 (% of width, shifted -3)
        let delay: Double  // phase offset in seconds
        let dur: Double    // cycle duration
        let len: Double    // streak length (pt)
        let op: Double     // opacity
        let w: Double      // stroke width
    }

    private func makeFar() -> [Drop] {
        let n = heavy ? 64 : 40
        return (0..<n).map { i in
            Drop(
                left:  hash(i, 0x1111_0001) * 106 - 3,
                delay: hash(i, 0x2222_0001) * 1.6,
                dur:   0.72 + hash(i, 0x3333_0001) * 0.4,
                len:   8    + hash(i, 0x4444_0001) * 7,
                op:    0.10 + hash(i, 0x5555_0001) * 0.16,
                w:     0.8
            )
        }
    }

    private func makeNear() -> [Drop] {
        let n = heavy ? 30 : 18
        return (0..<n).map { i in
            Drop(
                left:  hash(i, 0x1111_0002) * 106 - 3,
                delay: hash(i, 0x2222_0002) * 1.6,
                dur:   0.34 + hash(i, 0x3333_0002) * 0.16,
                len:   22   + hash(i, 0x4444_0002) * 16,
                op:    0.22 + hash(i, 0x5555_0002) * 0.34,
                w:     1.7
            )
        }
    }

    var body: some View {
        let far = makeFar()
        let near = makeNear()
        let rot: Double = heavy ? 14 : 8

        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height

            TimelineView(.animation) { tl in
                let t = tl.date.timeIntervalSinceReferenceDate
                ZStack {
                    // Far layer: blurred
                    Canvas { ctx, size in
                        for drop in far {
                            let phase = ((t / drop.dur) + drop.delay)
                                .truncatingRemainder(dividingBy: 1)
                            let y = -drop.len + phase * (size.height + drop.len)
                            let x = drop.left / 100 * size.width

                            var path = Path()
                            path.move(to: CGPoint(x: x, y: y))
                            path.addLine(to: CGPoint(x: x + sin(rot * .pi / 180) * drop.len,
                                                     y: y + cos(rot * .pi / 180) * drop.len))
                            ctx.stroke(path,
                                       with: .color(red: 208/255, green: 224/255, blue: 250/255,
                                                    opacity: drop.op),
                                       style: StrokeStyle(lineWidth: drop.w, lineCap: .round))
                        }
                    }
                    .blur(radius: 1.4)
                    .opacity(0.85)

                    // Near layer: sharp
                    Canvas { ctx, size in
                        for drop in near {
                            let phase = ((t / drop.dur) + drop.delay)
                                .truncatingRemainder(dividingBy: 1)
                            let y = -drop.len + phase * (size.height + drop.len)
                            let x = drop.left / 100 * size.width

                            var path = Path()
                            path.move(to: CGPoint(x: x, y: y))
                            path.addLine(to: CGPoint(x: x + sin(rot * .pi / 180) * drop.len,
                                                     y: y + cos(rot * .pi / 180) * drop.len))
                            ctx.stroke(path,
                                       with: .color(red: 208/255, green: 224/255, blue: 250/255,
                                                    opacity: drop.op),
                                       style: StrokeStyle(lineWidth: drop.w, lineCap: .round))
                        }
                    }
                }
                .frame(width: w, height: h)
            }
        }
        .allowsHitTesting(false)
    }
}

// MARK: - RainGlass
// Condensation beads (radial highlight, bob animation) + rivulets (descending trails).
private struct RainGlass: View {
    let heavy: Bool

    private struct Bead {
        let x, y, size, bob, delay: Double
    }
    private struct Rivulet {
        let x, w, len, dur, delay, head: Double
    }

    private func makeBeads() -> [Bead] {
        let n = heavy ? 44 : 30
        return (0..<n).map { i in
            let s = 2.4 + hash(i, 0xBEAD_0001) * (heavy ? 9 : 7)
            return Bead(
                x:     hash(i, 0xBEAD_0002) * 100,
                y:     hash(i, 0xBEAD_0003) * 100,
                size:  s,
                bob:   2.4 + hash(i, 0xBEAD_0004) * 3,
                delay: hash(i, 0xBEAD_0005) * 5
            )
        }
    }

    private func makeRivulets() -> [Rivulet] {
        let n = heavy ? 8 : 5
        return (0..<n).map { i in
            Rivulet(
                x:     hash(i, 0xA1B2_0001) * 100,
                w:     1.4 + hash(i, 0xA1B2_0002) * 2.2,
                len:   24  + hash(i, 0xA1B2_0003) * 40,
                dur:   1.8 + hash(i, 0xA1B2_0004) * 2.6,
                delay: hash(i, 0xA1B2_0005) * 5,
                head:  4   + hash(i, 0xA1B2_0006) * 4
            )
        }
    }

    var body: some View {
        let beads = makeBeads()
        let rivulets = makeRivulets()

        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height

            ZStack {
                // Slight blur/tint base
                Rectangle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color(red: 180/255, green: 200/255, blue: 225/255, opacity: 0.04),
                                Color(red: 110/255, green: 132/255, blue: 164/255, opacity: 0.10),
                            ],
                            center: .top,
                            startRadius: 0,
                            endRadius: h
                        )
                    )
                    .background(.ultraThinMaterial.opacity(0.08))

                TimelineView(.animation) { tl in
                    let t = tl.date.timeIntervalSinceReferenceDate
                    Canvas { ctx, size in
                        // Draw beads
                        for bead in beads {
                            let bobPhase = sin((t / bead.bob + bead.delay) * .pi * 2)
                            let yOffset = bobPhase * 1.2
                            let bx = bead.x / 100 * size.width
                            let by = bead.y / 100 * size.height + yOffset
                            let r = bead.size / 2

                            // Bead fill: radial highlight
                            let rect = CGRect(x: bx - r, y: by - r, width: bead.size, height: bead.size * 1.12)
                            let ell = Path(ellipseIn: rect)

                            ctx.fill(ell, with: .color(red: 220/255, green: 232/255, blue: 248/255, opacity: 0.55))
                            // Specular highlight at top-left of bead
                            let hlSize = r * 0.6
                            let hlRect = CGRect(x: bx - r * 0.3, y: by - r * 0.5,
                                                width: hlSize, height: hlSize)
                            let hl = Path(ellipseIn: hlRect)
                            ctx.fill(hl, with: .color(white: 1, opacity: 0.9))
                        }

                        // Draw rivulets
                        for riv in rivulets {
                            let phase = ((t / riv.dur) + riv.delay)
                                .truncatingRemainder(dividingBy: 1)
                            // Animate from above screen (-60pt offset) to below (+screen height)
                            let totalTravel = size.height + 60 + riv.len + 120
                            let ry = -60.0 + phase * totalTravel
                            let rx = riv.x / 100 * size.width

                            // Trail
                            var trail = Path()
                            trail.move(to: CGPoint(x: rx, y: ry))
                            trail.addLine(to: CGPoint(x: rx, y: ry + riv.len))
                            let opacity = phase < 0.08 ? phase / 0.08 : (phase > 0.9 ? (1 - phase) / 0.1 : 1.0)
                            ctx.stroke(trail,
                                       with: .color(red: 210/255, green: 226/255, blue: 250/255,
                                                    opacity: 0.28 * opacity),
                                       style: StrokeStyle(lineWidth: riv.w, lineCap: .round))

                            // Head bead at bottom of rivulet
                            let hr = riv.head / 2
                            let headRect = CGRect(x: rx - hr, y: ry + riv.len - hr,
                                                  width: riv.head, height: riv.head * 1.15)
                            let headEll = Path(ellipseIn: headRect)
                            ctx.fill(headEll,
                                     with: .color(red: 220/255, green: 232/255, blue: 248/255,
                                                  opacity: 0.55 * opacity))
                        }
                    }
                }
            }
            .frame(width: w, height: h)
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Snow
// 52 flakes: fall + sway, seeded by index.
private struct Snow: View {
    private struct Flake {
        let left, delay, dur, size, op, sway: Double
    }

    private let flakes: [Flake] = (0..<52).map { i in
        Flake(
            left:  hash(i, 0xF1A1_0001) * 100,
            delay: hash(i, 0xF1A1_0002) * 7,
            dur:   5 + hash(i, 0xF1A1_0003) * 5,
            size:  2 + hash(i, 0xF1A1_0004) * 3.6,
            op:    0.45 + hash(i, 0xF1A1_0005) * 0.5,
            sway:  1.6 + hash(i, 0xF1A1_0006) * 2.2
        )
    }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            TimelineView(.animation) { tl in
                let t = tl.date.timeIntervalSinceReferenceDate
                Canvas { ctx, size in
                    for flake in flakes {
                        let fallPhase = ((t / flake.dur) + flake.delay)
                            .truncatingRemainder(dividingBy: 1)
                        let fy = -flake.size + fallPhase * (size.height + flake.size)
                        let swayOffset = sin((t / flake.sway) * .pi * 2) * 12
                        let fx = (flake.left / 100 * size.width) + swayOffset

                        let r = flake.size / 2
                        let rect = CGRect(x: fx - r, y: fy - r, width: flake.size, height: flake.size)
                        let circle = Path(ellipseIn: rect)
                        // Prototype flakes carry a soft white glow (boxShadow 0 0 4px rgba(255,255,255,.6)).
                        ctx.drawLayer { layer in
                            layer.addFilter(.shadow(color: .white.opacity(0.6), radius: 4))
                            layer.fill(circle, with: .color(white: 1, opacity: flake.op))
                        }
                    }
                }
                .frame(width: w, height: h)
            }
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Frost
// Radial vignette (screen blend) giving frosted edges for snow/sleet.
private struct Frost: View {
    var body: some View {
        GeometryReader { geo in
            RadialGradient(
                stops: [
                    .init(color: Color.clear, location: 0),
                    .init(color: Color.clear, location: 0.56),
                    .init(color: Color(red: 214/255, green: 230/255, blue: 248/255, opacity: 0.14), location: 0.82),
                    .init(color: Color(red: 232/255, green: 244/255, blue: 255/255, opacity: 0.32), location: 1),
                ],
                center: .center,
                startRadius: 0,
                // Prototype: `120% 92% at 50% 50%` — scale to the screen, not a fixed 600.
                endRadius: max(geo.size.width, geo.size.height) * 0.85
            )
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
    }
}

// MARK: - GodRays
// 6 light beams radiating from top (sun position depends on night).
private struct GodRays: View {
    let night: Bool
    // Prototype `mgray 7s ease-in-out infinite alternate`: the ray group breathes.
    @State private var sway = false

    var body: some View {
        let angles: [Double] = [-22, -12, -3, 7, 17, 28]
        let xFrac: CGFloat = night ? 0.50 : 0.72
        let tintColor: Color = night
            ? Color(red: 232/255, green: 199/255, blue: 126/255, opacity: 0.12)
            : Color(red: 255/255, green: 244/255, blue: 214/255, opacity: 0.15)

        GeometryReader { geo in
            ZStack {
                ForEach(Array(angles.enumerated()), id: \.offset) { idx, angle in
                    Rectangle()
                        .fill(
                            LinearGradient(
                                colors: [tintColor, Color.clear],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                        .frame(width: 58, height: geo.size.height * 1.55)
                        .transformEffect(
                            CGAffineTransform(translationX: -29, y: -geo.size.height * 0.14)
                        )
                        .rotationEffect(.degrees(angle), anchor: .top)
                        .blur(radius: 7)
                        .position(x: geo.size.width * xFrac,
                                  y: geo.size.height * 0.5)
                }
            }
            .rotationEffect(.degrees(sway ? 2.5 : -2.5), anchor: .top)
            .opacity(sway ? 1.0 : 0.85)
        }
        .blendMode(.screen)
        .allowsHitTesting(false)
        .onAppear {
            withAnimation(.easeInOut(duration: 7).repeatForever(autoreverses: true)) {
                sway = true
            }
        }
    }
}

// MARK: - SunFlare
// Warm radial glow in upper-right (day / clear only).
private struct SunFlare: View {
    var body: some View {
        GeometryReader { geo in
            RadialGradient(
                stops: [
                    .init(color: Color(red: 255/255, green: 247/255, blue: 224/255, opacity: 0.92), location: 0),
                    .init(color: Color(red: 255/255, green: 212/255, blue: 142/255, opacity: 0.34), location: 0.40),
                    .init(color: Color.clear, location: 0.70),
                ],
                center: .center,
                startRadius: 0,
                endRadius: 75
            )
            .frame(width: 150, height: 150)
            .blur(radius: 3)
            .blendMode(.screen)
            .position(x: geo.size.width * 0.87, y: geo.size.height * 0.05 + 75)
        }
        .allowsHitTesting(false)
    }
}

// MARK: - Clouds
// Three drifting elliptical cloud blobs.
private struct Clouds: View {
    private struct CloudSpec {
        let topFrac: Double
        let delay: Double
        let dur: Double
        let opacity: Double
    }
    private let specs: [CloudSpec] = [
        .init(topFrac: 0.07, delay: 0,    dur: 46, opacity: 0.5),
        .init(topFrac: 0.20, delay: -16,  dur: 60, opacity: 0.34),
        .init(topFrac: 0.13, delay: -34,  dur: 74, opacity: 0.28),
    ]

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation) { tl in
                let t = tl.date.timeIntervalSinceReferenceDate
                Canvas { ctx, size in
                    for spec in specs {
                        // Drift: start at -20% left, cycle across screen
                        let period = spec.dur
                        let phase = ((t / period) + spec.delay / period)
                            .truncatingRemainder(dividingBy: 1)
                        // x goes from -20% to +100% of width
                        let xStart: Double = -size.width * 0.2
                        let xEnd: Double   = size.width * 1.2
                        let cx = xStart + phase * (xEnd - xStart) + size.width * 0.31 // center of 62% width blob
                        let cy = spec.topFrac * size.height + 50

                        let cloudRect = CGRect(x: cx - size.width * 0.31,
                                               y: cy - 50,
                                               width: size.width * 0.62,
                                               height: 100)
                        let cloudPath = Path(ellipseIn: cloudRect)
                        ctx.fill(cloudPath,
                                 with: .color(red: 196/255, green: 201/255, blue: 212/255,
                                              opacity: spec.opacity * 0.6))
                    }
                }
                .blur(radius: 11)
            }
        }
        .allowsHitTesting(false)
    }
}

// MARK: - WeatherFX
// Composites the weather layer stack based on `kind` and `night`.
// Tints from prototype:
//   rain      → rgba(50,78,120,0.20) multiply
//   heavyRain → rgba(34,52,92,0.30)  multiply
//   sleet     → rgba(96,116,150,0.22) multiply
//   snow      → rgba(200,216,240,0.14) screen
//   cloudy    → rgba(110,120,140,0.16) multiply
//   clear     → no tint
public struct WeatherFX: View {
    public let kind: Weather
    public let night: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(kind: Weather, night: Bool) {
        self.kind = kind
        self.night = night
    }

    private var tint: (color: Color, blend: BlendMode)? {
        switch kind {
        case .rain:
            return (Color(red: 50/255, green: 78/255, blue: 120/255, opacity: 0.20), .multiply)
        case .heavyRain:
            return (Color(red: 34/255, green: 52/255, blue: 92/255, opacity: 0.30), .multiply)
        case .sleet:
            return (Color(red: 96/255, green: 116/255, blue: 150/255, opacity: 0.22), .multiply)
        case .snow:
            return (Color(red: 200/255, green: 216/255, blue: 240/255, opacity: 0.14), .screen)
        case .cloudy:
            return (Color(red: 110/255, green: 120/255, blue: 140/255, opacity: 0.16), .multiply)
        case .clear:
            return nil
        }
    }

    private var isWet: Bool {
        kind == .rain || kind == .heavyRain || kind == .sleet
    }

    public var body: some View {
        ZStack {
            // Per-kind tint overlay
            if let t = tint {
                Rectangle()
                    .fill(t.color)
                    .blendMode(t.blend)
                    .allowsHitTesting(false)
            }

            // Animated FX — suppressed when Reduce Motion is enabled (accessibility).
            // The static per-kind tint above still conveys the weather.
            if !reduceMotion {
                // GodRays: clear OR night
                if kind == .clear || night {
                    GodRays(night: night)
                }

                // SunFlare: clear day only
                if kind == .clear && !night {
                    SunFlare()
                }

                // Clouds: cloudy or any wet
                if kind == .cloudy || isWet {
                    Clouds()
                }

                // Rain layers: any wet (heavy = not plain rain)
                if isWet {
                    Rain(heavy: kind != .rain)
                    RainGlass(heavy: kind != .rain)
                }

                // Snow/frost: snow or sleet
                if kind == .snow || kind == .sleet {
                    Snow()
                    Frost()
                }
            }
        }
        .allowsHitTesting(false)
    }
}
