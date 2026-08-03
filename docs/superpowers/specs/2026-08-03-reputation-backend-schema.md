# Backend schema — Community Reputation + preferred theme

**Cosmetic only.** Never gate messaging or adult content on these columns.

## Postgres (Supabase)

```sql
-- Additive; run when live reputation lands.
alter table public.profiles
  add column if not exists rep_score integer not null default 0
    check (rep_score >= 0 and rep_score <= 100);

alter table public.profiles
  add column if not exists preferred_style text
    check (
      preferred_style is null
      or preferred_style in (
        'calmStudio', 'aspirational', 'precisionTech', 'digitalFlow', 'boldExpression'
      )
    );

-- Optional audit of safe reputation events (no sexual / match metrics)
create table if not exists public.reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'verification_complete',
    'positive_rating_received',
    'helpful_report',
    'safety_module_complete',
    'clean_tenure_bonus'
  )),
  delta integer not null check (delta between -20 and 20),
  created_at timestamptz not null default now()
);

create index if not exists reputation_events_user_id_idx
  on public.reputation_events (user_id);
```

## RLS sketch

- Users read own `rep_score` / `preferred_style`.
- Users update `preferred_style` only if unlocked client-side (server should re-validate min score).
- `reputation_events` insert via service role / edge function only.

## Edge function (later)

`adjust-reputation` accepts only allowlisted `kind` values; rejects anything resembling match_count or message_volume.

## Cross-platform IDs

| Swift / Android | RN ThemeId |
| --------------- | ---------- |
| calmStudio      | bobRoss    |
| aspirational    | lambo      |
| precisionTech   | cyborg     |
| digitalFlow     | matrix     |
| boldExpression  | gothGlam   |
