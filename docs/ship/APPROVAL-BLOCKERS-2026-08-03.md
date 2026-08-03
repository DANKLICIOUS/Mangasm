# Mangasm approval blockers — live ASC measure (2026-08-03)

**#1 goal:** Revenue + Reviews → need **Approved** then live IAP + convert.  
**Xcode Cloud is not the approval path.** Build **31** already uploaded locally; app is already **Waiting for Review**.

## Live ASC truth (API)

| Field                           | Value                                          |
| ------------------------------- | ---------------------------------------------- |
| App                             | Mangasm · `com.mangasm.app` · `6776317775`     |
| Version string                  | **31**                                         |
| State                           | **WAITING_FOR_REVIEW**                         |
| Attached build                  | **26** (VALID) — not 31                        |
| Build 31                        | Uploaded 2026-08-03 · **VALID** · not selected |
| Privacy / terms                 | **200** on mangasm.app                         |
| IAP monthly `Mangasm2cute4u001` | **READY_TO_SUBMIT**                            |
| IAP quarterly `Mangasm0001`     | **MISSING_METADATA**                           |
| Demo required                   | **YES**                                        |
| Demo username in ASC            | `privacy@mangasm.app` (email shape ✅)         |
| Demo password in ASC            | set (7 chars)                                  |

## Critical: demo login is broken

Probed Supabase Auth (`dvomzrvslwdabwcwtvrg`) with ASC password + `MANGASM_DEMO_PASSWORD` against common emails including `privacy@mangasm.app` → **all Invalid login credentials**.

Signup path creates users but **email confirmation required**; confirmation mail for `@mangasm.app` does not land in connected Gmail; email send is **rate-limited**.

**If Apple reviews now, Guideline 2.1 (cannot sign in) is the most likely rejection.**

### Fix (one human paste)

1. Supabase Dashboard → project **dvomzrvslwdabwcwtvrg** → **Settings → API** → copy **`service_role`** (secret).
2. On swagger:

```bash
cd ~/dev/mangasm/mangasm
export SUPABASE_SERVICE_ROLE_KEY='…paste…'
./scripts/provision-demo-reviewer.sh
# prints EMAIL + PASSWORD — paste into ASC App Review Information
```

3. ASC version → **App Review Information**:
   - Username = **full email** (not bare `Opal`)
   - Password = value from script (`[SET]` in logs only)
4. **Notes** must match the binary (see below). While **Waiting for Review**, some fields return **409** on API PATCH — you may need **Remove from Review** → edit → human **Submit** again.

## Critical: review notes describe a dead flow

Current ASC notes tell the reviewer:

> Enter phone + privacy@mangasm.app → Send Code → OTP SuzyQQQ

**Live binary:** Sign in with Apple + **Email/Password**. Phone OTP is **not** on the live sign-in sheet.

Replace notes with the text in `APP_REVIEW_NOTES.md` (build 31 set).

IAP product review notes also still mention phone OTP — update after demo works.

## Secondary

| Item                               | Action                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Xcode Cloud exit 65                | Fixed in repo (`ci_pre_xcodebuild.sh`); optional for approval                               |
| Attached build 26 vs 31            | Prefer attach **31** only if 26 lacks email login / DateNight; requires remove-from-review  |
| IAP `Mangasm0001` MISSING_METADATA | Complete quarterly product metadata / screenshot in ASC UI; attach both IAPs with version   |
| Bare `Opal` in secrets             | `MANGASM_DEMO_USERNAME` is still 4-char bare name — replace with real email after provision |

## Do / don’t while Waiting

| Do                                     | Don’t                               |
| -------------------------------------- | ----------------------------------- |
| Fix demo login in Supabase immediately | Thrash Xcode Cloud as the ship path |
| Correct review notes + demo email      | Invent passwords in chat            |
| Human Submit after edit if removed     | Agent click Submit for Review       |

## Success criteria (approval path)

1. `./scripts/provision-demo-reviewer.sh` → password grant **PASS**
2. ASC demo fields = that email + password
3. Notes = email/password path + 1.2 controls + DateNight
4. Reviewer can open Discover + paywall tiles
5. Apple moves Waiting → In Review → **Approved**
