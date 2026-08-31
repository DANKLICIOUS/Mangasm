import Foundation

// MARK: - AuthField
/// Which form field an auth error belongs to, so the UI can render the message
/// inline under the field that caused it (never a raw error code).
public enum AuthField: Sendable, Equatable {
    case email
    case password
    case newPassword
    /// Not attributable to a single field (network, rate limit, …).
    case general
}

public enum AuthError: LocalizedError, Sendable, Equatable {
    case consentRequired
    /// Plain-language message anchored to a specific form field.
    case field(AuthField, String)
    case server(String)

    public var errorDescription: String? {
        switch self {
        case .consentRequired: return "Please confirm you are 18+ and accept the guidelines."
        case .field(_, let message): return message
        case .server(let detail): return detail
        }
    }

    /// The field this error should be shown under (.general when server-side).
    public var authField: AuthField {
        switch self {
        case .field(let field, _): return field
        case .consentRequired, .server: return .general
        }
    }
}

// MARK: - AuthErrorMapper
/// Maps Supabase Auth failures to plain-language, field-anchored messages.
/// Matching is on the server's message text because supabase-swift surfaces
/// GoTrue errors as API messages; unknown errors fall back to a generic line —
/// a raw code or JSON body is never shown to the user.
public enum AuthErrorMapper {
    public static func map(_ error: Error) -> AuthError {
        if let authError = error as? AuthError { return authError }

        let text = (error as NSError).localizedDescription.lowercased()

        if text.contains("invalid login credentials") || text.contains("invalid_credentials") {
            return .field(.password, "That email and password don't match. Try again or reset your password.")
        }
        if text.contains("email not confirmed") {
            return .field(.email, "Please confirm your email first — check your inbox for the link we sent.")
        }
        if text.contains("already registered") || text.contains("already been registered") {
            return .field(.email, "An account with this email already exists. Try signing in instead.")
        }
        if text.contains("password should be") || text.contains("weak password") {
            return .field(.password, "That password is too weak. Use at least 8 characters with a lowercase letter, an uppercase letter, a number, and a symbol.")
        }
        if text.contains("rate limit") || text.contains("too many requests") || text.contains("429") {
            return .field(.general, "Too many attempts. Please wait a minute and try again.")
        }
        if text.contains("invalid email") || text.contains("unable to validate email") {
            return .field(.email, "That doesn't look like a valid email address.")
        }
        if text.contains("expired") && (text.contains("link") || text.contains("token") || text.contains("otp")) {
            return .field(.general, "That link has expired. Request a new password-reset email.")
        }
        if (error as NSError).domain == NSURLErrorDomain {
            return .field(.general, "Couldn't reach the server. Check your connection and try again.")
        }
        return .field(.general, "Something went wrong. Please try again.")
    }
}
