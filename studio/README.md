# Overnight — Slay.LLC × Coexist.LLC × LynxLogix.Ai

Standalone static landing page (no build step), separate from the Mangasm site in `../web`.

Sections: ice-shader hero → the three units → behind-the-scenes dashboard (three live terminals) →
before/after slider → completed projects → contact.

## Run locally

```bash
cd studio && python3 -m http.server 4173
# open http://localhost:4173
```

## Edit content

All copy lives in `data.js`: brands, completed projects, and the scripted terminal sessions.

## Unicorn Studio hero

The hero runs a built-in WebGL ice shader. To use a Unicorn Studio scene instead, set
`unicornProjectId` in `data.js` (or preview with `?us=<PROJECT_ID>`). If the ID is missing or
invalid, or the browser lacks WebGL2, the page falls back to the built-in shader automatically.

## WebGL effects (`fx.js`)

Five Unicorn-Studio-style effects plus the ice scene, all rendered through one shared WebGL
context (`OvernightFX.contexts === 1`). Each is switched on with a `data-fx` attribute in
`index.html`; remove the attribute to drop it.

| Effect     | Where                         | What it does                                                     |
| ---------- | ----------------------------- | ---------------------------------------------------------------- |
| `liquid`   | hero (`header.hero`)          | Cursor-trail fluid: advected trail buffer, iridescent caustics   |
| `text`     | hero headline (`h1`)          | Headline as a texture: RGB split, wave and slice glitch on hover |
| `grain`    | whole page (`body`)           | Film grain, Bayer-dithered vignette, scanlines                   |
| `dissolve` | before/after mock (`#compare`) | Scroll-driven pixel/noise burn-away reveal with glowing edge     |
| `aurora`   | backstage (`#backstage`)      | Domain-warped gradient-mesh aurora with bloom behind terminals   |

Toggle without editing: `?fx=off` (all five off), `?fx=liquid,text` (only these),
`?fx=-grain,-text` (all but these). Options: `data-fx-intensity`, `data-fx-scale`, `data-fx-z`,
`data-fx-bleed`, `data-fx-cell`. Under `prefers-reduced-motion` liquid/text/dissolve are skipped
and grain/aurora/ice draw one static frame; with no WebGL nothing mounts and the page is unchanged.

Palettes live in `fx-themes.js` (preset `overnight` here, plus one per site). Preview every
preset at `fx-demo.html?site=<domain>`; see `EMBED.md` for the one-line embed on other sites.
Screenshots: `node tools/fx-shot.mjs shots.json` (headless Chrome over CDP).

## Deploy

- Vercel: create a project with Root Directory `studio`, framework "Other", no build command.
- Appwrite Sites: fill `projectId` / `endpoint` in `appwrite.config.json`, then
  `appwrite login && appwrite push sites --all --force` from this folder.
