import SwiftUI

// MARK: - PasswordResetRequestView

/// "Forgot password?" sheet: takes an email and sends the Supabase reset
/// magic link (redirects back via `mangasm://auth-callback`).
struct PasswordResetRequestView: View {
    @EnvironmentObject private var env: AppEnvironment
    @Environment(\.dismiss) private var dismiss

    @State private var email: String
    @State private var isLoading = false
    @State private var emailError: String?
    @State private var sent = false

    private let cream = Color(red: 245/255, green: 235/255, blue: 214/255)

    init(initialEmail: String = "") {
        _email = State(initialValue: initialEmail)
    }

    private func send() {
        emailError = nil
        guard EmailAuthValidator.isValidEmail(email) else {
            emailError = "Enter a valid email address."
            return
        }
        Task { @MainActor in
            isLoading = true
            defer { isLoading = false }
            do {
                try await env.auth.sendPasswordReset(email: email)
                sent = true
            } catch {
                emailError = AuthErrorMapper.map(error).errorDescription
            }
        }
    }

    var body: some View {
        VStack(spacing: 14) {
            Capsule()
                .fill(Color.white.opacity(0.4))
                .frame(width: 38, height: 4)
                .padding(.top, 10)

            Text("Reset Password")
                .font(MGFont.serif(24, .bold))
                .foregroundStyle(MGGradient.goldHeading)
                .padding(.top, 8)

            if sent {
                Text("Check your email — tap the reset link to come back here and choose a new password.")
                    .font(MGFont.mono(10))
                    .foregroundStyle(cream.opacity(0.85))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
                    .accessibilityIdentifier("reset_sent_notice")

                Button("Done") { dismiss() }
                    .font(MGFont.serif(15, .bold))
                    .foregroundStyle(MGColor.goldText)
                    .accessibilityIdentifier("reset_done_button")
            } else {
                Text("Enter your account email and we'll send a sign-in link to set a new password.")
                    .font(MGFont.mono(9.5))
                    .foregroundStyle(cream.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)

                TextField("Email", text: $email)
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
                    #if os(iOS)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    #endif
                    .accessibilityIdentifier("reset_email_field")
                    .accessibilityLabel("Email address for password reset")

                if let emailError {
                    Text(emailError)
                        .font(MGFont.mono(8.5))
                        .foregroundStyle(Color(red: 0.9, green: 0.4, blue: 0.4))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button(action: send) {
                    HStack(spacing: 8) {
                        if isLoading {
                            ProgressView()
                                .controlSize(.small)
                                .tint(MGColor.goldText)
                        }
                        Text("Send Reset Link")
                            .font(MGFont.serif(15, .bold))
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
                    )
                }
                .buttonStyle(.plain)
                .disabled(isLoading || email.isEmpty)
                .accessibilityIdentifier("reset_send_button")
                .accessibilityLabel("Send password reset link")
            }

            Spacer()
        }
        .padding(.horizontal, 22)
        .presentationDetents([.medium])
        .presentationBackground(.ultraThinMaterial)
    }
}

// MARK: - NewPasswordView

/// Shown after the reset magic link deep-links back into the app with a
/// recovery session: the user sets a new password, then continues into the app.
struct NewPasswordView: View {
    @EnvironmentObject private var env: AppEnvironment

    /// Called once the password is saved (recovery session is now a full session).
    let onComplete: () -> Void

    @State private var newPassword = ""
    @State private var isLoading = false
    @State private var passwordError: String?

    private let cream = Color(red: 245/255, green: 235/255, blue: 214/255)

    private func save() {
        passwordError = nil
        if let problem = EmailAuthValidator.passwordProblem(newPassword) {
            passwordError = problem
            return
        }
        Task { @MainActor in
            isLoading = true
            defer { isLoading = false }
            do {
                try await env.auth.updatePassword(newPassword: newPassword)
                onComplete()
            } catch {
                passwordError = AuthErrorMapper.map(error).errorDescription
            }
        }
    }

    var body: some View {
        VStack(spacing: 14) {
            Capsule()
                .fill(Color.white.opacity(0.4))
                .frame(width: 38, height: 4)
                .padding(.top, 10)

            Text("Choose a New Password")
                .font(MGFont.serif(22, .bold))
                .foregroundStyle(MGGradient.goldHeading)
                .padding(.top, 8)

            Text("At least 8 characters, with a letter and a number.")
                .font(MGFont.mono(9))
                .foregroundStyle(cream.opacity(0.6))

            SecureField("New password", text: $newPassword)
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
                #if os(iOS)
                .textContentType(.newPassword)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                #endif
                .accessibilityIdentifier("new_password_field")
                .accessibilityLabel("New password")

            if let passwordError {
                Text(passwordError)
                    .font(MGFont.mono(8.5))
                    .foregroundStyle(Color(red: 0.9, green: 0.4, blue: 0.4))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(action: save) {
                HStack(spacing: 8) {
                    if isLoading {
                        ProgressView()
                            .controlSize(.small)
                            .tint(MGColor.goldText)
                    }
                    Text("Save Password")
                        .font(MGFont.serif(15, .bold))
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
                )
            }
            .buttonStyle(.plain)
            .disabled(isLoading || newPassword.isEmpty)
            .accessibilityIdentifier("save_password_button")
            .accessibilityLabel("Save new password")

            Spacer()
        }
        .padding(.horizontal, 22)
        .presentationDetents([.medium])
        .presentationBackground(.ultraThinMaterial)
        .interactiveDismissDisabled()
    }
}
