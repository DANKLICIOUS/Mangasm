import Foundation

/// XCUITest hook. Tests pass `-MANGASM_UI_TESTING` and/or
/// `MANGASM_UI_TESTING=1`. Not compiled out of Release — the flag is only
/// present when the test runner launches the app.
enum UITestLaunch {
    static let argument = "-MANGASM_UI_TESTING"
    static let environmentKey = "MANGASM_UI_TESTING"

    static var isActive: Bool {
        ProcessInfo.processInfo.arguments.contains(argument)
            || ProcessInfo.processInfo.environment[environmentKey] == "1"
    }
}
