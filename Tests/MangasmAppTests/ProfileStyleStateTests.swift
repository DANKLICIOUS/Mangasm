import XCTest
@testable import MangasmApp

final class ProfileStyleStateTests: XCTestCase {
    func testPreferredLowerStyleRespected() {
        let state = ProfileStyleState(reputationScore: 50, preferredStyleId: .calmStudio)
        XCTAssertEqual(state.activeConfig.styleId, .calmStudio)
    }

    func testPreferredNotUnlockedFallsBackToDefault() {
        let state = ProfileStyleState(reputationScore: 10, preferredStyleId: .digitalFlow)
        XCTAssertEqual(state.activeConfig.styleId, .calmStudio)
    }

    func testScoreIncreaseDetectsNewUnlocks() {
        var state = ProfileStyleState(
            reputationScore: 20,
            preferredStyleId: nil,
            seenUnlockIds: [.calmStudio]
        )
        let toast = state.applyScoreChange(42)
        XCTAssertEqual(Set(toast.map(\.styleId)), [.aspirational, .precisionTech])
        XCTAssertTrue(state.seenUnlockIds.contains(.precisionTech))
    }

    func testApplyScoreDoesNotRepeatSeenUnlocks() {
        var state = ProfileStyleState(
            reputationScore: 50,
            preferredStyleId: nil,
            seenUnlockIds: [.calmStudio, .aspirational, .precisionTech]
        )
        let toast = state.applyScoreChange(50)
        XCTAssertTrue(toast.isEmpty)
    }

    func testSelectPreferredOnlyIfUnlocked() {
        var state = ProfileStyleState(reputationScore: 25, preferredStyleId: nil)
        XCTAssertTrue(state.selectPreferred(.aspirational))
        XCTAssertFalse(state.selectPreferred(.boldExpression))
        XCTAssertEqual(state.preferredStyleId, .aspirational)
    }

    func testSeedSeenSuppressesToastOnSameScore() {
        var state = ProfileStyleState(reputationScore: 90, preferredStyleId: nil, seenUnlockIds: [])
        state.seedSeenWithCurrentUnlocks()
        let toast = state.applyScoreChange(90)
        XCTAssertTrue(toast.isEmpty)
        XCTAssertEqual(state.seenUnlockIds.count, 5)
    }
}
