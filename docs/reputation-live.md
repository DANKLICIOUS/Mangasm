# Live Community Reputation + gated ProfileStyle themes

Client contract for `SupabaseReputationService`. Server remains the source of truth
for unlocks. This is **cosmetic only** — it does not change App Review Guideline 1.2
claims (block/report/delete), StoreKit IAP, or photo-gate math.

Build 38 (1.1.1) is already in TestFlight. This work is for a later build.

## Unlock map

| Tier (`reputation_scores.tier`) | Score | Unlocked styles |
| ------------------------------- | ----- | --------------- |
| `new` | &lt; 40 | `calmStudio` |
| `building` | 40+ | + `aspirational` |
| `reliable` | 65+ | + `precisionTech`, `digitalFlow` |
| `verified` | 85+ | + `boldExpression` (all five) |

## Intended backend contract

Sibling repo `DANKLICIOUS/mangasm-backend` owns schema. Expected surface:

```
reputation_scores
  user_id uuid PK
  score int            -- 0…100
  tier text            -- new | building | reliable | verified
  photo_gate int       -- min viewer score to see photos (default 50)
  selected_style_id    -- calmStudio | aspirational | precisionTech | digitalFlow | boldExpression
  vouch_count int
  updated_at timestamptz

RPC set_selected_style(p_style_id text)
  -- auth.uid() only; reject locked styles (raise style_locked)
  -- writes selected_style_id; may return { selected_style_id, score, unlocked }

Edge recalculate-score
  -- server-only score writes; client never writes score
```

If `selected_style_id` / the RPC are not deployed yet, the iOS client:

1. Tries `set_selected_style`
2. Falls back to `UPDATE reputation_scores.selected_style_id`
3. Then `profiles.selected_style_id` / `profiles.preferred_style`
4. Then **local-only** persist (UserDefaults via `ProfileStyleStore`)

Missing-schema errors (`PGRST202/204/205`, `42703`, `42883`, `42P01`) are probed once per session.

## Smoke test (live Supabase)

Requires a signed-in member and Info.plist `SUPABASE_URL` + publishable key (never commit secrets).

1. Sign in. Confirm Settings → Profile styles shows **Score N · {New\|Building\|Reliable\|Verified}**.
2. Locked cells show a lock + “Unlocks at {tier} · {score}+” and are not tappable.
3. Tap an unlocked style. Profile + TopBar badge/theme update immediately.
4. Force-quit and relaunch: selected style still applied (UserDefaults + server when deployed).
5. With RPC deployed: pick a style you have not unlocked (or lower `score` in SQL as a service role). Client should show the rejection message and revert.
6. Photos on Profile still use `canViewPhotos(viewerScore, photo_gate)` — style choice must not reveal photos.

SQL checks (dashboard / `supabase db query`):

```sql
select user_id, score, tier, photo_gate, selected_style_id
from reputation_scores
where user_id = auth.uid();  -- or paste the member uuid
```

After a successful picker tap (when the column exists):

```sql
select selected_style_id from reputation_scores where user_id = '<member-uuid>';
```

## Mocks

Previews, tests, and DEBUG builds without `SupabaseConfig` keep `MockReputationService`.
Release archives still `fatalError` if config is missing (blocker B3).
