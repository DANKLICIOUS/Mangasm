import SwiftUI

/// Settings grid: unlocked styles free to switch; locked show min score.
public struct ProfileStylePicker: View {
    @EnvironmentObject private var state: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Community Reputation")
                .font(MGFont.sans(12, .bold))
                .foregroundStyle(MGColor.goldBright)
                .tracking(0.8)

            Text("Score \(state.profile.repScore) · \(state.profileStyle.activeConfig.badgeName)")
                .font(MGFont.mono(10))
                .foregroundStyle(MGColor.inkSoft)

            Text(ProfileStyleCatalog.communityReputationExplainer)
                .font(MGFont.sans(11))
                .foregroundStyle(MGColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)

            LazyVGrid(
                columns: [GridItem(.flexible()), GridItem(.flexible())],
                spacing: 10
            ) {
                ForEach(ProfileStyleCatalog.all) { config in
                    styleCell(config)
                }
            }
        }
    }

    @ViewBuilder
    private func styleCell(_ config: ProfileStyleConfig) -> some View {
        let unlocked = ProfileStyleCatalog.isUnlocked(config.styleId, score: state.profile.repScore)
        let active = state.profileStyle.activeConfig.styleId == config.styleId
        let theme = ProfileStyleTheme.theme(for: config.styleId)

        Button {
            guard unlocked else { return }
            state.setPreferredStyle(config.styleId)
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: theme.ringColors,
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 22, height: 22)
                    Spacer()
                    if active {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(theme.accent)
                    } else if !unlocked {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(MGColor.inkFaint)
                    }
                }
                Text(config.displayName)
                    .font(MGFont.sans(12, .bold))
                    .foregroundStyle(MGColor.ink)
                    .multilineTextAlignment(.leading)
                Text(config.badgeName)
                    .font(MGFont.mono(8))
                    .foregroundStyle(MGColor.inkFaint)
                if !unlocked {
                    Text("Unlocks at \(config.minScore)")
                        .font(MGFont.mono(8))
                        .foregroundStyle(MGColor.inkFaint)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.white.opacity(unlocked ? 0.12 : 0.06))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(
                        active ? theme.accent.opacity(0.8) : Color.white.opacity(0.15),
                        lineWidth: active ? 1.5 : 0.7
                    )
            )
            .opacity(unlocked ? 1 : 0.55)
        }
        .buttonStyle(.plain)
        .disabled(!unlocked)
        .accessibilityLabel(
            unlocked
                ? "\(config.displayName), \(active ? "selected" : "available")"
                : "\(config.displayName), locked until reputation \(config.minScore)"
        )
    }
}
