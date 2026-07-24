# DateNight Discovery System — Design Spec

**App:** `com.mangasm.app` · **Date:** 2026-07-24  
**Status:** Approved via MASTERPROMPT (Yelp + Ticketmaster deep-link only)  
**IPA reference:** `build/export/Mangasm.ipa`

## Mission

Restaurant + event + festival discovery for **AI Matchmaking → RSVP a First Date**, party of **2**, venue/event must sit within **10 miles of both** people (zip and/or GPS). Booking/ticketing is **deep-link only**.

## Non-negotiable constraints

| Constraint         | Decision                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Restaurants        | **Yelp Fusion** only (self-serve)                                                        |
| Events + festivals | **Ticketmaster Discovery API** only (Live Nation = Ticketmaster inventory)               |
| OpenTable / Resy   | **Do not integrate** (partner-gated pre-launch)                                          |
| Booking / tickets  | **Deep-link** to provider URL (`UIApplication` / `openURL` via SwiftUI `openURL`)        |
| Concurrency        | Swift 6 strict concurrency                                                               |
| UI                 | SwiftUI only — no UIKit, no Storyboards                                                  |
| Dependencies       | **Zero new SPM** — `URLSession` + `Codable` + MapKit/CoreLocation system frameworks only |

## Domain rules

1. **Party size** is always 2 (viewer + matched candidate).
2. **Dual proximity:** place lat/lon must be ≤ **10.0 miles** from **both** anchors.
3. **Anchors:** each person supplies GPS and/or US ZIP. When both present, **GPS wins**. ZIP resolves via `CLGeocoder` (injectable for tests).
4. **Fail closed:** if either anchor missing/invalid, or users are >20 miles apart (intersection empty), or no place passes dual filter → empty list + user-visible reason.
5. **Search strategy:** midpoint of the two anchors; request radius = `max(1, 10 − d/2)` miles when `d ≤ 20`; then **client-side refilter** dual 10-mile rule.
6. **Privacy:** show area/city on cards before mutual “Let’s go”; full deep-link opens provider page (external).

## Architecture

```
DateNightService (protocol)
  ├── MockDateNightService          // previews / offline
  └── LiveDateNightService
        ├── DualProximity (pure)
        ├── Zip/GPS → GeoCoordinate
        ├── YelpFusionClient         // restaurants
        └── TicketmasterDiscoveryClient // events + festivals
```

- **Pure domain** under `Services/Domain/DateNight/` (unit-tested, no network).
- **HTTP clients** under `Services/Live/DateNight/` with injectable `HTTPClient` (`URLSession` default).
- **UI** under `Features/Match/DateNight/` — replaces static `Venue.samples` on `AIMatchScreen`.

## Models

- `GeoCoordinate` — lat/lon, Sendable
- `GeoAnchor` — `.gps` | `.zip(String)` → resolved coordinate
- `DateNightCategory` — `restaurant` | `event` | `festival`
- `DateNightPlace` — id, category, name, subtitle, coordinate, distance labels, **bookingURL**
- `DateNightQuery` — viewer + match anchors, optional category filter
- `DateNightError` — missingAnchor, tooFarApart, configMissing, network, decoding

## API mapping

### Yelp Fusion

- `GET https://api.yelp.com/v3/businesses/search?term=delis&latitude=37.786882&longitude=-122.399972`
- Header: `Authorization: Bearer {YELP_API_KEY}`
- Query: **`term`** (keyword), `latitude`, `longitude`, plus DateNight defaults `radius` (meters, ≤40000), `limit`, `categories=restaurants`, `sort_by=best_match`
- Client: `YelpFusionClient.businessSearchURL(…)` / `search(center:radiusMiles:term:)` · query field `DateNightQuery.term`
- Deep-link: `business.url`
- **Autocomplete:** `GET https://api.yelp.com/v3/autocomplete?text={q}&latitude={lat}&longitude={lon}`  
  → `YelpFusionClient.autocomplete(text:center:)` → terms / businesses / categories  
  Example: `text=del&latitude=37.786882&longitude=-122.399972`
- **Reviews (max 3):** `GET https://api.yelp.com/v3/businesses/{id}/reviews`  
  Example: `/v3/businesses/north-india-restaurant-san-francisco/reviews`  
  → `YelpFusionClient.reviews(businessID:)` / `reviews(forPlaceID:)` — hard-cap `maxReviews = 3`

### Ticketmaster Discovery

- `GET https://app.ticketmaster.com/discovery/v2/events.json`
- Query: `apikey`, `latlong`, `radius`, `unit=miles`, `size`, classification filter for events/festivals
- Deep-link: `url` / `url` on event

## Config

Info.plist (via `Secrets.xcconfig`):

- `YELP_API_KEY`
- `TICKETMASTER_API_KEY`

Missing keys → mock discovery in DEBUG; clear error surface in UI for Release if live mode expected.

## Testing (TDD)

1. Haversine / dual proximity edge cases (exactly 10, both sides, >20 apart).
2. Search radius formula.
3. Yelp/TM JSON fixture decode → `DateNightPlace`.
4. Dual filter drops places outside one anchor.
5. Mock service returns deterministic fixtures without network.

## Out of scope

- Hard table holds / paid booking APIs
- Server-side proxy for API keys (keys in client Info.plist for v1; rotate if leaked)
- Hosted Mangasm community events (existing `EventService` unchanged)
