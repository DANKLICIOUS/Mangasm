-- =============================================================================
-- 0010_apple_credentials.sql
-- Mangasm — App Store Guideline 5.1.1(v): revoke Sign in with Apple token on
-- account deletion.
--
-- Stores the Apple *refresh token* obtained by exchanging the sign-in
-- authorization code (see edge function `apple-register`). `delete-account`
-- reads this row and calls Apple's /auth/revoke endpoint before purging the
-- user, so the SIWA grant is torn down as required.
--
-- ADDITIVE ONLY. Idempotent. RLS enabled with NO policies = deny-all for
-- clients; rows are written and read exclusively by SECURITY DEFINER edge
-- functions using the service (secret) key.
-- =============================================================================

create table if not exists public.apple_credentials (
  user_id       uuid not null references auth.users(id) on delete cascade,
  refresh_token text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint apple_credentials_pkey primary key (user_id)
);

alter table public.apple_credentials enable row level security;
-- Deliberately NO policies: clients can never see or write Apple refresh
-- tokens. Only the Edge runtime (secret key / service role) touches this table.

revoke all on table public.apple_credentials from anon, authenticated;
