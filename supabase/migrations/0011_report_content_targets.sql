-- =============================================================================
-- 0011_report_content_targets.sql
-- Mangasm — App Store Guideline 1.2: extend the `reports` table (the table the
-- iOS SafetyService actually writes to) so a report can target something other
-- than a whole profile — specifically an individual photo or an event — and so
-- reported content can be actioned (taken down) within the existing 24-hour
-- moderation flow.
--
-- ADDITIVE ONLY. Idempotent.
--
-- Changes:
--   1. reports.content_type  — what kind of thing was reported.
--   2. reports.content_id    — opaque id/URL of the specific item (photo/event).
--   3. reports.target_id     — relaxed to NULLable: an event report has no host
--      profile UUID on the client, so target_id may be absent. The existing
--      (reporter_id <> target_id) CHECK stays valid (NULL comparison => NULL =>
--      passes).
--   4. content_takedowns     — records photos/events removed by a moderator.
--   5. admin_takedown_content(report_id) / is_content_taken_down(content_id) —
--      the takedown action + a query helper for feed/photo filtering.
-- =============================================================================

-- ---------- 1. reports: content-scoped targeting ----------

alter table public.reports
  add column if not exists content_type text not null default 'profile';

alter table public.reports
  add column if not exists content_id text;

do $$
begin
  alter table public.reports
    add constraint reports_content_type_check
    check (content_type in ('profile','photo','event','message','bio','other'));
exception
  when duplicate_object then null;
end $$;

-- Event reports carry no host UUID on the client → allow NULL target.
alter table public.reports alter column target_id drop not null;

create index if not exists reports_content_idx
  on public.reports (content_type, content_id);

-- ---------- 2. content_takedowns: the takedown ledger ----------

create table if not exists public.content_takedowns (
  content_type text not null
    constraint content_takedowns_type_check
    check (content_type in ('profile','photo','event','message','bio','other')),
  content_id   text not null,
  report_id    uuid references public.reports(id) on delete set null,
  actioned_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint content_takedowns_pkey primary key (content_type, content_id)
);

alter table public.content_takedowns enable row level security;

-- Anyone signed in may READ takedowns so clients can hide removed content;
-- writes happen only through the SECURITY DEFINER function below.
drop policy if exists takedowns_read on public.content_takedowns;
create policy takedowns_read on public.content_takedowns
  for select to authenticated using (true);

revoke all on table public.content_takedowns from anon;
grant select on table public.content_takedowns to authenticated;

-- ---------- 3. moderation actions ----------

-- Mark a report actioned AND record a takedown for its target, in one step.
-- SECURITY DEFINER so it can flip report status regardless of RLS; intended to
-- be invoked by moderation tooling (service role) inside the 24h SLA.
create or replace function public.admin_takedown_content(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r public.reports%rowtype;
begin
  select * into r from public.reports where id = p_report_id;
  if not found then raise exception 'report % not found', p_report_id; end if;

  update public.reports set status = 'actioned' where id = p_report_id;

  if r.content_id is not null then
    insert into public.content_takedowns
        (content_type, content_id, report_id, actioned_by)
      values (r.content_type, r.content_id, r.id, auth.uid())
      on conflict (content_type, content_id) do nothing;
  end if;
end;
$function$;

create or replace function public.is_content_taken_down(p_content_id text)
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.content_takedowns where content_id = p_content_id
  );
$function$;

-- Takedown execution is moderator-only (service role); never client-callable.
revoke all on function public.admin_takedown_content(uuid) from public, anon, authenticated;
revoke all on function public.is_content_taken_down(text) from public, anon;
grant execute on function public.is_content_taken_down(text) to authenticated;
