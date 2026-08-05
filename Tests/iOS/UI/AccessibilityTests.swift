import XCTest

/// Accessibility — interactive controls must meet Apple's 44pt minimum touch target.
final class AccessibilityTests: XCTestCase {

    override func setUp() { continueAfterFailure = false }

    func testSettingsCloseButtonMeetsMinimumTouchTarget() {
        let app = XCUIApplication()
        app.launch()

        // Enter the app through the consent gate, then open Settings.
        // Confirming the 18+ gate pre-fills consent, so the mock entry
        // button proceeds straight in.
        let ageGate = app.buttons["age_gate_confirm"]
        XCTAssertTrue(ageGate.waitForExistence(timeout: 30), "18+ gate should appear after the splash")
        ageGate.tap()
        let enter = app.buttons["mock_enter_button"]
        XCTAssertTrue(enter.waitForExistence(timeout: 8))
        enter.tap()
        XCTAssertTrue(enter.waitForNonExistence(timeout: 8))
        app.buttons["settings_button"].tap()

        let close = app.buttons["Close"]
        XCTAssertTrue(close.waitForExistence(timeout: 6), "Settings close button should exist")
        XCTAssertGreaterThanOrEqual(close.frame.height, 44, "close button must be ≥44pt tall (touch target)")
        XCTAssertGreaterThanOrEqual(close.frame.width, 44, "close button must be ≥44pt wide (touch target)")
    }
}
