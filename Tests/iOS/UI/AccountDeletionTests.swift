import XCTest

/// Phase 1 (UI) — in-app account deletion (Guideline 5.1.1(v)). Apple's actual
/// requirement is that account deletion be *easy to find* in-app; this test
/// verifies it's reachable and hittable from Settings after entering the app.
///
/// The post-confirm sign-out effect is verified by `AccountDeletionLogicTests`
/// (resetForSignOut + the deleteAccount() service call), because the destructive
/// `confirmationDialog` does not present reliably under XCUITest's synthetic tap
/// when nested in a ScrollView-inside-a-sheet (verified via hierarchy dump).
final class AccountDeletionTests: XCTestCase {

    override func setUp() { continueAfterFailure = false }

    func testDeleteAccountIsReachableFromSettings() {
        let app = XCUIApplication()
        app.launch()

        // Enter the app through the consent gate. Confirming the 18+ gate
        // pre-fills consent, so the mock entry button proceeds straight in.
        let ageGate = app.buttons["age_gate_confirm"]
        XCTAssertTrue(ageGate.waitForExistence(timeout: 30), "18+ gate should appear after the splash")
        ageGate.tap()
        let enter = app.buttons["mock_enter_button"]
        XCTAssertTrue(enter.waitForExistence(timeout: 8), "sign-in should appear")
        enter.tap()
        XCTAssertTrue(enter.waitForNonExistence(timeout: 8), "should enter the app")

        // Open Settings.
        let settings = app.buttons["settings_button"]
        XCTAssertTrue(settings.waitForExistence(timeout: 6), "settings button should be present")
        settings.tap()

        // Deletion must be reachable and tappable (not buried).
        let deleteRow = app.buttons["delete_account_row"]
        XCTAssertTrue(deleteRow.waitForExistence(timeout: 6),
                      "Delete Account must be reachable from Settings (Guideline 5.1.1(v))")
        var tries = 0
        while !deleteRow.isHittable && tries < 5 { app.swipeUp(); tries += 1 }
        XCTAssertTrue(deleteRow.isHittable, "Delete Account must be tappable, not buried")
    }
}
