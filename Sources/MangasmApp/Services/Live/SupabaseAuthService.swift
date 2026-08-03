import Foundation
import Supabase

@MainActor
public final class SupabaseAuthService: AuthService {
    private let client: SupabaseClient
    private let projectURL: URL
    private let publishableKey: String
    #if canImport(AuthenticationServices) && canImport(UIKit)
    private let apple = AppleSignInPresenter()
    #endif

    public init(client: SupabaseClient, projectURL: URL, publishableKey: String = "") {
        self.client = client
        self.projectURL = projectURL
        self.publishableKey = publishableKey
    }

    public func signInWithApple(consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
        #if canImport(AuthenticationServices) && canImport(UIKit)
        let (idToken, nonce, authorizationCode) = try await apple.signIn()
        try await client.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
        )
        try await upsertProfileFromAppleSession()
        try await logConsent(consent)
        // Guideline 5.1.1(v): register the Apple authorization code so the
        // server can hold a refresh token for revoke-on-delete. Best-effort —
        // must never fail sign-in.
        if let authorizationCode {
            await registerAppleAuthorizationCode(authorizationCode)
        }
        #else
        throw AuthError.notImplemented("Sign in with Apple")
        #endif
    }

    public func signInWithEmail(email: String, password: String, consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !password.isEmpty else {
            throw AuthError.server("Enter your email and password.")
        }
        try await client.auth.signIn(email: trimmedEmail, password: password)
        try await logConsent(consent)
    }

    public func signInWithGoogle(consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
        throw AuthError.notImplemented("Google sign-in")
    }

    public func signInWithPhone(consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
        throw AuthError.notImplemented("Phone sign-in")
    }

    public func enterMock(consent: OnboardingConsent) async throws {
        guard consent.mayEnter else { throw AuthError.consentRequired }
    }

    /// Send the Apple authorization code to the `apple-register` edge function,
    /// which exchanges it for a refresh token and stores it for revoke-on-delete.
    /// Failures are swallowed (logged) — this must never block sign-in.
    private func registerAppleAuthorizationCode(_ code: String) async {
        do {
            let session = try await client.auth.session
            let url = projectURL.appending(path: "functions/v1/apple-register")
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if !publishableKey.isEmpty {
                request.setValue(publishableKey, forHTTPHeaderField: "apikey")
            }
            struct Body: Encodable { let authorizationCode: String }
            request.httpBody = try JSONEncoder().encode(Body(authorizationCode: code))
            _ = try await URLSession.shared.data(for: request)
        } catch {
            print("[SupabaseAuthService] apple-register failed: \(error)")
        }
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

    private func upsertProfileFromAppleSession() async throws {
        let user = try await client.auth.session.user
        let meta = user.userMetadata
        let full = meta["full_name"]?.stringValue ?? ""
        let given = meta["given_name"]?.stringValue ?? ""
        let family = meta["family_name"]?.stringValue ?? ""
        let combined = [given, family].filter { !$0.isEmpty }.joined(separator: " ")
        let name = full.isEmpty ? combined : full

        // Apple only sends the name on the FIRST authorization; on later logins
        // these fields come back empty. Skip the write when we have no real name
        // so we never overwrite a returning user's name (the profile row already
        // exists — created by the handle_new_user trigger on signup).
        guard !name.isEmpty else { return }

        struct ProfileRow: Encodable {
            let id: UUID
            let name: String
        }

        try await client
            .from("profiles")
            .upsert(ProfileRow(id: user.id, name: name))
            .execute()
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

private extension AnyJSON {
    var stringValue: String? {
        switch self {
        case .string(let s): return s
        default: return nil
        }
    }
}