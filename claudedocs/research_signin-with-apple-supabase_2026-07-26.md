# Research — Sign in with Apple (`ASAuthorizationAppleIDProvider`) + Supabase for a native iOS app

- **Date:** 2026-07-26
- **Depth:** standard (2 hops, multi-source)
- **Overall confidence:** **High** — three independent searches converged and the official Supabase doc confirms
- **Tools:** WebSearch + WebFetch (Tavily MCP was down)
- **Scope note:** research report only — no code changes (`ASAuthorizationAppleIDProvider` usage in `AppleSignInPresenter.swift` was already reviewed and is correct).

## Executive summary

The Apple-login config steps given earlier in the session (create a **Services ID**, **Key ID**, and **.p8 secret** in Supabase) describe the **web OAuth** path. **Mangasm is a native iOS app using `signInWithIdToken`, so that whole OAuth setup is NOT required.** The native flow returns an `idToken` from Apple that Supabase validates directly against Apple's public keys.

**What Mangasm actually needs to "turn on" Apple login:**

1. **Apple Developer portal:** App ID `com.mangasm.app` → enable the **Sign in with Apple** capability.
2. **Supabase dashboard → Auth → Providers → Apple:** enable it and add the **bundle ID `com.mangasm.app`** to the **Client IDs** field. No Services ID, no .p8, no secret key needed for native.
3. **Code:** already correct — raw nonce → Supabase, SHA-256(nonce) → Apple.

## Findings

### 1. Native iOS uses `signInWithIdToken`, not the OAuth redirect flow — confidence: High

On native iOS/macOS, Sign in with Apple returns an `idToken` directly; Supabase validates it against Apple's public keys without an OAuth callback. "If you're building a native app only, you do not need to configure the OAuth settings." → Services ID + secret key (.p8) are **not required**. The .p8 is only used by the OAuth redirect flow (web / Android). [Supabase Docs — Login with Apple], [Supabase discussion #44217]

### 2. Register the bundle ID in "Client IDs" — confidence: High

"Register all of the App IDs that will be using your Supabase project in the Apple provider configuration … under **Client IDs**." The native `signInWithIdToken` flow accepts **any** client ID in that list as a valid token audience. So `com.mangasm.app` goes in Client IDs. [Supabase Docs — Login with Apple]

**Ordering caveat (only if you later add web):** Supabase uses the _first_ Client ID for the web `signInWithOAuth` flow. If a native App ID is listed before a Services ID, native keeps working but **web** sign-in gets rejected by Apple. iOS-only → irrelevant for now. [Supabase Docs]

### 3. Apple Developer portal steps — confidence: High

- Create/confirm an **App ID** matching `com.mangasm.app`.
- Enable **Sign in with Apple** in that App ID's **Capabilities**.
- Leave **Server-to-Server notification endpoints blank** — "Supabase Auth does not support Server-to-Server notification endpoints." [Supabase Docs]

### 4. Nonce binding (raw vs hashed) — confidence: High

Generate a random **raw** nonce → send **SHA-256(rawNonce)** to Apple in the authorization request (`request.nonce`) → Apple bakes that hash into the signed `idToken` → send the **raw** (unhashed) nonce to Supabase `signInWithIdToken(nonce:)`, which re-hashes and compares. **Without a nonce, `signInWithIdToken` rejects the token (400).** [Supabase Swift ref], [supabase/supabase#26747]

→ **Mangasm's `AppleSignInPresenter` + `SignInNonce.sha256Hex` already implement exactly this.** No change needed.

### 5. Dashboard "secret key to save" — confidence: Medium (conflicting sources)

- **Official docs:** native-only setups don't require OAuth credentials, so no secret key is needed to save.
- **Community reports** (discussion #44217): some users hit a dashboard that won't **save** the Apple provider page without a Secret Key, even for native-only.
- **Practical read:** try saving with just Client IDs enabled; if the dashboard blocks you, that known friction is why you'd generate a throwaway .p8-derived secret _solely to satisfy the save button_ — it isn't used for native auth. Verify against the current dashboard.

## What this changes vs. earlier session guidance

| Earlier (session)                                      | Corrected (this research)                             |
| ------------------------------------------------------ | ----------------------------------------------------- |
| Create Services ID + Key ID + .p8, paste into Supabase | **Not needed** for native iOS                         |
| —                                                      | Add **bundle ID `com.mangasm.app`** to **Client IDs** |
| Enable capability on App ID                            | ✅ still required                                     |
| Nonce handling                                         | ✅ already correct in code                            |

## Verification against the codebase

`Sources/MangasmApp/Services/Live/AppleSignInPresenter.swift` + `SupabaseAuthService.signInWithApple` + `SignInNonce`:

- ✅ hashed nonce → Apple request; raw nonce returned alongside idToken
- ✅ `client.auth.signInWithIdToken(credentials: .init(provider: .apple, idToken:, nonce:))`
- No implementation change indicated by this research.

## Recommendations (for human decision — no action taken)

1. Enable **Sign in with Apple** capability on App ID `com.mangasm.app` (Apple Developer portal).
2. In Supabase → Auth → Providers → **Apple**: enable + add `com.mangasm.app` to **Client IDs**. Skip Services ID/.p8 unless the save button forces it.
3. Test on a real device (Simulator SIWA can be flaky); if you get a **400** from `signInWithIdToken`, first suspect a missing/mismatched nonce or the bundle ID not being in Client IDs.

## Sources

- [Supabase Docs — Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase Docs — Swift: Sign in with ID token](https://supabase.com/docs/reference/swift/auth-signinwithidtoken)
- [Supabase blog — Native Mobile Auth for Google and Apple](https://supabase.com/blog/native-mobile-auth)
- [Supabase discussion #44217 — Make Apple secret key optional for native-only](https://github.com/orgs/supabase/discussions/44217)
- [supabase/supabase#26747 — signInWithIdToken 400](https://github.com/supabase/supabase/issues/26747)
- [Apparence — Apple Sign-In with Supabase setup guide (2026)](https://apparencekit.dev/blog/flutter-supabase-apple-sign-in/)
