import SwiftUI

/// Non-blocking celebration when a cosmetic style unlocks.
public struct ProfileUnlockToastHost: View {
    @EnvironmentObject private var state: AppState

    public init() {}

    public var body: some View {
        VStack {
            if let first = state.pendingStyleUnlocks.first {
                HStack(spacing: 10) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(ProfileStyleTheme.theme(for: first.styleId).accent)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("New style unlocked")
                            .font(MGFont.mono(9))
                            .foregroundStyle(.white.opacity(0.75))
                        Text(first.displayName)
                            .font(MGFont.sans(14, .bold))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(
                            ProfileStyleTheme.theme(for: first.styleId).accent.opacity(0.5),
                            lineWidth: 1
                        )
                )
                .padding(.horizontal, 16)
                .padding(.top, 56)
                .transition(.move(edge: .top).combined(with: .opacity))
                .onAppear {
                    Task { @MainActor in
                        try? await Task.sleep(nanoseconds: 2_500_000_000)
                        state.clearPendingStyleUnlocks()
                    }
                }
                .accessibilityLabel("New style unlocked: \(first.displayName)")
            }
            Spacer()
        }
        .animation(.spring(response: 0.4), value: state.pendingStyleUnlocks.map(\.styleId))
        .allowsHitTesting(false)
    }
}
