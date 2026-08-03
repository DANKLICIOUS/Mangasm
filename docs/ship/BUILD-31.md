# Mangasm 1.1.0 (31)

**Date:** 2026-08-03  
**Branch:** feature/appstore-compliance  
**Bundle:** com.mangasm.app

## Includes

- Community Reputation / Trust Score (SDT-safe formula, no VR core)
- Hybrid profile styles + hero assets + badge icons
- AppPhase FSM, How Trust Score works screen
- RN theme-provider package + Android Play placeholder shell
- iOS widget shell (App Group bridge)

## Ship steps

1. `./scripts/archive-build.sh`
2. `./scripts/upload-build.sh`
3. ASC → TestFlight → Builds → 1.1.0 (31)

## Status 2026-08-03

| Step       | Result                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------ |
| Commit     | `ae9c83b` + prior feature commits on `feature/appstore-compliance`                         |
| Push       | OK → origin                                                                                |
| PR         | https://github.com/gothamgodzilla/Mangasm/pull/22                                          |
| Web deploy | Vercel `gothamganesh/web` production deploy initiated                                      |
| Archive    | **BLOCKED** — `Invalid trust settings` on `iPhone Distribution: Mark Webster (854XZ2543V)` |

### Unblock archive (human · ~1 min)

1. Open **Keychain Access**
2. Search **Apple Worldwide Developer Relations** and **iPhone Distribution: Mark Webster**
3. Double-click → **Trust** → set all to **Use System Defaults**
4. Close dialogs; run:

```bash
cd ~/dev/mangasm/mangasm   # or ~/mangasm
./scripts/archive-build.sh
./scripts/upload-build.sh
```

Root cause: intermediate WWDR CA had custom trust (TrustAsRoot + allow expired), which breaks codesign validation for the Distribution leaf.
