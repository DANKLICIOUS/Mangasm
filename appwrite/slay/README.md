# slay.llc — Void Market / The Grove (Appwrite CLI)

This is **not** a Mangasm dating backend. It is the Appwrite project for **The Grove**: Gnomies, Artifacts, live markets, Gnomie Vision signals, Gnomie School, and GROW (which creates Artifacts). There is no FORGE primitive, no NFT-collection marketplace, and no guaranteed-return language.

CLI used to author this tree: **appwrite-cli 28.2.0**.

## Layout

| Path                       | Role                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `appwrite.config.json`     | Project + TablesDB + functions + Grove site + buckets + teams + topics                                    |
| `functions/grow-artifact/` | Ruby 3.3 GROW — creates Artifacts                                                                         |
| `functions/gnomie/`        | Gnomie identity + participation reputation                                                                |
| `functions/market/`        | Grove market snapshots (read)                                                                             |
| `functions/trade/`         | Simulated trades only — never places orders                                                               |
| `functions/signal/`        | Gnomie Vision informational signals                                                                       |
| `sdk/ids.ts`               | Resource IDs for the slay-app client                                                                      |
| `../../slay-app`           | Site source (Vite/React Grove). Build output override: `./dist`                                           |
| `../../web/slay-dist`      | Existing static Grove build served on mangasm.app `/slay` `/grove` — **do not replace Vercel production** |

## Domain (TablesDB `grove`)

`gnomies` · `artifacts` · `markets` · `trades` · `signals` · `comments` · `reputation` · `learning_progress` · `creator_economics`

String columns use `varchar` / `text` / `mediumtext` — never legacy `string`. `provenance_adapter` on Artifact is **adapter metadata only**, not a cryptographic 25SHA guarantee.

## Auth status (this environment)

Headless Cloud Agent has **no Appwrite session and no API key**. `appwrite whoami` → `no active session`. `appwrite push` is **blocked**. This folder is initialized locally only.

Appwrite-api MCP is also unauthenticated (`mcp_auth` interaction handler unavailable here).

## Human steps to go live

1. Create a Cloud project named **slay.llc — Void Market / The Grove** at [cloud.appwrite.io](https://cloud.appwrite.io).
2. Put the real project id and region endpoint into `appwrite.config.json`:

```json
"projectId": "<YOUR_PROJECT_ID>",
"endpoint": "https://<REGION>.cloud.appwrite.io/v1"
```

3. Create a **server API key** (Console → Overview → API keys) with scopes for tables, functions, storage, sites, teams, and messaging. Do not commit it.
4. Register a **Web platform** for `https://slay.llc` (and localhost if you develop locally).
5. Sign in from a machine that can open a browser:

```bash
export PATH="$HOME/.npm-global/bin:$PATH"   # if CLI was installed with a user prefix
appwrite -v                                  # expect 28.2.0+
appwrite login --endpoint "https://cloud.appwrite.io/v1"
# confirm the device code at https://appwrite.io/oauth2/device?user_code=...
```

Or CI / headless (never commit the key):

```bash
appwrite client \
  --endpoint "https://<REGION>.cloud.appwrite.io/v1" \
  --project-id "<YOUR_PROJECT_ID>" \
  --key "$APPWRITE_API_KEY"
```

6. Push from this directory only after login works (or pass `--config-file`):

```bash
cd appwrite/slay
appwrite push all --all --force
# equivalent from repo root:
# appwrite push all --all --force --config-file appwrite/slay/appwrite.config.json
```

7. Set **secret** function var `APPWRITE_API_KEY` on `grow-artifact` (and `APPWRITE_PROJECT_ID` / `APPWRITE_ENDPOINT` if they differ from the automatic `APPWRITE_FUNCTION_*` vars). `APPWRITE_DATABASE_ID=grove` is already declared.
8. Attach custom domain **slay.llc** (or `grove.slay.llc`) to site `the-grove` in Console → Sites → Domains. DNS is a human Console action.
9. Do **not** run `vercel --prod` against mangasm.app as part of this Appwrite wiring.

Until step 6 succeeds, this is **not** a production-ready backend.

## Env vars the human must set

| Variable               | Where                                          | Secret  |
| ---------------------- | ---------------------------------------------- | ------- |
| `APPWRITE_ENDPOINT`    | shell, function vars, slay-app client          | no      |
| `APPWRITE_PROJECT_ID`  | shell, `appwrite.config.json`, slay-app client | no      |
| `APPWRITE_API_KEY`     | shell / CI / function secret only              | **yes** |
| `APPWRITE_DATABASE_ID` | function vars (default `grove`)                | no      |

See `.env.example`. Copy to `.env.local` — both `*.env.local` and `~/.appwrite` sessions are gitignored.

## Existing Grove URLs (Vercel, unchanged)

- https://mangasm.app/slay
- https://mangasm.app/grove
- https://mangasm.app/grow

Appwrite Sites URL appears only after a successful `push sites` (typically `https://the-grove-<project>.appwrite.network`). None has been deployed from this agent.
