import XCTest
@testable import MangasmApp

final class ThemeChoiceTests: XCTestCase {
    func testFourChoiceIdsAreStable() {
        XCTAssertEqual(
            ThemeChoiceId.allCases.map(\.rawValue),
            ["viral", "effective", "fantasy", "steampunk"]
        )
        XCTAssertEqual(ThemeChoiceId.viral.displayName, "Afterglow")
        XCTAssertEqual(ThemeChoiceId.effective.displayName, "Long Table")
        XCTAssertEqual(ThemeChoiceId.fantasy.displayName, "Aether")
        XCTAssertEqual(ThemeChoiceId.steampunk.displayName, "Inkhouse")
    }

    func testPalettesAreDistinct() {
        let fills = ThemeChoiceId.allCases.map { ThemeChoicePalette.palette(for: $0).accent }
        XCTAssertEqual(fills.count, Set(fills.map { String(describing: $0) }).count)
    }

    func testLiveChromeIsInkhouse() {
        XCTAssertEqual(ThemeChoiceId.live, .steampunk)
        XCTAssertEqual(ThemeChoiceId.live.displayName, "Inkhouse")
        XCTAssertEqual(ThemeChoiceId.live.rawValue, "steampunk")
    }
}
