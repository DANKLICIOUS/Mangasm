import Foundation

/// XCUITest hook. Tests pass `-MANGASM_UI_TESTING YES` and/or
/// `MANGASM_UI_TESTING=1`. Not compiled out of Release — the flag is only
/// present when the test runner launches the app.
enum UITestLaunch {
    static let argument = "-MANGASM_UI_TESTING"
    static let environmentKey = "MANGASM_UI_TESTING"

    static var isActive: Bool {
        let info = ProcessInfo.processInfo
        if info.arguments.contains(argument) { return true }
        if info.environment[environmentKey] == "1" { return true }
        if UserDefaults.standard.bool(forKey: environmentKey) { return true }
        return false
    }

    static func logProcessFlags() {
        NSLog(
            "MANGASM UITestLaunch.isActive=%@ args=[%@] env=%@",
            isActive ? "YES" : "NO",
            ProcessInfo.processInfo.arguments.joined(separator: " "),
            ProcessInfo.processInfo.environment[environmentKey] ?? "nil"
        )
    }
}
