import XCTest
@testable import MangasmApp

final class ProfileStyleCatalogTests: XCTestCase {
    func testBoundariesUnlockCorrectDefault() {
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 0).id, .calmStudio)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 20).id, .calmStudio)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 21).id, .aspirational)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 40).id, .aspirational)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 41).id, .precisionTech)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 60).id, .precisionTech)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 61).id, .digitalFlow)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 80).id, .digitalFlow)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 81).id, .boldExpression)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 100).id, .boldExpression)
    }

    func testAvailableCountGrowsWithScore() {
        XCTAssertEqual(ProfileStyleCatalog.available(score: 0).count, 1)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 21).count, 2)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 41).count, 3)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 61).count, 4)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 81).count, 5)
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
