# Mangasm Android — Google Play placeholder shell

**Status:** Scaffold only — **not** a shipping APK.  
**Package (planned):** `app.mangasm.android`  
**iOS sibling:** `com.mangasm.app` (this monorepo’s Swift package)  
**Purpose:** Separate Google Play authorization + listing path while iOS ships first.

---

## Directory layout

```
Android/
  README.md                 ← this file
  AUTH-PATH.md              ← Google / Play / OAuth authorization path
  PLAY-LISTING-COPY.md      ← Store listing placeholder copy
  app/
    build.gradle.kts.placeholder
    src/main/
      AndroidManifest.xml
      java/app/mangasm/android/
        MangasmApp.kt
        auth/AuthPath.kt
        ui/theme/ProfileStyleCatalog.kt
  gradle.properties.placeholder
```

## Product parity (target)

| iOS                         | Android (planned)                            |
| --------------------------- | -------------------------------------------- |
| Sign in with Apple          | Google Sign-In + email (Play policy)         |
| Community Reputation styles | Same catalog thresholds + badge names        |
| Supabase backend            | Same project / REST — different OAuth client |
| IAP StoreKit                | Play Billing (separate SKUs)                 |

## Non-goals for this scaffold

- No full Jetpack Compose UI yet
- No production keystore
- No Play Console upload

## Next human steps

1. Open Android Studio → **New Project** from this folder when ready.
2. Create Play Console app **Mangasm** (separate from App Store Connect).
3. Follow `AUTH-PATH.md` for OAuth clients.
4. Replace placeholders; never copy iOS Apple secrets into Android.
