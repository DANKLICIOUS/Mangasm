# Mangasm Android — Authorization path (Google Play)

**Separate from iOS.** Do not reuse Apple Team keys, APNs `.p8`, or App Store Connect API keys for Android.

## Identity providers (planned)

| Provider               | Use                               | Where configured                                       |
| ---------------------- | --------------------------------- | ------------------------------------------------------ |
| **Google Sign-In**     | Primary social on Android         | Google Cloud Console + Play Console                    |
| **Email / password**   | Fallback / review demo            | Supabase Auth (same project as iOS)                    |
| **Sign in with Apple** | Optional (if offering on Android) | Apple Developer Services ID — separate from iOS app ID |

## Google Cloud setup

1. Project: create or reuse **Mangasm** GCP project (not Apple Team).
2. **OAuth consent screen** — External, app name **Mangasm**, support email `ai@mangasm.app`.
3. **OAuth client IDs**
   - Android client: package `app.mangasm.android`, SHA-1 from **Play App signing** cert + debug keystore.
   - Web client: for Supabase Google provider token exchange.
4. Enable APIs: Google Sign-In / Identity Toolkit as required by Supabase docs.

## Supabase

| Env                  | iOS             | Android                      |
| -------------------- | --------------- | ---------------------------- |
| Project URL          | shared          | shared                       |
| Publishable/anon key | shared (client) | shared (client)              |
| Apple provider       | enabled         | n/a or optional              |
| Google provider      | optional        | **required for Google path** |

Android app secrets live in:

- Local: `Android/local.properties` (gitignored)
- CI: Play / Secret Manager — **never** `mastermind-ai/certs/AuthKey_*.p8`

## Play Console authorization

1. Create app **Mangasm** (application ID `app.mangasm.android`).
2. Complete **Data safety**, **Content rating**, **Target audience** (18+).
3. **App signing** by Google Play → export SHA-1 for OAuth.
4. Internal testing track first; same demo account policy as iOS (**Opal** / secrets — do not invent passwords).
5. Privacy policy URL: `https://mangasm.app/privacy` (must resolve).

## App Groups / shared storage

No shared keychain with iOS. Reputation score for any future widget-like surface uses Android `SharedPreferences` / DataStore only.

## Checklist before first Play upload

- [ ] Package name final: `app.mangasm.android`
- [ ] Google OAuth Android + Web clients live
- [ ] Supabase Google provider configured
- [ ] Play signing SHA-1 registered
- [ ] Privacy / terms URLs live
- [ ] 18+ rating questionnaire complete
- [ ] Separate store listing copy from `PLAY-LISTING-COPY.md`
