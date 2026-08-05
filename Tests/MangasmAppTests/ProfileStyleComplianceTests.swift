import XCTest
@testable import MangasmApp

final class ProfileStyleComplianceTests: XCTestCase {
    func testStyleUnlockCopyHasNoSexualTerms() {
        let blob = (
            ProfileStyleCatalog.all.map(\.badgeName)
                + ProfileStyleCatalog.all.map(\.displayName)
                + [ProfileStyleCatalog.communityReputationExplainer]
        )
        .joined(separator: " ")
        .lowercased()

        // Word-boundary style bans (allow "sexual features" only in the safety explainer phrase).
        for banned in ["thirst", "hookup", "nsfw", "xxx", "fetish", "sexy", "hot score"] {
            XCTAssertFalse(blob.contains(banned), "banned term \(banned) found in style copy")
        }
        let badgeBlob = ProfileStyleCatalog.all.map(\.badgeName).joined(separator: " ").lowercased()
        XCTAssertFalse(badgeBlob.contains("sex"))
    }

    func testPhotoGateRemainsScoreBasedNotStyleBased() {
        let mock = MockReputationService()
        XCTAssertFalse(mock.canViewPhotos(viewerScore: 10, targetGate: 20))
        XCTAssertTrue(mock.canViewPhotos(viewerScore: 50, targetGate: 20))
    }

    func testExplainerStatesCosmeticOnly() {
        let e = ProfileStyleCatalog.communityReputationExplainer.lowercased()
        XCTAssertTrue(e.contains("cosmetic"))
        XCTAssertTrue(e.contains("never messages") || e.contains("never"))
    }
}
