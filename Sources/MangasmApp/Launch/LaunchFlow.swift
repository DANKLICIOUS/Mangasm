import SwiftUI

/// Orchestrates the launch sequence: Splash → 18+ Gate → Sign-In.
/// Provides `onEnter` callback for when the user has authenticated (or tapped through the stub).
public struct LaunchFlow: View {
    public let onEnter: () -> Void
    public init(onEnter: @escaping () -> Void) { self.onEnter = onEnter }

    @EnvironmentObject private var state: AppState

    enum Stage { case splash, ageGate, signIn }
    @State private var stage: Stage = LaunchFlow.initialStage
    @State private var crossFadeOpacity: Double = 1.0

    /// XCUITest launch argument `-MANGASM_UI_TESTING` starts at the 18+ gate
    /// so splash video/timeline cannot hide it. The gate itself is still shown.
    private static var initialStage: Stage {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("-MANGASM_UI_TESTING") {
            return .ageGate
        }
        #endif
        return .splash
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
    }

    private func advance(to next: Stage) {
        withAnimation(.easeInOut(duration: 0.35)) { crossFadeOpacity = 0 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            stage = next
            withAnimation(.easeIn(duration: 0.35)) { crossFadeOpacity = 1 }
        }
    }
}
