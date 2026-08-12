# Structure Index — Mangasm

Generated 2026-08-11 from `fix/ui-tests-email-auth`. Verified against the working
tree, not carried over from a previous index.

Supersedes the structure section of `PROJECT_INDEX.md` (generated 2026-07-19),
which had drifted — see [Drift corrected](#drift-corrected). The entry-point and
module notes in that file are still hand-maintained and remain authoritative;
this document covers layout and inventory only.

Related: `SPEC_INDEX.md` reconciles environments and App Review claims and wins
over any sibling that disagrees with it. `CONTEXT.md` defines domain vocabulary
(Community Reputation, Trust Score).

## Repository layout

```
mangasm/
├── App/iOS/              @main iOS host (MangasmiOSApp)
├── Sources/
│   ├── MangasmApp/       Library: UI + models + services
│   │   ├── DesignSystem/ Theme, glass, components
│   │   ├── Domain/       Pure logic, no I/O
│   │   ├── Features/     Chat, Discover, Events, Match, Profile, Settings
│   │   ├── Launch/       Splash, age gate, sign-in
│   │   ├── Models/       Profile, Candidate, Message, Conversation, …
│   │   ├── Resources/    Bundled assets
│   │   ├── Services/     Protocols, Mocks, Live/*, StoreKit
│   │   └── Shell/        AppState, tabs, root, top bar
│   └── MangasmPreview/   macOS @main preview window
├── Tests/
│   ├── MangasmAppTests/  SPM unit tests
│   └── iOS/              UI + Unit (simulator)
├── supabase/
│   ├── migrations/       0001–0011
│   └── functions/        _shared, delete-account, validate-referral,
│                         verify-purchase
├── Android/              Separate app + Play listing copy
├── packages/             theme-provider
├── mcp/                  outreach tooling
├── web/                  Marketing site, privacy policy, waitlist API
├── scripts/              Archive, upload, tests, provisioning
├── fastlane/             ASC automation
├── ci_scripts/           Xcode Cloud hooks
└── docs/                 handoff, marketing, pdca, ship, superpowers
```

## Inventory

| Type | Count |
|------|-------|
| Swift | 125 |
| Markdown | 94 |
| Shell | 18 |
| SQL | 15 |
| HTML | 11 |
| JavaScript | 8 |
| TypeScript | 6 |

## Database migrations

| Migration | Purpose |
|-----------|---------|
| `0001_mangasm_init` | Base schema |
| `0002_mangasm_extended` | Legacy `messages`, `blocks`, `reports` |
| `0003_mangasm_auth_safety` | Auth + safety |
| `0004_perf_security_hardening` | Performance and RLS |
| `0005_merge_permissive_policies` | Policy consolidation |
| `0006_cartoon_referral_program` | Referrals |
| `0007_purge_conversation` | `purge_conversation_with` RPC |
| `0008_canonical_flat_messages` | Message model |
| `0009_guideline12_safety` | `user_blocks`, `content_reports`, `is_blocked_pair` |
| `0010_apple_credentials` | Legacy Apple rows (revoke-only) |
| `0011_report_content_targets` | Report targets |

## Edge functions

| Function | Status |
|----------|--------|
| `delete-account` | Live — purges legacy tables, revokes legacy Apple tokens |
| `validate-referral` | Live |
| `verify-purchase` | Live |
| `_shared/apple.ts` | Retained for legacy `apple_credentials` revoke only |

## Auth

**Email-only** as of the email-only switch. Sign in with Apple was removed from
all client paths; `supabase/config.toml` pins `[auth.external.apple] enabled =
false`. The `_shared/apple.ts` helper and migration `0010` survive deliberately
so existing `apple_credentials` rows can still be revoked on account deletion —
deleting them would strand those users.

`docs/superpowers/specs/2026-06-21-mangasm-phase1-auth-spec.md` still mandates
"Sign in with Apple (primary)" and is **superseded**, not violated. Guideline 4.8
binds only when a third-party social login is offered; with none, it is moot.
That spec needs a supersession note.

## Drift corrected

`PROJECT_INDEX.md` (2026-07-19) states:

- **"~78 Swift files"** — actual count is **125**.
- **"migrations 0001–0006"** — actual range is **0001–0011**.
- Lists **`SignInNonce`** under Domain — removed by the email-only auth cleanup.
- Omits `Android/`, `packages/`, `mcp/`, and `ci_scripts/`, all of which exist.
- Describes `web/` as ".well-known + vercel.json" — it now holds the marketing
  site, privacy policy, and waitlist API.
- Lists `Sources/MangasmApp/Domain/` nested under `Services/`; it is a sibling.

## Known inconsistency

`web/privacy.html:79` asserts "Blocking is bidirectional." The client filters on
`blocker_id` only (`SupabaseMatchService.swift:129`,
`SupabaseSafetyService.swift:72`), so it fetches rows the viewer created and
never rows where the viewer is `blocked_id`. Migration `0009` ships an
`is_blocked_pair(a,b)` helper for symmetric filtering that is **called from
nowhere** in Swift or TypeScript. The published claim is ahead of the
implementation.
