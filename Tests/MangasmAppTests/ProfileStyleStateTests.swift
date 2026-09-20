import XCTest
@testable import MangasmApp

final class ProfileStyleStateTests: XCTestCase {
    func testPreferredLowerStyleRespected() {
        let state = ProfileStyleState(reputationScore: 50, preferredStyleId: .calmStudio)
        XCTAssertEqual(state.activeConfig.styleId, .calmStudio)
    }

    func testPreferredGrandfatheredAfterDemotion() {
        let state = ProfileStyleState(reputationScore: 10, preferredStyleId: .digitalFlow)
        XCTAssertEqual(state.activeConfig.styleId, .digitalFlow)
    }

    func testScoreIncreaseDetectsNewUnlocks() {
        var state = ProfileStyleState(
            reputationScore: 20,
            preferredStyleId: nil,
            seenUnlockIds: [.calmStudio]
        )
        let toast = state.applyScoreChange(42)
        XCTAssertEqual(Set(toast.map(\.styleId)), [.aspirational])
        XCTAssertTrue(state.seenUnlockIds.contains(.aspirational))
        XCTAssertFalse(state.seenUnlockIds.contains(.precisionTech))
    }

    func testReliableBandUnlocksTwoStylesTogether() {
        var state = ProfileStyleState(
            reputationScore: 40,
            preferredStyleId: nil,
            seenUnlockIds: [.calmStudio, .aspirational]
        )
        let toast = state.applyScoreChange(65)
        XCTAssertEqual(Set(toast.map(\.styleId)), [.precisionTech, .digitalFlow])
    }

    func testApplyScoreDoesNotRepeatSeenUnlocks() {
        var state = ProfileStyleState(
            reputationScore: 50,
            preferredStyleId: nil,
            seenUnlockIds: [.calmStudio, .aspirational]
        )
        let toast = state.applyScoreChange(50)
        XCTAssertTrue(toast.isEmpty)
    }

    func testSelectPreferredOnlyIfUnlocked() {
        var state = ProfileStyleState(reputationScore: 45, preferredStyleId: nil)
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
