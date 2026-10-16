import XCTest
@testable import MangasmApp

final class ModelTests: XCTestCase {
    func testProfileSampleMatchesPrototypeDefaults() {
        let p = Profile.sample
        XCTAssertEqual(p.name, "Julian")
        XCTAssertEqual(p.age, 32)
        XCTAssertEqual(p.position, "Vers")
    }
    func testBioMaxIsPremiumAware() {
        XCTAssertEqual(Profile.bioMax(premium: false), 300)
        XCTAssertEqual(Profile.bioMax(premium: true), 600)
    }
    func testProfileSampleFullFields() {
        let p = Profile.sample
        XCTAssertEqual(p.location, "Harbor District")
        XCTAssertEqual(p.headline, "Slow mornings, long tables")
        XCTAssertEqual(p.instagram, "julianv")
        XCTAssertEqual(p.x, "julian_v")
        XCTAssertEqual(p.astro, "Scorpio")
        XCTAssertEqual(p.chinese, "Dragon")
        XCTAssertEqual(p.lifePath, 7)
    }
    func testRepTierBoundaries() {
        // Test lowest value of each band
        XCTAssertEqual(RepTier.tier(for: 0), .new)
        XCTAssertEqual(RepTier.tier(for: 20), .rising)
        XCTAssertEqual(RepTier.tier(for: 40), .veteran)
        XCTAssertEqual(RepTier.tier(for: 70), .elite)
        XCTAssertEqual(RepTier.tier(for: 90), .legend)
        // Test prototype display value (42 = "Veteran")
        XCTAssertEqual(RepTier.tier(for: 42), .veteran)
        // Test one below each boundary
        XCTAssertEqual(RepTier.tier(for: 19), .new)
        XCTAssertEqual(RepTier.tier(for: 39), .rising)
        XCTAssertEqual(RepTier.tier(for: 69), .veteran)
        XCTAssertEqual(RepTier.tier(for: 89), .elite)
        // Test max value
        XCTAssertEqual(RepTier.tier(for: 100), .legend)
    }
    func testCandidateSamplesPopulated() {
        XCTAssertGreaterThanOrEqual(Candidate.samples.count, 4)
        let first = Candidate.samples[0]
        XCTAssertFalse(first.name.isEmpty)
        XCTAssertGreaterThan(first.matchPct, 0)
    }
    func testConversationSamplesPopulated() {
        XCTAssertGreaterThanOrEqual(Conversation.samples.count, 3)
    }
    func testEventSamplesPopulated() {
        XCTAssertGreaterThanOrEqual(EventItem.samples.count, 3)
    }
    func testCommunitySamplesPopulated() {
        XCTAssertGreaterThanOrEqual(Community.samples.count, 4)
    }
    func testVenueSamplesPopulated() {
        XCTAssertGreaterThanOrEqual(Venue.samples.count, 2)
    }
    func testVisibilitySampleMatchesPrototypeDefaults() {
        let v = Visibility.sample
        XCTAssertTrue(v.headline)
        XCTAssertTrue(v.hobbies)
        XCTAssertFalse(v.into)
    }
    func testCompatNotesFields() {
        let n = CompatNotes(astro: "Water trine", numerology: "Seeker meets free spirit", chinese: "Dragon × Rat")
        XCTAssertEqual(n.astro, "Water trine")
    }
    func testMessageSampleIsMine() {
        let m = Message(id: "1", senderIsMe: true, text: "Hello")
        XCTAssertTrue(m.senderIsMe)
    }
    func testIdentifiable() {
        let p = Profile.sample
        XCTAssertFalse(p.id.uuidString.isEmpty)
    }
}
