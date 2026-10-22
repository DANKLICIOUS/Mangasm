# Now Playing · RANGER-26

A drop-in "Now Playing" stage in the Mangasm gothic-gold style: a rotating gold sigil, a live ticker
that crosses it (horizontal band) and orbits it (circular text ring), and **RANGER-26**, an original
procedural WebGL humanoid that reacts to the feed. No build step and no model files.

RANGER-26 is an original character: matte white and graphite panels, a glossy black visor with a
gold/turquoise display face, a glass dome, a wrist comm and fold-out jetpack wings. It deliberately
avoids any existing franchise's colours, logos or names.

## Run locally

```bash
cd studio && python3 -m http.server 4850
# open http://localhost:4850/nowplaying/
```

Query overrides for the demo page: `?ticker=band|ring|both`, `?mode=intelligence`,
`?nowplaying=<feed url>`.

## Embed

```html
<div id="np"></div>
<script
  type="module"
  src="/nowplaying/nowplaying.js"
  data-mount="#np"
  data-ticker="both"
  data-mode="intelligence"
  data-feed="/api/now-playing"
  data-poll="15"
></script>
```

The module injects `nowplaying.css` (resolved next to the script) and the Cinzel / JetBrains Mono
fonts if the page doesn't already load them. three.js r170 is imported from jsDelivr only when WebGL
is available.

| Attribute       | Values                           | Default    |
| --------------- | -------------------------------- | ---------- |
| `data-mount`    | CSS selector of the host element | required   |
| `data-ticker`   | `band`, `ring`, `both`           | `both`     |
| `data-mode`     | `standard`, `intelligence`       | `standard` |
| `data-feed`     | feed URL (polled)                | none       |
| `data-poll`     | seconds between polls (min 3)    | `15`       |
| `data-controls` | `off` hides the toolbar          | on         |
| `data-robot`    | `off` renders the ticker only    | on         |

The stage height defaults to `clamp(560px, 92svh, 940px)`; override it with `--np-height` on a
parent. For programmatic use:

```js
import { mount, NowPlaying } from "/nowplaying/nowplaying.js";
const stage = await mount("#np", {
  ticker: "band",
  mode: "intelligence",
  feed: "/api/now-playing",
});
stage.wave();
stage.fly();
stage.setMode("standard");
stage.setTicker("ring");
stage.status(); // feed / ticker / robot state
```

## Interactions

- Move the cursor and the head, neck and visor eyes track it. After 4 s idle it glances around.
- Click or tap the robot to wave. The next click flies: wings deploy, it hovers with a three-quarter
  turn, and the jetpack and boot thrusters glow.
- Keys: `W` wave, `F` fly, `I` intelligence mode, `T` cycle the ticker band / ring / both.
- Intelligence mode adds a holographic halo around the head (scrolling scan text with the current
  item, tick ring, orbiting node, a "thinking" pulse) and a side panel showing the item and progress.
- The visor waveform, wrist comm EQ, chest light, ticker EQ and sigil glow are all driven by
  `NowPlaying.levels()`, so they pulse together.

Performance and accessibility: the pixel ratio is capped at 1.5, rendering pauses offscreen and in
hidden tabs, and `prefers-reduced-motion` gives a static pose with a static marquee and ring. Without
WebGL (or if the CDN import fails) a gold SVG silhouette is shown. The ticker announces item changes
through a polite live region.

## Data contract

```json
{
  "live": true,
  "label": "Live · Cavern radio",
  "items": [
    {
      "type": "music",
      "title": "Tulum Nights: Live from the Cavern",
      "artist": "Mangasm Sound System",
      "source": "Cavern Stage · Tulum",
      "startedAt": "2026-10-22T09:30:00Z",
      "durationSec": 214,
      "url": "https://example.com/listen"
    }
  ]
}
```

- `type`: `music`, `run` or `event`. Unknown values fall back to `music`.
- `startedAt`: an ISO string, epoch ms or epoch seconds.
- `durationSec`: `0` (or omitted) means open-ended, like a live stream. Elapsed time counts up and
  the ticker shows `LIVE` instead of a duration.
- `url`: optional, and only `http(s)` links are used.
- `tag` (top level): optional badge text for a feed that is not live, such as `"Simulated"`. It is
  upper-cased and capped at 16 characters, and `"live"` is ignored, so only `live: true` shows `LIVE`.
- The current item is the latest one whose `startedAt` is in the past. Once it ends and nothing newer
  exists, the ticker shows `OFF AIR` / "Last played".
- A bare array of items is also accepted.

Sources, in precedence order:

1. The `feed` option, then `?nowplaying=<url>`, then `data-feed`. These are fetched with
   `cache: "no-store"` and re-polled every `poll` seconds. A polled feed counts as live unless it
   sends `"live": false`. If a poll fails, the last items stay up and the badge shows `RECONNECTING`.
2. `window.NOW_PLAYING`, inline data set before the script runs. It shows `SNAPSHOT` unless it
   includes `"live": true`. Push updates later with `NowPlaying.set(data)` (for example from a
   WebSocket).
3. The built-in demo loop: music items mixed with a snapshot of recent automation runs (America's Got
   AI, Recursive Interpreter, US Citizen Rights & AI Coexistence, Coexist cash & Whop fixes, Bifocals
   2026). It is labelled `DEMO` and described as "not live".

## Plugging in real sources

Keep API keys and OAuth tokens server-side. The usual shape is a small serverless function (for
example `api/now-playing.js` on Vercel) that calls the provider and returns the contract above. Point
`data-feed` at it. None of these are wired up yet.

**Spotify.** The Web API endpoint `GET https://api.spotify.com/v1/me/player/currently-playing` needs a
user OAuth token with the `user-read-currently-playing` scope. Store the refresh token server-side.
Map the response like this:

- `title` ← `item.name`
- `artist` ← `item.artists[].name` joined
- `durationSec` ← `item.duration_ms / 1000`
- `startedAt` ← `Date.now() - progress_ms`
- `url` ← `item.external_urls.spotify`
- `source` ← `"Spotify"`

Return `live: is_playing`.

**Last.fm.** Call `user.getrecenttracks` with `limit=1`. The first track is current when
`track["@attr"].nowplaying === "true"`. Last.fm gives no start time or duration, so either call
`track.getInfo` for `duration` and remember when the title first appeared, or send `durationSec: 0`
for an open-ended "now". The API key is not secret-grade, but keep it in an environment variable.

**Icecast / Shoutcast.**

- Icecast exposes `/status-json.xsl`. `icestats.source` is an object or an array, and its `title` is
  usually `"Artist - Title"`; `server_name` maps to `source`.
- Shoutcast v2 exposes `/stats?sid=1&json=1` with `songtitle` and `servertitle`.

Streams are open-ended, so send `durationSec: 0` and keep `startedAt` fixed until the title changes.
Most stream servers don't send CORS headers, so proxy them through the function.

```js
// api/now-playing.js (sketch): Icecast → Now Playing contract
let last = { title: "", startedAt: 0 };
export default async function handler(req, res) {
  const stats = await fetch(process.env.ICECAST_STATUS_URL).then((r) => r.json());
  const src = [].concat(stats.icestats.source)[0];
  const [artist, title] = String(src.title || "").split(" - ");
  if (src.title !== last.title) last = { title: src.title, startedAt: Date.now() };
  res.setHeader("Cache-Control", "no-store");
  res.json({
    live: true,
    items: [
      {
        type: "music",
        title: title || src.title,
        artist,
        source: src.server_name,
        startedAt: last.startedAt,
        durationSec: 0,
      },
    ],
  });
}
```

**Automation runs.** Cursor Automations has no public read API; `studio/data.js` → `runHistory` is a
hand-transcribed snapshot. To show runs, emit
`{ type: "run", title: <automation name>, artist: "Cursor Automations", source: "automation run", startedAt, durationSec }`
from whatever records the runs (a webhook sink, a CI job, or a script that regenerates a static JSON
file). Merge them with music items in the same `items` array, sorted by `startedAt`.

## Files

| File                 | Role                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| `nowplaying.js`      | Entry point: auto-mount from the script tag, `mount()`, keys, controls     |
| `nowplaying-data.js` | `NowPlaying` data layer: load/poll/set, `current()`, `badge()`, `levels()` |
| `ticker.js`          | Marquee band and SVG text ring                                             |
| `sigil.js`           | Rotating gold sigil (2D canvas, pre-rendered layers)                       |
| `ranger.js`          | RANGER-26 (three.js r170, RoomEnvironment, procedural geometry)            |
| `nowplaying.css`     | Styles, all scoped under `.np-root`                                        |
| `index.html`         | Demo page                                                                  |
| `tools/np-shot.mjs`  | Headless Chrome screenshot driver (Node 22, CDP over WebSocket)            |

## Screenshots

```bash
node studio/nowplaying/tools/np-shot.mjs shots.json
```

The driver supports mouse moves, clicks, key presses, `eval` and clipped shots, and prints console
errors per page. Headless SwiftShader renders at about 1 fps, so the animations are clock-driven.
`NowPlayingStage.advance(seconds)` steps the simulation forward, which makes mid-wave and mid-flight
captures deterministic.

## Vercel Sandbox preview

The demo was checked in a non-persistent Vercel Sandbox: 1 vCPU, port 3000, with a git source
cloning this branch and serving it with `python3 -m http.server 3000 --bind 0.0.0.0` from `studio/`.
Sandbox URLs (`https://sb-….vercel.run/nowplaying/`) stop working when the session times out. For a
lasting URL, deploy `studio/` as a static Vercel project instead.
