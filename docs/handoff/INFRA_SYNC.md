# Handoff: Mangasm — Infra Sync (Supabase · Vercel · GitHub)

_Last updated: 2026-07-20 · Baseline: `main` @ `8359a1a` (PR #6 merged)_

Single-page brief so every agent/service in the ecosystem targets the **same
cloud footprint**. If a value here disagrees with something you were told
elsewhere, this file wins.

## Cloud footprint

```
GitHub (source + Actions CI)
   → Supabase project dvomzrvslwdabwcwtvrg  (Postgres, RLS, edge functions)
   → Vercel projects "mangasm" + "web"       (static site + PR previews)
```

## Supabase — single source of truth

| Item                 | Value                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Live project ref** | `dvomzrvslwdabwcwtvrg`                                                                         |
| **Project URL**      | `https://dvomzrvslwdabwcwtvrg.supabase.co`                                                     |
| **Publishable key**  | `sb_publishable_*` — **public / client-safe** (NEXT_PUBLIC), safe to ship in the iOS app + web |
| **MCP endpoint**     | `https://mcp.supabase.com/mcp?project_ref=dvomzrvslwdabwcwtvrg&...`                            |

**Retired refs — do NOT use anywhere:**

- `zfwzrloxqqkkikedpruf` — dead DNS (was stale in `.mcp.json`, now fixed)
- `hcpzbxplnkyythzwkovy` — prior project
- `pwmddvigardiyhqtihdw` — old dev project

**Secrets:** `App/iOS/Secrets.xcconfig`, `.env`, `fastlane/api_key.json` are
gitignored and NOT committed. Only `*.example` templates are tracked. The
service-role / `sb_secret_*` key referenced in old spec docs was rotated —
never commit it.

## GitHub — CI

Workflow: `.github/workflows/ci.yml` (triggers on push/PR to `main` +
`workflow_dispatch`). Two deterministic, host-runnable jobs:

| Job           | What it does                                                                                                              | Runner |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| `supabase-db` | Postgres 16 service → apply migrations `0001→0007` → run RLS/trigger tests (`scripts/ci-db-test.sh`)                      | ubuntu |
| `web`         | Validate `vercel.json` + `apple-app-site-association` JSON, `node --check` middleware, assert required static pages exist | ubuntu |

**CodeQL:** the repo uses CodeQL **default setup** (enabled, green). The old
advanced `codeql.yml` was removed — it collided with default setup on SARIF
upload and pinned Swift to the invalid `build-mode: none`, so it failed on
every `main` commit. Security scanning continues via default setup; do not
re-add an advanced CodeQL workflow.

**Not in CI by design — iOS/Xcode suite.** `Sources/` import `UIKit` and the
tests need Apple code-signing + a simulator, which GitHub-hosted runners
can't do without signing secrets. Run it on Apple hardware:
`scripts/run-all-tests.sh` (SPM logic tests + DB tests + xcodebuild sim tests).

## Vercel

- Projects **`mangasm`** and **`web`** auto-deploy previews per PR (both report
  Ready on green PRs). Config lives in `web/vercel.json` (host rewrites for
  `ios.mangasm.app`, `/privacy`, `/terms`, `/moderation`, `/promo`, AASA
  content-type header) and `web/middleware.js`.
- Static pages served: `index.html`, `ios.html`, `privacy.html`, `terms.html`,
  `moderation.html`, `promo.html`, `plus.html` (web Stripe at `/plus`).

## Database migrations

- Chain `supabase/migrations/0001_*.sql … 0007_*.sql` applies cleanly in order.
- **0004** (perf/security hardening: FK indexes, `(select auth.uid())` RLS
  wrapping, pinned `search_path`) and **0005** (merge permissive policies) were
  missing statement terminators and could never apply — fixed in PR #6.
- Tests: `supabase/tests/rls_tests.sql` (T1 mutual-like→match, T2 vouch→rep
  sync, T3 sensitive-field masking, T4 consent-log privacy, T5 profiles delete
  RLS) — all pass. `supabase/tests/auth_shim.sql` stubs `auth.uid()` + roles
  for local/CI Postgres.
- Local runner: `scripts/test-db.sh` (Docker Postgres). CI runner:
  `scripts/ci-db-test.sh` (libpq env vars, no Docker).

## Access notes for agents

- **Supabase MCP** requires OAuth; in headless/non-interactive sessions it is
  unauthenticated. Authorize via claude.ai connector settings before live DB
  ops (`apply_migration`, `execute_sql`, `deploy_edge_function`, `get_advisors`).
- **GitHub** ops go through the GitHub MCP tools (`mcp__github__*`), scoped to
  `gothamgodzilla/Mangasm`.
