# Mangasm Monetization — Requirements Specification

> **Status:** Requirements discovery (brainstorm output). This document defines _what_ and _why_ — **not** architecture or implementation.
> Next steps: `/sc:design` for the entitlement/ledger architecture, `/sc:workflow` for build sequencing.
> **Scope note:** Mangasm is a _safety-first gay dating app_. Every monetization requirement below is subordinate to that positioning — see [NFR-Safety](#nfr-safety).

---

## 1. Goals

**Primary goal:** Generate revenue from Day 1 with the lowest-friction path to first payment, while protecting the safety-first brand and the ecosystem liquidity that makes the app valuable.

**Strategic thesis (decided):**

- **Model:** Subscriptions **+** consumables. Consumables monetize first-session impulse (impulse buyers convert before they'll commit to a recurring charge); subscriptions capture retained users; consumable packs let power users ("whales") spend $50–$100+ in week one without a per-month ceiling.
- **Anchor value:** _"See who liked you"_ — reveal blurred **admirers** on the **LIKED YOU** surface. Universally the highest-converting paywall trigger in dating.
- **Safety is not for sale:** core safety (location fuzzing, blocking, reporting, basic privacy) stays free — it _builds_ the trust and liquidity that fuels paid boosts and likes.
- **Payments (v1):** Apple IAP only (StoreKit / current server verification). Web billing on `mangasm.app` is deferred.
- **Tier structure (v1):** Single premium tier — **M+ / Mangasm+** — plus standalone consumables. Multi-tier ladder deferred.

**Non-goals (v1):**

- Ads (rewarded video + fixed-price sponsored grid cards) — _later_, and only non-disruptive formats. No interstitials, ever.
- Web / Stripe billing.
- Multi-tier subscription ladder (Plus/Gold/Platinum).
- À-la-carte Travel/Passport as a _consumable_ (it is an M+ tier perk).

---

## 2. Current state (grounding)

What already exists in the codebase that these requirements build on:

| Concept              | Today                                                                                                                               | Domain term                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Premium tier         | Exists. Gates event hosting, extended bio (600 vs 300), fetishes visibility (`Visibility.into`). Server truth = `profiles.premium`. | **M+ / Mangasm+**, `premium` / `isPremium` |
| Products             | Monthly **$9.99** (`Mangasm2cute4u001`), 3-Month **$24.99** (`Mangasm0001`). No consumables, no intro offers.                       | `Mangasm.storekit` group `M+`              |
| Purchase flow        | Hand-rolled **StoreKit 2** → JWS → Supabase `verify-purchase` → `profiles.premium`.                                                 | `StoreKitStore`, `PremiumResolver`         |
| Feature gate         | Single in-memory bool consumed by every view.                                                                                       | `AppState.premium`                         |
| Discover grid        | Mock `MatchService` (5 seeded `Candidate`s). No radius, no paging, no count cap. Grid header **NEARBY** + online count.             | `DiscoverScreen` `.nearby`, `UserGridCard` |
| Likes                | Display-only. Reuses `nearby()`, shows `prefix(4)` under **LIKED YOU** as _"N admirers"_. No like action, no daily cap.             | `AppTab.likes`, "admirers"                 |
| Other people vs self | `Candidate` (others, has `matchPct`, `distanceLabel`) vs `Profile` (self). `matchPct >= 85` = "hot".                                | `Candidate`, `MatchService`                |
| Boost                | **Does not exist.** Greenfield.                                                                                                     | (new)                                      |

---

## 3. Functional requirements

### FR-1 — M+ subscription (extend existing tier)

- **FR-1.1** M+ MUST unlock, in addition to its current perks: reveal of **admirers** (who liked you), unlimited daily likes, extended NEARBY range beyond the free count cap, message priority + read receipts, and **Travel / Passport** (browse & chat in another city).
- **FR-1.2** M+ MUST offer a **weekly** price point alongside monthly. (Weekly consistently drives the fastest conversion velocity in mobile dating; the upfront cost feels negligible.) Exact prices → [OQ-2](#open-questions).
- **FR-1.3** Each active M+ subscription MUST grant **1 free Boost per week** (auto-credited), anchoring consumable value inside the subscription.
- **FR-1.4** M+ entitlement MUST remain **server-authoritative** (`profiles.premium`), with on-device StoreKit entitlement as an optimistic fallback only (existing `PremiumResolver` contract).

### FR-2 — "See who liked you" (the anchor paywall)

- **FR-2.1** Free users MUST see their **admirer count** and **blurred** admirer thumbnails on the LIKED YOU surface.
- **FR-2.2** Blurred thumbnails MUST retain recognizable **color/shape** (not opaque tiles) so curiosity drives the upgrade tap.
- **FR-2.3** Tapping any blurred admirer MUST trigger the paywall **at that exact moment** (contextual, not a generic upsell screen).
- **FR-2.4** M+ users MUST see all admirers unblurred, subject to blocking rules ([NFR-Safety](#nfr-safety)).

### FR-3 — Free-tier friction walls

- **FR-3.1 — NEARBY grid cap by COUNT, not distance.** Free users MUST see the nearest **N** profiles (target 50–100; final value → [OQ-3](#open-questions)) on the NEARBY grid. The immediate local area stays free so proximity feels high-value; **extended range** is gated behind M+. Rationale: capping by physical miles makes dense markets (e.g. NYC) feel dead and causes immediate bounce; capping by count preserves perceived density.
- **FR-3.2 — Daily like cap.** Free users MUST be limited to **10–20 likes/day** (final value → [OQ-3](#open-questions)); M+ = unlimited. Hitting the cap MUST trigger the paywall at that moment (FR-5).
- **FR-3.3 — Liquidity guard.** The daily like cap MUST NOT choke _responding to an existing connection or messaging someone already matched_. Replies and existing conversations stay open on the free tier so ecosystem liquidity does not collapse.
- **FR-3.4 — Message priority / read receipts.** Free users do not get read receipts or priority send; M+ does. (Ongoing value that justifies retention, distinct from one-time reveals.)

### FR-4 — Consumables (standalone microtransactions)

- **FR-4.1 — Boost / Spotlight.** A consumable that bumps the buyer to the **top of the local NEARBY grid** for a fixed window (target ~30 min; final → [OQ-4](#open-questions)). Sold as **1-pack and 5-pack**, price band **$2.99–$4.99**.
- **FR-4.2 — Super-Like / High-Intent Ping.** A consumable (also available as an M+ perk allotment) that sends a notification + grants message priority _before_ a mutual match. Pre-match messaging semantics → [OQ-5](#open-questions).
- **FR-4.3** Consumable balances (Boost credits, Super-Like credits) MUST be tracked **server-side** as an authoritative ledger; the client MUST NOT be the source of truth for remaining balance ([NFR-Integrity](#nfr-integrity)).
- **FR-4.4** The weekly-bundled Boost (FR-1.3) MUST draw from the same balance/ledger as purchased Boosts.

### FR-5 — Contextual paywall triggering

- **FR-5.1** The paywall MUST fire at the precise friction moment: (a) tapping a blurred admirer, (b) hitting the daily like cap, (c) attempting to exceed the NEARBY count cap / use extended range, (d) attempting Travel/Passport, (e) attempting to host an Event (existing "Unlock M+" gate).
- **FR-5.2** Each trigger MUST pass its **context** to the paywall so copy can match the moment ("Unlock to see who liked you", not a generic list of features).
- **FR-5.3** Purchase MUST support **Restore** (existing StoreKit restore flow) and reflect entitlement without app restart.

### FR-6 — Trial + first-session liquidity boost

- **FR-6.1** M+ MUST offer a **short free trial** (3 or 7 days → [OQ-6](#open-questions)) via a StoreKit introductory offer, one per Apple ID (StoreKit eligibility).
- **FR-6.2 — Anti-cancellation mechanic (critical).** Starting a trial MUST automatically apply a **first-session visibility boost** in the local feed for the trial window. Rationale: gay dating trials suffer high cancellation when users get no early matches; seeding early _inbound_ admirers before the first charge measurably lowers trial-cancel rate. This reuses the Boost mechanic (FR-4.1) at no consumable cost to the user.

---

## 4. Non-functional requirements

<a id="nfr-safety"></a>

### NFR-Safety — Safety is never behind the paywall

- Core safety MUST stay free: **location fuzzing**, block, report, and basic privacy controls.
- "Advanced privacy" _may_ be paid (incognito/travel), but MUST NOT include anything that degrades a free user's _baseline_ safety. A free user must never be _less safe_ for not paying.
- Boost/Spotlight and Super-Like MUST respect blocks: a boosted or super-liking user MUST NOT become visible to, or message, someone who blocked them. Boost MUST NOT deanonymize or override location fuzzing.
- Revealing an admirer (FR-2.4) MUST respect blocking in both directions.

<a id="nfr-integrity"></a>

### NFR-Integrity — Server-authoritative, tamper-resistant

- Entitlements (`profiles.premium`) and consumable balances MUST be validated server-side against verified transactions (extend the existing `verify-purchase` path). Client state is optimistic only.
- Consumable spend (activating a Boost, sending a Super-Like) MUST be an atomic server-side debit; no client-side "free" spend on tampered balances.
- Trial eligibility MUST rely on StoreKit/Apple, not client flags, to prevent trial farming.

### NFR-Compliance — App Store

- MUST meet App Store subscription rules: clear price/period disclosure, restore, terms/privacy links, no dark-pattern trial traps beyond what StoreKit permits.
- Consumables and subs MUST be correctly typed in `Mangasm.storekit` and App Store Connect (auto-renewing subs vs consumables).
- Blurred-content and adult-content presentation MUST comply with guidelines for the app's rating.

### NFR-Analytics — Instrument the funnel from Day 1

- MUST track, per trigger: paywall impressions, conversion rate, revenue, and ARPU; consumable attach rate; trial start → paid conversion; and a whale cohort (week-1 spend). Without this the impulse thesis can't be tuned.

### NFR-Liquidity — Do no harm to the marketplace

- Monetization MUST NOT reduce active-user density below the point where the NEARBY grid feels alive. Free tier must remain genuinely usable (FR-3.3). Pay-to-win reach (Boosts) MUST be bounded so unboosted users still surface.

---

## 5. User stories & acceptance criteria

**US-1 — Reveal admirers**
_As a free user who sees "7 admirers", I want to know who liked me._

- **Given** I am free with blurred admirers, **when** I tap a blurred admirer, **then** the paywall appears with copy specific to seeing who liked me, **and** on purchasing M+ the admirers unblur without app restart.
- Blurred thumbnails show recognizable colors/shapes (AC for FR-2.2).

**US-2 — Daily like cap → paywall**
_As a free user, I hit my daily likes._

- **Given** I've used my daily likes, **when** I like another `Candidate`, **then** the paywall fires at that moment; **but** I can still reply to and message existing connections (FR-3.3).

**US-3 — Boost to the top of NEARBY**
_As any user wanting visibility tonight, I buy a Boost._

- **Given** I purchase a Boost 1-pack, **when** I activate it, **then** my card moves to the top of the local NEARBY grid for the boost window, **and** my server balance decrements by exactly one, **and** blocked users still cannot see me.

**US-4 — Trial with liquidity boost**
_As a new user, I start a free trial._

- **Given** I start the M+ trial, **then** a first-session visibility boost is applied for the trial window automatically at no consumable cost, **and** I am charged only after the trial unless I cancel.

**US-5 — M+ includes a weekly Boost**
_As an M+ subscriber._

- **Given** an active M+ subscription, **then** I receive 1 Boost credit per week into the same balance as purchased Boosts.

**US-6 — Safety stays free**
_As a free user._

- **Given** I never pay, **then** location fuzzing, block, and report remain fully functional, **and** no safety feature ever shows a paywall.

---

## 6. Open questions

<a id="open-questions"></a>

- **OQ-1 — RevenueCat vs hand-rolled StoreKit 2 (architectural, decide before build).** Current IAP is hand-rolled StoreKit 2 + `PremiumResolver` + Supabase `verify-purchase`. RevenueCat SPM is now a resolved dependency but unused. Adopt RevenueCat (rewrite `StoreKitStore`, gain paywalls/entitlements/analytics/webhooks) **or** keep the hand-rolled path and drop the dependency? Consumable ledgers + multiple entitlements make RevenueCat attractive, but it's a rewrite. → route to `/sc:design`.
- **OQ-2 — Pricing reconciliation.** Shipped products are monthly **$9.99** / 3-month **$24.99**; the strategy calls for a **weekly** point ($4.99–6.99) and possibly a higher monthly (~$29.99). Which prices ship in v1, and do we keep, reprice, or retire the existing SKUs?
- **OQ-3 — Free-tier numbers.** Exact NEARBY count cap (50 vs 100?) and daily like cap (10 vs 20?). Needs to be tunable server-side, not hardcoded.
- **OQ-4 — Boost mechanics.** Boost duration (30 min?), radius, and how many boosted slots can occupy the top of a grid at once (liquidity/pay-to-win bound per NFR-Liquidity).
- **OQ-5 — Super-Like semantics.** Does a Super-Like allow a message _before_ a mutual match? If so, how does that interact with the safety model and consent?
- **OQ-6 — Trial length.** 3-day (faster cash, higher churn) vs 7-day (more early matches, better retention) — pair with the FR-6.2 boost either way.
- **OQ-7 — Entitlement model.** The single `AppState.premium` bool can't express consumables + multiple gated capabilities. A real entitlement/capability model is needed (→ `/sc:design`).
- **OQ-8 — Advanced-privacy paid set.** Exactly which privacy features are "advanced/paid" (incognito, travel) vs free baseline, verified against NFR-Safety so nothing degrades free-user safety.
- **OQ-9 — Ads (deferred).** When ads arrive: rewarded-video-for-perks and fixed-price sponsored grid cards only. Confirm no interstitials and how sponsored cards interleave with organic NEARBY results.

---

## 7. Handoff

This is a **requirements spec only**. Recommended next moves:

1. **`/sc:design`** — resolve OQ-1 and OQ-7: the entitlement/capability model + consumable ledger + StoreKit-vs-RevenueCat decision.
2. **`/sc:workflow`** — sequence the build. Suggested Day-1-cash ordering: (a) blurred admirers + contextual paywall (FR-2/FR-5), (b) daily like cap (FR-3.2/3.3), (c) Boost consumable + ledger (FR-4), (d) weekly M+ SKU + trial + liquidity boost (FR-1.2/FR-6).
