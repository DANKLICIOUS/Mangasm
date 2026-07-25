# Group DateNight — AI Match + RSVP Booking Algorithm

> Extends the existing 1:1 **DateNight** feature (AI Match → "RSVP A FIRST DATE", dual-proximity ≤10 mi of both, Yelp Fusion + Ticketmaster deep-links) to a **triad**: the viewer invites **two matches** to seamlessly RSVP to a single venue/event within **X miles** of all three.
>
> **Status:** Geometric core is **implemented + tested** (`MultiProximity`, 11 tests). Stages 0 and 4–5 (match selection, ranking, RSVP orchestration) are **specified here**, not yet built.
> **Note on providers:** the codebase uses **Yelp Fusion** (restaurants) + **Ticketmaster Discovery** (events), not OpenTable. OpenTable's booking API is partner-gated; treat it as a future provider behind the same seam. "RSVP" today = deep-link to the provider's booking/ticket page (`DateNightPlace.bookingURL`).

---

## 1. Problem statement

**Input:** the signed-in viewer, the viewer's pool of mutual matches, a radius **X** (miles), and category preferences (restaurant / event / festival).
**Output:** a ranked list of venues each within **X mi of the viewer and both invited matches**, plus an RSVP flow that books the group once all three accept.

**Selection question:** _which_ two matches, and _which_ venue, such that (a) a common venue exists, (b) it's fair on travel, and (c) it fits shared interests — booked with the fewest taps.

---

## 2. Domain types it builds on

| Concept                 | Type                            | Notes                                                                                   |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| Person location         | `GeoCoordinate` / `GeoAnchor`   | haversine `miles(from:to:)`; anchor = GPS or ZIP                                        |
| A match                 | `Candidate`                     | has `matchPct` (0–100), `sharedInterests`, `hobbies`, `geoCoordinate`, `distanceLabel`  |
| 2-party rule (existing) | `DualProximity`                 | midpoint, `usersTooFarApart`, `searchRadiusMiles`, `filter`                             |
| **N-party rule (new)**  | **`MultiProximity`**            | `feasible`, `center`, `searchRadiusMiles`, `isEligible`, `filter`, `minEnclosingCircle` |
| Venue                   | `DateNightPlace`                | `category`, `coordinate`, `bookingURL`, `provider`                                      |
| Discovery               | `DateNightService.discover(_:)` | Yelp + Ticketmaster; returns `[DateNightPlace]`                                         |

---

## 3. The geometry (implemented)

A venue serves a party **iff it lies within X mi of every anchor**. Such a venue exists **iff the minimum enclosing circle (MEC) of the anchors has radius ≤ X**. The MEC center is the fairest search origin (it minimizes the worst-case travel distance).

`MultiProximity` (in `Services/Domain/DateNight/MultiProximity.swift`) provides:

- `feasible(anchors:maxMiles:)` → `MEC.radius ≤ X`
- `center(of:)` → MEC center (fairest origin)
- `searchRadiusMiles(anchors:maxMiles:)` → `max(1, X − MEC.radius)`; a disk of this radius around the center is **guaranteed** inside the all-eligible region (proof in source)
- `isEligible(place:anchors:maxMiles:)` / `filter(places:anchors:maxMiles:)`
- `minEnclosingCircle(of:)` → deterministic brute force over pair-diameters + triple-circumcircles on a local equirectangular projection

**Reduction guarantee (tested):** for 2 anchors this equals `DualProximity` exactly (center = midpoint, radius = separation/2, feasible ⇔ separation ≤ 2X).

**The N≥3 trap (tested):** three people who are _pairwise_ close can still have **no** common venue — an equilateral triangle with 19-mi sides passes every pairwise ≤20-mi check yet its circumradius is 11 > 10. A naive "each pair is close enough" check is wrong for a triad; the MEC test is correct.

---

## 4. Full pipeline

```
Stage 0  Select the two matches  ─┐
Stage 1  Geometry / feasibility   │  "AI Matching"
Stage 2  Discovery (Yelp/TM)      │
Stage 3  Eligibility filter       │
Stage 4  Rank                    ─┘
Stage 5  RSVP orchestration + booking   "RSVP Booking Agent"
```

### Stage 0 — Match selection (which two to invite)

Let `M` = viewer's mutual matches with a known `geoCoordinate`. For each unordered pair `{p, q} ⊂ M`, the triad anchors are `[viewer, p, q]`.

- **Hard gate:** `MultiProximity.feasible([viewer, p, q], X)` must hold — else no venue exists, discard the pair.
- **Score** feasible pairs and take the top pair (or present the top few for the viewer to choose):

```
pairScore(p, q) =
      w_compat   · avg(p.matchPct, q.matchPct)/100            // both are good matches
    + w_shared   · jaccard(interests(viewer,p,q))             // 3-way interest overlap
    + w_fair     · (1 − travelSpread([viewer,p,q], X))        // nobody travels far more than others
    + w_slack    · (searchRadius([viewer,p,q], X) / X)        // roomy intersection = more venue choice
    − w_penalty  · pairwiseGap(p, q)                          // optional: don't pair two people who clash
```

where `travelSpread = (max−min anchor→center distance)/X`, and `jaccard` is over `sharedInterests ∪ hobbies` of all three. Weights start at `w_compat=0.4, w_shared=0.25, w_fair=0.2, w_slack=0.15`.

Complexity: `O(|M|²)` pairs × O(1); `|M|` is a handful → trivial.

### Stage 1 — Geometry / feasibility

For the chosen triad compute `center = MultiProximity.center(anchors)` and `radius = MultiProximity.searchRadiusMiles(anchors, X)`. If infeasible, surface a `DateNightError.tooFarApart`-style prompt with recovery options: **widen X**, **swap the farthest match**, or **fall back to a dyad** (viewer + nearest match) — the existing 1:1 flow.

### Stage 2 — Discovery

Query providers around `center` with `radius`, `partySize = 3`, category set, and (for events) a date window:

- **Yelp Fusion** → restaurants/festivals (existing `YelpFusionClient`).
- **Ticketmaster Discovery** → events (existing `TicketmasterDiscoveryClient`).
- **OpenTable** (future) → reservations behind the same `DateNightService` seam.

Merge into `[DateNightPlace]`. Extend `DateNightQuery` from `viewer/match` to `anchors: [GeoCoordinate]` + a `maxMiles` (the X) so `partySize` and `center`/`searchRadius` derive from the anchor list (currently hardcoded `partySize = 2`).

### Stage 3 — Eligibility filter

`MultiProximity.filter(places, anchors, X)` — keep only venues within X mi of all three. (Provider radius search is approximate; this is the exact gate.)

### Stage 4 — Ranking

```
venueScore(v) =
      w_dist   · (1 − avgAnchorDistance(v)/X)     // close to everyone
    + w_fair   · (1 − travelSpread_to(v)/X)       // fair to everyone
    + w_fit    · interestFit(v, triad)            // cuisine/genre matches shared interests/term
    + w_time   · availabilityFit(v, window)       // has a slot / on the right date
    + w_qual   · providerQuality(v)               // rating / popularity
    − w_price  · pricePenalty(v, budgetBand)
```

Return top-N (default 5). Ties broken by fairness, then rating.

### Stage 5 — RSVP orchestration (the booking agent)

A per-invitation state machine, one shared **GroupDate** with three participants:

```
        proposed ──invite──▶ pending
pending ──all accept──▶ confirming ──book ok──▶ booked
pending ──any decline / TTL expire──▶ fallback
fallback ──next-ranked venue exists──▶ proposed        (re-propose)
fallback ──none / degrade──▶ dyad or cancelled
booked  ──any cancel──▶ rebooking ──▶ fallback
```

- **Invite:** push + in-app to both matches with venue card + proposed time. Consent-based; a match may decline silently (no exposure to the other invitee).
- **TTL:** configurable (default 24 h; shorter for same-night). On timeout → `fallback`.
- **Book on unanimous accept:** open `bookingURL` for a reservation/tickets with `partySize = 3`. Today this is a deep-link; a true "seamless" booking needs a provider hold/checkout (see Open Questions).
- **Partial accept (2/3):** offer to **degrade to a dyad** for whoever accepted, or re-propose to a different second match.
- **Idempotency:** booking is keyed by `(groupDateId, venueId, slot)`; retries never double-book/double-charge.

---

## 5. Safety-first constraints (non-negotiable — brand spine)

- **Location fuzzing:** discovery runs on **fuzzed** anchors (snap to neighborhood/ZIP centroid), never raw home GPS. The MEC is computed on fuzzed anchors; only the **venue** location is ever revealed, never a participant's precise location.
- **Consent & blocking:** a triad requires all three to be **mutual matches** and **pairwise non-blocked**. Never place someone in a group with a user they blocked. Stage 0 must drop any pair violating this before scoring.
- **Public venues only** for group first dates (category gate).
- **Silent decline:** declining or timing out never notifies the other invitee who was proposed.
- **No pay-to-track:** a Boost/Spotlight (see monetization spec) must never reveal location beyond the fuzz radius.

---

## 6. Complexity & failure modes

- Selection `O(|M|²)`; MEC `O(n³)` build (n = party size, ~3); discovery = 2 network calls; filter/rank `O(V log V)`. Network-bound overall.
- **Failure modes & recovery:** infeasible triad → widen X / swap / dyad-fallback; empty discovery → widen X or relax categories; provider error → `DateNightError.network`; all decline → cancel gracefully.

---

## 7. What ships now vs next

**Implemented (this task):**

- `MultiProximity` — feasibility, MEC center, guaranteed search radius, eligibility/filter, exact N≥3 handling. Pure, `Sendable`, zero-dependency.
- `MultiProximityTests` — 11 tests: DualProximity reduction parity, triad feasible/infeasible, the pairwise-close-but-jointly-far trap, parameterized X, eligibility filter, degenerate inputs. Full suite green (150/150).

**Next (route to `/sc:design` then `/sc:workflow`):**

1. Generalize `DateNightQuery` (`anchors: [GeoCoordinate]` + `maxMiles`) and `DateNightService` to N anchors; wire `MultiProximity` into `LiveDateNightService`.
2. Stage 0 match-selection scorer + Stage 4 venue ranker (pure, testable).
3. `GroupDateService` RSVP state machine + `GroupDate`/`RSVPInvitation`/`RSVPStatus` models (mock + live), with consent/blocking gates.
4. AI Match UI: a "GROUP DATE" mode to pick two matches and drive the RSVP flow.

## Open questions

- **OQ-1 — True booking vs deep-link.** Real "seamless RSVP" needs a provider hold/checkout (Ticketmaster purchase, OpenTable reservation). Which providers get first-class booking vs deep-link in v1?
- **OQ-2 — Who picks?** AI auto-selects the two matches, or proposes a ranked shortlist the viewer confirms?
- **OQ-3 — Default X and same-night mode.** Keep 10 mi default? Add a tighter "tonight" radius + short TTL?
- **OQ-4 — Group semantics.** Is the triad a genuine 3-way meetup, or "invite two, first to accept becomes the date"? Changes Stage 5 heavily.
