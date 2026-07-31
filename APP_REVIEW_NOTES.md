# App Store Review Notes — Mangasm (com.mangasm.app)

**Build for this notes set:** **1.1.0 (30)** · DateNight Discovery ship

> Paste the **Demo Account** + **Notes** sections below into App Store Connect →  
> your version → **App Review Information**. Do not invent credentials — use the Opal account from masterlist / secrets.

---

## Demo Account (App Review Information → Sign-In required: YES)

> ⚠️ The app is login-gated and the sign-in screen has **an EMAIL field only** — there is
> **no username field**. The reviewer MUST be given a working **email + password**. Giving
> a bare username (e.g. "Opal") makes Supabase reject the login → **Guideline 2.1 rejection.**
> Reviewers cannot use Sign in with Apple for testing.

```
Email:     [the email address of the Opal demo account — e.g. opal@mangasm.app —
            from masterlist / secrets; must be a real email, NOT the word "Opal"]
Password:  [SET in ASC App Review Information from MANGASM_DEMO_PASSWORD — never invent]
```

### Pre-submit verification checklist (all must be ✅ before submitting)

- [ ] The Opal user **exists in Supabase Auth** with the exact email above.
- [ ] Its password matches what you enter in ASC → App Review Information.
- [ ] On a **clean install** of the archived build, that email + password **signs in successfully**
      (this catches both the login mismatch and a B3 launch-crash from missing Supabase config).
- [ ] Secrets (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) are populated in the archived
      binary — a Release build without them **fatalErrors on launch** (past B3 crash, builds 20–22).

---

## Notes for Reviewer (paste into the Notes field)

Mangasm is a safety-first social app for adult gay men. Sign in with the **Opal** demo
account above.

### What is new in build 30 — DateNight (please exercise)

1. Sign in as **Opal**.
2. Open the **AI Match** tab (center lamp / lightbulb tab).
3. Scroll to **“RSVP A FIRST DATE”** (DateNight Discovery).
4. Optionally enter a **keyword** (e.g. `delis`, `sushi`) and/or a **ZIP**, or leave
   **Use my GPS** on (iOS may prompt for When In Use location — OK to Allow or Deny;
   ZIP works without GPS).
5. Tap **Find**. You should see restaurant and/or event cards within ~10 miles of
   **both** you and the featured match (party of 2).
6. Tap **Book table** / **Get tickets** — the app opens the provider **deep link**
   (Yelp or Ticketmaster) in Safari / the partner app. We do **not** take payments
   or complete table booking inside Mangasm.
7. On a Yelp restaurant card, expand **Yelp reviews (up to 3)** if the control is
   shown (requires a live Yelp key; offline builds may show demo fixtures).

**How DateNight works (for review):**

- Restaurants: Yelp Fusion search (keyword + lat/lon).
- Events: Yelp Events search when available + Ticketmaster Discovery when configured.
- Booking/ticketing: **deep-link only** (Safari / partner app).
- Proximity rule: places must sit within **10 miles of both** people.
- Offline / missing keys: deterministic mock venues so the UI remains reviewable.

### Guideline 1.2 (UGC) — still present

1. **Filter objectionable content** — applied to profiles and messages.
2. **Report** — chat thread or match detail → overflow → Report.
3. **Block** — same menus → Block; thread dissolves and leaves the inbox.
4. **Delete account** — Settings → Delete Account (server purge + sign out).

### Location (build 30 update — honest disclosure)

DateNight may use **optional** location to find nearby restaurants/events:

- **GPS (When In Use)** if the reviewer allows the system prompt, **or**
- **ZIP code** typed on the DateNight section (no GPS required).

Purpose is app functionality only (local date suggestions). Location is **not** used
for advertising or tracking. The Discover “map” remains a stylized illustration;
member card “distance” text may still be self-reported profile copy.

Please update the App Privacy nutrition label to include **Precise Location** and/or
**Coarse Location** as “App Functionality,” optional, not linked to tracking, if not
already aligned with this binary.

### Encryption

HTTPS in transit. Direct messages use Apple CryptoKit (Curve25519 sealed boxes);
server stores ciphertext only. ITSAppUsesNonExemptEncryption = NO.

### Payments

Mangasm+ uses StoreKit IAP only (`Mangasm2cute4u001` monthly, `Mangasm0001` quarterly).
No Stripe checkout inside this iOS build.

---

## Pre-submit checklist

- [x] Team ID `854XZ2543V`
- [x] Build **30** notes describe DateNight path for reviewers
- [ ] Demo **EMAIL** + password for the Opal account pasted into ASC App Review Information
      (email address, **not** the bare word "Opal" — the app has no username field)
- [ ] Opal user confirmed in Supabase Auth; email + password sign in on a clean install of build 30
- [ ] Nutrition label location fields match DateNight (GPS/ZIP)
- [ ] IAP products Ready to Submit and attached to version
- [ ] Attach build **30** to the iOS version after processing
- [ ] Privacy policy URL live
