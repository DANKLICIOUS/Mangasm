import SwiftUI
import AVKit

// MARK: - AVPlayer holder (stable across SwiftUI body rebuilds)

@MainActor
private final class RunwayPlayer: ObservableObject {
    let queuePlayer: AVQueuePlayer?
    private var looper: AVPlayerLooper?
    // Entrance soundtrack — a looped deep-house beat that scores the runway walk.
    // The video itself stays MUTED; this is the only audio. Drop a licensed loop
    // at Resources/entrance.m4a (or .mp3); absent → silent, no crash.
    private var entranceAudio: AVAudioPlayer?

    init() {
        if UITestLaunch.isActive {
            queuePlayer = nil
            return
        }
        // ── Video (muted, looped) ──
        if let url = Bundle.module.url(forResource: "runway", withExtension: "mp4") {
            let item = AVPlayerItem(url: url)
            let player = AVQueuePlayer(playerItem: item)
            player.isMuted = true
            player.allowsExternalPlayback = false
            looper = AVPlayerLooper(player: player, templateItem: item)
            queuePlayer = player
        } else {
            queuePlayer = nil
        }

        // ── Entrance beat (looped) ──
        let url = Bundle.module.url(forResource: "entrance", withExtension: "m4a")
            ?? Bundle.module.url(forResource: "entrance", withExtension: "mp3")
        if let url {
            #if os(iOS)
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try? AVAudioSession.sharedInstance().setActive(true)
            #endif
            entranceAudio = try? AVAudioPlayer(contentsOf: url)
            entranceAudio?.numberOfLoops = -1   // loop forever under the entrance
            entranceAudio?.volume = 0.85
            entranceAudio?.prepareToPlay()
        }
    }

    func play() {
        queuePlayer?.play()
        entranceAudio?.play()
    }

    func pause() {
        queuePlayer?.pause()
        entranceAudio?.pause()
    }

    /// Fade the beat out over the splash hand-off, then stop.
    func fadeOutAudio(_ duration: TimeInterval) {
        entranceAudio?.setVolume(0, fadeDuration: duration)
    }
}

// MARK: - Runway video view (AVPlayerLayer-backed for true .resizeAspectFill cover)
// SwiftUI's `VideoPlayer` only does aspect-fit (letterboxes a portrait video).
// AVPlayerLayer must be hosted in a UIView/NSView, so this is the one justified
// platform-specific shim — `#if` gates a genuinely platform-only hosting API.

#if os(iOS)
import UIKit
private final class PlayerHostView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}
private struct RunwayVideoView: UIViewRepresentable {
    let player: AVPlayer
    func makeUIView(context: Context) -> PlayerHostView {
        let v = PlayerHostView()
        v.playerLayer.player = player
        v.playerLayer.videoGravity = .resizeAspectFill
        v.isUserInteractionEnabled = false
        return v
    }
    func updateUIView(_ uiView: PlayerHostView, context: Context) {
        uiView.playerLayer.player = player
    }
}
#elseif os(macOS)
import AppKit
private final class PlayerHostNSView: NSView {
    let playerLayer = AVPlayerLayer()
    init(player: AVPlayer) {
        super.init(frame: .zero)
        wantsLayer = true
        playerLayer.player = player
        playerLayer.videoGravity = .resizeAspectFill
        layer = playerLayer            // backing layer auto-resizes with the view
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) unavailable") }
}
private struct RunwayVideoView: NSViewRepresentable {
    let player: AVPlayer
    func makeNSView(context: Context) -> PlayerHostNSView { PlayerHostNSView(player: player) }
    func updateNSView(_ nsView: PlayerHostNSView, context: Context) {
        nsView.playerLayer.player = player
    }
}
#endif

// MARK: - SplashView

/// Cinematic launch splash. Calls `onContinue` after user tap, SKIP, CTA, or 8.6s auto-advance.
public struct SplashView: View {
    public let onContinue: () -> Void
    public init(onContinue: @escaping () -> Void) { self.onContinue = onContinue }

    @StateObject private var runway = RunwayPlayer()

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    // Double-fire guard — set true the first time go() is called.
    @State private var didContinue = false

    // Fade-out before handing off
    @State private var opacity: Double = 1.0

    // Staged reveal flags
    @State private var showKicker = false
    @State private var showWordmark = false
    @State private var showTagline = false
    @State private var showCTA = false

    // Glow loop animation
    @State private var glowPulse = false
    // CTA box-shadow pulse
    @State private var ctaPulse = false
    // Shimmer offset (0→1 across button width)
    @State private var shimmerOffset: CGFloat = -1.0
    @State private var shimmerVisible = false

    public var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .top) {
                // ── Layer 0: black base ──────────────────────────────────
                Color.black.ignoresSafeArea()

                // ── Layer 1: runway video (or gradient fallback) ─────────
                if let player = runway.queuePlayer {
                    // AVPlayerLayer .resizeAspectFill = CSS object-fit: cover (no letterbox).
                    RunwayVideoView(player: player)
                        .allowsHitTesting(false)
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()
                        .ignoresSafeArea()
                } else {
                    // Fallback gradient when runway.mp4 is absent from bundle
                    LinearGradient(
                        colors: [
                            Color(hex: "#0A0612"),
                            Color(hex: "#1A0A22"),
                            Color(hex: "#2D0F1A"),
                            Color(hex: "#1A0808")
                        ],
                        startPoint: .top, endPoint: .bottom
                    )
                    .ignoresSafeArea()
                }

                // ── Layer 2: cinematic grade gradient ────────────────────
                LinearGradient(
                    stops: [
                        .init(color: Color(red: 6/255, green: 4/255, blue: 9/255, opacity: 0.50), location: 0.00),
                        .init(color: Color(red: 6/255, green: 4/255, blue: 9/255, opacity: 0.05), location: 0.30),
                        .init(color: Color(red: 6/255, green: 4/255, blue: 9/255, opacity: 0.35), location: 0.62),
                        .init(color: Color(red: 4/255, green: 2/255, blue: 7/255, opacity: 0.92), location: 1.00),
                    ],
                    startPoint: .top, endPoint: .bottom
                )
                .ignoresSafeArea()
                .allowsHitTesting(false)

                // ── Layer 3: radial orange haze (screen blend) ───────────
                RadialGradient(
                    colors: [
                        MGColor.launchOrange.opacity(0.10),
                        MGColor.launchOrange.opacity(0.04),
                        Color.clear
                    ],
                    center: UnitPoint(x: 0.5, y: 0.30),
                    startRadius: 0,
                    endRadius: geo.size.width * 0.60
                )
                .blendMode(.screen)
                .ignoresSafeArea()
                .allowsHitTesting(false)

                // ── Layer 4: inset vignette ──────────────────────────────
                // Approximation: SwiftUI has no box-shadow inset; simulate with
                // a radial gradient darkening from the edges inward.
                RadialGradient(
                    colors: [Color.clear, Color.black.opacity(0.70)],
                    center: .center,
                    startRadius: geo.size.width * 0.35,
                    endRadius: max(geo.size.width, geo.size.height) * 0.75
                )
                .ignoresSafeArea()
                .allowsHitTesting(false)

                // ── SKIP pill (top-right) ────────────────────────────────
                HStack {
                    Spacer()
                    Button {
                        go()
                    } label: {
                        Text("SKIP")
                            .font(MGFont.mono(9))
                            .tracking(9 * 0.18)
                            .foregroundStyle(Color.white.opacity(0.78))
                            .padding(.vertical, 6)
                            .padding(.horizontal, 12)
                    }
                    .glassBackground(20)
                }
                .padding(.top, 60)
                .padding(.trailing, 18)
                .zIndex(10)

                // ── Layer: lockup pinned 132pt above screen bottom ───────
                VStack {
                    Spacer()
                    // Lockup: kicker / wordmark / tagline
                    VStack(spacing: 0) {
                        // Kicker — delay 0.4s
                        Text("EST. MMXXVI")
                            .font(MGFont.mono(9))
                            .tracking(9 * 0.50)   // 0.5em → 4.5pt
                            .foregroundStyle(MGColor.launchOrange)
                            .opacity(showKicker ? 1 : 0)
                            .offset(y: showKicker ? 0 : 20)

                        Spacer().frame(height: 6)

                        // Wordmark — delay 0.7s; glow loop from 1.8s
                        // Approximation: CSS text-shadow glow loop → animated .shadow() repeatForever
                        Text("Mangasm")
                            .font(MGFont.serif(60, .bold))
                            .foregroundStyle(Color.white)
                            .shadow(
                                color: MGColor.launchOrange.opacity(glowPulse ? 0.95 : 0.55),
                                radius: glowPulse ? 30 : 18
                            )
                            .shadow(
                                color: MGColor.launchOrange.opacity(glowPulse ? 0.55 : 0.30),
                                radius: glowPulse ? 80 : 44
                            )
                            .shadow(color: Color.black.opacity(0.50), radius: 3, y: 2)
                            .opacity(showWordmark ? 1 : 0)
                            .offset(y: showWordmark ? 0 : 14)
                            .blur(radius: showWordmark ? 0 : 6)

                        Spacer().frame(height: 12)

                        // Tagline — delay 1.5s
                        Text("DARK LUXURY · BROTHERHOOD · NIGHTLIFE")
                            .font(MGFont.mono(9.5))
                            .tracking(9.5 * 0.42)  // 0.42em → 3.99pt
                            .foregroundStyle(Color(red: 245/255, green: 235/255, blue: 214/255, opacity: 0.78))
                            .opacity(showTagline ? 1 : 0)
                            .offset(y: showTagline ? 0 : 20)
                    }
                    .multilineTextAlignment(.center)
                    .frame(width: geo.size.width)
                }
                .frame(maxHeight: .infinity, alignment: .bottom)
                .padding(.bottom, 132)
                .zIndex(9)

                // ── Layer: CTA pinned 46pt above screen bottom ───────────
                VStack {
                    Spacer()
                    // CTA button — delay 3.1s
                    VStack(spacing: 11) {
                        ZStack {
                            // Gradient base
                            RoundedRectangle(cornerRadius: 16)
                                .fill(MGGradient.launchCTA)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16)
                                        .stroke(MGColor.launchOrange.opacity(0.53), lineWidth: 1)
                                )
                                // CTA pulse — Approximation: CSS box-shadow pulse → animated shadow
                                .shadow(
                                    color: MGColor.launchOrange.opacity(ctaPulse ? 0.95 : 0.60),
                                    radius: ctaPulse ? 22 : 15,
                                    y: ctaPulse ? 6 : 10
                                )

                            // Button label
                            Text("ENTER THE COMMUNITY")
                                .font(MGFont.serif(16, .bold))
                                .tracking(16 * 0.08)  // 0.08em → 1.28pt
                                .foregroundStyle(Color.white)
                                .zIndex(2)

                            // Shimmer sweep — Approximation: diagonal gradient offset animation
                            // Starts at 3.6s (shimmerVisible flag), then loops.
                            if shimmerVisible {
                                GeometryReader { btn in
                                    LinearGradient(
                                        colors: [
                                            Color.clear,
                                            Color.white.opacity(0.40),
                                            Color.clear
                                        ],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                    .frame(width: btn.size.width * 0.4)
                                    .offset(x: shimmerOffset * btn.size.width)
                                    .blendMode(.overlay)
                                }
                                .clipped()
                                .allowsHitTesting(false)
                            }
                        }
                        .frame(height: 52)
                        .contentShape(Rectangle())
                        .onTapGesture { go() }

                        Text("TAP ANYWHERE TO CONTINUE")
                            .font(MGFont.mono(8))
                            .tracking(8 * 0.20)
                            .foregroundStyle(Color.white.opacity(0.50))
                    }
                    .padding(.horizontal, 24)
                    .opacity(showCTA ? 1 : 0)
                    .offset(y: showCTA ? 0 : 20)
                }
                .frame(maxHeight: .infinity, alignment: .bottom)
                .padding(.bottom, 46)
                .zIndex(9)

                // ── Full-screen tap-catcher (z below lockup+CTA, above video) ──
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { go() }
                    .zIndex(1)
                    .ignoresSafeArea()
            }
            .opacity(opacity)
        }
        .ignoresSafeArea()
        .onAppear {
            if UITestLaunch.isActive {
                go()
                return
            }
            runway.play()
            // Drive the timeline from onAppear so XCUITest layout passes
            // cannot cancel it the way SwiftUI `.task` does.
            Task { await runTimeline() }
            DispatchQueue.main.asyncAfter(deadline: .now() + 8.6) { go() }
        }
        .onDisappear { runway.pause() }
    }

    // MARK: - Timeline

    private func runTimeline() async {
        // Kicker at 0.4s
        try? await Task.sleep(for: .seconds(0.4))
        if Task.isCancelled { return }
        withAnimation(.easeOut(duration: 1.0)) { showKicker = true }

        // Wordmark at 0.7s
        try? await Task.sleep(for: .seconds(0.3))
        if Task.isCancelled { return }
        withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 1.1)) { showWordmark = true }

        // Glow loop starts at 1.8s (0.7 + 1.1)
        try? await Task.sleep(for: .seconds(1.1))
        if Task.isCancelled { return }
        if !reduceMotion {
            withAnimation(.easeInOut(duration: 1.7).repeatForever(autoreverses: true)) {
                glowPulse = true
            }
        }

        // Tagline at 1.5s from start: we're at ~1.8s; fire immediately
        // (Tagline is staggered relative to kicker, not wordmark; adjust)
        // Timeline: kicker 0.4s, wordmark 0.7s, tagline 1.5s total from 0.
        // We are at ≈0.4+0.3+1.1 = 1.8s. Tagline was due at 1.5s → show now.
        withAnimation(.easeOut(duration: 1.0)) { showTagline = true }

        // CTA at 3.1s total — we need to wait until 3.1s from start.
        // Elapsed so far ≈ 1.8s → wait 1.3s more.
        try? await Task.sleep(for: .seconds(1.3))
        if Task.isCancelled { return }
        withAnimation(.easeOut(duration: 0.9)) { showCTA = true }
        // Prototype mgctaPulse is a 2.4s beat; 1.2s in+out (autoreverse) ≈ 2.4s cycle.
        if !reduceMotion {
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                ctaPulse = true
            }
        }

        // Shimmer starts at 3.6s total → 0.5s after CTA
        try? await Task.sleep(for: .seconds(0.5))
        if Task.isCancelled { return }
        if !reduceMotion {
            shimmerVisible = true
            startShimmerLoop()
        }

        // Auto-advance at 8.6s total from start. Elapsed ≈ 3.6s → wait 5.0s more.
        try? await Task.sleep(for: .seconds(5.0))
        if Task.isCancelled { return }
        go()
    }

    // Repeating shimmer sweep (approximation of CSS background-position animation)
    private func startShimmerLoop() {
        shimmerOffset = -0.5
        withAnimation(.easeInOut(duration: 3.2).repeatForever(autoreverses: false)) {
            shimmerOffset = 1.5
        }
    }

    // MARK: - Go (double-fire guarded)

    private func go() {
        guard !didContinue else { return }
        didContinue = true
        runway.fadeOutAudio(0.48)
        withAnimation(.easeOut(duration: 0.48)) { opacity = 0 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.48) {
            onContinue()
        }
    }
}
