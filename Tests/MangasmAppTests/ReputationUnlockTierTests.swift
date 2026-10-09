import XCTest
@testable import MangasmApp

final class ReputationUnlockTierTests: XCTestCase {
    func testScoreBandsMatchBackendContract() {
        XCTAssertEqual(ReputationUnlockTier.from(score: 0), .new)
        XCTAssertEqual(ReputationUnlockTier.from(score: 39), .new)
        XCTAssertEqual(ReputationUnlockTier.from(score: 40), .building)
        XCTAssertEqual(ReputationUnlockTier.from(score: 64), .building)
        XCTAssertEqual(ReputationUnlockTier.from(score: 65), .reliable)
        XCTAssertEqual(ReputationUnlockTier.from(score: 84), .reliable)
        XCTAssertEqual(ReputationUnlockTier.from(score: 85), .verified)
        XCTAssertEqual(ReputationUnlockTier.from(score: 100), .verified)
        XCTAssertEqual(ReputationUnlockTier.from(score: -4), .new)
        XCTAssertEqual(ReputationUnlockTier.from(score: 999), .verified)
    }

    func testUnlockMap() {
        XCTAssertEqual(ReputationUnlockTier.new.unlockedStyleIds, [.calmStudio])
        XCTAssertEqual(
            ReputationUnlockTier.building.unlockedStyleIds,
            [.calmStudio, .aspirational]
        )
        XCTAssertEqual(
            ReputationUnlockTier.reliable.unlockedStyleIds,
            [.calmStudio, .aspirational, .precisionTech, .digitalFlow]
        )
        XCTAssertEqual(ReputationUnlockTier.verified.unlockedStyleIds.count, 5)
        XCTAssertTrue(ReputationUnlockTier.verified.unlockedStyleIds.contains(.boldExpression))
    }

    func testParseServerTierStrings() {
        XCTAssertEqual(ReputationUnlockTier.parse("building"), .building)
        XCTAssertEqual(ReputationUnlockTier.parse("VERIFIED"), .verified)
        XCTAssertEqual(ReputationUnlockTier.parse("veteran"), .building)
        XCTAssertEqual(ReputationUnlockTier.parse("legend"), .verified)
        XCTAssertNil(ReputationUnlockTier.parse("unknown"))
    }

    func testCatalogMinScoresMatchTiers() {
        XCTAssertEqual(ProfileStyleCatalog.config(id: .calmStudio).minScore, 0)
        XCTAssertEqual(ProfileStyleCatalog.config(id: .aspirational).minScore, 40)
        XCTAssertEqual(ProfileStyleCatalog.config(id: .precisionTech).minScore, 65)
        XCTAssertEqual(ProfileStyleCatalog.config(id: .digitalFlow).minScore, 65)
        XCTAssertEqual(ProfileStyleCatalog.config(id: .boldExpression).minScore, 85)
    }

    func testUnlockHintCopy() {
        XCTAssertTrue(ProfileStyleCatalog.unlockHint(for: .calmStudio).contains("every member"))
        XCTAssertEqual(ProfileStyleCatalog.unlockHint(for: .aspirational), "Unlocks at Building · 40+")
        XCTAssertEqual(ProfileStyleCatalog.unlockHint(for: .precisionTech), "Unlocks at Reliable · 65+")
        XCTAssertEqual(ProfileStyleCatalog.unlockHint(for: .boldExpression), "Unlocks at Verified · 85+")
    }
}
