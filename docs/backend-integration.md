# Mangasm — Backend Integration Plan (mock → real)

The app talks only to the protocols in `Sources/MangasmApp/Services/Protocols.swift`.
Going live = providing real implementations of those protocols and injecting a
`AppEnvironment.live` instead of `.mock`. **No view code changes.**

## Status / authorization gate

- Schema authored at `supabase/migrations/0001_mangasm_init.sql` — **NOT applied.**
- A Supabase project is connected to this workspace
  (`https://hcpzbxplnkyythzwkovy.supabase.co`), but it looks like a real/shared
  project. **Applying migrations or wiring keys to it requires the owner's
  explicit go-ahead** (which project, prod vs. a fresh dev project). Do not point
  DDL at production on inferred intent.

## Protocol → backend mapping

| Protocol | Supabase backing |
|---|---|
| `AuthService.enter()` | Sign in with Apple / Google / phone-OTP via Supabase Auth (`supabase.auth`). Replace the stub buttons with real provider flows. |
| `ProfileService.current()/update(_:)` | `profiles` table (RLS: owner-write, authed-read). `visibility` jsonb column. |
| `MatchService.featured()/nearby()/refresh()` | `profiles` + `likes`; mutual like → `matches` (trigger). Nearby via PostGIS or a simple distance RPC. |
| `ChatService.conversations()/messages(for:)/send(_:to:)/conversation(for:)` | `conversations` + `messages` (RLS: participants only). Realtime subscribe for live messages + unread. |
| `EventService.events()/communities()/rsvp(_:)` | `events`, `event_rsvps`, `communities`, `community_members`. Approval flow honored via `event_privacy` + `rsvp_status`. |
| `ReputationService.score(for:)/canViewPhotos(viewerScore:targetGate:)` / `selectStyle` | Live: `SupabaseReputationService` reads `reputation_scores` (`score`, `tier`, `photo_gate`, `selected_style_id`). Style persist via RPC `set_selected_style` with column fallbacks. Unlock map: new &lt;40, building 40+, reliable 65+, verified 85+. See `docs/reputation-live.md`. Photo gate remains score vs `photo_gate` (not style). |
| Premium (M+) | **StoreKit 2 / In-App Purchase** for the in-app subscription — Apple Guideline 3.1.1 **prohibits Stripe for digital subscriptions sold in the iOS app**. Verify the StoreKit transaction in a Supabase Edge Function (App Store Server Notifications v2 → set `profiles.premium`). Stripe is only valid for out-of-app/web purchases. Gates extended bio (600), fetishes visibility, event hosting. |
| Account deletion | `AuthService.deleteAccount()` (implemented; mandatory per Guideline 5.1.1(v)) → Edge Function deletes the auth user + cascades all rows (FKs are `on delete cascade`). |
| Block / report | `SafetyService.block/report` (implemented) → `blocks(blocker_id, blocked_id)` + `reports(reporter_id, target_id, reason, created_at)` tables (add in migration 0002); blocked users filtered from match/nearby/chat via RLS + query predicates. |

## Dev project & how to apply the schema

- **Dev project:** `pwmddvigardiyhqtihdw` — `https://pwmddvigardiyhqtihdw.supabase.co`
- Client config (URL + publishable key) is in **`supabase/.env.local`** (git-ignored). The app reads it via `SupabaseConfig` (Info.plist injection); the publishable key is never committed.
- Migrations `0001` + `0002` are NOT applied yet. Applying needs an **access token** (interactive `supabase login`) + the **DB password** — secrets I can't enter. Run it yourself in a terminal:

```bash
cd <repo root>
supabase login                                   # paste your access token (interactive)
supabase link --project-ref pwmddvigardiyhqtihdw # enter the DB password when prompted
supabase db push                                 # applies 0001 then 0002 in order
# 0002 already ends with: notify pgrst, 'reload schema';
```
Then confirm the 14 tables exist (dashboard → Table editor, or `supabase db dump --schema public`).
Alternatively: paste `supabase/migrations/0001_*.sql` then `0002_*.sql` into the dashboard SQL editor and run in order.

> If you'd rather I apply it: set `SUPABASE_ACCESS_TOKEN` in the env AND repoint the
> Supabase MCP at `pwmddvigardiyhqtihdw` (or provide a connection that doesn't require
> me to type the DB password), and I'll run `db push` + verify every table.

## Steps to go live (when authorized)

1. Pick/confirm the target Supabase project (prefer a fresh dev project first).
2. Apply `0001_mangasm_init.sql` (Supabase CLI `db push`, or MCP `apply_migration`).
3. Add the `supabase-swift` SDK to `Package.swift`; create `Sources/MangasmApp/Services/Live/`
   with `SupabaseAuthService`, `SupabaseProfileService`, … conforming to the existing protocols.
4. Add `AppEnvironment.live(client:)`; inject it in `MangasmRootView` behind a build flag
   (keep `.mock` for previews/tests).
5. Storage: private `photos` bucket + signed URLs gated by reputation.
6. Stripe: Edge Function for checkout + webhook → `profiles.premium`.
7. Realtime: subscribe to `messages` for the active conversation; recompute unread.

## Authentication (privacy-first)

- **Sign in with Apple is mandatory** if Google/phone are offered (Guideline 4.8) — and it's the most private (Hide My Email). Wire all three via Supabase Auth: Apple (ASAuthorization → Supabase `signInWithIdToken`), Google, and phone-OTP.
- Minimise PII: no real name required; email can be Apple's private relay. Age assurance (18+) at signup, stored as a verified boolean — never a birthdate in plaintext beyond what's needed.
- Sessions: Supabase JWT in the Keychain; refresh silently; `deleteAccount()` revokes + cascades.

## Privacy — number one

- **Precise location never leaves the device raw.** Show "privacy zones" (neighbourhood-level), compute distance server-side via a coarse geohash RPC; never store exact lat/long for display.
- Sexual orientation and fetishes = **sensitive data**: per-field `visibility` flags (already in `profiles.visibility`), RLS-enforced, never in logs/analytics, declared in the Privacy Nutrition Label + `PrivacyInfo.xcprivacy`. (HIV status was **removed from the app entirely** on 2026-06-22 — no health data is collected or stored.)
- Photos in a **private** Storage bucket; access via short-lived signed URLs gated by reputation. No public CDN URLs.
- Reputation-gated visibility everywhere; block/report fully removes a user from your surface.

## Encrypted communication (E2E)

- **Transport + at-rest**: TLS everywhere; Postgres at-rest encryption (Supabase default).
- **True end-to-end** for DMs (the "END-TO-END ENCRYPTED" banner must be real, not cosmetic): per-device X25519 keypair (private key in the Secure Enclave/Keychain, never uploaded); publish public keys to a `device_keys` table; encrypt each message body client-side (libsodium `crypto_box`/sealed-box) so the server stores only ciphertext in `messages.body`. Add a key-verification (safety-number) UI later. Until E2E ships, label the banner honestly ("encrypted in transit").
- Push notifications carry no message content (only "New message").

## Global connectivity — "Starlink"

- The Starlink/"where the signal shouldn't reach" theme = **works anywhere**: offline-first cache (the app already runs fully on mock/local data), optimistic sends with a queue that flushes on reconnect, and Supabase Realtime for live delivery when online.
- Surface a global-availability/"Starlink" status indicator in the TopBar (the design already reserves a Starlink pill); drive it from real reachability later.
- No region lock: cities (Dubai/London/Mykonos/Tokyo) are content, not gates — members travel.

## Safety (non-negotiable, already reflected in schema)

- Event hosting records `consent_ack`; approval-required events gate location reveal.
- Messages/conversations are participant-only (RLS). Photos are reputation-gated.
- Account deletion + block/report implemented in-app (mock now, Supabase-backed at go-live).
- All writes scoped to `auth.uid()`.

## App Store gate (see docs/production-readiness.md)

- Use **StoreKit** (not Stripe) for M+; rename the event taxonomy to avoid Guideline 1.1.4; ship moderation + block/report (done) + account deletion (done) before submission.
