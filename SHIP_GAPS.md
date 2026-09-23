# Ship Gaps & TestFlight / App Store Release Checklist

This document tracks current blockers, human-only operations, and production readiness requirements for **Mangasm** (`com.mangasm.app`) across iOS, Android, Supabase backend, and Web surfaces.

---

## 🚨 Top Blockers to TestFlight / App Store Approval

### 1. App Store Reviewer Demo Account & Login Path (Guideline 2.1)
- **Status:** Critical Review Blocker.
- **Issue:** The iOS app uses **Email + Password** login. Previous ASC review notes historically mentioned Phone + OTP, which caused immediate rejection. Additionally, demo user credentials must exist, be pre-confirmed in Supabase Auth (`dvomzrvslwdabwcwtvrg`), and be validated before review submission.
- **Required Action:** 
  1. Run `./scripts/provision-demo-reviewer.sh` with `SUPABASE_SERVICE_ROLE_KEY` to provision/verify the demo reviewer account.
  2. In App Store Connect under **App Review Information**, set Username to the full email (e.g. `privacy@mangasm.app`) and Password from the provision step.
  3. Ensure Review Notes match `APP_REVIEW_NOTES.md` (explicitly stating Email/Password sign-in).

### 2. In-App Purchase (StoreKit) Product Configuration (Guideline 3.1.1)
- **Status:** Metadata & Attachments Incomplete.
- **Issue:** 
  - Monthly subscription `Mangasm2cute4u001` ($9.99/mo) is `READY_TO_SUBMIT`.
  - Quarterly subscription `Mangasm0001` ($24.99/3-mo) has been flagged as `MISSING_METADATA` in App Store Connect.
- **Required Action:**
  - Owner must complete the subscription metadata, localization descriptions, and review screenshot in App Store Connect for `Mangasm0001`.
  - Both IAP products must be attached to the release version before submission.
  - Server-side purchase verification Edge Function (`verify-purchase`) must be deployed with Apple Root Certificates / App Store Server API credentials.

### 3. UGC Moderation & Reporting Compliance (Guideline 1.2)
- **Status:** Functional in-app; requires operational backend pipeline.
- **Requirements:**
  - In-app Block and Report actions are implemented (`SupabaseSafetyService` & `purge_conversation_with` RPC).
  - Account deletion is implemented (`delete-account` Edge function & in-app settings trigger).
  - Published Terms of Service and Privacy Policy must be reachable via `https://mangasm.app/terms` and `https://mangasm.app/privacy` (currently returning 200).
  - An operational 24-hour moderation response workflow must be monitored by the team.

---

## 👤 Human-Only Steps Checklist (Owner Action Items)

### A. Apple Developer & App Store Connect (ASC)
- [ ] **Code Signing & Distribution Certificates:** Ensure valid "Apple Distribution" certificate and App Store provisioning profile ("Mangasm App Store") are configured in the Apple Developer portal under Team ID `854XZ2543V`.
- [ ] **App Store Connect API Key:** Generate and download `AuthKey_<KEY_ID>.p8` for ASC API automation (used by Fastlane and CI). Set `APP_STORE_CONNECT_API_KEY_KEY_ID`, `APP_STORE_CONNECT_API_KEY_ISSUER_ID`, and `APP_STORE_CONNECT_API_KEY_KEY_FILEPATH`.
- [ ] **Attach Build:** Confirm the intended build (e.g., Build 31 or newer) is selected for the release version in App Store Connect.
- [ ] **IAP In-App Purchases:** Fix metadata for `Mangasm0001` and attach both `Mangasm2cute4u001` and `Mangasm0001` to the version.
- [ ] **App Review Notes:** Copy full notes from `APP_REVIEW_NOTES.md` into App Store Connect review information.
- [ ] **Privacy Nutrition Labels:** Verify declared data types in ASC (Contact Info, Location, Identifiers, User Content, Financial Info for subscriptions).

### B. Secrets & Environment Configuration
- [ ] **Supabase Edge Functions Secrets:**
  - Deploy edge functions (`delete-account`, `verify-purchase`, `validate-referral`, `stripe-checkout`, `stripe-webhook`).
  - Set secrets via `supabase secrets set`:
    - `APPLE_ROOT_CA` / App Store credentials for receipt/transaction validation
    - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (for web billing on mangasm.app/plus)
- [ ] **iOS Client Secrets (`Secrets.xcconfig`):**
  - Populate `SUPABASE_PUBLISHABLE_KEY` (anon key for project `dvomzrvslwdabwcwtvrg`).
  - (Optional) Populate `YELP_API_KEY` and `TICKETMASTER_API_KEY` for live Date Night discovery.
  - In Xcode Cloud, add these under Environment Variables as documented in `docs/ship/XCODE-CLOUD-SECRETS.md`.
- [ ] **Vercel Web Secrets:**
  - Set `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` in Vercel project environment for `/api/public-config`.
  - Set `RESEND_API_KEY`, `WAITLIST_FROM`, and `WAITLIST_NOTIFY_TO` for waitlist emails.

### C. Android & Google Play (Separate Path)
- [ ] **Google Cloud Project & OAuth:** Configure GCP OAuth Consent Screen and create Android + Web OAuth Client IDs matching `app.mangasm.android`.
- [ ] **Play Console Setup:** Create App listing `Mangasm`, complete Data Safety questionnaire, Content Rating (18+), and configure Play App Signing.
- [ ] Note: Android remains a placeholder scaffold; iOS is the primary target for initial launch.

---

## 🚢 Production Release Verification

Before submitting the build for final App Store Review:
1. **Clean Install Smoke Test:** Install the exact TestFlight build on a physical device.
2. **Auth Verification:** Sign in with reviewer credentials (`privacy@mangasm.app`).
3. **Safety Verification:** Test block and report from a profile and chat thread.
4. **Paywall Verification:** Verify StoreKit paywall displays local currency prices from StoreKit configuration.
5. **Account Deletion Test:** Verify Account Deletion in Settings cleanly revokes sessions and executes deletion.
