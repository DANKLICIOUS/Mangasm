import XCTest

/// Phase 1 (UI) — the 18+/terms consent gate must block app entry until accepted.
/// Runs on the simulator via xcodebuild test; drives the app through the
/// accessibility API (no live backend needed).
@MainActor
final class OnboardingGateTests: XCTestCase {

    override func setUp() { continueAfterFailure = false }

    func testEntryRequiresAgeAndTermsAcceptance() {
        let app = LaunchUI.launchForGateTests()

        // UI-testing launch starts at the 18+ gate, then sign-in.
        LaunchUI.confirmAgeGate(app)

        let enter = app.buttons["mock_enter_button"]
        XCTAssertTrue(enter.waitForExistence(timeout: 8),
                      "sign-in should appear after the age gate")

        // Age gate pre-fills consent; wait for that, then uncheck to verify
        // the sign-in gate still blocks.
        let toggle = app.buttons["accept_toggle"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 4), "consent toggle should be on sign-in")
        let prefilled = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "value == %@", "accepted"),
            object: toggle
        )
        XCTAssertEqual(
            XCTWaiter().wait(for: [prefilled], timeout: 4),
            .completed,
            "age-gate confirm should pre-fill the sign-in consent toggle"
        )
        toggle.tap()
        let revoked = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "value == %@", "not_accepted"),
            object: toggle
        )
        XCTAssertEqual(
            XCTWaiter().wait(for: [revoked], timeout: 3),
            .completed,
            "toggle must revoke consent"
        )
        enter.tap()
        let nudge = app.staticTexts["accept_nudge"]
        let nudgeByLabel = app.staticTexts["Please confirm to continue."]
        XCTAssertTrue(
            nudge.waitForExistence(timeout: 4) || nudgeByLabel.waitForExistence(timeout: 2),
            "tapping before consent must show the confirm prompt"
        )
        XCTAssertTrue(enter.exists, "must remain on the sign-in screen before consent")

        toggle.tap()
        enter.tap()
        XCTAssertTrue(enter.waitForNonExistence(timeout: 8),
                      "after accepting, entering should dismiss the sign-in screen")
    }
}
