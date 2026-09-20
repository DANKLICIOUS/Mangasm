import XCTest
@testable import MangasmApp

final class ProfileStyleCatalogTests: XCTestCase {
    func testBoundariesUnlockCorrectDefault() {
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 0).id, .calmStudio)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 39).id, .calmStudio)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 40).id, .aspirational)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 64).id, .aspirational)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 65).id, .digitalFlow)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 84).id, .digitalFlow)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 85).id, .boldExpression)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 100).id, .boldExpression)
    }

    func testAvailableCountGrowsWithScore() {
        XCTAssertEqual(ProfileStyleCatalog.available(score: 0).count, 1)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 39).count, 1)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 40).count, 2)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 64).count, 2)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 65).count, 4)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 84).count, 4)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 85).count, 5)
    }

    func testReliableUnlocksBothPrecisionAndDigitalFlow() {
        let ids = Set(ProfileStyleCatalog.available(score: 65).map(\.styleId))
        XCTAssertTrue(ids.contains(.precisionTech))
        XCTAssertTrue(ids.contains(.digitalFlow))
        XCTAssertFalse(ids.contains(.boldExpression))
    }

    func testClampsOutOfRangeScores() {
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: -5).id, .calmStudio)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 999).id, .boldExpression)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 999).count, 5)
    }

    func testBadgeNamesAreAppStoreSafe() {
        let names = ProfileStyleCatalog.all.map(\.badgeName)
        XCTAssertEqual(names, [
            "New Member",
            "Rising Member",
            "Trusted Member",
            "Community Leader",
            "Elite Verified",
        ])
    }

    func testHeroAssetNamesMatchCatalog() {
        XCTAssertEqual(
            ProfileStyleCatalog.config(id: .precisionTech).heroAssetName,
            "style-hero-precisionTech"
        )
    }

    func testLegacyThemeAliasesRoundTrip() {
        XCTAssertEqual(ProfileStyleId.calmStudio.legacyThemeAlias, "bobRoss")
        XCTAssertEqual(ProfileStyleId(legacyThemeAlias: "cyborg"), .precisionTech)
        XCTAssertEqual(ProfileStyleId(legacyThemeAlias: "gothGlam"), .boldExpression)
        XCTAssertNil(ProfileStyleId(legacyThemeAlias: "unknown"))
    }
}
