# Project Index: Mangasm (iOS / SwiftUI)

> **Structure section is stale (2026-07-19).** File counts, the migration range,
> and the Domain listing have drifted. See `docs/STRUCTURE.md` (2026-08-11) for
> verified layout and inventory. The entry-point, module, and service tables
> below are hand-maintained and still current.

Generated: 2026-07-19  
Path: `~/dev/mangasm/Mangasm` · remote: `gothamgodzilla/Mangasm`  
Last ship note: `c74de2a` Block dissolves chat then purges thread

## 📁 Project Structure

```
Mangasm/
├── App/iOS/                 # @main iOS host (MangasmiOSApp)
├── Sources/
│   ├── MangasmApp/          # Library: UI + models + services
│   │   ├── DesignSystem/    # Theme, glass, components
│   │   ├── Features/        # Chat, Discover, Events, Match, Profile, Settings
│   │   ├── Launch/          # Splash, age gate, sign-in, skyline
│   │   ├── Models/          # Profile, Candidate, Message, Conversation, …
│   │   ├── Services/        # Protocols, Mocks, Live/*, Domain/*, StoreKit
│   │   └── Shell/           # AppState, tabs, root, top bar
│   └── MangasmPreview/      # macOS @main preview window
├── Tests/
│   ├── MangasmAppTests/     # SPM unit tests (ServiceTests, DomainLogic, …)
│   └── iOS/                 # UI + Unit (simulator-oriented)
├── supabase/                # Client-adjacent migrations + edge stubs
│   ├── migrations/          # 0001–0006 (may diverge from mangasm-backend)
│   └── functions/           # delete-account, validate-referral, verify-purchase
├── scripts/                 # archive, upload, tests, secrets helpers
├── fastlane/                # ASC automation
├── docs/                    # readiness, handoff, marketing, superpowers specs
├── web/                     # .well-known + vercel.json
├── Package.swift            # SPM 6.0 · iOS 17 / macOS 14
├── project.yml              # XcodeGen
├── Mangasm.storekit         # StoreKit config
└── APP_REVIEW_NOTES.md
```

**Swift files:** ~78 (excl. `.build`)

## 🚀 Entry Points

| Entry | Path | Purpose |
|-------|------|---------|
| iOS app | `App/iOS/MangasmiOSApp.swift` | `@main` production host |
| Preview | `Sources/MangasmPreview/main.swift` | `swift run MangasmPreview` |
| Root UI | `Shell/MangasmRootView.swift` | Window content |
| DI | `Services/AppEnvironment.swift` | Mock vs live Supabase wiring |
| Config | `Services/SupabaseConfig.swift` | URL + publishable key from Info.plist |

**Quick start**

```bash
swift run MangasmPreview   # macOS canvas
swift test                 # unit suite
open Package.swift         # Xcode
./scripts/run-all-tests.sh
```

## 📦 Core Modules

### Shell
- `AppState`, `MainTabView`, `MangasmRootView`, `TopBar` — navigation + session shell

### Features
- **Chat:** `ChatListScreen`, `ChatThreadScreen` (block → dissolve → `removeConversation`)
- **Discover:** map-style discover + `FakeMap`
- **Match:** AI match, detail, compat UI
- **Events / Communities:** host form, cards, M+ upsell via StoreKit
- **Profile / Settings**

### Services (protocol seam)
| Protocol | Mock | Live |
|----------|------|------|
| Auth | MockAuthService | SupabaseAuthService ✅ |
| Profile | Mock | SupabaseProfileService ✅ |
| Match | Mock | SupabaseMatchService ✅ |
| **Chat** | Mock | **SupabaseChatService** ✅ (2026-07-19) |
| Events | Mock | ❌ |
| Reputation | Mock | ❌ |
| Safety | Mock | SupabaseSafetyService ✅ |
| Referrals | Mock | SupabaseReferralService ✅ |

Live `makeDefault()` wires **SupabaseChatService**. Block purge = local clear + `purge_conversation_with` RPC (migration `0006` / iOS `0007`).

### Domain (pure logic)
- `BlockPolicy` — bidirectional blocks
- `ChatInboxCache` — pure local DM inbox (shared by mock + live chat; unit-tested)
- `AgeGate`, `OnboardingConsent`, `MessageCrypto`, `PremiumResolver`, `ReferralCode`, `SignInNonce`

### Store / revenue
- `StoreKitStore` + `MangasmProduct` (monthly / quarterly)
- Server verify via `verify-purchase` edge function base URL
- Upsell UI in `EventsView`

### Design system
- `Theme`, `Components` (Pill, Chip, MGCard, RepRing…), glass / weather FX

## 🔧 Configuration

| File | Purpose |
|------|---------|
| `Package.swift` | SPM targets + supabase-swift |
| `project.yml` | XcodeGen project |
| `App/iOS/Info.plist` | Bundle keys (SUPABASE_* expected) |
| `Mangasm.storekit` | Local IAP testing |
| `ExportOptions*.plist` | Archive / upload |
| `supabase/config.toml` | Local Supabase CLI |
| `.github/workflows/codeql.yml` | CodeQL |
| `.mcp.json` | MCP for this repo |

**Dependency:** `supabase/supabase-swift` ≥ 2.0

## 🧪 Tests (~20 files)

| Suite | Examples |
|-------|----------|
| Unit (SPM) | `ServiceTests`, `DomainLogicTests` (BlockPolicy), `AccountDeletionLogicTests`, `ComplianceTests`, `StoreKit` related, mapping tests |
| UI | `AccountDeletionTests`, `OnboardingGateTests`, `AccessibilityTests`, `MangasmUITests` |

**Focus after safety work:** block dissolve + `removeConversation` in `ServiceTests` / domain.

## 📚 Documentation

| Doc | Topic |
|-----|--------|
| `README.md` | Package overview + run |
| `APP_REVIEW_NOTES.md` | ASC review |
| `docs/production-readiness.md` | Ship checklist |
| `docs/backend-integration.md` | Live wiring |
| `docs/superpowers/specs/*` | Auth / roadmap specs |
| `docs/marketing/*` | Launch content |

## ⚠️ High-risk / ship-critical paths

1. **Apply `purge_conversation_with`** on live Supabase (`0006` backend / `0007` iOS tree)  
2. **Deploy** hardened `delete-account` + `verify-purchase` edge functions  
3. **Dual migration trees** — backend is DB SoT; reconcile before dual push  
4. **Codesign** — human gate (0 identities) — see `~/mastermind-ai/mangasm/ASC-CODESIGN-UNLOCK.md`  
5. **IAP first $** — ASC product IDs + Apple IAP key env — `IAP-PATH-CHECKLIST.md`  
6. **Events / reputation** still mock in live DI

## 🔗 Related repos / ops

| Asset | Path |
|-------|------|
| Backend | `~/mangasm-backend` |
| Goals | `~/dev/mangasm/GOALS.md` |
| SuperClaude map | `~/mastermind-ai/mangasm/SUPERCLAUDE-MAP.md` |
| Landing / status | `~/mastermind-ai/mangasm/campaign/landing/` |
| ASC Chrome playbook | `~/mastermind-ai/asc-claude-chrome/` |

## 📝 Suggested next commands

```text
/sc:test          → ServiceTests + block dissolve
/sc:implement     → SupabaseChatService + wire AppEnvironment.makeDefault()
@backend-architect → align migrations with mangasm-backend
@security-engineer → Guideline 1.2 block/report/delete audit
```
