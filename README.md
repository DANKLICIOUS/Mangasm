# Mangasm — SwiftUI Front-End

Mangasm is a safety-first gay dating app. This repository is the **SwiftUI front-end package**, wired to a mock service layer. Every auth control, service call, and data fetch goes through a protocol seam so the mock can be replaced with a real backend without touching the UI.

## What this repo is

- A multiplatform Swift Package (`swift-tools-version: 6.0`).
- Library target `MangasmApp` — all screens, design system, models, and service protocols.
- Executable target `MangasmPreview` — a macOS `@main` entry point so `swift run` opens a live preview window.
- Test target `MangasmAppTests` — unit tests for `AppState`, `Theme`, `Models`, `Services`, and `Skylines`.

The iOS app target is the deliverable; the macOS preview target exists so every engineer can run and inspect every screen without a device or simulator.

## Quick start

### macOS preview window

```bash
swift run MangasmPreview
```

Opens a resizable window sized to an iPhone canvas (402 × 874). All screens are navigable: splash → sign-in → tabs (Discover / Search / AI Match / Likes / Profile) with a Settings sheet reachable from the top bar.

### Open in Xcode / build for iOS Simulator

```bash
open Package.swift
```

Select the `MangasmApp` scheme, choose any iOS Simulator, and run. Alternatively:

```bash
xcodebuild -scheme MangasmApp -destination 'generic/platform=iOS Simulator' build
```

### Run tests

```bash
swift test
```

Expected: 85 tests, 0 failures across `AppStateTests`, `ModelTests`, `ServiceTests`, `SkylineTests`, `ThemeTests`, and the compliance/crypto/chat suites.

## Architecture

```
Sources/
  MangasmApp/
    DesignSystem/     — Theme.swift, Glass.swift, Components.swift,
                        LamborghiniBackground.swift, WeatherFX.swift
    Models/           — Models.swift  (Profile, Candidate, Conversation, …)
    Services/         — Protocols.swift, Mocks.swift, AppEnvironment.swift
    Shell/            — AppState.swift, MangasmRootView.swift,
                        MainTabView.swift, TopBar.swift
    Launch/           — LaunchFlow.swift, SplashView.swift,
                        SignInView.swift, SkylineShapes.swift,
                        LandmarkSlides.swift
    Features/
      Profile/        — ProfileScreen.swift, ProfileParts.swift
      Discover/       — DiscoverScreen.swift, FakeMap.swift
      Match/          — AIMatchScreen.swift, CompatibilityRing.swift,
                        MatchDetailScreen.swift
      Events/         — EventsView.swift, EventCard.swift,
                        CommunitiesView.swift, HostEventForm.swift
      Chat/           — ChatListScreen.swift, ChatThreadScreen.swift
      Settings/       — SettingsScreen.swift
    Resources/        — lambo_hero.jpg, runway.mp4, Fonts/
  MangasmPreview/
    main.swift
Tests/
  MangasmAppTests/
```

### Key types

| Type                                | Role                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `AppState`                          | `@EnvironmentObject` — phase (launch/app), tab, weather, profile, selectedMatch |
| `AppEnvironment`                    | `@EnvironmentObject` — DI container holding service protocol instances          |
| `MGColor` / `MGFont` / `MGGradient` | Design-system tokens (single source of truth)                                   |
| `MangasmRootView`                   | Root router: launch phase → `LaunchFlow`; app phase → `MainTabView`             |

### Routing flow

```
MangasmRootView
  └── LaunchFlow         (AppPhase.launch)
        ├── SplashView   (runway video + CTA)
        └── SignInView   (landmark slides + auth sheet)
  └── MainTabView        (AppPhase.app)
        ├── DiscoverScreen   (.discover / .search / .likes)
        ├── AIMatchScreen    (.aiMatch)
        ├── ProfileScreen    (.profile)
        ├── ChatListScreen   (modal, opened from match detail)
        └── SettingsScreen   (modal, opened from top bar)
```

## Mock → real service swap

`AppEnvironment` holds instances of the service protocols. The injected mock is `AppEnvironment.mock`. To wire a real backend:

1. Implement the protocols in `Sources/MangasmApp/Services/Protocols.swift`:
   `AuthService`, `ProfileService`, `MatchService`, `ChatService`, `EventService`, `ReputationService`.
2. Replace `AppEnvironment.mock` with an `AppEnvironment` initialised with your real implementations.
3. No view code changes required — screens read from `@EnvironmentObject var env: AppEnvironment`.

## Custom fonts

Drop `.ttf`/`.otf` files into `Sources/MangasmApp/Resources/Fonts/` and rebuild.
`Package.swift` picks them up via `.process("Resources")` and they become available in `Bundle.module`.

See `Sources/MangasmApp/Resources/Fonts/README.md` for the exact file names and download links (all SIL OFL).

Until the files are present, `MGFont` falls back transparently to system `.serif` / default / `.monospaced` — the app never hard-fails on a missing font.

## Production assets

| Asset             | Status                                    |
| ----------------- | ----------------------------------------- |
| `lambo_hero.jpg`  | Bundled — Lamborghini background photo    |
| `runway.mp4`      | Bundled — splash screen runway video      |
| Font `.ttf` files | Not bundled — add from Google Fonts (OFL) |

## Spec and plan

- Design spec: [`docs/superpowers/specs/2026-06-21-mangasm-launch-and-app-design.md`](docs/superpowers/specs/2026-06-21-mangasm-launch-and-app-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-06-21-mangasm-launch-and-app.md`](docs/superpowers/plans/2026-06-21-mangasm-launch-and-app.md)

## Release history

Version numbers live in `project.yml` (`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`); the XcodeGen project and Info.plist inherit from there.

| Version (build) | Date       | Branch                        | Changes                                                                                                                 |
| --------------- | ---------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1.1.0 (21)      | 2026-07-23 | `ci/ios-build-21`             | Build-number bump for the next App Store / TestFlight upload of `com.mangasm.app`. No code changes over build 20.       |
| 1.1.0 (20)      | 2026-07-22 | `ci/ios-build-20`             | Pre-commit hooks, graphics polish for App Review, storybook shipped on mangasm.app; archived and uploaded via fastlane. |
| 1.1.0 (19)      | —          | `ci/ios-build-19-export-auth` | Export/auth work for the 1.1.0 upload pipeline.                                                                         |

## Known limitations

_Updated 2026-07-23 — the earlier "mock-only prototype" description was stale. See `SPEC_INDEX.md` for the authoritative claim/blocker status._

- **Live/mock split** — real Supabase services live in `Sources/MangasmApp/Services/Live/` (auth, profile, match, chat, safety, referral) and are selected when `SupabaseConfig` is present in Info.plist; otherwise the app falls back to the mock environment (`AppEnvironment.swift`). Previews and tests intentionally use mocks. ⚠️ The fallback is currently unconditional — a Release archive without config silently ships all-mock services (review-polish blocker B3).
- **Live auth is email/password only** — sign-up with email confirmation, sign-in, and password reset run on Supabase (`SupabaseAuthService.swift`, `EmailAuthValidator.swift`). Sign in with Apple and the Google/phone buttons have been removed.
- **No content filter yet** — moderation/filtering on messages and profiles is not implemented (blocker B1).
- **Map is stylized, not functional** — `FakeMap` renders gradient streets and pinned avatars; no MapKit, no GPS, no location collection of any kind. Live Discover currently backfills `Candidate.samples` when the DB returns few rows (blocker B4).
- **DMs are E2E-encrypted** (`MessageCrypto.swift`, CryptoKit sealed boxes), but the client chat schema has drifted from the repo migrations and the live DB (blocker B5).
- **Placeholder art / fonts** — `lambo_hero.jpg` and `runway.mp4` are the bundled prototype assets. Custom OFL fonts are not included; system fallbacks are active.
- **macOS preview is a dev tool** — `MangasmPreview` is excluded from the iOS product; it exists solely to let engineers run screens on a Mac.

---

## Web Cash Path — Stripe Mangasm+ Configuration

Mangasm operates a web-first cash register on `mangasm.app/plus` without blocking on App Store review:
- Pricing: **$9.99/mo** (Monthly) · **$24.99/3mo** (3-Month / quarterly).
- Entitlements: Web subscriptions directly sync to `billing_subscriptions` and `profiles.premium` via PostgreSQL triggers (`supabase/migrations/0012_web_billing.sql`).

### 1. Vercel Environment Variables (`mangasm` / `mangasm-landing` / `web`)

Configure the following environment variables in your Vercel Project Settings (Settings → Environment Variables):

| Variable | Target | Description | Example / Notes |
| -------- | ------ | ----------- | --------------- |
| `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`) | Production, Preview | Public client key for live Supabase project | `sb_publishable_...` |
| `SUPABASE_URL` | Production, Preview | Live Supabase project URL | `https://dvomzrvslwdabwcwtvrg.supabase.co` |
| `RESEND_API_KEY` | Production, Preview | API key for transactional waitlist emails | `re_...` |
| `WAITLIST_NOTIFY_TO` | Production | Admin destination for signup notifications | `bae@slay.llc` |
| `WAITLIST_FROM` | Production | From email address | `Mangasm Rebuild <bae@slay.llc>` |

> **Security Note:** Never set `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` in Vercel client environment variables. `/api/public-config` strips all private keys.

### 2. Supabase Edge Functions Secrets (`supabase secrets set`)

Deploy and configure the edge functions:

```bash
# Set secrets in live Supabase project
supabase secrets set \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  STRIPE_PRICE_MONTHLY="price_1TyJDiGxbhrlkJVl4YOUgZat" \
  STRIPE_PRICE_QUARTERLY="price_1TyJDsGxbhrlkJVlHDwNtO1Y" \
  CHECKOUT_SUCCESS_URL="https://www.mangasm.app/plus/success" \
  CHECKOUT_CANCEL_URL="https://www.mangasm.app/plus"

# Deploy functions (JWT verification handled in handler)
supabase functions deploy stripe-checkout --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
```

### 3. Stripe Dashboard Setup

1. **Create Products & Recurring Prices:**
   - **Mangasm+ Monthly:** $9.99 USD / month recurring (`STRIPE_PRICE_MONTHLY`).
   - **Mangasm+ 3-Month:** $24.99 USD / every 3 months recurring (`STRIPE_PRICE_QUARTERLY`).
2. **Enable Payment Methods:**
   - In Stripe Dashboard → Settings → Payment methods: Enable **Card**, **Cash App Pay**, **Apple Pay**, **Google Pay**, and **Link**.
3. **Register Webhook Endpoint:**
   - URL: `https://dvomzrvslwdabwcwtvrg.supabase.co/functions/v1/stripe-webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy Signing Secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.

### 4. Billing Provider Evaluation: Stripe vs. Whop

| Dimension | Stripe (Current Implementation) | Whop (Alternative Evaluation) |
| --------- | -------------------------------- | ----------------------------- |
| **Transaction Fees** | Standard 2.9% + $0.30 per charge | 3.0% platform fee + merchant processing fees (~5.9% + 30¢ total on basic tiers) |
| **Merchant of Record (MoR)** | Mangasm is MoR (direct control over funds, disputes, payouts) | Whop acts as MoR / reseller (simplified global tax, but payout holds & dispute fees) |
| **Payment Methods** | Native Card, Apple Pay, Google Pay, **Cash App Pay**, ACH | Cards, Apple Pay, Google Pay, Crypto, Discord/Telegram bot integration |
| **Integration Complexity** | **Already 100% built in repo** (DB triggers, Edge Functions, webhook signature check, `web/plus.html`) | Requires new webhook translator, custom redirect URLs, and dual customer reconciliation |
| **Entitlement Sync** | Zero latency: Webhook updates `billing_subscriptions` → trigger flips `profiles.premium` | Webhook → Edge Function → custom mapping to user profile |
| **Recommendation** | **Keep Stripe as primary web cash register**; keep Whop in evaluation for potential creator/community monetization tiers if needed later. |

