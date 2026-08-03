#if canImport(AuthenticationServices) && canImport(UIKit)
import AuthenticationServices
import UIKit

/// Presents Sign in with Apple and returns the identity token + raw nonce for Supabase.
@MainActor
public final class AppleSignInPresenter: NSObject {
    /// idToken/nonce feed Supabase; authorizationCode is exchanged server-side
    /// for an Apple refresh token so the SIWA grant can later be revoked on
    /// account deletion (Guideline 5.1.1(v)). authorizationCode is nil if Apple
    /// did not return one.
    public typealias Credential = (idToken: String, nonce: String, authorizationCode: String?)
    private var continuation: CheckedContinuation<Credential, Error>?
    private var rawNonce = ""

    public func signIn() async throws -> Credential {
        rawNonce = SignInNonce.make()
        let hashed = SignInNonce.sha256Hex(rawNonce)

        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = hashed

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    private func finish(_ result: Result<Credential, Error>) {
        guard let continuation else { return }
        self.continuation = nil
        continuation.resume(with: result)
    }
}

extension AppleSignInPresenter: ASAuthorizationControllerDelegate {
    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8)
        else {
            finish(.failure(AuthError.missingIdentityToken))
            return
        }
        let authCode = credential.authorizationCode
            .flatMap { String(data: $0, encoding: .utf8) }
        finish(.success((idToken: idToken, nonce: rawNonce, authorizationCode: authCode)))
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        finish(.failure(AuthError.appleSignInFailed(error.localizedDescription)))
    }
}

extension AppleSignInPresenter: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.flatMap(\.windows).first { $0.isKeyWindow }
        return window ?? ASPresentationAnchor()
    }
}
#endif