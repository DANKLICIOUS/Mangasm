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

/// Shared launch helpers for UI tests. Still require the 18+ gate; only
/// tap through splash if auto-advance has not already handed off.
enum LaunchUI {
    @MainActor
    static func waitForAgeGate(
        _ app: XCUIApplication,
        file: StaticString = #file,
        line: UInt = #line
    ) -> XCUIElement {
        let gate = app.descendants(matching: .any)["age_gate_confirm"]
        if !gate.waitForExistence(timeout: 12) {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.35)).tap()
        }
        XCTAssertTrue(
            gate.waitForExistence(timeout: 20),
            "18+ gate should appear after the splash",
            file: file,
            line: line
        )
        return gate
    }
}
