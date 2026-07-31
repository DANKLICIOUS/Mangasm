# Ship — Mangasm build 28

**Bundle ID:** `com.mangasm.app`  
**Marketing version:** 1.1.0  
**CFBundleVersion:** 28  
**Team:** 854XZ2543V  
**Uploaded:** _not via App Store_ — App Store Connect / Transporter upload is
**intentionally skipped**; distribution is moving to a different method (TBD). The
binary still builds on `main`; only the ASC upload step is being retired here.

## Why 28

`CURRENT_PROJECT_VERSION` bumped **27 → 28** so the next shippable binary exceeds
the already-uploaded build 27 (ASC requires a strictly higher CFBundleVersion for
re-upload).

## Same features as 27

DateNight Discovery (Yelp + Ticketmaster, dual 10-mi, deep-link booking), App Review
notes, location When-In-Use, embedded provider keys. No feature changes vs 27 — this
is a build-number bump for the ASC re-upload.

## Binary / upload

| Item        | Value                                                |
| ----------- | ---------------------------------------------------- |
| Version     | **1.1.0 (28)**                                       |
| IPA         | produced by the iOS build (CI on `main`)             |
| Transporter | **retired** — not shipping to the App Store this way |

Merge to `main` still triggers the iOS build workflow (archive produced for record),
but the **App Store / Transporter upload step is no longer part of the ship path**.
Distribution is moving to a different method — see the follow-up plan when chosen.
