# Ship — Mangasm build 26

**Bundle ID:** `com.mangasm.app`  
**Marketing version:** 1.1.0  
**CFBundleVersion:** 26  
**Team:** 854XZ2543V  
**Feature:** DateNight Discovery (Yelp restaurants + events, dual ≤10 mi, deep-link book)  
**Uploaded:** 2026-07-24 via iTMSTransporter (exit 0)

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

| Item            | Value                                            |
| --------------- | ------------------------------------------------ |
| Archive         | `build/Mangasm.xcarchive`                        |
| IPA             | `build/export/Mangasm.ipa` (~11.4 MB)            |
| Version         | **1.1.0 (26)**                                   |
| Supabase URL    | clean `https://dvomzrvslwdabwcwtvrg.supabase.co` |
| Yelp key        | Embedded (len 128)                               |
| Location string | DateNight When-In-Use                            |

## App Store Connect

```text
Transporter: 1 package uploaded successfully
/Users/babe/mangasm/build/export/Mangasm.ipa
Watch TestFlight → Builds for 1.1.0 (26) → VALID
App ID: 6776317775
```

## App Review (ASC paste)

From `APP_REVIEW_NOTES.md`:

- Demo username **Opal** · password from `MANGASM_DEMO_PASSWORD`
- Notes include full DateNight exercise path for reviewers

## Git

- Branch: `ci/ios-build-25`
- `CURRENT_PROJECT_VERSION: "26"`
