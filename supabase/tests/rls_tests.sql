-- Phase 2 RLS + trigger integration tests. Runs against the local Postgres +
-- auth shim. Any failed ASSERT raises -> psql exits non-zero -> test run fails.
-- All work happens in one transaction and is rolled back at the end.

begin;

-- ── seed (as superuser; RLS bypassed) ──────────────────────────────────────
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333');

insert into profiles (id, name, "into") values
  ('11111111-1111-1111-1111-111111111111', 'Alice', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'Bob',   '{leather}'),
  ('33333333-3333-3333-3333-333333333333', 'Cy',    '{}');

-- ── T1: mutual like -> match trigger ───────────────────────────────────────
do $$
begin
  insert into likes (liker_id, liked_id) values
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
  assert (select count(*) from matches) = 0, 'no match should exist after a one-way like';

  insert into likes (liker_id, liked_id) values
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');
  assert (select count(*) from matches
          where user_a = '11111111-1111-1111-1111-111111111111'
            and user_b = '22222222-2222-2222-2222-222222222222') = 1,
         'a mutual like must create exactly one ordered match';
  raise notice 'T1 mutual-like -> match: OK';
end $$;

-- ── T2: vouch -> reputation_scores + profiles.rep_score sync ────────────────
do $$
begin
  insert into vouches (voucher_id, vouchee_id) values
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
  assert (select score from reputation_scores
          where user_id = '22222222-2222-2222-2222-222222222222') = 10,
         'a vouch must set the reputation score to 10';
  assert (select rep_score from profiles
          where id = '22222222-2222-2222-2222-222222222222') = 10,
         'profiles.rep_score must sync from the vouch trigger';
  raise notice 'T2 vouch -> rep sync: OK';
end $$;

-- ── T3: profile_cards masks sensitive fields (fetishes) from non-owners ─────
do $$
declare into_seen text[];
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '11111111-1111-1111-1111-111111111111')::text, true);
  set local role authenticated;

  select "into" into into_seen from profile_cards
    where id = '22222222-2222-2222-2222-222222222222';
  assert into_seen = '{}'::text[], 'fetishes must be masked from a non-owner';

  perform set_config('request.jwt.claims',
    json_build_object('sub', '22222222-2222-2222-2222-222222222222')::text, true);
  select "into" into into_seen from profile_cards
    where id = '22222222-2222-2222-2222-222222222222';
  assert into_seen = '{leather}'::text[], 'the owner must see their own fetishes';

  reset role;
  raise notice 'T3 sensitive-field masking: OK';
end $$;

-- ── T4: consent_log is private to its owner ────────────────────────────────
do $$
declare cnt int;
begin
  insert into consent_log (user_id, kind) values
    ('22222222-2222-2222-2222-222222222222', 'eula');     -- as superuser
  perform set_config('request.jwt.claims',
    json_build_object('sub', '11111111-1111-1111-1111-111111111111')::text, true);
  set local role authenticated;
  select count(*) into cnt from consent_log
    where user_id = '22222222-2222-2222-2222-222222222222';
  assert cnt = 0, 'a user must not read another user''s consent rows (saw '||cnt||')';
  reset role;
  raise notice 'T4 consent_log privacy: OK';
end $$;

-- ── T5: profile deletion restricted to owner (account deletion path) ────────
do $$
declare deleted int;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', '11111111-1111-1111-1111-111111111111')::text, true);
  set local role authenticated;

  with d as (delete from profiles
             where id = '22222222-2222-2222-2222-222222222222' returning 1)
    select count(*) into deleted from d;
  assert deleted = 0, 'a user must not be able to delete another profile';

  with d as (delete from profiles
             where id = '11111111-1111-1111-1111-111111111111' returning 1)
    select count(*) into deleted from d;
  assert deleted = 1, 'a user must be able to delete their own profile';

  reset role;
  raise notice 'T5 profiles delete RLS: OK';
end $$;

-- ── T6: Stripe billing trigger flips profiles.premium (web rail) ───────────
do $$
begin
  insert into billing_subscriptions (id, user_id, source, status, current_period_end)
  values (
    'sub_test_bob',
    '22222222-2222-2222-2222-222222222222',
    'stripe',
    'active',
    now() + interval '30 days'
  );
  assert (select premium from profiles
          where id = '22222222-2222-2222-2222-222222222222') = true,
         'an active Stripe subscription must grant profiles.premium';

  update billing_subscriptions
     set status = 'canceled', current_period_end = now() - interval '1 day'
   where id = 'sub_test_bob';
  assert (select premium from profiles
          where id = '22222222-2222-2222-2222-222222222222') = false,
         'a canceled / expired subscription must revoke profiles.premium';
  raise notice 'T6 billing → premium sync: OK';
end $$;

rollback;
