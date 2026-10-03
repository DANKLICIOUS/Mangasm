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
        app.launchArguments += ["-MANGASM_UI_TESTING", "YES"]
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
        let title = app.staticTexts["18+ ONLY"]
        XCTAssertTrue(
            title.waitForExistence(timeout: 20),
            "18+ gate should appear after launch",
            file: file,
            line: line
        )
        let confirmCandidates: [XCUIElement] = [
            app.buttons["I AM 18 OR OLDER"],
            app.staticTexts["I AM 18 OR OLDER"],
            app.buttons["age_gate_confirm"],
            app.descendants(matching: .any)["age_gate_confirm"],
        ]
        for element in confirmCandidates where element.exists {
            return element
        }
        for element in confirmCandidates {
            if element.waitForExistence(timeout: 2) { return element }
        }
        XCTFail(
            "18+ confirm control should appear with the gate\n\(app.debugDescription)",
            file: file,
            line: line
        )
        return title
    }

    /// Waits for the 18+ gate, then taps the confirm CTA (not the title).
    @MainActor
    static func confirmAgeGate(
        _ app: XCUIApplication,
        file: StaticString = #file,
        line: UInt = #line
    ) {
        let confirm = waitForAgeGate(app, file: file, line: line)
        if confirm.identifier == "18+ ONLY" || confirm.label == "18+ ONLY" {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.80)).tap()
            return
        }
        confirm.tap()
    }
}
