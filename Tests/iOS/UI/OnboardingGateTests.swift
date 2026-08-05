import XCTest

/// Phase 1 (UI) — the 18+/terms consent gate must block app entry until accepted.
/// Runs on the simulator via xcodebuild test; drives the app through the
/// accessibility API (no live backend needed).
final class OnboardingGateTests: XCTestCase {

    override func setUp() { continueAfterFailure = false }

    func testEntryRequiresAgeAndTermsAcceptance() {
        let app = XCUIApplication()
        app.launch()

        // Splash auto-advances (~8.6s) → 18+ gate → sign-in.
        let ageGate = app.buttons["age_gate_confirm"]
        XCTAssertTrue(ageGate.waitForExistence(timeout: 30),
                      "18+ gate should appear after the splash")
        ageGate.tap()

        let enter = app.buttons["mock_enter_button"]
        XCTAssertTrue(enter.waitForExistence(timeout: 8),
                      "sign-in should appear after the age gate")

        // Age gate pre-fills consent; uncheck to verify the sign-in gate still blocks.
        app.buttons["accept_toggle"].tap()
        enter.tap()
        XCTAssertTrue(app.staticTexts["accept_nudge"].waitForExistence(timeout: 3),
                      "tapping before consent must show the confirm prompt")
        XCTAssertTrue(enter.exists, "must remain on the sign-in screen before consent")

        app.buttons["accept_toggle"].tap()
        enter.tap()
        XCTAssertTrue(enter.waitForNonExistence(timeout: 8),
                      "after accepting, entering should dismiss the sign-in screen")
    }
}
