import XCTest

/// Phase 5 — TestFlight smoke. Verifies the real app binary launches on a
/// simulator and reaches the foreground without crashing. Runs via
/// xcodebuild test; needs no live backend.
@MainActor
final class MangasmUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    func testAppLaunchesToForeground() {
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(
            app.wait(for: .runningForeground, timeout: 20),
            "app must reach the foreground after launch"
        )
        // Still alive a moment later (catches immediate launch crashes).
        XCTAssertEqual(app.state, .runningForeground)
    }
}

/// Shared launch helpers for UI tests. Still require the 18+ gate;
/// `-MANGASM_UI_TESTING` skips splash so the gate is the first screen.
enum LaunchUI {
    @MainActor
    static func launchForGateTests() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-MANGASM_UI_TESTING"]
        app.launchEnvironment["MANGASM_UI_TESTING"] = "1"
        app.launch()
        return app
    }

    @MainActor
    static func waitForAgeGate(
        _ app: XCUIApplication,
        file: StaticString = #file,
        line: UInt = #line
    ) -> XCUIElement {
        let gate = app.buttons["age_gate_confirm"]
        if gate.waitForExistence(timeout: 12) { return gate }
        let any = app.descendants(matching: .any)["age_gate_confirm"]
        XCTAssertTrue(
            any.waitForExistence(timeout: 5),
            "18+ gate should appear after launch",
            file: file,
            line: line
        )
        return any
    }
}
