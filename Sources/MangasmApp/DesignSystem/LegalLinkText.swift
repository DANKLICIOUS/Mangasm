import SwiftUI

/// Tappable legal line for onboarding — Community Guidelines + Privacy Policy.
struct LegalConsentText: View {
    let cream: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("I confirm I'm 18+ and accept the")
                .font(MGFont.mono(7.5))
                .tracking(7.5 * 0.04)
                .foregroundStyle(cream.opacity(0.72))
            HStack(spacing: 4) {
                LegalLink(title: "Community Guidelines", url: LegalURLs.terms)
                Text("and")
                    .font(MGFont.mono(7.5))
                    .foregroundStyle(cream.opacity(0.6))
                LegalLink(title: "Privacy Policy", url: LegalURLs.privacy)
                Text(".")
                    .font(MGFont.mono(7.5))
                    .foregroundStyle(cream.opacity(0.72))
            }
        }
    }
}

private struct LegalLink: View {
    let title: String
    let url: String

    var body: some View {
        Link(destination: URL(string: url)!) {
            Text(title)
                .font(MGFont.mono(7.5))
                .tracking(7.5 * 0.04)
                .underline()
                .foregroundStyle(MGColor.brass.opacity(0.9))
        }
        .accessibilityLabel(title)
    }
}