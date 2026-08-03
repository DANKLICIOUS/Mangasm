# Design: Community Reputation × Hybrid Profile Styles

**Date:** 2026-08-03  
**Status:** Approved in conversation; awaiting file review before implementation plan  
**App:** Mangasm (`com.mangasm.app`)  
**Goal link:** App Store path + reviews (#1 revenue + appreciation) via differentiated, compliance-safe UX  
**Related:** Guideline **4.3** differentiation; Guideline **1.2** UGC safety; no sexual gamification

---

## 1. Problem

Mangasm already has `Profile.repScore` and a coarse `RepTier`, but the UI is largely a single gold/glass look. After App Store **4.3** (spam / template-like) risk, the product needs **distinctive, earned visual identity** that still ships offline-safe and review-safe.

We will **not** use runtime AI image generation for score changes (latency, cost, review risk). We **will** use a **hybrid** system: SwiftUI chrome + optional hero plate assets per style.

---

## 2. Goals

1. Map reputation **0–100** to five **cosmetic** profile styles with clear unlock thresholds.
2. Persist unlocks and user **preferred** style; never force a higher theme over a manual lower pick.
3. Surface styles on **Profile card**, **Top bar** accents, and **Settings → Unlocked styles**.
4. Frame the system as **Community Reputation / Trust** (positive, verifiable behavior only).
5. Improve **4.3** differentiation without violating sexual-gamification rules.

### Non-goals (this slice)

- Live Supabase reputation scoring engine (mock + schema hooks only).
- Runtime Grok/Imagine generation in-app.
- Changing photo-gate math beyond existing `ReputationService.canViewPhotos`.
- Rewarding matches, message volume, or sexual activity.

---

## 3. App Store / Play compliance (hard rules)

### Allowed score drivers (document + implement when backend ships)

- Profile verification complete
- Positive ratings from other users
- Helpful reports / helping new members
- Consistent use **without** open abuse reports
- Completing safety / education modules

### Forbidden score drivers

- Sexual activity, explicit language, adult content consumption
- Match count, romantic message volume, “fun” sex metrics
- Unlocking sexual features, visibility of adult content, or messaging privileges via style tier

### Framing

| Avoid                       | Prefer                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| Level up / grind / power    | Community Reputation, Trust Score                                           |
| Sexy / hot / thirsty badges | New Member, Rising Member, Trusted Member, Community Leader, Elite Verified |
| Forced FOMO theme swaps     | Free switch among unlocked styles + optional unlock toast                   |

**Review explanation (canonical):**  
“Community Reputation grows when you complete verification, receive positive feedback, finish safety education, and help keep Mangasm safe. Higher reputation unlocks cosmetic profile styles only — never messages, adult visibility, or sexual features.”

---

## 4. Domain model

### 4.1 Style catalog

|  Score | Badge name       | Style ID         | Display name    | Visual direction                                     |
| -----: | ---------------- | ---------------- | --------------- | ---------------------------------------------------- |
|   0–20 | New Member       | `calmStudio`     | Calm Studio     | Bob Ross–inspired painting calm; pastels; soft light |
|  21–40 | Rising Member    | `aspirational`   | Aspirational    | Emerald Lambo / luxury beach; green + gold accents   |
|  41–60 | Trusted Member   | `precisionTech`  | Precision Tech  | Cyborg HUD; cyan/chrome; holographic accents         |
|  61–80 | Community Leader | `digitalFlow`    | Digital Flow    | Matrix-inspired green rain; dark + neon outlines     |
| 81–100 | Elite Verified   | `boldExpression` | Bold Expression | Dark purple/black glam; silver accents               |

### 4.2 Types (Swift)

```text
enum ProfileStyleId: String, CaseIterable, Codable, Sendable {
  case calmStudio, aspirational, precisionTech, digitalFlow, boldExpression
}

struct ProfileStyleConfig: Sendable, Equatable {
  let id: ProfileStyleId
  let minScore: Int
  let badgeName: String
  let displayName: String
  let heroAssetName: String?   // Assets catalog; nil → pure SwiftUI fallback
}

struct ProfileStyleState: Sendable, Equatable {
  var reputationScore: Int              // 0...100 clamped
  var preferredStyleId: ProfileStyleId? // user override
  var seenUnlockIds: Set<ProfileStyleId>
}
```

### 4.3 Pure functions

- `availableStyles(score:)` → all styles with `score >= minScore`
- `defaultStyle(score:)` → highest unlocked
- `activeStyle(state:)` → preferred if unlocked, else default
- `newlyUnlocked(previousScore:newScore:)` → styles newly available for toast

### 4.4 Relation to existing `RepTier`

`RepTier` today uses different cutoffs and names (`new`…`legend`).

**Decision:** Introduce **`ProfileStyleId` + catalog** as the style system of record. Map Top bar badge text to **style badgeName** (or keep `RepTier` only for photo-gate docs). Do **not** leave two conflicting user-facing tier ladders — migrate display to the five style badges above. Photo gating continues via `ReputationService.canViewPhotos` + numeric score, unchanged in this slice.

---

## 5. Hybrid rendering

### 5.1 SwiftUI chrome (always)

- Layout unchanged: Mangasm wordmark, REPUTATION score, PRIVATE pill, avatar ring, bio card, photos section, tab bar (existing shell).
- Theme tokens per style: background gradient, card fill/border, accent, text primary/secondary, ring gradient.
- Digital Flow: optional lightweight Canvas/particle **rain** behind content; honor `accessibilityReduceMotion` (static gradient only).

### 5.2 Hero plates (when present)

- Asset names: `style-hero-calmStudio`, `style-hero-aspirational`, `style-hero-precisionTech`, `style-hero-digitalFlow`, `style-hero-boldExpression`.
- Placement: behind profile content (and optionally subtle Top bar wash), dimmed for readability.
- **Fallback:** if asset missing, SwiftUI tokens only — tests and CI never depend on binary art.

### 5.3 Offline design prompts

Refined Imagine/design prompts live in:

`docs/superpowers/specs/2026-08-03-reputation-profile-style-prompts.md`

Used by humans/agents to **author assets**, not called at runtime.

---

## 6. App surfaces

| Surface                    | Behavior                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Profile                    | Apply `ProfileStyleTheme` + optional hero to card shell                                                                 |
| TopBar                     | Accent + badge from `activeStyle`                                                                                       |
| Settings → Unlocked styles | Grid of unlocked styles; checkmark on preferred; lock icon on locked (show min score)                                   |
| Unlock toast               | When `newlyUnlocked` non-empty after score change: “New style unlocked: {displayName}” once per style (`seenUnlockIds`) |

---

## 7. Persistence

| Layer        | Storage                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| v1 ship      | `UserDefaults` / `AppStorage`: `preferredStyleId`, `seenUnlockIds`                                            |
| Score source | `AppState.profile.repScore` (existing)                                                                        |
| Later        | Supabase: `preferred_style text`, optional `unlocked_styles` JSONB; or derive unlocks solely from `rep_score` |

**Rule:** Prefer server preferred style when live profile loads; until then, local preferred + score-derived unlocks.

---

## 8. Architecture (modules)

```
Sources/MangasmApp/
  Domain/Reputation/
    ProfileStyleCatalog.swift    // THEMES table + pure functions
    ProfileStyleState.swift      // state + resolve active
  DesignSystem/
    ProfileStyleTheme.swift      // Color/Gradient tokens per id
    ProfileStyleBackground.swift // hero + fallbacks + rain
  Features/Profile/
    ProfileStylePicker.swift     // settings grid
    ProfileUnlockToast.swift     // presentation
  Services/
    ProfileStyleStore.swift      // UserDefaults protocol + mock
```

Wire: `AppState` or environment object holds `ProfileStyleState`; update when `profile.repScore` changes; inject store via `AppEnvironment` if needed.

---

## 9. Testing

| Test                | Expectation                                                |
| ------------------- | ---------------------------------------------------------- |
| Unit                | Threshold boundaries 20/21, 40/41, 60/61, 80/81            |
| Unit                | Preferred lower style respected when still unlocked        |
| Unit                | Preferred higher-than-unlocked falls back to default       |
| Unit                | `newlyUnlocked` only returns styles not in `seenUnlockIds` |
| UI (optional later) | Picker shows unlock state for sample scores                |

No tests require binary hero assets.

---

## 10. Rollout

1. Domain + tokens + fallbacks (no assets required).
2. Profile + TopBar apply active style.
3. Settings picker + unlock toast.
4. Drop hero assets as they are produced from prompt doc.
5. ASC metadata blurb for reputation (human pastes).

---

## 11. Success criteria

- User with score 42 defaults to **Precision Tech** unless they pick Calm Studio / Aspirational.
- Score 100 unlocks all five; manual switch works offline.
- Zero sexual gamification in copy or unlock rules.
- Missing hero assets still look intentional (fallback).
- Clear path to explain system under App Review 4.3 / 1.2 narrative.

---

## 12. Open items (explicit, not TBD blockers)

| Item                          | Owner                    | When             |
| ----------------------------- | ------------------------ | ---------------- |
| Produce 5 hero plates         | Design / Imagine offline | After code shell |
| Live reputation event scoring | Backend                  | Post-v1          |
| ASC metadata paste            | Human                    | Submit build     |

---

## Approval

- Design conversation: **approved** (user 2026-08-03).
- This file: pending user review before **writing-plans** / implementation.
