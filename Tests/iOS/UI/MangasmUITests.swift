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
