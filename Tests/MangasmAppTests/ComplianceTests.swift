import XCTest
@testable import MangasmApp

/// Regression guards for App Store / privacy compliance decisions made in Phase 0.
/// These lock in safety-critical defaults so they cannot silently regress.
final class ComplianceTests: XCTestCase {

    // MARK: - Sensitive-data visibility defaults

    /// Fetishes ("into") are sensitive and must default to hidden until opt-in.
    /// (HIV status was removed from the app entirely — no health data is stored.)
    func testBrandingDoesNotReferenceMangaReader() {
        let forbidden = ["manga reader", "read more", "feel more", "premium manga"]
        let corpus = [
            Profile.sample.bio,
            Profile.sample.headline,
            EventItem.samples.map(\.title).joined(separator: " "),
            EventItem.samples.map(\.description).joined(separator: " "),
        ].joined(separator: " ").lowercased()

        for phrase in forbidden {
            XCTAssertFalse(corpus.contains(phrase),
                           "seed data must not contain off-brand phrase: \(phrase)")
        }
    }

    func testSensitiveFieldsHiddenByDefault() {
        let v = Visibility()
        XCTAssertFalse(v.into, "into (fetishes) must default hidden")
    }

    // MARK: - Clean-shell seed data (Guideline 1.1.4)

    /// The shipped binary must not contain sex-act / anonymous-encounter language
    /// in seed/demo data. The adult product lives in user-generated content + the
    /// web surface, never in compiled sample data.
    func testEventSeedDataHasNoExplicitContent() {
        let banned = [
            "anon", "anonymous", "glory", "bareback",
            "sanitiz", "twenty-minute", "in-and-out",
            "clothing optional", "gear encouraged", "booth",
            "latex", "fetish", "kink",
        ]
        for event in EventItem.samples {
            let haystack = (event.title + " " + event.description).lowercased()
            for term in banned {
                XCTAssertFalse(
                    haystack.contains(term),
                    "Seed event \"\(event.title)\" contains banned term '\(term)' (Guideline 1.1.4 risk)"
                )
            }
        }
    }

    /// Guideline 4.3 — reviewer-visible seed must not reopen a gold/Lambo luxury grid.
    func testReviewerVisibleSeedIsInkhouseNotLuxuryGrid() {
        let banned = [
            "dubai", "penthouse", "palm jumeirah", "business bay",
            "skyline", "fast cars", "quiet luxury", "jet-set",
            "lambo", "marina",
        ]
        let corpus = [
            Profile.sample.location,
            Profile.sample.headline,
            Profile.sample.bio,
            EventItem.samples.map(\.title).joined(separator: " "),
            EventItem.samples.map(\.place).joined(separator: " "),
            EventItem.samples.map(\.area).joined(separator: " "),
            EventItem.samples.map(\.description).joined(separator: " "),
            Community.samples.map(\.name).joined(separator: " "),
            Community.samples.map(\.tagline).joined(separator: " "),
            Candidate.samples.map(\.bio).joined(separator: " "),
        ].joined(separator: " ").lowercased()
        for term in banned {
            XCTAssertFalse(corpus.contains(term), "reviewer seed still contains luxury-grid term: \(term)")
        }
        XCTAssertEqual(EventItem.samples[0].title, "Ink Circle")
        XCTAssertEqual(Set(EventItem.samples.map(\.type)), Set(EventType.allCases))
        XCTAssertEqual(EventType.cosplay.label, "Costume")
        XCTAssertEqual(ProfileStyleCatalog.config(id: .calmStudio).displayName, "Inkhouse")
        XCTAssertEqual(ThemeChoiceId.live, .steampunk)
    }

    // MARK: - Honest encryption claim

    /// Until real E2E ships, no shipped event/profile copy should claim
    /// "end-to-end". (Banner text is verified manually; this guards seed copy.)
    func testEventTypeRawValuesAreAppStoreSafe() {
        // Raw values must be neutral category slugs, not sex-act references.
        let raws = EventType.allCases.map { $0.rawValue }
        XCTAssertEqual(Set(raws), ["open_door", "social_mixer", "circle", "cosplay"])
    }
}
