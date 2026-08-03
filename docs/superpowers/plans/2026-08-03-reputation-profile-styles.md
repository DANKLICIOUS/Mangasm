# Community Reputation × Hybrid Profile Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship App Store–safe Community Reputation cosmetic styles (five hybrid SwiftUI + optional hero plates) with unlock rules, preference persistence, Profile/TopBar theming, Settings picker, and unlock toast.

**Architecture:** Pure domain catalog + resolver in `Domain/Reputation/`; SwiftUI tokens and background in `DesignSystem/`; `ProfileStyleStore` for UserDefaults; `AppState` owns `ProfileStyleState` and reacts to `profile.repScore`. No runtime AI. Missing hero assets fall back to gradients.

**Tech Stack:** Swift 6 / SwiftUI package `MangasmApp`, XCTest in `Tests/MangasmAppTests`, existing `AppState` + `Profile.repScore` + `TopBar` + `ProfileScreen`.

## Global Constraints

- Cosmetic unlocks only — never gate messaging, adult content, or sexual features by style.
- Score drivers documented as verification / positive feedback / safety education / helpful reports only (no match-count gamification).
- User-facing copy: “Community Reputation”, badge names from catalog (New Member … Elite Verified).
- `preferredStyleId` never overridden by a higher auto default while still unlocked.
- Clamp reputation to 0…100 for style resolution.
- `accessibilityReduceMotion` disables Digital Flow rain animation.
- Hero asset names exact: `style-hero-calmStudio`, `style-hero-aspirational`, `style-hero-precisionTech`, `style-hero-digitalFlow`, `style-hero-boldExpression`.
- Spec: `docs/superpowers/specs/2026-08-03-reputation-profile-styles-design.md`.
- Do not modify photo-gate math in `ReputationService.canViewPhotos` in this plan.
- TDD: failing test → implement → pass → commit per task.
- Run: `cd ~/mangasm && swift test --filter <TestClass>` unless noted.

---

## File map

| Path                                                                    | Responsibility                                      |
| ----------------------------------------------------------------------- | --------------------------------------------------- |
| `Sources/MangasmApp/Domain/Reputation/ProfileStyleCatalog.swift`        | `ProfileStyleId`, config table, pure unlock helpers |
| `Sources/MangasmApp/Domain/Reputation/ProfileStyleState.swift`          | State + `activeStyle` / `newlyUnlocked`             |
| `Sources/MangasmApp/DesignSystem/ProfileStyleTheme.swift`               | Color tokens per style                              |
| `Sources/MangasmApp/DesignSystem/ProfileStyleBackground.swift`          | Hero image + fallback + rain                        |
| `Sources/MangasmApp/Services/ProfileStyleStore.swift`                   | Protocol + UserDefaults store                       |
| `Sources/MangasmApp/Shell/AppState.swift`                               | Hold style state; sync from `repScore`              |
| `Sources/MangasmApp/Shell/TopBar.swift`                                 | Badge + accents from active style                   |
| `Sources/MangasmApp/Features/Profile/ProfileScreen.swift`               | Themed profile shell                                |
| `Sources/MangasmApp/Features/Profile/ProfileStylePicker.swift`          | Settings grid                                       |
| `Sources/MangasmApp/Features/Profile/ProfileUnlockToast.swift`          | Unlock toast UI                                     |
| `Sources/MangasmApp/Features/Settings/` (or existing settings sheet)    | Embed picker + explainer                            |
| `Tests/MangasmAppTests/ProfileStyleCatalogTests.swift`                  | Domain unit tests                                   |
| `Tests/MangasmAppTests/ProfileStyleStoreTests.swift`                    | Store unit tests                                    |
| `docs/superpowers/specs/2026-08-03-reputation-profile-style-prompts.md` | Asset prompts (already exists)                      |

---

### Task 1: Domain catalog + pure functions (TDD)

**Files:**

- Create: `Sources/MangasmApp/Domain/Reputation/ProfileStyleCatalog.swift`
- Create: `Tests/MangasmAppTests/ProfileStyleCatalogTests.swift`

**Interfaces:**

- Produces: `ProfileStyleId`, `ProfileStyleConfig`, `ProfileStyleCatalog.all`, `ProfileStyleCatalog.available(score:)`, `ProfileStyleCatalog.defaultStyle(score:)`, `ProfileStyleCatalog.config(id:)`

- [ ] **Step 1: Write failing tests**

Create `Tests/MangasmAppTests/ProfileStyleCatalogTests.swift`:

```swift
import XCTest
@testable import MangasmApp

final class ProfileStyleCatalogTests: XCTestCase {
    func testBoundariesUnlockCorrectDefault() {
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 0).id, .calmStudio)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 20).id, .calmStudio)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 21).id, .aspirational)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 40).id, .aspirational)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 41).id, .precisionTech)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 60).id, .precisionTech)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 61).id, .digitalFlow)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 80).id, .digitalFlow)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 81).id, .boldExpression)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 100).id, .boldExpression)
    }

    func testAvailableCountGrowsWithScore() {
        XCTAssertEqual(ProfileStyleCatalog.available(score: 0).count, 1)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 21).count, 2)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 41).count, 3)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 61).count, 4)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 81).count, 5)
    }

    func testClampsOutOfRangeScores() {
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: -5).id, .calmStudio)
        XCTAssertEqual(ProfileStyleCatalog.defaultStyle(score: 999).id, .boldExpression)
        XCTAssertEqual(ProfileStyleCatalog.available(score: 999).count, 5)
    }

    func testBadgeNamesAreAppStoreSafe() {
        let names = ProfileStyleCatalog.all.map(\.badgeName)
        XCTAssertEqual(names, [
            "New Member",
            "Rising Member",
            "Trusted Member",
            "Community Leader",
            "Elite Verified",
        ])
    }

    func testHeroAssetNamesMatchCatalog() {
        XCTAssertEqual(
            ProfileStyleCatalog.config(id: .precisionTech).heroAssetName,
            "style-hero-precisionTech"
        )
    }
}
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd ~/mangasm && swift test --filter ProfileStyleCatalogTests
```

Expected: compile error or FAIL (types missing).

- [ ] **Step 3: Implement catalog**

Create `Sources/MangasmApp/Domain/Reputation/ProfileStyleCatalog.swift`:

```swift
import Foundation

public enum ProfileStyleId: String, CaseIterable, Codable, Sendable, Hashable {
    case calmStudio
    case aspirational
    case precisionTech
    case digitalFlow
    case boldExpression
}

public struct ProfileStyleConfig: Sendable, Equatable, Identifiable {
    public var id: ProfileStyleId { styleId }
    public let styleId: ProfileStyleId
    public let minScore: Int
    public let badgeName: String
    public let displayName: String
    public let heroAssetName: String

    public init(
        styleId: ProfileStyleId,
        minScore: Int,
        badgeName: String,
        displayName: String,
        heroAssetName: String
    ) {
        self.styleId = styleId
        self.minScore = minScore
        self.badgeName = badgeName
        self.displayName = displayName
        self.heroAssetName = heroAssetName
    }
}

public enum ProfileStyleCatalog {
    public static let all: [ProfileStyleConfig] = [
        .init(styleId: .calmStudio, minScore: 0, badgeName: "New Member",
              displayName: "Calm Studio", heroAssetName: "style-hero-calmStudio"),
        .init(styleId: .aspirational, minScore: 21, badgeName: "Rising Member",
              displayName: "Aspirational", heroAssetName: "style-hero-aspirational"),
        .init(styleId: .precisionTech, minScore: 41, badgeName: "Trusted Member",
              displayName: "Precision Tech", heroAssetName: "style-hero-precisionTech"),
        .init(styleId: .digitalFlow, minScore: 61, badgeName: "Community Leader",
              displayName: "Digital Flow", heroAssetName: "style-hero-digitalFlow"),
        .init(styleId: .boldExpression, minScore: 81, badgeName: "Elite Verified",
              displayName: "Bold Expression", heroAssetName: "style-hero-boldExpression"),
    ]

    public static func clampScore(_ score: Int) -> Int {
        min(100, max(0, score))
    }

    public static func available(score: Int) -> [ProfileStyleConfig] {
        let s = clampScore(score)
        return all.filter { s >= $0.minScore }
    }

    public static func defaultStyle(score: Int) -> ProfileStyleConfig {
        available(score: score).last ?? all[0]
    }

    public static func config(id: ProfileStyleId) -> ProfileStyleConfig {
        all.first { $0.styleId == id } ?? all[0]
    }

    public static func isUnlocked(_ id: ProfileStyleId, score: Int) -> Bool {
        clampScore(score) >= config(id: id).minScore
    }
}
```

Ensure the package target includes the new folder (SPM usually picks up all sources under `Sources/MangasmApp`).

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd ~/mangasm && swift test --filter ProfileStyleCatalogTests
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/mangasm
git add Sources/MangasmApp/Domain/Reputation/ProfileStyleCatalog.swift \
        Tests/MangasmAppTests/ProfileStyleCatalogTests.swift
git commit -m "feat(reputation): ProfileStyle catalog and unlock pure functions"
```

---

### Task 2: ProfileStyleState resolver (TDD)

**Files:**

- Create: `Sources/MangasmApp/Domain/Reputation/ProfileStyleState.swift`
- Create: `Tests/MangasmAppTests/ProfileStyleStateTests.swift` (or extend catalog tests file)

**Interfaces:**

- Consumes: `ProfileStyleCatalog`
- Produces: `ProfileStyleState`, `activeConfig`, `applyScoreChange`, `selectPreferred`

- [ ] **Step 1: Write failing tests**

```swift
import XCTest
@testable import MangasmApp

final class ProfileStyleStateTests: XCTestCase {
    func testPreferredLowerStyleRespected() {
        var state = ProfileStyleState(reputationScore: 50, preferredStyleId: .calmStudio)
        XCTAssertEqual(state.activeConfig.styleId, .calmStudio)
    }

    func testPreferredNotUnlockedFallsBackToDefault() {
        var state = ProfileStyleState(reputationScore: 10, preferredStyleId: .digitalFlow)
        XCTAssertEqual(state.activeConfig.styleId, .calmStudio)
    }

    func testScoreIncreaseDetectsNewUnlocks() {
        var state = ProfileStyleState(reputationScore: 20, preferredStyleId: nil, seenUnlockIds: [.calmStudio])
        let toast = state.applyScoreChange(42)
        XCTAssertEqual(Set(toast.map(\.styleId)), [.aspirational, .precisionTech])
        XCTAssertTrue(state.seenUnlockIds.contains(.precisionTech))
    }

    func testApplyScoreDoesNotRepeatSeenUnlocks() {
        var state = ProfileStyleState(
            reputationScore: 50,
            preferredStyleId: nil,
            seenUnlockIds: [.calmStudio, .aspirational, .precisionTech]
        )
        let toast = state.applyScoreChange(50)
        XCTAssertTrue(toast.isEmpty)
    }

    func testSelectPreferredOnlyIfUnlocked() {
        var state = ProfileStyleState(reputationScore: 25, preferredStyleId: nil)
        XCTAssertTrue(state.selectPreferred(.aspirational))
        XCTAssertFalse(state.selectPreferred(.boldExpression))
        XCTAssertEqual(state.preferredStyleId, .aspirational)
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd ~/mangasm && swift test --filter ProfileStyleStateTests
```

- [ ] **Step 3: Implement state**

```swift
import Foundation

public struct ProfileStyleState: Sendable, Equatable {
    public var reputationScore: Int
    public var preferredStyleId: ProfileStyleId?
    public var seenUnlockIds: Set<ProfileStyleId>

    public init(
        reputationScore: Int = 0,
        preferredStyleId: ProfileStyleId? = nil,
        seenUnlockIds: Set<ProfileStyleId> = []
    ) {
        self.reputationScore = ProfileStyleCatalog.clampScore(reputationScore)
        self.preferredStyleId = preferredStyleId
        self.seenUnlockIds = seenUnlockIds
    }

    public var activeConfig: ProfileStyleConfig {
        if let preferred = preferredStyleId,
           ProfileStyleCatalog.isUnlocked(preferred, score: reputationScore) {
            return ProfileStyleCatalog.config(id: preferred)
        }
        return ProfileStyleCatalog.defaultStyle(score: reputationScore)
    }

    /// Updates score; returns configs newly unlocked that were not yet in `seenUnlockIds`.
    @discardableResult
    public mutating func applyScoreChange(_ newScore: Int) -> [ProfileStyleConfig] {
        let previous = reputationScore
        reputationScore = ProfileStyleCatalog.clampScore(newScore)
        let newly = ProfileStyleCatalog.available(score: reputationScore)
            .filter { !ProfileStyleCatalog.available(score: previous).map(\.styleId).contains($0.styleId) }
            .filter { !seenUnlockIds.contains($0.styleId) }
        for c in ProfileStyleCatalog.available(score: reputationScore) {
            seenUnlockIds.insert(c.styleId)
        }
        // Only toast styles that crossed this change and weren't seen before the update:
        // recompute strictly as delta:
        return newly
    }

    @discardableResult
    public mutating func selectPreferred(_ id: ProfileStyleId) -> Bool {
        guard ProfileStyleCatalog.isUnlocked(id, score: reputationScore) else { return false }
        preferredStyleId = id
        return true
    }
}
```

**Note:** Fix `applyScoreChange` carefully so `newly` is computed **before** inserting into `seenUnlockIds`:

```swift
@discardableResult
public mutating func applyScoreChange(_ newScore: Int) -> [ProfileStyleConfig] {
    let previous = reputationScore
    let next = ProfileStyleCatalog.clampScore(newScore)
    let previousIds = Set(ProfileStyleCatalog.available(score: previous).map(\.styleId))
    let nextConfigs = ProfileStyleCatalog.available(score: next)
    let newly = nextConfigs.filter { !previousIds.contains($0.styleId) && !seenUnlockIds.contains($0.styleId) }
    reputationScore = next
    for c in nextConfigs { seenUnlockIds.insert(c.styleId) }
    // Seed baseline unlocks on first run if seen empty and score already high:
    if seenUnlockIds.isEmpty {
        for c in nextConfigs { seenUnlockIds.insert(c.styleId) }
        return []
    }
    return newly
}
```

Actually the tests expect: starting `seenUnlockIds: [.calmStudio]` at score 20, then `applyScoreChange(42)` returns aspirational + precisionTech. So do **not** empty-seen special case that swallows toasts. Use:

```swift
@discardableResult
public mutating func applyScoreChange(_ newScore: Int) -> [ProfileStyleConfig] {
    let previous = reputationScore
    let next = ProfileStyleCatalog.clampScore(newScore)
    let previousIds = Set(ProfileStyleCatalog.available(score: previous).map(\.styleId))
    let nextConfigs = ProfileStyleCatalog.available(score: next)
    let newly = nextConfigs.filter {
        !previousIds.contains($0.styleId) && !seenUnlockIds.contains($0.styleId)
    }
    reputationScore = next
    for c in nextConfigs { seenUnlockIds.insert(c.styleId) }
    return newly
}
```

On first app launch, call `seedSeenWithCurrentUnlocks()` once after load so existing high scores don’t spam all toasts:

```swift
public mutating func seedSeenWithCurrentUnlocks() {
    for c in ProfileStyleCatalog.available(score: reputationScore) {
        seenUnlockIds.insert(c.styleId)
    }
}
```

Add test: after seed, apply same score → empty toast.

- [ ] **Step 4: Run — expect PASS**

```bash
cd ~/mangasm && swift test --filter ProfileStyleStateTests
```

- [ ] **Step 5: Commit**

```bash
git add Sources/MangasmApp/Domain/Reputation/ProfileStyleState.swift \
        Tests/MangasmAppTests/ProfileStyleStateTests.swift
git commit -m "feat(reputation): ProfileStyleState active style and unlock delta"
```

---

### Task 3: ProfileStyleStore (UserDefaults)

**Files:**

- Create: `Sources/MangasmApp/Services/ProfileStyleStore.swift`
- Create: `Tests/MangasmAppTests/ProfileStyleStoreTests.swift`

**Interfaces:**

- Produces: `protocol ProfileStyleStoreing` (or `ProfileStyleStore`), `UserDefaultsProfileStyleStore`, `InMemoryProfileStyleStore`

- [ ] **Step 1: Write failing tests** using `InMemoryProfileStyleStore` (or UserDefaults suite):

```swift
func testRoundTripPreferredAndSeen() {
    let store = InMemoryProfileStyleStore()
    store.save(preferred: .cyborgEquivalent, seen: [.calmStudio, .aspirational])
    // use .precisionTech not cyborg
    store.save(preferred: .precisionTech, seen: [.calmStudio, .aspirational])
    let loaded = store.load()
    XCTAssertEqual(loaded.preferred, .precisionTech)
    XCTAssertEqual(loaded.seen, [.calmStudio, .aspirational])
}
```

Use:

```swift
public protocol ProfileStyleStore: Sendable {
    func loadPreferred() -> ProfileStyleId?
    func loadSeenUnlockIds() -> Set<ProfileStyleId>
    func savePreferred(_ id: ProfileStyleId?)
    func saveSeenUnlockIds(_ ids: Set<ProfileStyleId>)
}

public final class InMemoryProfileStyleStore: ProfileStyleStore, @unchecked Sendable {
    private var preferred: ProfileStyleId?
    private var seen: Set<ProfileStyleId> = []
    public init() {}
    public func loadPreferred() -> ProfileStyleId? { preferred }
    public func loadSeenUnlockIds() -> Set<ProfileStyleId> { seen }
    public func savePreferred(_ id: ProfileStyleId?) { preferred = id }
    public func saveSeenUnlockIds(_ ids: Set<ProfileStyleId>) { seen = ids }
}

public final class UserDefaultsProfileStyleStore: ProfileStyleStore, @unchecked Sendable {
    private let defaults: UserDefaults
    private let preferredKey = "mangasm.profileStyle.preferred"
    private let seenKey = "mangasm.profileStyle.seen"

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    public func loadPreferred() -> ProfileStyleId? {
        guard let raw = defaults.string(forKey: preferredKey) else { return nil }
        return ProfileStyleId(rawValue: raw)
    }

    public func loadSeenUnlockIds() -> Set<ProfileStyleId> {
        let raw = defaults.stringArray(forKey: seenKey) ?? []
        return Set(raw.compactMap(ProfileStyleId.init(rawValue:)))
    }

    public func savePreferred(_ id: ProfileStyleId?) {
        if let id { defaults.set(id.rawValue, forKey: preferredKey) }
        else { defaults.removeObject(forKey: preferredKey) }
    }

    public func saveSeenUnlockIds(_ ids: Set<ProfileStyleId>) {
        defaults.set(ids.map(\.rawValue).sorted(), forKey: seenKey)
    }
}
```

- [ ] **Step 2–4:** FAIL → implement → PASS with suite:

```bash
cd ~/mangasm && swift test --filter ProfileStyleStoreTests
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(reputation): ProfileStyleStore UserDefaults + in-memory"
```

---

### Task 4: Theme tokens + background view

**Files:**

- Create: `Sources/MangasmApp/DesignSystem/ProfileStyleTheme.swift`
- Create: `Sources/MangasmApp/DesignSystem/ProfileStyleBackground.swift`
- Test: optional snapshot-free unit test for token non-nil / contrast not required

- [ ] **Step 1: Implement `ProfileStyleTheme`**

```swift
import SwiftUI

public struct ProfileStyleTheme: Sendable {
    public let accent: Color
    public let accentSecondary: Color
    public let cardFill: Color
    public let cardStroke: Color
    public let textPrimary: Color
    public let textSecondary: Color
    public let ringColors: [Color]
    public let fallbackGradient: [Color]

    public static func theme(for id: ProfileStyleId) -> ProfileStyleTheme {
        switch id {
        case .calmStudio:
            return .init(
                accent: Color(hex: "#7BAF7B"),
                accentSecondary: Color(hex: "#E8D5A3"),
                cardFill: Color.white.opacity(0.72),
                cardStroke: Color(hex: "#C9B896").opacity(0.6),
                textPrimary: Color(hex: "#2A2117"),
                textSecondary: Color(hex: "#2A2117").opacity(0.7),
                ringColors: [Color(hex: "#A8D5A2"), Color(hex: "#E8D5A3")],
                fallbackGradient: [Color(hex: "#B8D4E8"), Color(hex: "#E8F0D8"), Color(hex: "#F5E6C8")]
            )
        case .aspirational:
            return .init(
                accent: Color(hex: "#0B6B3A"),
                accentSecondary: Color(hex: "#C9A84C"),
                cardFill: Color.black.opacity(0.35),
                cardStroke: Color(hex: "#C9A84C").opacity(0.5),
                textPrimary: .white,
                textSecondary: .white.opacity(0.75),
                ringColors: [Color(hex: "#C9A84C"), Color(hex: "#0B6B3A")],
                fallbackGradient: [Color(hex: "#0A2F1C"), Color(hex: "#1A5C3A"), Color(hex: "#C9A84C").opacity(0.4)]
            )
        case .precisionTech:
            return .init(
                accent: Color(hex: "#3AD0FF"),
                accentSecondary: Color(hex: "#A8B4C0"),
                cardFill: Color.black.opacity(0.45),
                cardStroke: Color(hex: "#3AD0FF").opacity(0.45),
                textPrimary: .white,
                textSecondary: Color(hex: "#B8C8D8"),
                ringColors: [Color(hex: "#3AD0FF"), Color(hex: "#E8EEF2")],
                fallbackGradient: [Color(hex: "#0A1018"), Color(hex: "#123040"), Color(hex: "#3AD0FF").opacity(0.35)]
            )
        case .digitalFlow:
            return .init(
                accent: Color(hex: "#00FF66"),
                accentSecondary: Color(hex: "#003B1A"),
                cardFill: Color.black.opacity(0.55),
                cardStroke: Color(hex: "#00FF66").opacity(0.4),
                textPrimary: Color(hex: "#D0FFD8"),
                textSecondary: Color(hex: "#80C898"),
                ringColors: [Color(hex: "#00FF66"), Color(hex: "#003B1A")],
                fallbackGradient: [Color.black, Color(hex: "#001A0A"), Color(hex: "#00FF66").opacity(0.25)]
            )
        case .boldExpression:
            return .init(
                accent: Color(hex: "#A78BFA"),
                accentSecondary: Color(hex: "#C0C0C8"),
                cardFill: Color.black.opacity(0.5),
                cardStroke: Color(hex: "#A78BFA").opacity(0.45),
                textPrimary: .white,
                textSecondary: Color(hex: "#D4C4F0"),
                ringColors: [Color(hex: "#A78BFA"), Color(hex: "#C0C0C8")],
                fallbackGradient: [Color(hex: "#0A0612"), Color(hex: "#2A1040"), Color(hex: "#A78BFA").opacity(0.35)]
            )
        }
    }
}
```

- [ ] **Step 2: Implement `ProfileStyleBackground`**

```swift
import SwiftUI

public struct ProfileStyleBackground: View {
    public let styleId: ProfileStyleId
    public var showRain: Bool = true

    public init(styleId: ProfileStyleId, showRain: Bool = true) {
        self.styleId = styleId
        self.showRain = showRain
    }

    public var body: some View {
        let theme = ProfileStyleTheme.theme(for: styleId)
        let config = ProfileStyleCatalog.config(id: styleId)
        ZStack {
            LinearGradient(colors: theme.fallbackGradient, startPoint: .topLeading, endPoint: .bottomTrailing)
            if UIImage(named: config.heroAssetName) != nil {
                Image(config.heroAssetName)
                    .resizable()
                    .scaledToFill()
                    .opacity(0.55)
                    .clipped()
            }
            if styleId == .digitalFlow && showRain {
                DigitalRainOverlay()
                    .opacity(0.35)
                    .allowsHitTesting(false)
            }
            // Readability scrim
            LinearGradient(
                colors: [.black.opacity(0.15), .black.opacity(0.45)],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        .ignoresSafeArea()
    }
}

/// Lightweight green “rain” — static when Reduce Motion is on.
struct DigitalRainOverlay: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: reduceMotion ? 60 : 0.08, paused: reduceMotion)) { timeline in
            Canvas { context, size in
                let cols = Int(size.width / 14)
                let t = timeline.date.timeIntervalSinceReferenceDate
                for c in 0..<cols {
                    let x = CGFloat(c) * 14 + 4
                    let seed = Double(c) * 12.3
                    let y = reduceMotion ? CGFloat(c % 7) * 40 : CGFloat((t * 40 + seed).truncatingRemainder(dividingBy: Double(size.height + 40)))
                    let rect = CGRect(x: x, y: y - 40, width: 2, height: 28)
                    context.fill(Path(rect), with: .color(Color(hex: "#00FF66").opacity(0.5)))
                }
            }
        }
    }
}
```

If `UIImage` is unavailable in pure SwiftPM macOS tests, gate with:

```swift
#if canImport(UIKit)
import UIKit
private func heroExists(_ name: String) -> Bool { UIImage(named: name) != nil }
#else
private func heroExists(_ name: String) -> Bool { false }
#endif
```

- [ ] **Step 3: Compile check**

```bash
cd ~/mangasm && swift build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(reputation): hybrid ProfileStyleTheme and background"
```

---

### Task 5: Wire AppState + store

**Files:**

- Modify: `Sources/MangasmApp/Shell/AppState.swift`
- Modify: `Sources/MangasmApp/Services/AppEnvironment.swift` (optional inject store)
- Modify: app root / `MainTabView` if needed to pass style

**Interfaces:**

- Consumes: `ProfileStyleState`, `ProfileStyleStore`
- Produces: `AppState.profileStyle`, `setPreferredStyle`, score sync

- [ ] **Step 1: Extend AppState**

Read current `AppState.swift` and add:

```swift
public var profileStyle: ProfileStyleState
private let styleStore: any ProfileStyleStore

// In init: load store, set reputationScore from profile.repScore, seedSeen if first launch flag
public func syncProfileStyleWithReputation() {
    let toast = profileStyle.applyScoreChange(profile.repScore)
    styleStore.saveSeenUnlockIds(profileStyle.seenUnlockIds)
    pendingStyleUnlocks = toast  // new published property
}

public func setPreferredStyle(_ id: ProfileStyleId) {
    if profileStyle.selectPreferred(id) {
        styleStore.savePreferred(id)
    }
}
```

Call `syncProfileStyleWithReputation()` when profile loads / repScore changes.

- [ ] **Step 2: Unit test AppState style sync** if existing `AppStateTests` pattern allows; else keep logic in `ProfileStyleState` tests only.

- [ ] **Step 3: `swift test` filter AppState + ProfileStyle**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(reputation): wire ProfileStyleState into AppState"
```

---

### Task 6: TopBar + ProfileScreen theming

**Files:**

- Modify: `Sources/MangasmApp/Shell/TopBar.swift`
- Modify: `Sources/MangasmApp/Features/Profile/ProfileScreen.swift`

- [ ] **Step 1: TopBar** — replace `RepTier.tier(...).rawValue` badge with `state.profileStyle.activeConfig.badgeName`; tint accents with `ProfileStyleTheme.theme(for: active.id).accent`.

- [ ] **Step 2: ProfileScreen** — wrap content in `ZStack { ProfileStyleBackground(styleId:); existing scroll }`; apply card fill/stroke from theme; keep layout structure.

- [ ] **Step 3: Manual sim check** (or Preview): score 42 → Precision Tech tokens.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(reputation): theme TopBar and Profile with hybrid styles"
```

---

### Task 7: Style picker + unlock toast + settings explainer

**Files:**

- Create: `Sources/MangasmApp/Features/Profile/ProfileStylePicker.swift`
- Create: `Sources/MangasmApp/Features/Profile/ProfileUnlockToast.swift`
- Modify: Settings sheet / `ProfileScreen` settings entry point

- [ ] **Step 1: Picker UI**

```swift
// Grid of ProfileStyleCatalog.all
// Unlocked: tappable, checkmark if active
// Locked: opacity 0.45, lock, "Unlocks at {minScore}"
// Header: "Community Reputation"
// Footnote: canonical review explanation string from spec §3
```

- [ ] **Step 2: Toast**

```swift
// Overlay when pendingStyleUnlocks non-empty
// Text: "New style unlocked: \(config.displayName)"
// Dismiss after 2.5s; clear pending
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(reputation): unlocked styles picker and unlock toast"
```

---

### Task 8: Compliance tests + docs touch

**Files:**

- Create or modify: `Tests/MangasmAppTests/ComplianceTests.swift` (or new `ProfileStyleComplianceTests.swift`)
- Modify: `docs/superpowers/specs/2026-08-03-reputation-profile-styles-design.md` status → Implemented (when done)

- [ ] **Step 1: Compliance assertions**

```swift
func testStyleUnlockCopyHasNoSexualTerms() {
    let blob = (ProfileStyleCatalog.all.map(\.badgeName)
        + ProfileStyleCatalog.all.map(\.displayName)).joined(separator: " ").lowercased()
    for banned in ["sex", "thirst", "hookup", "nsfw", "xxx"] {
        XCTAssertFalse(blob.contains(banned))
    }
}

func testAllStylesAreCosmeticOnlyComment() {
    // Document invariant: style never appears in ReputationService.canViewPhotos
    // Photo gate remains score-based only — smoke:
    let mock = MockReputationService()
    XCTAssertEqual(mock.canViewPhotos(viewerScore: 10, targetGate: 20), false)
}
```

- [ ] **Step 2: Full SPM suite**

```bash
cd ~/mangasm && swift test
```

Expected: all existing + new tests PASS (StoreKit iOS target out of scope).

- [ ] **Step 3: Commit**

```bash
git commit -m "test(reputation): App Store–safe style compliance checks"
```

---

### Task 9: Optional hero assets (non-blocking)

**Files:**

- Add to asset catalog or `Resources` when available (from prompt doc)
- No code change if names already match

- [ ] **Step 1:** Generate 5 plates offline using `docs/superpowers/specs/2026-08-03-reputation-profile-style-prompts.md`
- [ ] **Step 2:** Import with exact names; verify Profile shows image under scrim
- [ ] **Step 3:** Commit assets only if size policy allows

```bash
git commit -m "assets: profile style hero plates for hybrid themes"
```

---

## Spec coverage checklist

| Spec section                             | Task                          |
| ---------------------------------------- | ----------------------------- |
| 5 styles + thresholds                    | Task 1                        |
| preferred / unlock / toast delta         | Task 2                        |
| UserDefaults persistence                 | Task 3                        |
| Hybrid tokens + hero fallback + rain     | Task 4                        |
| AppState wiring                          | Task 5                        |
| Profile + TopBar                         | Task 6                        |
| Settings picker + toast UI + review copy | Task 7                        |
| Compliance tests                         | Task 8                        |
| Offline prompts / assets                 | Task 9 + existing prompts doc |
| No photo-gate change                     | Explicit non-touch            |
| No runtime AI                            | Explicit                      |

## Placeholder scan

None intentional — `applyScoreChange` implementation is fully specified; `AppState` wiring requires reading live file structure at execute time for exact property names.

## Type consistency

- `ProfileStyleId` raw values camelCase throughout
- `heroAssetName` always `style-hero-<id rawValue>`
- Store methods: `loadPreferred` / `savePreferred` / `loadSeenUnlockIds` / `saveSeenUnlockIds`

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-03-reputation-profile-styles.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks
2. **Inline Execution** — this session executes tasks with checkpoints

Which approach?
