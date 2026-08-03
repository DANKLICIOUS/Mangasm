import XCTest
@testable import MangasmApp

final class TrustScoreFormulaTests: XCTestCase {
    func testComponentsClampAndTotal() {
        let c = TrustScoreComponents(
            baseVerification: 15,
            profileCompleteness: 10,
            positiveFeedback: 40,
            communityContribution: 20,
            safetyActions: 10,
            penalties: 0,
            inactivityDecay: 0
        )
        XCTAssertEqual(TrustScoreFormula.score(from: c), 95)
    }

    func testEventsFoldIntoScore() {
        let events = [
            ReputationEvent(kind: .verificationComplete, delta: 15),
            ReputationEvent(kind: .positiveRatingReceived, delta: 10),
            ReputationEvent(kind: .safetyModuleComplete, delta: 5),
        ]
        let score = TrustScoreFormula.score(events: events)
        XCTAssertEqual(score, 30)
    }

    func testForbiddenKindsRejected() {
        XCTAssertFalse(ReputationEventPolicy.isAllowed(rawKind: "match_count"))
        XCTAssertFalse(ReputationEventPolicy.isAllowed(rawKind: "sexual_activity"))
        XCTAssertTrue(ReputationEventPolicy.isAllowed(rawKind: "verification_complete"))
    }

    func testEventDeltaClamped() {
        let e = ReputationEvent(kind: .positiveRatingReceived, delta: 100)
        XCTAssertEqual(e.delta, 20)
        let neg = ReputationEvent(kind: .penaltyViolation, delta: -100)
        XCTAssertEqual(neg.delta, -20)
    }

    func testProgressToNextStyle() {
        let (next, p) = TrustScoreFormula.progressToNextStyle(score: 42)
        XCTAssertEqual(next?.styleId, .digitalFlow)
        XCTAssertGreaterThan(p, 0)
        XCTAssertLessThan(p, 1)
        let (done, full) = TrustScoreFormula.progressToNextStyle(score: 100)
        XCTAssertNil(done)
        XCTAssertEqual(full, 1)
    }

    func testNoVariableRatioInCoreFormula() {
        // Determinism: same events always same score
        let events = [
            ReputationEvent(kind: .verificationComplete, delta: 15),
            ReputationEvent(kind: .helpfulReport, delta: 5),
        ]
        XCTAssertEqual(
            TrustScoreFormula.score(events: events),
            TrustScoreFormula.score(events: events)
        )
    }
}

final class AppPhaseMachineTests: XCTestCase {
    func testLegalTransitions() {
        XCTAssertEqual(
            AppPhaseMachine.apply(from: .launch, event: .finishLaunchFlow),
            .app
        )
        XCTAssertEqual(
            AppPhaseMachine.apply(from: .app, event: .signOut),
            .launch
        )
    }

    func testIllegalTransitionIsNoOp() {
        // Cannot finish launch from app
        XCTAssertEqual(
            AppPhaseMachine.apply(from: .app, event: .finishLaunchFlow),
            .app
        )
    }
}

final class CommunityReputationStyleFacadeTests: XCTestCase {
    func testResolvePrefersUnlockedPreferred() {
        let active = CommunityReputationStyle.resolve(
            score: 50,
            preferred: .calmStudio
        )
        XCTAssertEqual(active.styleId, .calmStudio)
        XCTAssertEqual(active.badgeName, "New Member")
    }

    func testResolveFallsBackWhenPreferredLocked() {
        let active = CommunityReputationStyle.resolve(
            score: 10,
            preferred: .boldExpression
        )
        XCTAssertEqual(active.styleId, .calmStudio)
    }
}

final class ThemeCatalogParityTests: XCTestCase {
    func testBundledCatalogParityWithCompiled() throws {
        // Prefer bundled JSON; if missing in test host, decode docs path fallback
        let file: ThemeCatalogLoader.CatalogFile
        if let bundled = ThemeCatalogLoader.loadBundled() {
            file = bundled
        } else {
            let url = URL(fileURLWithPath: #filePath)
                .deletingLastPathComponent() // Tests/MangasmAppTests
                .deletingLastPathComponent() // Tests
                .deletingLastPathComponent() // root
                .appendingPathComponent("docs/theme-catalog.json")
            let data = try Data(contentsOf: url)
            file = try JSONDecoder().decode(ThemeCatalogLoader.CatalogFile.self, from: data)
        }
        let issues = ThemeCatalogLoader.parityIssues(against: file)
        XCTAssertTrue(issues.isEmpty, issues.joined(separator: "; "))
    }
}
