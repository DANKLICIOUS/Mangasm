import Foundation

/// Finite state machine for app shell phases.
/// Root cause of past confusion: ad-hoc `phase = .app` without documenting legal transitions.
///
/// States:
/// - `launch` — splash / age gate / sign-in (LaunchFlow)
/// - `app` — main tabs authenticated (or demo) shell
public enum AppPhase: String, Sendable, Codable, CaseIterable {
    case launch
    case app
}

public enum AppPhaseEvent: String, Sendable {
    case finishLaunchFlow
    case signOut
    case accountDeleted
}

public enum AppPhaseMachine {
    public static func canTransition(from: AppPhase, event: AppPhaseEvent) -> Bool {
        switch (from, event) {
        case (.launch, .finishLaunchFlow): return true
        case (.app, .signOut), (.app, .accountDeleted): return true
        case (.launch, .signOut), (.launch, .accountDeleted): return true // idempotent reset
        default: return false
        }
    }

    public static func apply(from: AppPhase, event: AppPhaseEvent) -> AppPhase {
        guard canTransition(from: from, event: event) else { return from }
        switch event {
        case .finishLaunchFlow: return .app
        case .signOut, .accountDeleted: return .launch
        }
    }
}
