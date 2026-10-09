# Live Community Reputation + gated ProfileStyle themes

Client contract for `SupabaseReputationService`. **Server is the source of truth
for unlocks.** Cosmetic only — does not change App Review Guideline 1.2 claims,
StoreKit IAP, or photo-gate math.

Build 38 (1.1.1) is already in TestFlight. This work is for a later build.

Canonical backend doc: [`DANKLICIOUS/mangasm-backend` `docs/PROFILE_STYLE.md`](https://github.com/DANKLICIOUS/mangasm-backend/blob/cursor/reputation-gated-profile-style-b83a/docs/PROFILE_STYLE.md)
(draft PR [#10](https://github.com/DANKLICIOUS/mangasm-backend/pull/10)).

## Dual-tree hazard

Canonical migrations live in **`DANKLICIOUS/mangasm-backend`**
(`0009_profile_style.sql` and earlier). This iOS repo has a **divergent**
`supabase/migrations/` tree (`0001_mangasm_init.sql`, denormalized
`profiles.rep_score`, different RLS). Those files are not a copy of the backend.

**Do not `supabase db push` this repo’s `supabase/` tree onto the same project
as mangasm-backend.** Point `supabase link` / `db push` at the backend repo only.

## Round-trip + persist

| Direction | Surface |
| --------- | ------- |
| Read | RPC `my_profile_style()` → `score`, `tier`, `unlocked_style_ids[]`, `selected_style_id` |
| Write | `UPDATE profiles.selected_style_id` (enum, default `calmStudio`) |
| Score cache | `reputation_scores` is **read-only** from the client (`recalculate-score` writes it) |

```swift
let row: MyProfileStyle = try await client.rpc("my_profile_style").single().execute().value

try await client
    .from("profiles")
    .update(["selected_style_id": styleId.rawValue])
    .eq("id", value: session.user.id.uuidString)
    .execute()
```

When the RPC is present, treat `unlocked_style_ids` as canonical. Do not recompute
write-time unlocks from the old local 0 / 21 / 41 / 61 / 81 catalog. Local
`ProfileStyleCatalog` minScores (0 / 40 / 65 / 65 / 85) are UX hints + offline
fallback only.

Illegal updates raise `check_violation` (`23514`) / RLS. A later demotion does
**not** clear `selected_style_id` — the member keeps the look they already
picked and cannot switch to a newly locked style.

If the RPC or column is not deployed yet, the client falls back to a read of
`reputation_scores` (score/tier/`photo_gate`) plus local UserDefaults.

## Unlock map (`recalculate-score` tiers)

| Tier | Score | Unlocked styles |
| ---- | ----- | --------------- |
| `new` | &lt; 40 | `calmStudio` |
| `building` | 40+ | + `aspirational` |
| `reliable` | 65+ | + `precisionTech`, `digitalFlow` |
| `verified` | 85+ | + `boldExpression` (all five) |

IDs must match Swift `ProfileStyleId` raw values (not RN aliases).

## Smoke test (live Supabase)

Requires a signed-in member and Info.plist `SUPABASE_URL` + publishable key
(never commit secrets). Backend `0009` must be applied **from mangasm-backend**.

1. Sign in. Settings → Profile styles shows **Score N · {New\|Building\|Reliable\|Verified}**.
2. Locked cells show a lock + “Unlocks at {tier} · {score}+” and are not tappable.
3. Tap an unlocked style. Profile + TopBar update. Relaunch keeps the pick.
4. As service role, set `reputation_scores.score/tier` to `new` after picking
   `boldExpression`. Relaunch: theme stays Bold Expression; Aspirational stays locked.
5. `update profiles set selected_style_id = 'boldExpression'` while still `new`
   must fail (`check_violation`); picker shows the rejection and reverts.
6. Photos still use `canViewPhotos(viewerScore, photo_gate)` — style does not reveal photos.

```sql
select * from public.my_profile_style();  -- JWT required
select selected_style_id from profiles where id = '<member-uuid>';
```

## Mocks

Previews, tests, and DEBUG builds without `SupabaseConfig` keep `MockReputationService`.
Release archives still `fatalError` if config is missing (blocker B3).
