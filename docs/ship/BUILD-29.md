# Ship — Mangasm build 29

**Bundle ID:** `com.mangasm.app`
**Marketing version:** 1.1.0
**CFBundleVersion:** 29
**Team:** 854XZ2543V
**Uploaded:** _not via App Store_ — App Store Connect / Transporter upload remains
**retired** (see BUILD-28). Distribution is via a different method (TBD). Binary still
builds on `main`; only the ASC upload step is out of the ship path.

## What's new since 28

- **Weather is now location-driven** — resolved from the device's location via WeatherKit
  (heuristic fallback), replacing the manual Settings toggle. New `WeatherProvider` /
  `LocationProvider` seams, refreshed once at app launch.
- **Auth surface cleanup** — removed a redundant catch arm and the dead
  `AuthError.notConfigured` case (adversarially-verified audit). No behavior change.
- Sign in with Apple was already fully wired (`AppleSignInPresenter` → `signInWithIdToken`);
  turning it on is **config only** — enable the capability on the App ID + add
  `com.mangasm.app` to Supabase → Auth → Providers → Apple → Client IDs. No Services ID /
  `.p8` secret needed for native iOS (see `claudedocs/research_signin-with-apple-supabase_2026-07-26.md`).

## Binary / upload

| Item        | Value                                                |
| ----------- | ---------------------------------------------------- |
| Version     | **1.1.0 (29)**                                       |
| IPA         | produced by the iOS build (CI on `main`)             |
| Transporter | **retired** — not shipping to the App Store this way |

Tests: 149 pass (`swift test`). iOS-only WeatherKit/CoreLocation paths are `#if os(iOS)`
so they compile out of `swift test` — verify in an Xcode build.
