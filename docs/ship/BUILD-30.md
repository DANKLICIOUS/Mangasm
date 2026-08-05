# Ship — Mangasm build 30

**Bundle ID:** `com.mangasm.app`
**Marketing version:** 1.1.0
**CFBundleVersion:** 30
**Team:** 854XZ2543V
**Signing:** Manual — `iPhone Distribution: Mark Webster (854XZ2543V)`, profile `Mangasm App Store 18`

## Why 30

`CURRENT_PROJECT_VERSION` bumped **29 → 30** for the next App Store Connect upload
(ASC requires a strictly higher CFBundleVersion than any already-uploaded build).
No feature changes vs 29 — same merged surface (weather-from-location, auth cleanup).

## Project root now committed

The generated Xcode project `MangasmiOS.xcodeproj` is now **tracked in git**
(`.gitignore` negates it via `!MangasmiOS.xcodeproj`). Previously `*.xcodeproj`
was ignored and the project was regenerated on demand by XcodeGen — a stale or
absent generated project surfaced in Xcode as a **"missing root object"** error.
Committing a known-good project (rootObject present) removes that failure mode.

To regenerate after editing `project.yml`:

```
xcodegen generate
```

## Verified locally

- `swift build` — clean
- `swift test` — 149 tests, 0 failures
- Unsigned simulator build (app + RevenueCat + Supabase) — compiles
- Signing identity + Apple WWDR/Root CA present in keychain

## Ship

| Item       | Value                                       |
| ---------- | ------------------------------------------- |
| Version    | **1.1.0 (30)**                              |
| Xcode proj | `MangasmiOS.xcodeproj` (committed)          |
| Archive    | Product → Archive in Xcode, then distribute |

Merge to `main` triggers the web (Vercel) deploy; the iOS archive/upload is a
local Xcode step (the Xcode suite is intentionally not in CI — see `ci.yml`).
