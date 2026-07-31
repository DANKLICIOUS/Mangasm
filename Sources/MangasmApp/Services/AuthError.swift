import Foundation

public enum AuthError: LocalizedError, Sendable {
    case consentRequired
    case notImplemented(String)
    case missingIdentityToken
    case appleSignInFailed(String)
    case server(String)

    public var errorDescription: String? {
        switch self {
        case .consentRequired: return "Please confirm you are 18+ and accept the guidelines."
        case .notImplemented(let feature): return "\(feature) is coming soon."
        case .missingIdentityToken: return "Apple did not return a sign-in token."
        case .appleSignInFailed(let detail): return "Apple sign-in failed: \(detail)"
        case .server(let detail): return detail
        }
    }
}