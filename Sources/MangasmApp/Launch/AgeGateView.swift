import SwiftUI

// MARK: - AgeGateView
/// Full-screen 18+ affirmation shown after splash and before sign-in.
/// Matches beta feedback: prominent shield, single CTA, legal footer (Guideline 1.2 / age apps).
public struct AgeGateView: View {
    public let onConfirm: () -> Void

    public init(onConfirm: @escaping () -> Void) {
        self.onConfirm = onConfirm
    }

    public var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                ZStack {
                    Image(systemName: "shield.fill")
                        .font(.system(size: 88, weight: .semibold))
                        .foregroundStyle(MGColor.launchOrange)
                        .shadow(color: MGColor.launchOrange.opacity(0.45), radius: 24, y: 8)

                    Image(systemName: "exclamationmark")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(.white)
                }
                .accessibilityHidden(true)

                Text("18+ ONLY")
                    .font(MGFont.sans(34, .bold))
                    .foregroundStyle(.white)
                    .padding(.top, 28)

                Text("Mangasm contains adult-oriented social content intended for users 18 years of age or older.")
                    .font(MGFont.sans(15, .regular))
                    .foregroundStyle(Color.white.opacity(0.62))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 36)
                    .padding(.top, 16)

                Spacer()

                Button(action: onConfirm) {
                    Text("I AM 18 OR OLDER")
                        .font(MGFont.sans(16, .bold))
                        .tracking(16 * 0.06)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(MGGradient.launchCTA)
                        )
                        .shadow(color: MGColor.launchOrange.opacity(0.45), radius: 18, y: 10)
                        .accessibilityIdentifier("age_gate_confirm")
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 28)
                .accessibilityLabel("I AM 18 OR OLDER")
                .accessibilityIdentifier("age_gate_confirm")
                .accessibilityAddTraits(.isButton)

                VStack(spacing: 6) {
                    Text("By continuing you confirm you are of legal age and agree to our")
                        .font(MGFont.mono(8))
                        .foregroundStyle(Color.white.opacity(0.45))
                        .multilineTextAlignment(.center)

                    Link(destination: URL(string: LegalURLs.terms)!) {
                        Text("Terms of Service")
                            .font(MGFont.mono(8))
                            .underline()
                            .foregroundStyle(MGColor.gold.opacity(0.85))
                    }
                }
                .padding(.horizontal, 32)
                .padding(.top, 18)
                .padding(.bottom, 44)
            }
        }
        .accessibilityIdentifier("age_gate_screen")
    }
}