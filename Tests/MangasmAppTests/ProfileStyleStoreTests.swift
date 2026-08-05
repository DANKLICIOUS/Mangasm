import XCTest
@testable import MangasmApp

final class ProfileStyleStoreTests: XCTestCase {
    func testInMemoryRoundTripPreferredAndSeen() {
        let store = InMemoryProfileStyleStore()
        store.savePreferred(.precisionTech)
        store.saveSeenUnlockIds([.calmStudio, .aspirational])
        XCTAssertEqual(store.loadPreferred(), .precisionTech)
        XCTAssertEqual(store.loadSeenUnlockIds(), [.calmStudio, .aspirational])
    }

    func testUserDefaultsRoundTripWithSuite() {
        let suite = "mangasm.tests.profileStyle.\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suite) else {
            return XCTFail("suite")
        }
        defer { defaults.removePersistentDomain(forName: suite) }

        let store = UserDefaultsProfileStyleStore(defaults: defaults)
        store.savePreferred(.digitalFlow)
        store.saveSeenUnlockIds([.calmStudio, .digitalFlow])
        XCTAssertEqual(store.loadPreferred(), .digitalFlow)
        XCTAssertEqual(store.loadSeenUnlockIds(), [.calmStudio, .digitalFlow])

        store.savePreferred(nil)
        XCTAssertNil(store.loadPreferred())
    }
}
