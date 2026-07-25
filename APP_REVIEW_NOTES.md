# App Store Review Notes — Mangasm (com.mangasm.app)

**Build for this notes set:** **1.1.0 (26)** · DateNight Discovery ship

> Paste the **Demo Account** + **Notes** sections below into App Store Connect →  
> your version → **App Review Information**. Do not invent credentials — use Opal from masterlist / secrets.

---

## Demo Account (App Review Information → Sign-In required: YES)

> ⚠️ The app is login-gated. Reviewers **cannot** use Sign in with Apple for testing, so  
> you MUST supply a working **email/password** (or username/password) demo login.

```
Username:  Opal
Password:  [SET in ASC App Review Information from MANGASM_DEMO_PASSWORD — never invent]
```

(Opal is the fixed TestFlight / App Review demo account. Create or confirm the matching
user in Supabase Auth before submission; verify login on a clean install.)

---

## Notes for Reviewer (paste into the Notes field)

Mangasm is a safety-first social app for adult gay men. Sign in with the **Opal** demo
account above.

### What is new in build 26 — DateNight (please exercise)

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

### Location (build 26 update — honest disclosure)

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
- [x] Build **26** notes describe DateNight path for reviewers
- [x] Demo username **Opal** (password only in secrets / ASC form)
- [ ] Paste Notes + Opal password into ASC App Review Information
- [ ] Nutrition label location fields match DateNight (GPS/ZIP)
- [ ] IAP products Ready to Submit and attached to version
- [ ] Attach build **26** to the iOS version after processing
- [ ] Privacy policy URL live
