import XCTest
@testable import MangasmApp

/// Stage 0 planner tests: choosing which two matches to invite (pure, feasible-only, ranked).
final class GroupDateMatcherTests: XCTestCase {

    private let miami = GeoCoordinate(latitude: 25.7617, longitude: -80.1918)
    private let miamiBeach = GeoCoordinate(latitude: 25.7907, longitude: -80.1300)   // ~4 mi
    private let coralGables = GeoCoordinate(latitude: 25.7215, longitude: -80.2684)   // ~5.5 mi
    private let fortLauderdale = GeoCoordinate(latitude: 26.1224, longitude: -80.1373) // ~25 mi

    private func cand(_ id: String, at coord: GeoCoordinate?, matchPct: Int = 80, interests: [String] = []) -> Candidate {
        Candidate(
            id: id, name: id, age: 30, distanceLabel: "1 km", matchPct: matchPct,
            astro: "Cancer", chinese: "Rat", lifePath: 5, position: "Vers",
            sharedInterests: interests, hobbies: [],
            bio: "", notes: CompatNotes(astro: "", numerology: "", chinese: ""),
            avatarURL: nil, geoCoordinate: coord
        )
    }

    // MARK: - Feasibility gating

    func testKeepsOnlyGeoFeasiblePairs() {
        let near1 = cand("Ana", at: miamiBeach)
        let near2 = cand("Bea", at: coralGables)
        let far = cand("Cid", at: fortLauderdale)   // 25 mi north — any pair with Cid is infeasible

        let pairs = GroupDateMatcher.selectPairs(
            viewer: miami, candidates: [near1, near2, far], maxMiles: 10
        )
        // Only (Ana, Bea) survives; the two Cid-pairs are dropped.
        XCTAssertEqual(pairs.count, 1)
        XCTAssertEqual(Set([pairs[0].first.name, pairs[0].second.name]), ["Ana", "Bea"])
        XCTAssertEqual(pairs[0].anchors.count, 3)
    }

    func testWiderRadiusUnlocksMorePairs() {
        let a = cand("Ana", at: miamiBeach)
        let b = cand("Bea", at: coralGables)
        let c = cand("Cid", at: fortLauderdale)
        // At 20 mi, Fort Lauderdale can pair with the Miami two (but still not both at once).
        let pairs = GroupDateMatcher.selectPairs(viewer: miami, candidates: [a, b, c], maxMiles: 20)
        XCTAssertGreaterThan(pairs.count, 1)
    }

    func testSkipsCandidatesWithoutLocation() {
        let located = cand("Ana", at: miamiBeach)
        let noLoc = cand("Ghost", at: nil)
        let pairs = GroupDateMatcher.selectPairs(viewer: miami, candidates: [located, noLoc], maxMiles: 10)
        XCTAssertTrue(pairs.isEmpty)   // only one placeable candidate → no pair
    }

    func testFewerThanTwoPlaceableReturnsEmpty() {
        XCTAssertTrue(GroupDateMatcher.selectPairs(viewer: miami, candidates: [], maxMiles: 10).isEmpty)
        XCTAssertTrue(GroupDateMatcher.selectPairs(
            viewer: miami, candidates: [cand("Solo", at: miamiBeach)], maxMiles: 10).isEmpty)
    }

    func testZeroLimitReturnsEmpty() {
        let pairs = GroupDateMatcher.selectPairs(
            viewer: miami,
            candidates: [cand("A", at: miamiBeach), cand("B", at: coralGables)],
            maxMiles: 10, limit: 0
        )
        XCTAssertTrue(pairs.isEmpty)
    }

    // MARK: - Ranking

    func testHigherCompatAndSharedInterestRanksFirst() {
        // A & B are equally located (both at coralGables) so geometry is identical across
        // the pairs that include them — compat + interest overlap decide the order.
        let amy = cand("Amy", at: miamiBeach, matchPct: 95, interests: ["house music", "sailing"])
        let ben = cand("Ben", at: coralGables, matchPct: 95, interests: ["house music"])
        let cid = cand("Cid", at: coralGables, matchPct: 50, interests: [])

        let pairs = GroupDateMatcher.selectPairs(
            viewer: miami, viewerInterests: ["house music"],
            candidates: [amy, ben, cid], maxMiles: 10
        )
        // (Amy, Ben) — high compat + all three share "house music" — must outrank pairs with Cid.
        XCTAssertEqual(pairs.first.map { [$0.first.name, $0.second.name] }, ["Amy", "Ben"])
        XCTAssertGreaterThan(pairs.first!.score, pairs.last!.score)
    }

    func testLimitTruncatesRankedResults() {
        let cands = [
            cand("A", at: miamiBeach), cand("B", at: coralGables),
            cand("C", at: miami), cand("D", at: GeoCoordinate(latitude: 25.80, longitude: -80.13)),
        ]
        let all = GroupDateMatcher.selectPairs(viewer: miami, candidates: cands, maxMiles: 10, limit: 99)
        let capped = GroupDateMatcher.selectPairs(viewer: miami, candidates: cands, maxMiles: 10, limit: 2)
        XCTAssertGreaterThan(all.count, 2)
        XCTAssertEqual(capped.count, 2)
        XCTAssertEqual(capped.map(\.score), Array(all.prefix(2)).map(\.score))
    }

    // MARK: - Interest overlap helper

    func testThreeWayInterestOverlap() {
        XCTAssertEqual(GroupDateMatcher.threeWayInterestOverlap(["a", "b"], ["b", "c"], ["b", "d"]), 1.0 / 4.0, accuracy: 1e-9)
        XCTAssertEqual(GroupDateMatcher.threeWayInterestOverlap(["a"], ["b"], ["c"]), 0)
        XCTAssertEqual(GroupDateMatcher.threeWayInterestOverlap([], [], []), 0)
    }
}
