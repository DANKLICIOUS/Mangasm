import XCTest
@testable import MangasmApp

@MainActor
final class ReputationServiceTests: XCTestCase {
    func testMockSelectStylePersistsUnlocked() async throws {
        let rep = MockReputationService(defaultScore: 70)
        try await rep.selectStyle(.digitalFlow)
        XCTAssertEqual(rep.selectedStyleId, .digitalFlow)
        XCTAssertEqual(rep.selectStyleCalls, [.digitalFlow])
    }

    func testMockSelectStyleRejectsLocked() async {
        let rep = MockReputationService(defaultScore: 10)
        do {
            try await rep.selectStyle(.boldExpression)
            XCTFail("locked style must throw")
        } catch ReputationError.styleLocked {
            XCTAssertNil(rep.selectedStyleId)
        } catch {
            XCTFail("unexpected \(error)")
        }
    }

    func testPhotoGateUsesTargetThreshold() {
        let rep = MockReputationService(defaultPhotoGate: 60)
        XCTAssertFalse(rep.canViewPhotos(viewerScore: 50, targetGate: rep.photoGate(for: UUID())))
        XCTAssertTrue(rep.canViewPhotos(viewerScore: 60, targetGate: 60))
    }

    func testAppStateRevertsWhenServerRejectsLockedStyle() async {
        let store = InMemoryProfileStyleStore()
        store.savePreferred(.calmStudio)
        let state = AppState(styleStore: store)
        state.profile.repScore = 70
        state.syncProfileStyleWithReputation()
        XCTAssertTrue(state.setPreferredStyleUnlockedForTest(.digitalFlow))

        let rep = MockReputationService(defaultScore: 70)
        rep.rejectNextSelect = true
        await state.setPreferredStyle(.precisionTech, reputation: rep)

        XCTAssertEqual(state.profileStyle.preferredStyleId, .digitalFlow)
        XCTAssertEqual(store.loadPreferred(), .digitalFlow)
        XCTAssertEqual(state.lastStylePersistMessage, ReputationError.styleLocked.errorDescription)
        XCTAssertEqual(rep.selectStyleCalls, [.precisionTech])
    }

    func testAppStateAppliesLiveSnapshotAndSelectedStyle() {
        let store = InMemoryProfileStyleStore()
        let state = AppState(styleStore: store)
        let user = state.profile.id
        let snap = ReputationSnapshot(
            userId: user,
            score: 88,
            photoGate: 40,
            selectedStyleId: .boldExpression
        )
        state.applyReputationSnapshot(snap, suppressToast: true)
        XCTAssertEqual(state.profile.repScore, 88)
        XCTAssertEqual(state.profileStyle.preferredStyleId, .boldExpression)
        XCTAssertEqual(store.loadPreferred(), .boldExpression)
        XCTAssertTrue(state.pendingStyleUnlocks.isEmpty)
        XCTAssertTrue(state.isStyleUnlocked(.digitalFlow))
    }

    func testServerUnlockListIsWriteTimeTruthNotLocalCatalog() {
        let state = AppState(styleStore: InMemoryProfileStyleStore())
        let snap = ReputationSnapshot(
            userId: state.profile.id,
            score: 99,
            selectedStyleId: .calmStudio,
            unlockedStyleIds: [.calmStudio, .aspirational],
            unlocksFromServer: true
        )
        state.applyReputationSnapshot(snap, suppressToast: true)
        XCTAssertTrue(ProfileStyleCatalog.isUnlocked(.boldExpression, score: 99))
        XCTAssertFalse(state.isStyleUnlocked(.boldExpression))
        XCTAssertTrue(state.isStyleUnlocked(.aspirational))
        state.setPreferredStyle(.boldExpression)
        XCTAssertEqual(state.profileStyle.preferredStyleId, .calmStudio)
    }

    func testAppStateGrandfathersSelectedStyleAfterDemotion() {
        let store = InMemoryProfileStyleStore()
        let state = AppState(styleStore: store)
        let snap = ReputationSnapshot(
            userId: state.profile.id,
            score: 0,
            selectedStyleId: .boldExpression,
            unlockedStyleIds: [.calmStudio],
            unlocksFromServer: true
        )
        state.applyReputationSnapshot(snap, suppressToast: true)
        XCTAssertEqual(state.profile.repScore, 0)
        XCTAssertEqual(state.profileStyle.preferredStyleId, .boldExpression)
        XCTAssertEqual(state.profileStyle.activeConfig.styleId, .boldExpression)
        XCTAssertFalse(state.isStyleUnlocked(.aspirational))
        XCTAssertTrue(state.isStyleUnlocked(.calmStudio))
        state.setPreferredStyle(.aspirational)
        XCTAssertEqual(state.profileStyle.preferredStyleId, .boldExpression)
    }

    func testAppStateClientGateBlocksLockedTap() {
        let state = AppState(styleStore: InMemoryProfileStyleStore())
        state.profile.repScore = 10
        state.syncProfileStyleWithReputation()
        state.setPreferredStyle(.boldExpression)
        XCTAssertNotEqual(state.profileStyle.preferredStyleId, .boldExpression)
        XCTAssertEqual(state.lastStylePersistMessage, ProfileStyleCatalog.unlockHint(for: .boldExpression))
    }
}

private extension AppState {
    func setPreferredStyleUnlockedForTest(_ id: ProfileStyleId) -> Bool {
        setPreferredStyle(id)
        return profileStyle.preferredStyleId == id
    }
}
