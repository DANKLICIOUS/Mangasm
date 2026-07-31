import SwiftUI

// MARK: - SignInView

/// Landmark slideshow + glass auth sheet. Apple uses Sign in with Apple when live auth is configured.
public struct SignInView: View {
    public let onAuthenticated: () -> Void

    public init(onAuthenticated: @escaping () -> Void) {
        self.onAuthenticated = onAuthenticated
    }

    public var body: some View {
        ZStack(alignment: .bottom) {
            LandmarkSlides()
                .ignoresSafeArea()

            AuthSheet(onAuthenticated: onAuthenticated)
        }
        .ignoresSafeArea(edges: .bottom)
    }
}

// MARK: - AuthSheet

private struct AuthSheet: View {
    @EnvironmentObject private var env: AppEnvironment
    @EnvironmentObject private var state: AppState

    let onAuthenticated: () -> Void

    @State private var accepted = false
    @State private var nudge = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var inviteCode = ""
    @State private var referralNotice: String?
    @State private var email = ""
    @State private var password = ""

    private let cream = Color(red: 245/255, green: 235/255, blue: 214/255)

    private var consent: OnboardingConsent {
        OnboardingConsent(ageAffirmed: accepted, termsAccepted: accepted)
    }

    private var usesLiveAuth: Bool {
        env.auth is SupabaseAuthService
    }

    private func attemptMockEnter() {
        guard consent.mayEnter else {
            withAnimation(.easeInOut(duration: 0.2)) { nudge = true }
            return
        }
        Task { @MainActor in
            isLoading = true
            defer { isLoading = false }
            do {
                try await env.auth.enterMock(consent: consent)
                onAuthenticated()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func signIn(_ action: @escaping () async throws -> Void) {
        guard consent.mayEnter else {
            withAnimation(.easeInOut(duration: 0.2)) { nudge = true }
            return
        }
        Task { @MainActor in
            isLoading = true
            errorMessage = nil
            referralNotice = nil
            defer { isLoading = false }
            do {
                try await action()
                await redeemInviteIfNeeded()
                onAuthenticated()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func redeemInviteIfNeeded() async {
        let raw = inviteCode.isEmpty ? state.pendingReferralCode : inviteCode
        guard let code = ReferralCode.normalize(raw) else { return }
        guard env.referrals is SupabaseReferralService else { return }

        do {
            _ = try await env.referrals.redeem(code: code)
            referralNotice = "Welcome — you're on \(code)'s team."
            state.clearPendingReferralCode()
            inviteCode = ""
        } catch {
            referralNotice = error.localizedDescription
        }
    }

    /// Email/password sign-in (phase1-auth spec §4a). Sign-in only — accounts
    /// are provisioned server-side; App Review's demo account uses this path.
    /// SIWA stays above this section so it remains the most prominent option
    /// (Guideline 4.8).
    @ViewBuilder
    private var emailPasswordSection: some View {
        VStack(spacing: 9) {
            authTextField(
                TextField("Email", text: $email),
                identifier: "email_field",
                keyboardIsEmail: true
            )
            authTextField(
                SecureField("Password", text: $password),
                identifier: "password_field",
                keyboardIsEmail: false
            )

            Button {
                signIn {
                    try await env.auth.signInWithEmail(email: email, password: password, consent: consent)
                }
            } label: {
                Text(isLoading ? "Signing in…" : "Sign in with Email")
                    .font(MGFont.serif(15, .bold))
                    .tracking(15 * 0.03)
                    .foregroundStyle(MGColor.goldText)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(LinearGradient(
                                colors: [MGColor.goldBright, MGColor.gold, MGColor.goldDeep],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ))
                            .shadow(color: MGColor.gold.opacity(0.5), radius: 12, x: 0, y: 8)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.white.opacity(0.5), lineWidth: 0.7)
                            .allowsHitTesting(false)
                    )
            }
            .buttonStyle(.plain)
            .disabled(isLoading || email.isEmpty || password.isEmpty)
            .accessibilityIdentifier("email_sign_in_button")
        }
    }

    @ViewBuilder
    private func authTextField(_ field: some View, identifier: String, keyboardIsEmail: Bool) -> some View {
        let styled = field
            .font(MGFont.mono(13))
            .foregroundStyle(Color.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.08))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.18), lineWidth: 0.8)
                    )
            )
            .accessibilityIdentifier(identifier)
        #if os(iOS)
        styled
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .keyboardType(keyboardIsEmail ? .emailAddress : .default)
        #else
        styled
        #endif
    }

    var body: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(Color.white.opacity(0.4))
                .frame(width: 38, height: 4)
                .padding(.top, 10)
                .padding(.bottom, 18)

            VStack(spacing: 0) {
                Text("Mangasm")
                    .font(MGFont.serif(38, .bold))
                    .tracking(38 * 0.01)
                    .foregroundStyle(MGGradient.goldHeading)
                    .shadow(color: MGColor.gold.opacity(0.4), radius: 7, x: 0, y: 1)

                Text("BY INVITATION · MEMBERS ONLY")
                    .font(MGFont.mono(8.5))
                    .tracking(8.5 * 0.28)
                    .foregroundStyle(cream.opacity(0.66))
                    .padding(.top, 7)
            }
            .padding(.bottom, 18)

            VStack(spacing: 9) {
                ProviderButton(kind: .apple) {
                    if usesLiveAuth {
                        signIn { try await env.auth.signInWithApple(consent: consent) }
                    } else {
                        attemptMockEnter()
                    }
                }
                if !usesLiveAuth {
                    ProviderButton(kind: .google) {
                        attemptMockEnter()
                    }
                    ProviderButton(kind: .phone) {
                        attemptMockEnter()
                    }
                }
            }
            .disabled(isLoading)

            HStack(spacing: 10) {
                LinearGradient(colors: [.clear, MGColor.gold.opacity(0.4)], startPoint: .leading, endPoint: .trailing)
                    .frame(height: 1)
                Text("OR")
                    .font(MGFont.mono(8))
                    .tracking(8 * 0.2)
                    .foregroundStyle(cream.opacity(0.5))
                LinearGradient(colors: [MGColor.gold.opacity(0.4), .clear], startPoint: .leading, endPoint: .trailing)
                    .frame(height: 1)
            }
            .padding(.vertical, 15)
            .padding(.horizontal, 4)

            if usesLiveAuth {
                emailPasswordSection
            } else {
                // Mock-only fast entry for previews/dev. Never rendered with live
                // auth — the live app is login-gated (App Review notes claim).
                Button(action: attemptMockEnter) {
                    Text(isLoading ? "Signing in…" : "Enter the community →")
                        .font(MGFont.serif(16, .bold))
                        .tracking(16 * 0.04)
                        .foregroundStyle(MGColor.goldText)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(
                            RoundedRectangle(cornerRadius: 15)
                                .fill(LinearGradient(
                                    colors: [MGColor.goldBright, MGColor.gold, MGColor.goldDeep],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ))
                                .shadow(color: MGColor.gold.opacity(0.7), radius: 16, x: 0, y: 12)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 15)
                                .stroke(Color.white.opacity(0.5), lineWidth: 0.7)
                                .allowsHitTesting(false)
                        )
                }
                .buttonStyle(.plain)
                .disabled(isLoading)
            }

            VStack(spacing: 7) {
                Button {
                    accepted.toggle()
                    if accepted { nudge = false }
                } label: {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: accepted ? "checkmark.square.fill" : "square")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(accepted ? MGColor.goldDeep
                                             : (nudge ? Color(red: 0.85, green: 0.3, blue: 0.3) : cream.opacity(0.6)))
                        LegalConsentText(cream: cream)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("accept_toggle")

                if nudge {
                    Text("Please confirm to continue.")
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(Color(red: 0.9, green: 0.4, blue: 0.4))
                        .accessibilityIdentifier("accept_nudge")
                }

                if let referralNotice {
                    Text(referralNotice)
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(cream.opacity(0.75))
                        .multilineTextAlignment(.center)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(Color(red: 0.9, green: 0.4, blue: 0.4))
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.top, 14)
            .padding(.bottom, 30)
        }
        .onAppear {
            if state.ageGateAffirmed { accepted = true }
            if inviteCode.isEmpty, !state.pendingReferralCode.isEmpty {
                inviteCode = state.pendingReferralCode
            }
        }
        .padding(.horizontal, 22)
        .background(
            UnevenRoundedRectangle(topLeadingRadius: 30, topTrailingRadius: 30)
                .fill(.ultraThinMaterial)
                .overlay(
                    UnevenRoundedRectangle(topLeadingRadius: 30, topTrailingRadius: 30)
                        .stroke(Color.white.opacity(0.4), lineWidth: 1)
                        .allowsHitTesting(false)
                )
                .shadow(color: .black.opacity(0.75), radius: 30, x: 0, y: -20)
        )
    }
}