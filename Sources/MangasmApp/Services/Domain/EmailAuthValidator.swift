import Foundation

/// Client-side email/password validation, run BEFORE any network call so the
/// user gets instant, field-anchored feedback (email-only auth spec).
public enum EmailAuthValidator {
    /// Pragmatic RFC-lite check: one @, a non-empty local part, and a dotted
    /// domain. Deliberately loose — the server is the final validator.
    public static func isValidEmail(_ raw: String) -> Bool {
        let email = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !email.isEmpty, !email.contains(" ") else { return false }
        let parts = email.split(separator: "@", omittingEmptySubsequences: false)
        guard parts.count == 2, !parts[0].isEmpty else { return false }
        let domain = parts[1]
        guard domain.contains("."), !domain.hasPrefix("."), !domain.hasSuffix(".") else { return false }
        return true
    }

    /// Password strength: ≥8 chars with at least one letter and one digit.
    /// Mirrors the Supabase project's minimum so client and server agree.
    public static func passwordProblem(_ password: String) -> String? {
        if password.count < 8 {
            return "Password must be at least 8 characters."
        }
        if !password.contains(where: { $0.isLetter }) || !password.contains(where: { $0.isNumber }) {
            return "Password must include at least one letter and one number."
        }
        return nil
    }

    /// Validates both fields, throwing the first field-anchored error found.
    public static func validate(email: String, password: String) throws {
        guard isValidEmail(email) else {
            throw AuthError.field(.email, "Enter a valid email address.")
        }
        if let problem = passwordProblem(password) {
            throw AuthError.field(.password, problem)
        }
    }
}
