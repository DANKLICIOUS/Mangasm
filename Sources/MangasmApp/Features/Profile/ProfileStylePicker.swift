import SwiftUI

/// Settings grid: unlocked styles free to switch; locked show tier + score.
public struct ProfileStylePicker: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var env: AppEnvironment

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Community Reputation")
                .font(MGFont.sans(12, .bold))
                .foregroundStyle(MGColor.goldBright)
                .tracking(0.8)

            let tier = ReputationUnlockTier.from(score: state.profile.repScore)
            Text("Score \(state.profile.repScore) · \(tier.displayName) · \(state.profileStyle.activeConfig.badgeName)")
                .font(MGFont.mono(10))
                .foregroundStyle(MGColor.inkSoft)

            Text(ProfileStyleCatalog.communityReputationExplainer)
                .font(MGFont.sans(11))
                .foregroundStyle(MGColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)

            if let message = state.lastStylePersistMessage {
                Text(message)
                    .font(MGFont.sans(11, .semibold))
                    .foregroundStyle(MGColor.goldBright)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("profile_style_persist_message")
            }

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
        let unlocked = state.isStyleUnlocked(config.styleId)
        let active = state.profileStyle.activeConfig.styleId == config.styleId
        let theme = ProfileStyleTheme.theme(for: config.styleId)

        Button {
            Task { await state.setPreferredStyle(config.styleId, reputation: env.reputation) }
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    ProfileStyleBadgeIcon(styleId: config.styleId, size: 28)
                    Spacer()
                    if active {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(theme.accent)
                    } else if !unlocked {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(MGColor.gold.opacity(0.7))
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
                    HStack(spacing: 4) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 8, weight: .bold))
                        Text(ProfileStyleCatalog.unlockHint(for: config.styleId))
                    }
                    .font(MGFont.mono(8))
                    .foregroundStyle(MGColor.gold.opacity(0.75))
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.white.opacity(unlocked ? 0.12 : 0.05))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(
                        active ? theme.accent.opacity(0.8) : Color.white.opacity(unlocked ? 0.15 : 0.08),
                        lineWidth: active ? 1.5 : 0.7
                    )
            )
            .opacity(unlocked ? 1 : 0.5)
        }
        .buttonStyle(.plain)
        .disabled(!unlocked)
        .accessibilityLabel(
            unlocked
                ? "\(config.displayName), \(active ? "selected" : "available")"
                : "\(config.displayName), locked. \(ProfileStyleCatalog.unlockHint(for: config.styleId))"
        )
    }
}
