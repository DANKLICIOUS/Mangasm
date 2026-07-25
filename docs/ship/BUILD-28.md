# Ship — Mangasm build 28

**Bundle ID:** `com.mangasm.app`  
**Marketing version:** 1.1.0  
**CFBundleVersion:** 28  
**Team:** 854XZ2543V  
**Uploaded:** _pending_ — version bump only; Transporter/CI upload is a separate step.

## Why 28

`CURRENT_PROJECT_VERSION` bumped **27 → 28** so the next shippable binary exceeds
the already-uploaded build 27 (ASC requires a strictly higher CFBundleVersion for
re-upload).

## Same features as 27

DateNight Discovery (Yelp + Ticketmaster, dual 10-mi, deep-link booking), App Review
notes, location When-In-Use, embedded provider keys. No feature changes vs 27 — this
is a build-number bump for the ASC re-upload.

## Binary / upload

| Item        | Value                                           |
| ----------- | ----------------------------------------------- |
| Version     | **1.1.0 (28)**                                  |
| IPA         | produced by the iOS build (CI on `main`)        |
| Transporter | not yet run — upload after the archive is built |

Merge to `main` triggers the iOS build workflow; archive + Transporter upload of
**1.1.0 (28)** is the follow-up ship step.
