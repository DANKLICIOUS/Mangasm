# Event AI Matching + RSVP — Contracts (from real gaps)

**Date:** 2026-09-07  
**Author:** Mangasm Builder  
**Sources of truth audited:**
- `gothamgodzilla/Mangasm` / `DANKLICIOUS/Mangasm` @ `ed0622b` (same Match/Events tree)
- `DANKLICIOUS/mangasm-backend` migrations `0001`, `0005`
- Specs: `docs/superpowers/specs/2026-07-24-datenight-discovery-design.md`, `docs/backend-integration.md`, `SPEC_INDEX.md`
- Live: `www.mangasm.app/events` (Ticketmaster Worker nights page)

**Rule:** Anything not proven in code/schema is marked **NEW**. Do not pretend existing types already mean 3–5 guest Event AI Matching.

---

## 0. Reality check (what exists today)

| Surface | What it is | Party / group size | Live? |
|---|---|---|---|
| `MatchService` / `Candidate` / `match_results` | **1:1** candidate discovery + score | 1 featured + nearby list | Live Supabase read |
| `DateNightService` / Ticketmaster + Yelp | Place discovery for a first date | **Hard-coded `partySize = 2`** | Live when API keys present |
| `EventService` / `EventItem` / `event_rsvps` | Hosted community events + RSVP | Capacity digit field (default 12); **no guest matching** | **Mock only** in DI |
| `www.mangasm.app/events` | Ticketmaster Discovery via Worker; scores **nights**, not guests | N/A | Live page (Worker); not guest pairing |

**Product goal (Matryx / bot charter):** Event AI Matching pairs **3–5 matched guests** for Ticketmaster-style events + **RSVP/concierge** for **NYC, SF, Miami** first.

→ That product surface is **not implemented**. These contracts define it as a new layer that **reuses** existing pieces where honest.

---

## 1. Dual-schema hazard (must resolve before DDL)

Two incompatible trees claim “events / RSVP / match”:

### A. App tree — `Mangasm/supabase/migrations/0001_mangasm_init.sql` (+ `0002`)
- `event_type`: `open_door | social_mixer | circle | cosplay`
- `rsvp_status`: `none | requested | confirmed | declined`
- `event_privacy`: `approval | open` (Swift UI says `"public"` — already drifted)
- `match_results`: `user_id`, `candidate_id`, score, astro/num/chinese notes
- Swift `EventService.rsvp(_ eventID:)` is fire-and-forget; no live writer

### B. Backend tree — `mangasm-backend/supabase/migrations/0001_initial_schema.sql` + `0005_matchmaking.sql`
- `event_type`: `social | drag | open_mic | naked_yoga | leather | cum_and_go | wellness | custom`
- `rsvp_status`: `going | maybe | declined`
- `events`: PostGIS `location`, `starts_at`/`ends_at`, `capacity`, `visibility`
- `match_results`: `matched_user_id`, `ai_insight`, `reasons[]`, `action` (`pending|liked|passed|messaged`), `match_date`
- Plus `match_vectors` (pgvector 128), `match_preferences` weights

`SPEC_INDEX.md` already: sibling `mangasm-backend` migration lineage **conflicts**; nothing from that repo gets applied blindly.

**Contract decision (proposed):**  
- **Canonical live DB** remains `dvomzrvslwdabwcwtvrg` (per SPEC_INDEX).  
- Event AI Matching migrations land **only** after a live-schema diff against `dvomz…`.  
- New tables for group matching use names that do **not** collide with either tree’s `events` / `event_rsvps` / `match_results` until those are reconciled. Prefer prefix `eam_` (Event AI Matching) for the new surface.

---

## 2. Existing contracts we keep (do not redefine)

### 2.1 One-to-one Match (keep)
```
MatchService
  featured() -> Candidate
  nearby() -> [Candidate]
  refresh()
  loadFromServer(viewerHobbies: [String]) async throws
```
`Candidate`: single person; `matchPct` 0–100; optional `geoCoordinate`.

### 2.2 DateNight party-of-2 (keep; out of scope for EAM)
```
DateNightQuery.partySize = 2   // immutable for this product
DateNightService.discover(DateNightQuery) -> [DateNightPlace]
```
Spec: dual ≤10 mi; Ticketmaster/Yelp deep-link only; **explicitly out of scope** for hosted `EventService`.

### 2.3 Hosted Event RSVP (intended SQL vs mock client)
**Intended (app SQL):** `event_rsvps(event_id, user_id, status rsvp_status)` with approval flow.  
**Client today:** `EventService.rsvp(eventID)` mock bump `going`; `AppEnvironment.makeDefault()` hardcodes `MockEventService()`.  
**Gap:** ship `LiveEventService` separately — **not** the same as Event AI Matching.

---

## 3. NEW product contracts — Event AI Matching (EAM)

### 3.1 Definitions

| Term | Meaning |
|---|---|
| **Catalog Event** | A Ticketmaster-sourced (or Worker-normalized) show/night. Inventory is external; Mangasm does not invent showtimes. |
| **Match Group** | A set of **3–5** consented guests (plus optional host later) scored to attend one Catalog Event together. |
| **RSVP** | Per-guest commitment to a Match Group’s Catalog Event (`invited` → `accepted` / `declined` / `expired`). |
| **Concierge** | Ops/runbook layer: confirmations, night-of checklist, substitutions — owned by Mangasm Operator after Builder ships data contracts. |
| **Launch cities** | NYC, San Francisco, Miami only until Matryx expands. |

### 3.2 Size & city invariants (non-negotiable)

1. `MatchGroup.memberCount` ∈ **{3, 4, 5}** at lock time.  
2. Soft-forming groups may be 2 while filling; **cannot lock / ticket** until ≥3 and ≤5.  
3. Every member’s city market ∈ `{nyc, sf, miami}` for v1 (explicit market tag, not Dubai sample content).  
4. No HIV/health fields (Decision D).  
5. Blocks: any bidirectional block between two members → cannot share a Match Group.  
6. Age gate 18+ already exists; EAM inherits it.

### 3.3 Proposed types (NEW — not in repo today)

```
Market = nyc | sf | miami

CatalogEvent
  id: String                 // mangasm id
  provider: "ticketmaster"
  providerEventId: String
  title, venueName, market: Market
  startsAt: Date
  timezone: String
  ticketUrl: URL             // deep-link only (reuse DateNight rule)
  imageUrl: URL?
  raw: JSON?                 // opaque Worker payload

MatchGroupStatus
  = forming | locked | rsvp_open | confirmed | cancelled | completed

MatchGroup
  id: String
  catalogEventId: String
  market: Market
  status: MatchGroupStatus
  targetSize: Int            // 3...5
  memberIds: [String]        // length 0...5 while forming; 3...5 when locked
  score: Int                 // 0...100 group compatibility
  reasons: [String]          // human-readable why
  createdAt, lockedAt?: Date

GroupMemberRole = guest | host_concierge
GroupMemberStatus = invited | accepted | declined | left | removed

MatchGroupMember
  groupId, userId
  role: GroupMemberRole
  status: GroupMemberStatus
  individualScore: Int?      // pairwise/group contribution
  respondedAt?: Date

RSVPStatus = invited | accepted | declined | expired | waitlisted

EventRSVP  // EAM RSVP — distinct from hosted event_rsvps until merged
  groupId, userId
  catalogEventId
  status: RSVPStatus
  updatedAt: Date
```

### 3.4 Service protocols (NEW)

```
protocol CatalogEventService {
  func search(market: Market, vibe: String?, from: Date, to: Date) async throws -> [CatalogEvent]
  func get(_ id: String) async throws -> CatalogEvent
}

protocol EventAIMatchingService {
  /// Propose groups of targetSize 3...5 for a catalog event (or propose event+group).
  func propose(for userId: String, market: Market, targetSize: Int) async throws -> [MatchGroupDraft]
  func lock(_ groupId: String) async throws -> MatchGroup   // requires 3...5 accepted intents
  func cancel(_ groupId: String, reason: String) async throws
}

protocol GroupRSVPService {
  func invite(_ groupId: String, userIds: [String]) async throws
  func respond(groupId: String, status: RSVPStatus) async throws -> MatchGroup
  func list(for userId: String) async throws -> [EventRSVP]
}
```

`MatchGroupDraft` = unscored/unlocked proposal (event + candidate member set + reasons).

### 3.5 Worker / web alignment

Live `/events` page: “Match % and why are Worker fields. This page does **not** score nights” vs copy that scores nights — treat Worker as **CatalogEvent + night score** only.

**Contract:**  
- Worker outputs `CatalogEvent` (+ optional night score).  
- **Guest grouping** happens in Mangasm backend (`EventAIMatchingService`), not in the Ticketmaster key holder.  
- Ticketmaster API key stays on Worker/server — never in new client surfaces (DateNight already embeds keys in Info.plist for v1; EAM must **not** repeat that for group flows — proxy via Worker).

### 3.6 Suggested SQL sketch (NEW tables; apply only after live diff)

```sql
-- illustrative; names deliberately eam_* to avoid colliding with events/event_rsvps/match_results
create type eam_market as enum ('nyc', 'sf', 'miami');
create type eam_group_status as enum (
  'forming', 'locked', 'rsvp_open', 'confirmed', 'cancelled', 'completed'
);
create type eam_rsvp_status as enum (
  'invited', 'accepted', 'declined', 'expired', 'waitlisted'
);

create table eam_catalog_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'ticketmaster'),
  provider_event_id text not null,
  title text not null,
  venue_name text,
  market eam_market not null,
  starts_at timestamptz not null,
  ticket_url text not null,
  payload jsonb not null default '{}',
  unique (provider, provider_event_id)
);

create table eam_match_groups (
  id uuid primary key default gen_random_uuid(),
  catalog_event_id uuid not null references eam_catalog_events(id),
  market eam_market not null,
  status eam_group_status not null default 'forming',
  target_size int not null check (target_size between 3 and 5),
  score int check (score between 0 and 100),
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  locked_at timestamptz
);

create table eam_match_group_members (
  group_id uuid references eam_match_groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status eam_rsvp_status not null default 'invited',
  individual_score int,
  responded_at timestamptz,
  primary key (group_id, user_id)
);

-- lock invariant enforced in RPC: count(accepted) between 3 and 5, no blocks, same market
```

Reuse existing **1:1** `match_results` / vectors as **inputs** to group scoring — do not overload `match_results` rows to mean groups.

### 3.7 Scoring inputs (honest reuse)

Allowed inputs already in system:
- `match_results.score` / `Candidate.matchPct` (pairwise)
- `match_preferences` weights (backend tree) — if present on live
- Shared hobbies / tags on profiles
- Dual-proximity style geo (extend from party-of-2 → all members within market + mutual radius TBD; **default proposal:** all members ≤15 mi of venue; pairwise ≤20 mi)

**Not allowed:** inventing shows; using HIV/health; match_count / message_volume as reputation (CONTEXT.md).

### 3.8 Concierge handoff (Builder → Operator)

When `MatchGroup.status = confirmed`:
- Emit stable payload for Mangasm Operator: group id, catalog event, member contacts (per privacy), RSVP matrix, ticket deep-link.  
- Builder does **not** run live event ops.

---

## 4. Gap list → ship order

| # | Gap | Depends on | Owner lane |
|---|---|---|---|
| G1 | No 3–5 group model/types/protocols | — | Builder (this spec) |
| G2 | No `eam_*` tables / lock RPC on live `dvomz…` | Live schema diff; Supabase auth | Builder |
| G3 | `/events` Worker scores nights, not guests | G1–G2 | Builder + Worker |
| G4 | `EventService` still mock; hosted RSVP ≠ EAM RSVP | Separate | Builder (later) / App Store Boss for iOS DI |
| G5 | DateNight `partySize=2` must stay; don’t stretch it to 3–5 | — | Keep silo |
| G6 | Dual migration trees (`Mangasm/supabase` vs `mangasm-backend`) | Matryx decision: which DDL lineage | Builder + Matryx |
| G7 | City markets not gated (Dubai samples / Miami fixtures) | G1 market enum | Builder |
| G8 | Stripe `/plus` + waitlist 404 | Unrelated to EAM; parallel | Builder later |
| G9 | Concierge runbooks | G1–G3 confirmed groups | Mangasm Operator |

**Recommended build sequence:**  
1. Land this contract in-repo (`docs/superpowers/specs/…`) via CloudAgent PR.  
2. Live-schema diff + Matryx pick on DDL lineage (G6).  
3. Implement `eam_*` + `EventAIMatchingService` (server-first).  
4. Wire web `/events` → propose groups (NYC/SF/Miami).  
5. iOS: new EAM UI; leave DateNight + mock hosted Events untouched until G4.  
6. Hand confirmed-group payload shape to Operator + App Store Boss for release notes when iOS ships.

---

## 5. Explicit non-goals (v1)

- Stretching `DateNightQuery.partySize` from 2 → 3–5  
- Using hosted `EventItem` / mock `EventService` as the Ticketmaster group product  
- Applying `mangasm-backend` migrations onto live without diff  
- Expanding cities past NYC/SF/Miami  
- Builder running night-of ops  
- Inventing Ticketmaster inventory

---

## 6. Decisions status

Section 6 open questions were decided by Builder defaults on 2026-09-07 when Matryx skipped the decision widget — see §7.

---

*End of contract pack. Prove next work against these names — or amend this doc in the same PR.*

---

## 7. Decisions baked 2026-09-07 (Matryx skipped widget — Builder defaults)

| Decision | Choice |
|---|---|
| DDL lineage | Evolve `Mangasm/supabase/*` against live `dvomzrvslwdabwcwtvrg`. Do **not** apply `mangasm-backend` migrations without live-schema diff. |
| Group composition | v1 **guests-only**; host/concierge seat is **outside** `targetSize` (3–5). |
| Fill strategy | **Auto-lock at 3**; allow fill to 5 before event start. |
| UI surface | **Web-first** on `/events` (Worker catalog → EAM propose). iOS later. |

## 8. Live Worker (catalog only — not guest matching)

- Base: `https://coexist-ganesh-mangasm.gothamgodzilla.workers.dev`
- Catalog: `GET /events?zip=&radius=25&keyword=&mood=`
- Response fields used as `CatalogEvent` inputs: `id`, `name`, `url`, `image`, `localDate`, `localTime`, `venue`, `venueCity`, `venueZip`, `distanceMiles`, `classifications`, plus night `matchPct`/`why` (night score ≠ guest group score).
- Worker source **not** in `gothamgodzilla` / `DANKLICIOUS` GitHub search as of 2026-09-07.
- `/events` page does **not** call Supabase.

## 9. Related branch (do not confuse with EAM 3–5)

`feat/group-datenight` designs `group_dates` / `group_date_participants` / `group_date_invitations` — triad (viewer + two matches, party ≈ 3), migration `0010_group_datenight.sql` **not present**. EAM contracts above supersede stretching DateNight; if that branch lands, reconcile naming with `eam_*` rather than shipping two group products.
