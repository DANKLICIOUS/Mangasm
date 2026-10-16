# App Store Review Notes — Mangasm (com.mangasm.app)

**Build for this notes set:** **1.1.0 (37)** · Skull Island identity + Events  
**Live ASC:** attach build **37** (or the next free number if 37 is taken).

### Significant change (Guideline 4.3)

This version is a **significant visual and product identity change**, not a reskin of a generic dating template:

- **Skull Island** is the default chrome: launch, sign-in, and New Member profile style. Jungle, campfire, and a geological skull-mountain plate — not a gold/Lambo luxury grid.
- **Events remain the differentiator:** default landing tab is Events (Circle / Open Door / Social Mixer) with host-approved addresses.
- Cosmetic **Community Reputation** styles (Skull Island, Aspirational, Precision Tech, Digital Flow, Bold Expression) never unlock messages or adult features.
- Backend style id for Skull Island remains `calmStudio` (storage only). Reviewers will see the name **Skull Island**.

> Paste **Demo Account** + **Notes** into App Store Connect → version → **App Review Information**.  
> Do not invent credentials — provision via `./scripts/provision-demo-reviewer.sh` then paste.

---

## Demo Account (Sign-In required: YES)

> ⚠️ The app is login-gated. Sign-in is **Email + Password only** — there is no Sign in with Apple.  
> There is **no username-only field** and **no phone OTP** on the live sheet.  
> Giving a bare name like `Opal` or an OTP path causes **Guideline 2.1** rejection.

```
Email:     privacy@mangasm.app   (or the email printed by provision-demo-reviewer.sh)
Password:  [SET from provision script / secrets.env MANGASM_DEMO_PASSWORD — never invent]
```

### Pre-submit verification (all must be ✅)

- [ ] Demo user **exists in Supabase Auth**, **email confirmed**
- [ ] Password grant works: same email + password → access token
- [ ] Clean install of the **attached** build signs in with those credentials
- [ ] Archived binary embeds `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` (no B3 launch crash)
- [ ] ASC **Username** field = full **email**, not `Opal`

Provision (needs service_role once):

```bash
export SUPABASE_SERVICE_ROLE_KEY='…'
./scripts/provision-demo-reviewer.sh
```

---

## Notes for Reviewer (paste into Notes)

Mangasm is a safety-first social app for adult gay men (18+).

This version is a significant change from prior submissions: the app’s visual identity is **Skull Island** (jungle / campfire chrome on launch, sign-in, and the default New Member profile style). It is not a generic dating-app template. Member-hosted **Events** (Circle, Open Door, Social Mixer) with host-approved addresses remain the core differentiator. Community Reputation unlocks cosmetic styles only.

### HOW TO TEST (email + password — there is NO phone OTP field)

1. Launch the app. Affirm 18+ / Terms on the sign-in sheet if prompted.
2. On Sign In, use **Email + Password** — it is the only sign-in method.
3. Use the demo account from App Review Information (Username = full email).
4. After sign-in you land on **Events** (Circle / Open Door / Social Mixer). Then open **Discover** to browse profiles.
5. Open **AI Match** (center lamp tab) → scroll to **RSVP A FIRST DATE** (DateNight). Enter a ZIP or Allow location → **Find**.
6. **Report / Block:** profile or chat → overflow menu.
7. **Delete account:** Settings → Delete Account (prefer Report/Block smoke if you must preserve the demo user).
8. **Mangasm+ paywall:** Profile → Upgrade to Mangasm+ → Monthly (`Mangasm2cute4u001`) and 3-Month (`Mangasm0001`). StoreKit only; no Stripe in this binary.

### Guideline 1.2 (UGC)

1. Filter objectionable content on profiles and messages.
2. **Report** — chat or match detail → overflow → Report.
3. **Block** — same menus; thread leaves the inbox.
4. **Delete account** — Settings → server purge + sign out.

### Location

DateNight may use **optional** When-In-Use GPS **or** a typed ZIP. App functionality only — not ads/tracking. Discover “map” remains a stylized illustration.

### Encryption

HTTPS in transit. DMs use Apple CryptoKit (Curve25519 sealed boxes); server stores ciphertext. ITSAppUsesNonExemptEncryption = NO.

### Payments

Mangasm+ uses StoreKit IAP only (`Mangasm2cute4u001` monthly, `Mangasm0001` quarterly). No Stripe checkout inside this iOS build.

---

## Pre-submit checklist

- [x] Team ID `854XZ2543V`
- [x] Notes describe email/password (not phone OTP) — ASC notes patched 2026-08-03
- [ ] Demo EMAIL + password provisioned + verified against Supabase
- [ ] ASC App Review fields match verified demo
- [ ] Nutrition label location fields match DateNight if GPS used
- [ ] IAP products complete (`Mangasm0001` was MISSING_METADATA) and attached
- [ ] Preferred binary: attach build **37** if it is the intended review build
- [x] Privacy policy URL live (mangasm.app/privacy **200**)
