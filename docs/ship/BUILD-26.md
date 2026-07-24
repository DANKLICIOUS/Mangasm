# Ship — Mangasm build 26

**Bundle ID:** `com.mangasm.app`  
**Marketing version:** 1.1.0  
**CFBundleVersion:** 26  
**Team:** 854XZ2543V  
**Feature:** DateNight Discovery (Yelp restaurants + events, dual ≤10 mi, deep-link book)

## What’s in this binary

- AI Match → **RSVP A FIRST DATE** (DateNight): keyword, ZIP/GPS, dual proximity
- Yelp Fusion: business search, autocomplete, reviews UI (≤3), events search/lookup
- Ticketmaster client ready when `TICKETMASTER_API_KEY` is set
- App Review notes: `APP_REVIEW_NOTES.md` (Opal + DateNight path)
- Privacy: optional When-In-Use location for DateNight; PrivacyInfo updated

## Reviewer path (summary)

1. Sign in as **Opal**
2. AI Match tab → scroll to DateNight
3. Keyword e.g. `delis` → Find → open Book table deep-link

## Binary

| Item    | Value                                 |
| ------- | ------------------------------------- |
| Archive | `build/Mangasm.xcarchive`             |
| IPA     | `build/export/Mangasm.ipa`            |
| Upload  | Transporter / fastlane `upload_build` |

## Git

- Branch: `ci/ios-build-25` (build number 26 on same line) or successor
- `CURRENT_PROJECT_VERSION: "26"`
