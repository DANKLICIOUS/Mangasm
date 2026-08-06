import XCTest
@testable import MangasmApp

/// Unit tests for the pure domain logic of Phases 1, 3, and 4. These run without
/// any backend; the integration/UI tests for these phases remain gated on the
/// live dev Supabase project + Xcode simulator.
final class DomainLogicTests: XCTestCase {

    private let cal = Calendar(identifier: .gregorian)
    private func date(_ y: Int, _ m: Int, _ d: Int) -> Date {
        cal.date(from: DateComponents(year: y, month: m, day: d))!
    }

    // MARK: - Phase 1: AgeGate (critical path)

    func testExactly18TodayIsAdult() {
        let dob = date(2008, 6, 21)
        let now = date(2026, 6, 21)             // 18th birthday exactly
        XCTAssertTrue(AgeGate.isAdult(birthDate: dob, now: now))
    }

    func testOneDayShortOf18IsNotAdult() {
        let dob = date(2008, 6, 22)
        let now = date(2026, 6, 21)             // turns 18 tomorrow
        XCTAssertFalse(AgeGate.isAdult(birthDate: dob, now: now))
    }

    func testClearlyOver18IsAdult() {
        XCTAssertTrue(AgeGate.isAdult(birthDate: date(1990, 1, 1), now: date(2026, 6, 21)))
    }

    func testFutureBirthDateIsNotAdult() {
        XCTAssertFalse(AgeGate.isAdult(birthDate: date(2030, 1, 1), now: date(2026, 6, 21)))
    }

    // MARK: - Email-only auth: EmailAuthValidator (critical path)

    func testValidEmailsAccepted() {
        XCTAssertTrue(EmailAuthValidator.isValidEmail("a@b.co"))
        XCTAssertTrue(EmailAuthValidator.isValidEmail("  user.name+tag@example.com  "))
    }

    func testInvalidEmailsRejected() {
        for bad in ["", "plain", "@no-local.com", "two@@ats.com", "sp ace@x.com",
                    "user@nodot", "user@.leadingdot.com", "user@trailingdot."] {
            XCTAssertFalse(EmailAuthValidator.isValidEmail(bad), "should reject: \(bad)")
        }
    }

    func testPasswordStrengthRules() {
        XCTAssertNotNil(EmailAuthValidator.passwordProblem("short1"))       // < 8 chars
        XCTAssertNotNil(EmailAuthValidator.passwordProblem("lettersonly"))  // no digit
        XCTAssertNotNil(EmailAuthValidator.passwordProblem("12345678"))     // no letter
        XCTAssertNil(EmailAuthValidator.passwordProblem("abcdefg1"))
    }

    func testValidateThrowsFieldAnchoredErrors() {
        XCTAssertThrowsError(try EmailAuthValidator.validate(email: "bad", password: "abcdefg1")) {
            XCTAssertEqual(($0 as? AuthError)?.authField, .email)
        }
        XCTAssertThrowsError(try EmailAuthValidator.validate(email: "a@b.co", password: "weak")) {
            XCTAssertEqual(($0 as? AuthError)?.authField, .password)
        }
        XCTAssertNoThrow(try EmailAuthValidator.validate(email: "a@b.co", password: "abcdefg1"))
    }

    // MARK: - Phase 4: BlockPolicy (bidirectional)

    func testBlockIsBidirectional() {
        var p = BlockPolicy()
        p.block("bob", by: "alice")
        XCTAssertTrue(p.isHidden("alice", "bob"))
        XCTAssertTrue(p.isHidden("bob", "alice"), "block must hide both directions")
    }

    func testUnblockRestoresVisibility() {
        var p = BlockPolicy()
        p.block("bob", by: "alice")
        p.unblock("bob", by: "alice")
        XCTAssertFalse(p.isHidden("alice", "bob"))
    }

    func testVisibleFiltersHiddenCandidates() {
        var p = BlockPolicy()
        p.block("x", by: "me")          // I blocked x
        p.block("me", by: "y")          // y blocked me
        let ids = ["x", "y", "z"]
        let visible = p.visible(ids, viewer: "me", id: { $0 })
        XCTAssertEqual(visible, ["z"], "both directions of a block must be filtered out")
    }

    // MARK: - Phase 3: PremiumResolver (server-authoritative, anti-fraud)

    func testServerTrueOverridesLocalFalse() {
        XCTAssertTrue(PremiumResolver.isPremium(serverVerified: true, localEntitlement: false))
    }

    func testServerFalseOverridesLocalTrue() {
        // The anti-fraud case: a spoofed client entitlement must not grant premium.
        XCTAssertFalse(PremiumResolver.isPremium(serverVerified: false, localEntitlement: true))
    }

    func testFallsBackToLocalWhenServerUnknown() {
        XCTAssertTrue(PremiumResolver.isPremium(serverVerified: nil, localEntitlement: true))
        XCTAssertFalse(PremiumResolver.isPremium(serverVerified: nil, localEntitlement: false))
    }
}
