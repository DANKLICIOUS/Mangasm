import SwiftUI

/// Permanent, revisitable explanation — SDT competence + autonomy + relatedness.
public struct HowTrustScoreWorksView: View {
    @Environment(\.dismiss) private var dismiss

    public init() {}

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Community Reputation")
                        .font(MGFont.serif(28, .bold))
                        .foregroundStyle(MGGradient.goldHeading)

                    Text(CommunityReputationStyle.explainer)
                        .font(MGFont.sans(14))
                        .foregroundStyle(MGColor.inkSoft)

                    section("How points work") {
                        Text(
                            "Your score is rule-based and transparent — not a slot machine. "
                                + "We do not use unpredictable reward schedules for the core Trust Score."
                        )
                        .font(MGFont.sans(13))
                        .foregroundStyle(MGColor.inkSoft)
                    }

                    section("What increases your score") {
                        bullet("Verification (phone / photo / ID when available) — up to 15")
                        bullet("Profile completeness (quality fields) — up to 10")
                        bullet("Positive ratings from others (recent, weighted) — up to 40")
                        bullet("Community help (upheld reports, welcoming members) — up to 20")
                        bullet("Safety education modules — up to 10")
                    }

                    section("What decreases your score") {
                        bullet("Confirmed policy violations (appealable) — up to −30")
                        bullet("Very mild inactivity after 60+ days with no positive activity — up to −15")
                    }

                    section("What never affects your score") {
                        bullet("Number of matches or swipes")
                        bullet("Romantic or sexual message volume")
                        bullet("Any adult or explicit activity metric")
                    }

                    section("Cosmetic styles") {
                        Text(
                            "At scores 0 / 21 / 41 / 61 / 81 you unlock profile looks. "
                                + "You may freely switch among any unlocked styles. "
                                + "Styles never unlock messaging or private content."
                        )
                        .font(MGFont.sans(13))
                        .foregroundStyle(MGColor.inkSoft)
                    }

                    section("Your control") {
                        ForEach(CommunityReputationStyle.howItWorksBullets, id: \.self) { line in
                            bullet(line)
                        }
                    }
                }
                .padding(20)
            }
            .background(Color(red: 14 / 255, green: 10 / 255, blue: 6 / 255).ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(MGColor.gold)
                }
            }
        }
    }

    private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(MGFont.sans(13, .bold))
                .foregroundStyle(MGColor.goldBright)
            content()
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial.opacity(0.35), in: RoundedRectangle(cornerRadius: 14))
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .foregroundStyle(MGColor.gold)
            Text(text)
                .font(MGFont.sans(13))
                .foregroundStyle(MGColor.inkSoft)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
