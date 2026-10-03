import SwiftUI

/// Orchestrates the launch sequence: Splash → 18+ Gate → Sign-In.
/// Provides `onEnter` callback for when the user has authenticated (or tapped through the stub).
public struct LaunchFlow: View {
    public let onEnter: () -> Void

    @EnvironmentObject private var state: AppState

    enum Stage { case splash, ageGate, signIn }
    @State private var stage: Stage
    @State private var crossFadeOpacity: Double = 1.0

    public init(onEnter: @escaping () -> Void) {
        self.onEnter = onEnter
        // Property-wrapper defaults are not reliable for ProcessInfo; set in init.
        _stage = State(initialValue: UITestLaunch.isActive ? .ageGate : .splash)
    }

    public var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch stage {
            case .splash:
                SplashView { advance(to: .ageGate) }
                    .opacity(crossFadeOpacity)
                    .transition(.opacity)
            case .ageGate:
                AgeGateView {
                    state.ageGateAffirmed = true
                    advance(to: .signIn)
                }
                .opacity(crossFadeOpacity)
                .transition(.opacity)
            case .signIn:
                SignInView(onAuthenticated: onEnter)
                    .environmentObject(state)
                    .opacity(crossFadeOpacity)
                    .transition(.opacity)
            }
        }
        .onAppear {
            UITestLaunch.logProcessFlags()
            // Belt-and-suspenders: XCUITest must still see the 18+ gate if
            // @State was reconstructed as `.splash`.
            if UITestLaunch.isActive, stage == .splash {
                stage = .ageGate
                crossFadeOpacity = 1
            }
        }
        .overlay(alignment: .topLeading) {
            Color.clear
                .frame(width: 1, height: 1)
                .accessibilityIdentifier("launch_stage_\(stageLabel)")
        }
    }

    private var stageLabel: String {
        switch stage {
        case .splash: return "splash"
        case .ageGate: return "ageGate"
        case .signIn: return "signIn"
        }
    }

    private func advance(to next: Stage) {
        if UITestLaunch.isActive {
            stage = next
            crossFadeOpacity = 1
            return
        }
        withAnimation(.easeInOut(duration: 0.35)) { crossFadeOpacity = 0 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            stage = next
            withAnimation(.easeIn(duration: 0.35)) { crossFadeOpacity = 1 }
        }
    }
}
