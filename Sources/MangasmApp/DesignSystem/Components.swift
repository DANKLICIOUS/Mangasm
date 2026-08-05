import SwiftUI

// MARK: - FlowLayout

/// A reusable wrapping flow layout (SwiftUI `Layout` protocol, iOS 16 / macOS 13+).
/// Flows subviews left-to-right; wraps to the next line when the row width is exceeded.
/// - Parameters:
///   - spacing: Horizontal gap between chips (default 6).
///   - lineSpacing: Vertical gap between rows (default 7).
@available(iOS 16, macOS 13, *)
public struct FlowLayout: Layout {
    public var spacing: CGFloat
    public var lineSpacing: CGFloat

    public init(spacing: CGFloat = 6, lineSpacing: CGFloat = 7) {
        self.spacing = spacing
        self.lineSpacing = lineSpacing
    }

    // MARK: Shared layout engine
    // Both sizeThatFits and placeSubviews derive all values from this single function
    // so row-break decisions are guaranteed identical and heights cannot disagree.

    private func layout(sizes: [CGSize], maxWidth: CGFloat) -> (offsets: [CGPoint], size: CGSize) {
        var offsets: [CGPoint] = []
        var rowX: CGFloat = 0
        var rowY: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxRowWidth: CGFloat = 0
        for size in sizes {
            // Wrap if this item won't fit on the current (non-empty) row
            if rowX > 0, rowX + spacing + size.width > maxWidth {
                rowY += rowHeight + lineSpacing
                rowX = 0
                rowHeight = 0
            }
            let x = rowX == 0 ? 0 : rowX + spacing
            offsets.append(CGPoint(x: x, y: rowY))
            rowX = x + size.width
            rowHeight = max(rowHeight, size.height)
            maxRowWidth = max(maxRowWidth, rowX)
        }
        return (offsets, CGSize(width: maxRowWidth, height: rowY + rowHeight))
    }

    /// Returns a finite container width.
    /// Guards both `.infinity` and unspecified (nil) width — `replacingUnspecifiedDimensions()`
    /// with no args substitutes 10, which collapses the layout to one chip per line.
    private func resolvedWidth(_ proposal: ProposedViewSize) -> CGFloat {
        if let w = proposal.width, w.isFinite, w > 0 { return w }
        return 320 // sane fallback for unspecified/infinite width
    }

    // MARK: Layout protocol

    public func sizeThatFits(
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) -> CGSize {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        return layout(sizes: sizes, maxWidth: resolvedWidth(proposal)).size
    }

    public func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        let result = layout(sizes: sizes, maxWidth: resolvedWidth(proposal))
        for (i, sub) in subviews.enumerated() {
            let o = result.offsets[i]
            sub.place(
                at: CGPoint(x: bounds.minX + o.x, y: bounds.minY + o.y),
                anchor: .topLeading,
                proposal: ProposedViewSize(sizes[i])
            )
        }
    }
}

// MARK: - Pill

/// Glass pill container — used for weather pill, starlink badge, etc.
/// Prototype: pad 5×10, r12, glass border, optional gold glow.
public struct Pill<Content: View>: View {
    var glow: Bool
    @ViewBuilder let content: Content

    public init(glow: Bool = false, @ViewBuilder content: () -> Content) {
        self.glow = glow
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 6) {
            content
        }
        .padding(.vertical, 5)
        .padding(.horizontal, 10)
        .glassBackground(12, glow: glow)
    }
}

// MARK: - Chip

/// Compact label badge. Tone .neutral = ink-tint; .gold = gold-tint.
/// Prototype: Mulish 700/9.5, pad 4×9, r9.
public struct Chip: View {
    public enum Tone { case neutral, gold }
    let text: String
    var tone: Tone = .neutral

    public init(_ text: String, tone: Tone = .neutral) {
        self.text = text
        self.tone = tone
    }

    public var body: some View {
        Text(text)
            .font(MGFont.sans(9.5, .bold))
            .foregroundStyle(tone == .gold ? MGColor.goldDeep : MGColor.inkSoft)
            .padding(.vertical, 4).padding(.horizontal, 9)
            .background(
                RoundedRectangle(cornerRadius: 9)
                    .fill(tone == .gold ? MGColor.gold.opacity(0.16) : MGColor.ink.opacity(0.06))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 9)
                    .stroke(tone == .gold ? MGColor.gold.opacity(0.4) : MGColor.ink.opacity(0.14),
                            lineWidth: 1)
            )
    }
}

// MARK: - Seal

/// Gold-gradient verification badge with dark check-mark.
/// Prototype: gold-gradient circle, shadow 0 0 8px rgba(232,199,126,0.6),
/// check stroke #2a1d05 strokeWidth 3.6 — NOTE: prototype uses dark ink, not white.
public struct Seal: View {
    var size: CGFloat

    public init(size: CGFloat = 16) {
        self.size = size
    }

    public var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [MGColor.goldBright, MGColor.goldDeep],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: Color(red: 232/255, green: 199/255, blue: 126/255).opacity(0.6),
                        radius: 4, x: 0, y: 0)

            // Check mark — dark ink per prototype (#2a1d05), not white
            let checkInk = MGColor.goldText
            Path { p in
                let s = size * 0.55
                let ox = (size - s) / 2
                let oy = (size - s) / 2
                // Scaled from: M5 13 l4 4 L19 6 in a 24×24 viewBox
                let scale = s / 24
                p.move(to: CGPoint(x: ox + 5 * scale, y: oy + 13 * scale))
                p.addLine(to: CGPoint(x: ox + 9 * scale, y: oy + 17 * scale))
                p.addLine(to: CGPoint(x: ox + 19 * scale, y: oy + 6 * scale))
            }
            // Prototype: strokeWidth 3.6 in 24-unit viewBox at size*0.55 → lineWidth = size*0.55*(3.6/24) ≈ size*0.0825
            .stroke(checkInk, style: StrokeStyle(lineWidth: size * 0.55 * (3.6 / 24), lineCap: .round, lineJoin: .round))
        }
        .frame(width: size, height: size)
    }
}

// MARK: - SectionLabel

/// Gold serif section header with gradient text + glow.
/// Prototype: Cormorant Garamond 700/15, tracking +0.16em → 2.4pt, goldText gradient + goldGlow shadow.
public struct SectionLabel: View {
    let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(MGFont.serif(15, .bold))
            .tracking(15 * 0.16) // 0.16em at 15pt = 2.4pt
            .foregroundStyle(MGGradient.goldHeading)
            // goldGlow: 0 1px 10px rgba(201,168,76,.30), 0 1px 1px rgba(255,255,255,.4)
            .shadow(color: MGColor.gold.opacity(0.30), radius: 5, x: 0, y: 1)
            .shadow(color: .white.opacity(0.4), radius: 0.5, x: 0, y: 1)
            .padding(.top, 4)
            .padding(.bottom, 8)
            .padding(.horizontal, 2)
    }
}

// MARK: - MGCard

/// Holo-bordered card wrapper with inner glass surface.
/// Prototype: 1px holo gradient border (r20), inner glass r19.
public struct MGCard<Content: View>: View {
    var radius: CGFloat
    @ViewBuilder let content: Content

    public init(radius: CGFloat = 20, @ViewBuilder content: () -> Content) {
        self.radius = radius
        self.content = content()
    }

    public var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: radius)
                .fill(MGGradient.holo)
                .shadow(color: Color(red: 40/255, green: 30/255, blue: 15/255).opacity(0.5),
                        radius: 22, x: 0, y: 18)

            content
                .clipShape(RoundedRectangle(cornerRadius: radius - 1))
                .glassBackground(radius - 1)
                .padding(1)
        }
    }
}

// MARK: - MGSwitch

/// Toggleable 42×24 switch with gold-gradient on state and locked-dim.
/// Prototype: w42 h24, r13, knob 20px white, on = GOLD_BRIGHT→GOLD_DEEP 135°,
/// off = ink 18%, locked dims to 0.55.
public struct MGSwitch: View {
    @Binding var isOn: Bool
    var locked: Bool = false

    public init(isOn: Binding<Bool>, locked: Bool = false) {
        self._isOn = isOn
        self.locked = locked
    }

    public var body: some View {
        ZStack(alignment: isOn ? .trailing : .leading) {
            RoundedRectangle(cornerRadius: 13)
                .fill(isOn
                    ? AnyShapeStyle(LinearGradient(
                        colors: [MGColor.goldBright, MGColor.goldDeep],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing))
                    : AnyShapeStyle(MGColor.ink.opacity(0.18))
                )
                .shadow(color: isOn ? MGColor.gold.opacity(0.7) : .clear, radius: 5, x: 0, y: 0)
                .frame(width: 42, height: 24)

            Circle()
                .fill(Color.white)
                .frame(width: 20, height: 20)
                .shadow(color: .black.opacity(0.3), radius: 1.5, x: 0, y: 1)
                .padding(2)
        }
        .animation(.easeInOut(duration: 0.2), value: isOn)
        .opacity(locked ? 0.55 : 1)
        .onTapGesture {
            guard !locked else { return }
            isOn.toggle()
        }
    }
}

// MARK: - RepRing

/// 84×84 reputation ring: spinning holo ring, stroked gold arc, serif score center.
/// Prototype: R=33, strokeWidth 3 (track) / 3.5 (arc), transition 1.2s cubic.
public struct RepRing: View {
    var value: Int
    var active: Bool

    public init(value: Int = 42, active: Bool = true) {
        self.value = value
        self.active = active
    }

    @State private var filled: Bool = false

    private let R: CGFloat = 33
    private let size: CGFloat = 84

    private var circumference: CGFloat { 2 * .pi * R }

    public var body: some View {
        ZStack {
            // Spinning conic holo ring (masked to annulus)
            Circle()
                .fill(
                    AngularGradient(
                        colors: [MGColor.gold, .white,
                                 Color(red: 176/255, green: 205/255, blue: 235/255),
                                 MGColor.gold, .white, MGColor.gold],
                        center: .center
                    )
                )
                .mask(
                    Circle()
                        .strokeBorder(lineWidth: 2)
                )
                .opacity(0.9)
                .rotationEffect(.degrees(filled ? 360 : 0))
                .animation(.linear(duration: 16).repeatForever(autoreverses: false), value: filled)
                .shadow(color: MGColor.gold.opacity(0.35), radius: 5)

            // Track + arc — pinned to 2×R frame so stroked radius = 33 (matches prototype)
            ZStack {
                // Track
                Circle()
                    .stroke(MGColor.ink.opacity(0.16), lineWidth: 3)

                // Gold arc
                Circle()
                    .trim(from: 0, to: filled ? CGFloat(value) / 100 : 0)
                    .stroke(
                        LinearGradient(
                            colors: [MGColor.goldBright, MGColor.goldDeep],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        style: StrokeStyle(lineWidth: 3.5, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .shadow(color: MGColor.gold.opacity(0.6), radius: 4)
                    .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 1.2), value: filled)
            }
            .frame(width: 2 * R, height: 2 * R) // 2×33 = 66pt

            // Center label
            VStack(spacing: 1) {
                Text("\(value)")
                    .font(MGFont.serif(34, .bold))
                    .tracking(0)
                    .foregroundStyle(MGGradient.goldHeading)
                    .shadow(color: MGColor.gold.opacity(0.30), radius: 5, x: 0, y: 1)
                    .shadow(color: .white.opacity(0.4), radius: 0.5, x: 0, y: 1)
                    .lineLimit(1)
                Text("REP")
                    .font(MGFont.mono(7))
                    .tracking(7 * 0.24) // 0.24em at 7pt = 1.68pt
                    .foregroundStyle(MGColor.inkFaint)
            }
        }
        .frame(width: size, height: size)
        .onAppear {
            if active {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.09) {
                    filled = true
                }
            }
        }
        .onChange(of: active) { _, newValue in
            if !newValue { filled = false }
            else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.09) {
                    filled = true
                }
            }
        }
    }
}

// MARK: - Equalizer

/// 4 animated bars (equalizer/music visualizer).
/// Prototype: n bars, w2.5 h5–11, gap 2, container h13.
public struct Equalizer: View {
    var color: Color
    var n: Int

    public init(color: Color = MGColor.gold, n: Int = 4) {
        self.color = color
        self.n = n
    }

    @State private var animating: Bool = false

    // Heights per bar from prototype: 5 + (i%3)*3 ∈ {5,8,11}
    private func height(for i: Int) -> CGFloat {
        CGFloat(5 + (i % 3) * 3)
    }

    // Duration per bar: 0.7 + (i%3)*0.2
    private func duration(for i: Int) -> Double {
        0.7 + Double(i % 3) * 0.2
    }

    // Delay per bar: i * 0.1
    private func delay(for i: Int) -> Double {
        Double(i) * 0.1
    }

    public var body: some View {
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(0..<n, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: 2.5, height: animating ? 13 : height(for: i))
                    .animation(
                        .easeInOut(duration: duration(for: i))
                            .delay(delay(for: i))
                            .repeatForever(autoreverses: true),
                        value: animating
                    )
            }
        }
        .frame(height: 13, alignment: .bottom)
        .onAppear { animating = true }
    }
}
