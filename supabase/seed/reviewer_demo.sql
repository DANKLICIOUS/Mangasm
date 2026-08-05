-- =============================================================================
-- reviewer_demo.sql — App Review Information demo-account seed
--
-- Provisions the "Opal" reviewer demo account with everything App Review needs
-- to exercise the app: a high reputation score (so photos + gated content are
-- visible), one event of each hosted type (Circle / Open Door / Social Mixer),
-- an already-APPROVED (confirmed) RSVP so an approval-gated exact address is
-- shown, and unlocked/visible photos.
--
-- PARAMETERIZED — no credentials are committed. Provide the target auth user id:
--
--   psql "$DATABASE_URL" \
--     -v reviewer_id="00000000-0000-0000-0000-000000000000" \
--     -f supabase/seed/reviewer_demo.sql
--
-- Idempotent: safe to re-run (upserts + delete-then-insert of seeded rows).
--
-- ── MANUAL STEPS THAT REMAIN (do these first; never commit real values) ──────
--   1. In Supabase Studio → Authentication → Users, create the reviewer Auth
--      user (email + password). Copy its UUID.
--   2. Run this script with -v reviewer_id=<that UUID>.
--   3. In App Store Connect → App Review Information, enter the same email +
--      password so the reviewer can sign in. Credentials live ONLY there.
-- =============================================================================

\set ON_ERROR_STOP on

-- Fail early with a clear message if the id wasn't supplied.
\if :{?reviewer_id}
\else
  \echo '>>> ERROR: pass -v reviewer_id=<auth user uuid>'
  \quit
\endif

begin;

-- ---------- 1. Reviewer profile: high rep, photos visible ----------
-- profiles.id FK → auth.users(id); the row usually already exists (created by
-- the handle_new_user trigger on signup). Upsert so this works either way.
insert into public.profiles (id, name, age, location, headline, bio, rep_score,
                             avatar_url, photos, premium, visibility)
values (
  :'reviewer_id'::uuid,
  'Opal',
  29,
  'San Francisco, CA',
  'App Review demo account',
  'Seeded reviewer profile with full access for App Review.',
  80,
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop',
  array[
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=600&fit=crop',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=600&fit=crop'
  ],
  true,
  '{"headline": true, "hobbies": true, "position": true, "into": true,
    "socials": true, "instagram": true, "x": true, "anthem": true,
    "photos": true}'::jsonb
)
on conflict (id) do update set
  rep_score  = excluded.rep_score,
  photos     = excluded.photos,
  avatar_url = excluded.avatar_url,
  premium    = excluded.premium,
  visibility = excluded.visibility;

-- ---------- 2. One event of each hosted type ----------
-- Deterministic UUIDs so re-running replaces (not duplicates) the seed events.
-- Circle + Social Mixer are approval-gated (exact address on approval);
-- Open Door is open.
delete from public.events where id in (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000003'
);

insert into public.events
  (id, host_id, type, title, description, when_text, place, area, capacity, privacy, consent_ack)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', :'reviewer_id'::uuid, 'circle',
   'Inner Circle Tasting', 'Intimate wine + conversation circle for vouched members.',
   'Fri 8:00 PM', 'The Vault · 214 Bush St', 'Financial District', 8, 'approval', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', :'reviewer_id'::uuid, 'open_door',
   'Open Door Rooftop Social', 'Drop-in rooftop mixer — all welcome.',
   'Sat 6:30 PM', 'Sky Terrace · 55 Mission St', 'SoMa', 40, 'open', true),
  ('aaaaaaaa-0000-0000-0000-000000000003', :'reviewer_id'::uuid, 'social_mixer',
   'Cosplay & Cocktails Mixer', 'Themed social mixer with approval entry.',
   'Sun 7:00 PM', 'Neon Lounge · 900 Folsom St', 'SoMa', 25, 'approval', true);

-- ---------- 3. An already-APPROVED RSVP (exact address visible) ----------
-- 'confirmed' is the approved RSVP state — it unlocks the exact address for an
-- approval-gated event. The reviewer is RSVP'd to their own Inner Circle event.
delete from public.event_rsvps
  where user_id = :'reviewer_id'::uuid
    and event_id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.event_rsvps (event_id, user_id, status)
values ('aaaaaaaa-0000-0000-0000-000000000001', :'reviewer_id'::uuid, 'confirmed');

commit;

\echo '>>> reviewer_demo seed complete for' :'reviewer_id'
