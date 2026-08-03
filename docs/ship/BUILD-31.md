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
