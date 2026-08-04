import Foundation
import Supabase

/// Deep-link targets registered under the `mangasm://` URL scheme (project.yml
/// CFBundleURLTypes). Supabase Auth redirects land here after email
/// confirmation and password reset; both must be in the Supabase dashboard's
/// Auth → URL Configuration → Redirect URLs allowlist.
public enum AuthDeepLink {
    public static let scheme = "mangasm"
    public static let callbackHost = "auth-callback"
    public static var callbackURL: URL { URL(string: "\(scheme)://\(callbackHost)")! }

    public static func isAuthCallback(_ url: URL) -> Bool {
        url.scheme == scheme && url.host == callbackHost
    }
}

@MainActor
public final class SupabaseAuthService: AuthService {
    private let client: SupabaseClient
    private let projectURL: URL
    private let publishableKey: String

    public init(client: SupabaseClient, projectURL: URL, publishableKey: String = "") {
        self.client = client
        self.projectURL = projectURL
        self.publishableKey = publishableKey
    }

    public func signUpWithEmail(email: String, password: String, consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        try EmailAuthValidator.validate(email: trimmedEmail, password: password)
        do {
            _ = try await client.auth.signUp(
                email: trimmedEmail,
                password: password,
                redirectTo: AuthDeepLink.callbackURL
            )
        } catch {
            throw AuthErrorMapper.map(error)
        }
        // With "Confirm email" ON there is no session yet — consent is logged
        // on the first successful sign-in instead.
    }

    public func signInWithEmail(email: String, password: String, consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !password.isEmpty else {
            throw AuthError.field(.email, "Enter your email and password.")
        }
        do {
            try await client.auth.signIn(email: trimmedEmail, password: password)
        } catch {
            throw AuthErrorMapper.map(error)
        }
        try await logConsent(consent)
    }

    public func sendPasswordReset(email: String) async throws {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard EmailAuthValidator.isValidEmail(trimmedEmail) else {
            throw AuthError.field(.email, "Enter a valid email address.")
        }
        do {
            try await client.auth.resetPasswordForEmail(
                trimmedEmail,
                redirectTo: AuthDeepLink.callbackURL
            )
        } catch {
            throw AuthErrorMapper.map(error)
        }
    }

    public func handleAuthURL(_ url: URL) async -> Bool {
        guard AuthDeepLink.isAuthCallback(url) else { return false }
        do {
            _ = try await client.auth.session(from: url)
            return true
        } catch {
            print("[SupabaseAuthService] auth callback failed: \(error)")
            return false
        }
    }

    public func updatePassword(newPassword: String) async throws {
        if let problem = EmailAuthValidator.passwordProblem(newPassword) {
            throw AuthError.field(.newPassword, problem)
        }
        do {
            _ = try await client.auth.update(user: UserAttributes(password: newPassword))
        } catch {
            throw AuthErrorMapper.map(error)
        }
    }

    public func signOut() async throws {
        do {
            try await client.auth.signOut()
        } catch {
            throw AuthErrorMapper.map(error)
        }
    }

    public func restoreSession() async -> Bool {
        // `client.auth.session` loads the Keychain-persisted session and
        // refreshes it when expired; any failure (no session, refresh token
        // revoked, offline-expired) routes the user back to the login screen.
        do {
            _ = try await client.auth.session
            return true
        } catch {
            return false
        }
    }

    public func enterMock(consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
    }

    public func deleteAccount() async throws {
        let session = try await client.auth.session
        let token = session.accessToken

        let url = projectURL.appending(path: "functions/v1/delete-account")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // Edge runtime expects apikey + user JWT (same pattern as PostgREST).
        if !publishableKey.isEmpty {
            request.setValue(publishableKey, forHTTPHeaderField: "apikey")
        }
        request.httpBody = Data("{}".utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let detail = String(data: data, encoding: .utf8) ?? ""
            throw AuthError.server(
                detail.isEmpty ? "Account deletion failed" : "Account deletion failed: \(detail)"
            )
        }

        try? await client.auth.signOut()
    }

    private func logConsent(_ consent: OnboardingConsent) async throws {
        let user = try await client.auth.session.user

        struct ConsentRow: Encodable {
            let user_id: UUID
            let kind: String
            let version: String
            let value: String
        }

        let rows = [
            ConsentRow(user_id: user.id, kind: "age_18plus", version: OnboardingConsent.eulaVersion, value: "affirmed"),
            ConsentRow(user_id: user.id, kind: "eula", version: OnboardingConsent.eulaVersion, value: "accepted"),
        ]

        try await client.from("consent_log").insert(rows).execute()
    }
}
