# 🤡 Mangasm → GitLab migration (gitlab.com)

Moving off GitHub to **gitlab.com**. Legend: **🙋 you** (needs your login/creds — I can't) ·
**🤖 me** (I can run once the prereq exists).

The good news up front: **your CI ports with zero secrets** (`.gitlab-ci.yml` already written —
both jobs run on Linux; the iOS build was never in CI). So the only real work is repo hosting +
reconnecting Vercel.

---

## 1. Account + SSH — 🙋 you

1. Create/confirm your **gitlab.com** account and a **group** (e.g. `gothamgodzilla` or a company group).
2. Add your SSH key: gitlab.com → **Preferences → SSH Keys** → paste the contents of
   `~/.ssh/id_ed25519.pub` (public half — safe to share). Test: `ssh -T git@gitlab.com`.
3. Create an **empty** project named `mangasm` in your group (no README/license — we're pushing history).

## 2. Owner token → secrets.env — 🙋 you

Create a PAT: gitlab.com → **Preferences → Access Tokens** → scope **`api`**, then add to
`~/mastermind-ai/secrets.env` (600):

```
GITLAB_HOST=gitlab.com
GITLAB_OWNER_TOKEN=glpat-…          # the PAT you just made
GITLAB_GROUP_ID=…                   # group → Settings → the numeric Group ID under the name
GITLAB_SA_USER_ID=…                 # only needed once you make a service account (step 5)
```

## 3. Push the repo (all history) — 🤖 me, after steps 1–2

Once your SSH key is on gitlab.com and the empty project exists:

```
git remote add gitlab git@gitlab.com:<group>/mangasm.git
git push gitlab --all
git push gitlab --tags
```

This publishes every branch + tag to GitLab. `origin` (GitHub) stays untouched as a fallback.

## 4. CI — 🤖 me (already done) / 🙋 verify

`.gitlab-ci.yml` is committed. On first push, gitlab.com's **shared Linux runners** run both jobs
(`supabase-db`, `web`). **No CI/CD variables needed** — neither job uses a secret. Just confirm the
pipeline goes green under the project's **Build → Pipelines**.

## 5. Service-account CI token (optional) — 🙋 create SA, 🤖 mint token

Only if you need a bot identity for mirrors/registry/protected pushes:

1. 🙋 Group → **Settings → Members → Service accounts** → create one; note its **user id** →
   `GITLAB_SA_USER_ID` in secrets.env.
2. 🤖 `./scripts/clown.sh token create` → mints a scoped, 90-day PAT into `GITLAB_CI_TOKEN`.

## 6. Reconnect Vercel to GitLab — 🙋 you (Vercel UI)

Vercel deploys currently come from GitHub. Vercel **supports GitLab** natively:

- For **each** Vercel project (`web` = mangasm.app, and `mangasm`): **Settings → Git** →
  disconnect GitHub → **Connect GitLab** → pick `<group>/mangasm`.
- ⚠️ While here, fix the health-check finding: the duplicate/broken `mangasm` project can be
  **deleted** instead of reconnected (its prod deploys all cancel). Reconnect only `web`.
- Then add the missing env var so the waitlist works:
  `vercel env add RESEND_API_KEY production` (value already in `secrets.env`).

## 7. Wind down GitHub — 🙋 you, when GitLab is green

- Keep GitHub as a read-only backup for a week, then **archive** the repo.
- The GitHub App (`mangasm-app`, empty permissions) and Actions can be left or removed — nothing
  depends on them once Vercel points at GitLab.

## 8. iOS — no change

Archiving/signing is unchanged (`scripts/archive-build.sh`, Manual signing, team `854XZ2543V`).
It was never in CI, so GitLab doesn't touch it.

---

### Ordered next 3 actions

1. 🙋 Add `id_ed25519.pub` to gitlab.com + create the empty `mangasm` project.
2. 🙋 Make the Owner PAT → drop the 3 `GITLAB_*` vars into `secrets.env`.
3. 🤖 Tell me the group path and I'll run step 3 (push all history) + watch the first pipeline.
