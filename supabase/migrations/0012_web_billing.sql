-- =============================================================================
-- 0012_web_billing.sql
-- Mangasm+ web Stripe rail (separate from iOS StoreKit / IAP).
--
-- Ported from mangasm-backend 0007_billing.sql, but this repo's entitlement
-- column is profiles.premium (boolean) — NOT profiles.membership. The iOS app
-- and verify-purchase already read/write premium; the webhook trigger must
-- match that contract so a web purchase unlocks the same M+ gates.
--
-- Idempotent: safe if mangasm-backend 0007 already created these tables.
-- =============================================================================

create table if not exists public.billing_customers (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at         timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  id                   text primary key,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  source               text not null default 'stripe' check (source in ('stripe','apple')),
  status               text not null,
  price_id             text,
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id);

-- Membership follows any live subscription. Grace: past_due keeps access until
-- the paid-through date so a failed-card retry doesn't yank M+ mid-cycle.
create or replace function public.sync_premium_from_billing(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  has_active boolean;
begin
  select exists (
    select 1 from public.billing_subscriptions
    where user_id = uid
      and status in ('active','trialing','past_due')
      and (current_period_end is null or current_period_end > now())
  ) into has_active;

  update public.profiles
     set premium = has_active
   where id = uid
     and premium is distinct from has_active;
end;
$$;

create or replace function public.tg_billing_subscriptions_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_premium_from_billing(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists billing_subscriptions_sync on public.billing_subscriptions;
create trigger billing_subscriptions_sync
  after insert or update or delete on public.billing_subscriptions
  for each row execute function public.tg_billing_subscriptions_sync();

create or replace function public.tg_billing_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists billing_subscriptions_touch on public.billing_subscriptions;
create trigger billing_subscriptions_touch
  before update on public.billing_subscriptions
  for each row execute function public.tg_billing_touch_updated_at();

alter table public.billing_customers     enable row level security;
alter table public.billing_subscriptions enable row level security;

drop policy if exists "own billing customer" on public.billing_customers;
create policy "own billing customer" on public.billing_customers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own subscriptions" on public.billing_subscriptions;
create policy "own subscriptions" on public.billing_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Data API: expose to authenticated (RLS-filtered); never to anon.
-- Writes are service-role only (edge functions); no insert/update/delete policies.
revoke all on table public.billing_customers     from public, anon;
revoke all on table public.billing_subscriptions from public, anon;
grant select on table public.billing_customers     to authenticated;
grant select on table public.billing_subscriptions to authenticated;

revoke all on function public.sync_premium_from_billing(uuid) from public, anon, authenticated;

comment on table public.billing_subscriptions is
  'Provider-agnostic subscription state (Stripe web). Written only by edge functions with the service-role key; profiles.premium syncs via trigger. iOS StoreKit remains a separate door (verify-purchase).';

notify pgrst, 'reload schema';
