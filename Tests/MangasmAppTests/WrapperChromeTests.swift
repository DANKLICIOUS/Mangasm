import XCTest
@testable import MangasmApp

final class WrapperChromeTests: XCTestCase {
    func testPlateNameIsStable() {
        XCTAssertEqual(WrapperChrome.plateName, "wrapper_hero")
    }

    func testDefaultTabRemainsEvents() {
        XCTAssertEqual(AppTab.allCases.first, .events)
        XCTAssertEqual(AppTab.allCases.map(\.rawValue), [
            "events", "discover", "aiMatch", "likes", "profile",
        ])
    }

    func testReputationStorageIdUnchanged() {
        XCTAssertEqual(ProfileStyleCatalog.config(id: .calmStudio).styleId.rawValue, "calmStudio")
    }
}
