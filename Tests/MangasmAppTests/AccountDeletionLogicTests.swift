import XCTest
@testable import MangasmApp

/// Phase 1 — account-deletion local effects (Guideline 5.1.1(v)).
@MainActor
final class AccountDeletionLogicTests: XCTestCase {

    func testResetForSignOutReturnsToLaunchAndClearsSession() {
        let s = AppState()
        s.phase = .app
        s.premium = true
        s.tab = .discover
        s.showSettings = true
        s.showChatList = true

        s.resetForSignOut()

        XCTAssertEqual(s.phase, .launch, "deletion must return to the launch flow")
        XCTAssertFalse(s.premium, "premium entitlement must be dropped locally")
        XCTAssertEqual(s.tab, .events, "tab resets to default (events)")
        XCTAssertFalse(s.showSettings, "open sheets must close")
        XCTAssertFalse(s.showChatList)
        XCTAssertNil(s.activeChat)
    }

    func testDeleteAccountReachesAuthService() async throws {
        let auth = MockAuthService()
        XCTAssertEqual(auth.deleteAccountCallCount, 0)
        try await auth.deleteAccount()
        XCTAssertEqual(auth.deleteAccountCallCount, 1, "delete must invoke the auth service")
    }
}
