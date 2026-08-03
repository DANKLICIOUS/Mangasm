# Xcode Cloud — Secrets.xcconfig

## Symptom

Archive fails with exit code 65:

```text
Unable to open base configuration reference file
'/Volumes/workspace/repository/App/iOS/Secrets.xcconfig'
```

`MangasmiOS.xcodeproj` + scheme `Mangasm` is intentional (xcodegen). The failure is the missing file, not the project name.

## Why

| Location     | `App/iOS/Secrets.xcconfig`                                                  |
| ------------ | --------------------------------------------------------------------------- |
| Local Mac    | Present (gitignored) — written by `scripts/sync-secrets-from-mastermind.sh` |
| Git / GitHub | **Never committed** (see `.gitignore`)                                      |
| Xcode Cloud  | Must be **generated** before `xcodebuild`                                   |

`project.yml` wires Debug/Release base config to that path and expands:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `YELP_API_KEY`
- `TICKETMASTER_API_KEY`

into Info.plist at build time.

## Fix (in repo)

`ci_scripts/ci_pre_xcodebuild.sh` runs automatically on Xcode Cloud and writes
`App/iOS/Secrets.xcconfig` from environment variables.

## App Store Connect setup

1. Open **App Store Connect** → **Mangasm** → **Xcode Cloud** → **Settings** → **Environment**.
2. Add (prefer **Secret** type):

| Variable                   | Required | Notes                                                                                    |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `SUPABASE_URL`             | Yes      | e.g. `https://dvomzrvslwdabwcwtvrg.supabase.co` (alias: `MANGASM_SUPABASE_URL`)          |
| `SUPABASE_PUBLISHABLE_KEY` | Yes      | Aliases: `SUPABASE_ANON_KEY`, `MANGASM_SUPABASE_PUBLISHABLE_KEY`                         |
| `YELP_API_KEY`             | No       | Date Night Yelp; empty → in-app fallback (alias: `MANGASM_YELP_API_KEY`)                 |
| `TICKETMASTER_API_KEY`     | No       | Date Night Ticketmaster; empty → in-app fallback (alias: `MANGASM_TICKETMASTER_API_KEY`) |

3. Ensure the workflow that archives the app includes these env vars (all environments or the specific workflow).
4. Re-run the Xcode Cloud build.

## Local development

```bash
./scripts/sync-secrets-from-mastermind.sh
# or: cp App/iOS/Secrets.xcconfig.example App/iOS/Secrets.xcconfig
# then edit real values
```

Do **not** commit `App/iOS/Secrets.xcconfig`.

## xcconfig URL gotcha

In `.xcconfig`, `//` starts a comment. A raw value:

```text
SUPABASE_URL = https://example.supabase.co
```

silently becomes `https:` (build 23). Always encode as:

```text
SUPABASE_URL = https:/$()/example.supabase.co
```

Both `sync-secrets-from-mastermind.sh` and `ci_pre_xcodebuild.sh` do this automatically.
