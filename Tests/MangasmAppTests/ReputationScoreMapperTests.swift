import XCTest
@testable import MangasmApp

final class ReputationScoreMapperTests: XCTestCase {
    func testScoreRowMapsSelectedStyleAndPhotoGate() {
        let user = UUID()
        let row = ReputationScoreMapper.ScoreRow(
            user_id: user,
            score: 72,
            tier: "reliable",
            photo_gate: 40,
            selected_style_id: "digitalFlow",
            preferred_style: nil,
            preferred_style_id: nil,
            unlocked_styles: nil,
            unlocked: nil
        )
        let snap = ReputationScoreMapper.snapshot(from: row)
        XCTAssertEqual(snap.userId, user)
        XCTAssertEqual(snap.score, 72)
        XCTAssertEqual(snap.photoGate, 40)
        XCTAssertEqual(snap.tier, .reliable)
        XCTAssertEqual(snap.selectedStyleId, .digitalFlow)
        XCTAssertFalse(snap.unlocksFromServer)
        XCTAssertEqual(snap.unlockedStyleIds.count, 4)
        XCTAssertTrue(snap.isUnlocked(.precisionTech))
        XCTAssertFalse(snap.isUnlocked(.boldExpression))
    }

    func testLegacyThemeAliasAndPreferredStyleFallback() {
        let row = ReputationScoreMapper.ScoreRow(
            user_id: UUID(),
            score: 90,
            tier: "legend",
            photo_gate: nil,
            selected_style_id: nil,
            preferred_style: "gothGlam",
            preferred_style_id: nil,
            unlocked_styles: nil,
            unlocked: nil
        )
        let snap = ReputationScoreMapper.snapshot(from: row)
        XCTAssertEqual(snap.selectedStyleId, .boldExpression)
        XCTAssertEqual(snap.tier, .verified)
        XCTAssertEqual(snap.photoGate, 50)
    }

    func testServerUnlockListIsAuthoritative() {
        let row = ReputationScoreMapper.ScoreRow(
            user_id: UUID(),
            score: 99,
            tier: "verified",
            photo_gate: 50,
            selected_style_id: "calmStudio",
            preferred_style: nil,
            preferred_style_id: nil,
            unlocked_styles: ["calmStudio", "aspirational"],
            unlocked: nil
        )
        let snap = ReputationScoreMapper.snapshot(from: row)
        XCTAssertTrue(snap.unlocksFromServer)
        XCTAssertEqual(snap.unlockedStyleIds, [.calmStudio, .aspirational])
        XCTAssertFalse(snap.isUnlocked(.boldExpression))
    }

    func testProfileFallbackRow() {
        let id = UUID()
        let row = ReputationScoreMapper.ProfileFallbackRow(
            id: id,
            rep_score: 40,
            selected_style_id: "aspirational",
            preferred_style: nil,
            preferred_style_id: nil
        )
        let snap = ReputationScoreMapper.snapshot(from: row)
        XCTAssertEqual(snap.userId, id)
        XCTAssertEqual(snap.score, 40)
        XCTAssertEqual(snap.selectedStyleId, .aspirational)
        XCTAssertEqual(snap.tier, .building)
    }
}

final class ReputationSchemaProbeTests: XCTestCase {
    func testMissingColumnCodes() {
        XCTAssertEqual(ReputationSchemaProbe.diagnose(blob: "PGRST204 column not found"), .missingColumn)
        XCTAssertEqual(ReputationSchemaProbe.diagnose(blob: "42703 undefined column selected_style_id"), .missingColumn)
    }

    func testMissingRPCAndTable() {
        XCTAssertEqual(ReputationSchemaProbe.diagnose(blob: "PGRST202 function not found"), .missingRPC)
        XCTAssertEqual(ReputationSchemaProbe.diagnose(blob: "42P01 relation reputation_scores does not exist"), .missingTable)
    }

    func testStyleLocked() {
        XCTAssertEqual(ReputationSchemaProbe.diagnose(blob: "P0001 style_locked"), .styleLocked)
        XCTAssertEqual(ReputationSchemaProbe.diagnose(blob: "this style is locked"), .styleLocked)
    }

    func testOtherErrorsStayOther() {
        XCTAssertEqual(ReputationSchemaProbe.diagnose(blob: "JWT expired"), .other)
    }
}
