# DateNight Discovery Implementation Plan

> **For agentic workers:** DateNight domain + Yelp/TM clients landed 2026-07-24 via TDD.

**Goal:** Restaurant + event + festival discovery for AI Match first dates; dual ≤10 mi; deep-link book.

**Architecture:** Pure `DualProximity` + `DateNightService`; `YelpFusionClient` + `TicketmasterDiscoveryClient`; UI `DateNightSection` on `AIMatchScreen`.

**Tech Stack:** Swift 6, SwiftUI, URLSession, Codable, CoreLocation (system). Zero new SPM.

## Global Constraints

- Yelp Fusion restaurants only; Ticketmaster Discovery events/festivals only.
- No OpenTable/Resy.
- Booking = deep-link only.
- Party of 2; ≤10 miles of both; ZIP and/or GPS.

## Done

- [x] Spec `docs/superpowers/specs/2026-07-24-datenight-discovery-design.md`
- [x] Domain + tests (geo, decode, mock)
- [x] Live clients + `LiveDateNightService` / `MockDateNightService`
- [x] Wire `AppEnvironment.dateNight` + `AIMatchScreen`
- [x] Info.plist keys `YELP_API_KEY`, `TICKETMASTER_API_KEY`, location usage string

## Remaining (human)

- [ ] Paste `YELP_API_KEY` + `TICKETMASTER_API_KEY` into `secrets.env` and run `./scripts/sync-secrets-from-mastermind.sh`
- [ ] Archive/upload build when ready
