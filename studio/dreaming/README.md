# Recursive Dreaming

A monitoring dashboard in the style of the Recursive HSI lore boards: antique gold Cinzel titles on near-black, filigree frames, sigil diagrams and three colour-coded tracks. While you sleep, the system "dreams". The overnight automations run, the self-repair cycle (Detect, Isolate, Repair, Evolve) heals failures, and the ARPG, Diabolic and Crypto Carnival tracks evolve.

It is a static, dependency-free page: `index.html`, `dreaming.css`, `dreaming.js` and `data.js`. The only external request is Google Fonts.

```sh
cd studio && python3 -m http.server 4840
# open http://localhost:4840/dreaming/
```

## What is real and what is simulated

| Part | Source |
| --- | --- |
| Automations monitor: 30-day run history, totals, automation list, recent runs | **Snapshot** of the Cursor Automations dashboard on Oct 21, 2026, transcribed from screenshots (`data.js`). Tagged "Snapshot". |
| Night clock, incidents, self-repair cycle, track metrics, Unreal handoff, dream journal, health score | **Simulated** in the browser. Tagged "Simulated". |
| Simulated runs added to the automations monitor during the night | **Simulated**. Hatched bars with a dashed outline in the chart, dashed cards with a "Simulated" tag in the runs feed. |

The Cursor dashboard has no public read API, so the snapshot does not update by itself. Crypto Carnival tokens, decay and "minting" are game design, not financial information.

## The night

**Activate Recursive Dreaming** starts one night, 22:00 to 06:00, compressed into 60 seconds at 1×. Pause, Replay and the ½×, 1×, 2× and 4× speeds only move one clock, `t` (simulated minutes since 22:00, 0 to 480).

The whole night is generated up front from a seed (`buildNight`), so every `t` maps to exactly one state. Incidents, simulated runs, loot drops, decay checkpoints and Unreal ticks are all pre-scheduled. The status (`idle`, `running`, `paused` or `done`), `t`, speed and seed are saved in `localStorage` under `recursive-dreaming:v1`, so a reload resumes where you left off.

Each incident walks the self-repair cycle: Detect at `t₀`, Isolate at +5 minutes, Repair at +11, Evolve at +17, and it resolves at +23. Failures pulse red (track card, orbit, toast); recoveries flash gold.

The health score (0 to 100) weights the automation success rate (35%), the average Diabolic integrity (25%), ARPG ledger sync (15%), Unreal sync (15%) and Carnival resilience (10%). It loses 7 points per open incident and 3 per unrecovered failed run.

## Data contract

`loadData()` in `dreaming.js` is the single entry point for data. It returns `window.DREAMING_DATA` from `data.js`. With `?data=<url>`, it fetches that JSON (`cache: "no-store"`) and merges it over the built-in data: objects merge key by key and arrays replace. If the request fails or the JSON is malformed, the page keeps the snapshot and shows a notice that explains why.

```jsonc
{
  "version": 1,
  "source": "snapshot",            // or "live": the tags then read "Live feed · <generatedAt>"
  "generatedAt": "2026-10-21T00:14:00Z",
  "automations": {
    "label": "Oct 21, 2026",       // shown on the snapshot tag
    "totals": { "runs": 1050, "succeeded": 787, "failed": 256, "automations": 16 },
    "history": {
      "start": "2026-09-22",       // date of days[0]
      "days": [[2, 0], [1, 0]]     // [succeeded, failed] per day, oldest first
    },
    "list": [{ "name": "every day", "schedule": "Hourly, 9:00 AM–6:00 PM", "next": "in 2 hr", "status": "active" }],
    "runs": [{ "name": "New AI petition & rights update", "automation": "every day", "time": "Oct 20 6:13 PM", "status": "succeeded" }]
  },
  // Optional starting values for the simulation (game design, not telemetry).
  "tracks": {
    "arpg": { "xp": 12480, "xpPerLevel": 2000 },
    "diabolic": { "vectors": { "soulLattice": 64, "bloodScript": 52, "echoChamber": 71 } },
    "carnival": { "value": 100, "decayLog": [-7.13, -21.37, -21.01] }
  },
  "unreal": { "assets": 1204, "blueprints": 86, "logic": 312, "ai": 18 }
}
```

Validation checks that `source` is `snapshot` or `live`, the totals are non-negative numbers, `history.days` is a list of `[succeeded, failed]` pairs, `history.start` is a date, and every `list` and `runs` item has a `name`. All strings are rendered with `textContent`, never as HTML.

`sample-feed.json` is a small example: open `/dreaming/?data=sample-feed.json`. A cross-origin URL needs CORS headers that allow this page's origin.

### Wiring real automation data

There is no public API for the Cursor Automations dashboard. Some options:

1. Re-export by hand. Update `data.js` (or a JSON file passed with `?data=`) from the dashboard when needed.
2. Run a small endpoint that emits the shape above from whatever source you have, for example an automation that writes its own run log. Point `?data=` at it.
3. If an API appears, map it in one place: the endpoint, or a `loadData()` adapter.

The simulation is independent of the feed. A real feed replaces the snapshot panels; the night stays labelled as simulated.

## Accessibility and fallbacks

- Text contrast meets WCAG AA. The screenshot pass runs a contrast audit over every visible text node.
- With `prefers-reduced-motion: reduce`, CSS animations and transitions are off, numbers jump instead of tweening, and the Recursion Engine canvas redraws as a static frame only when its state changes. The night still advances.
- The engine is a 2D canvas, so it needs no WebGL.
- Layout works down to 393 px wide. On phones, tables become stacked rows.

## Testing

`window.RecursiveDreaming` exposes `state()`, `script()` (the night's incident times), `seek(t, status?)` and `loadData`, for tests and for later wiring.

`tools/dream-shot.mjs` drives headless Chrome over the DevTools protocol (Node 22, no dependencies) and reports console errors:

```sh
node studio/dreaming/tools/dream-shot.mjs shots.json
```

See the header comment in that file for the `shots.json` format.
