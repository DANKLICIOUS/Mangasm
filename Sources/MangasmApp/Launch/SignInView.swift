import SwiftUI

// MARK: - SignInView

/// Landmark slideshow + glass auth sheet. Email-only auth: sign in, create
/// account (email confirmation required), and password reset via magic link.
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

    enum Mode { case signIn, signUp }

    @State private var mode: Mode = .signIn
    @State private var accepted = false
    @State private var nudge = false
    @State private var isLoading = false
    @State private var emailError: String?
    @State private var passwordError: String?
    @State private var generalError: String?
    @State private var infoNotice: String?
    @State private var inviteCode = ""
    @State private var referralNotice: String?
    @State private var email = ""
    @State private var password = ""
    @State private var showResetSheet = false

    private let cream = Color(red: 245/255, green: 235/255, blue: 214/255)

    private var consent: OnboardingConsent {
        OnboardingConsent(ageAffirmed: accepted, termsAccepted: accepted)
    }

    private var usesLiveAuth: Bool {
        env.auth is SupabaseAuthService
    }

    private func clearErrors() {
        emailError = nil
        passwordError = nil
        generalError = nil
        infoNotice = nil
        referralNotice = nil
    }

    private func show(_ error: Error) {
        let mapped = AuthErrorMapper.map(error)
        switch mapped.authField {
        case .email:                  emailError = mapped.errorDescription
        case .password, .newPassword: passwordError = mapped.errorDescription
        case .general:                generalError = mapped.errorDescription
        }
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
                generalError = error.localizedDescription
            }
        }
    }

    private func submit() {
        guard consent.mayEnter else {
            withAnimation(.easeInOut(duration: 0.2)) { nudge = true }
            return
        }
        // Client-side validation before any network call.
        clearErrors()
        guard EmailAuthValidator.isValidEmail(email) else {
            emailError = "Enter a valid email address."
            return
        }
        if mode == .signUp, let problem = EmailAuthValidator.passwordProblem(password) {
            passwordError = problem
            return
        }
        if password.isEmpty {
            passwordError = "Enter your password."
            return
        }
        Task { @MainActor in
            isLoading = true
            defer { isLoading = false }
            do {
                switch mode {
                case .signIn:
                    try await env.auth.signInWithEmail(email: email, password: password, consent: consent)
                    await redeemInviteIfNeeded()
                    onAuthenticated()
                case .signUp:
                    try await env.auth.signUpWithEmail(email: email, password: password, consent: consent)
                    infoNotice = "Check your email — tap the confirmation link we sent to \(email.trimmingCharacters(in: .whitespacesAndNewlines)), then sign in."
                    mode = .signIn
                    password = ""
                }
            } catch {
                show(error)
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

    @ViewBuilder
    private func fieldError(_ message: String?) -> some View {
        if let message {
            Text(message)
                .font(MGFont.mono(8.5))
                .foregroundStyle(Color(red: 0.9, green: 0.4, blue: 0.4))
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    /// Email/password form — the only auth path (email-only auth).
    @ViewBuilder
    private var emailPasswordSection: some View {
        VStack(spacing: 9) {
            Picker("Mode", selection: $mode) {
                Text("Sign In").tag(Mode.signIn)
                Text("Create Account").tag(Mode.signUp)
            }
            .pickerStyle(.segmented)
            .disabled(isLoading)
            .accessibilityIdentifier("auth_mode_picker")
            .accessibilityLabel("Choose sign in or create account")

            authTextField(
                TextField("Email", text: $email),
                identifier: "email_field",
                contentKind: .email
            )
            .accessibilityLabel("Email address")
            fieldError(emailError)

            authTextField(
                SecureField("Password", text: $password),
                identifier: "password_field",
                contentKind: mode == .signUp ? .newPassword : .password
            )
            .accessibilityLabel(mode == .signUp ? "Choose a password" : "Password")
            fieldError(passwordError)

            if mode == .signUp {
                Text("At least 8 characters, with a letter and a number.")
                    .font(MGFont.mono(7.5))
                    .foregroundStyle(cream.opacity(0.55))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(action: submit) {
                HStack(spacing: 8) {
                    if isLoading {
                        ProgressView()
                            .controlSize(.small)
                            .tint(MGColor.goldText)
                    }
                    Text(mode == .signIn ? "Sign In" : "Create Account")
                        .font(MGFont.serif(15, .bold))
                        .tracking(15 * 0.03)
                        .foregroundStyle(MGColor.goldText)
                }
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
            .accessibilityIdentifier("email_submit_button")
            .accessibilityLabel(mode == .signIn ? "Sign in" : "Create account")

            Button("Forgot password?") {
                clearErrors()
                showResetSheet = true
            }
            .font(MGFont.mono(9))
            .foregroundStyle(cream.opacity(0.7))
            .disabled(isLoading)
            .accessibilityIdentifier("forgot_password_button")
            .accessibilityLabel("Forgot password, send a reset link by email")
        }
    }

    enum FieldContentKind { case email, password, newPassword }

    @ViewBuilder
    private func authTextField(_ field: some View, identifier: String, contentKind: FieldContentKind) -> some View {
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
        switch contentKind {
        case .email:
            styled
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        case .password:
            styled
                .textContentType(.password)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        case .newPassword:
            styled
                .textContentType(.newPassword)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        }
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
                .accessibilityLabel("Confirm you are 18 or older and accept the community guidelines")

                if nudge {
                    Text("Please confirm to continue.")
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(Color(red: 0.9, green: 0.4, blue: 0.4))
                        .accessibilityIdentifier("accept_nudge")
                }

                if let infoNotice {
                    Text(infoNotice)
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(cream.opacity(0.85))
                        .multilineTextAlignment(.center)
                        .accessibilityIdentifier("auth_info_notice")
                }

                if let referralNotice {
                    Text(referralNotice)
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(cream.opacity(0.75))
                        .multilineTextAlignment(.center)
                }

                if let generalError {
                    Text(generalError)
                        .font(MGFont.mono(7.5))
                        .foregroundStyle(Color(red: 0.9, green: 0.4, blue: 0.4))
                        .multilineTextAlignment(.center)
                        .accessibilityIdentifier("auth_general_error")
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
        .sheet(isPresented: $showResetSheet) {
            PasswordResetRequestView(initialEmail: email)
                .environmentObject(env)
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
