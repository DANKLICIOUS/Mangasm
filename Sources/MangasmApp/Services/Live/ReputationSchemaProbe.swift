import Foundation

/// Classifies PostgREST / Postgres errors so live reputation can fall back when
/// `my_profile_style` or `profiles.selected_style_id` are not deployed yet.
public enum ReputationBackendIssue: Sendable, Equatable {
    case styleLocked
    case missingColumn
    case missingRPC
    case missingTable
    case other
}

public enum ReputationSchemaProbe {
    public static func diagnose(_ error: Error) -> ReputationBackendIssue {
        diagnose(blob: normalize(error))
    }

    public static func diagnose(blob: String) -> ReputationBackendIssue {
        let text = blob.lowercased()
        if isStyleLocked(text) { return .styleLocked }
        if containsAny(text, ["pgrst202", "42883"]) { return .missingRPC }
        if containsAny(text, ["pgrst205", "42p01"]) { return .missingTable }
        if containsAny(text, ["pgrst204", "42703"]) { return .missingColumn }
        if text.contains("function") && (text.contains("does not exist") || text.contains("not found")) {
            return .missingRPC
        }
        if text.contains("relation") && text.contains("does not exist") {
            return .missingTable
        }
        if text.contains("column") && (text.contains("does not exist") || text.contains("not found")) {
            return .missingColumn
        }
        return .other
    }

    public static func normalize(_ error: Error) -> String {
        var parts = [String(describing: type(of: error)), error.localizedDescription, String(describing: error)]
        let mirror = Mirror(reflecting: error)
        for child in mirror.children {
            if let value = child.value as? String {
                parts.append(value)
            } else if let value = child.value as? Int {
                parts.append(String(value))
            }
        }
        return parts.joined(separator: " ")
    }

    private static func isStyleLocked(_ text: String) -> Bool {
        if containsAny(text, [
            "style_locked",
            "style is locked",
            "style not unlocked",
            "is not unlocked",
            "23514",
            "check_violation",
        ]) {
            return true
        }
        return text.contains("p0001") && text.contains("style")
    }

    private static func containsAny(_ text: String, _ needles: [String]) -> Bool {
        needles.contains { text.contains($0) }
    }
}
