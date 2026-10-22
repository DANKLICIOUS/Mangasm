# Overnight — Opsec Iceberg · Slay.LLC × Coexist.LLC × LynxLogix.Ai

Standalone static landing page (no build step), separate from the Mangasm site in `../web`.

The concept is the **Opsec Iceberg** plus **self-sustainable self-sovereignty**: what the world sees
is the smallest part, and every layer underneath is something you should own.

Sections: skull-jungle hero → the three houses (units) → the Opsec Iceberg (scroll-driven descent,
six layers) → the self-sovereignty orbit (six pillars) → backstage (three live terminals + run
history) → before/after slider → completed work (Mangasm feature row + three cards) → contact
(email + GitHub Sponsors).

The look is dark luxe: onyx black, candle gold `#c9a24a` / `#e6c77a`, lagoon turquoise `#5fd6cc`
and ember red for failures. Cormorant Garamond for display, Cinzel for small caps, Manrope for body,
DM Mono for terminals. Panels are frosted glass with gold hairlines.

## Run locally

```bash
cd studio && python3 -m http.server 4830
# open http://localhost:4830
```

## Edit content

All copy lives in `data.js`:

- `brands`: the three houses (with their accent `hue`).
- `iceberg`: the six layers, surface to abyss: kicker, title, body, checklist and reference links.
  The namespace layer carries the glyph TLD `💀🔥⭐` (`xg--f7i8717mfoa`) and a `prototype` flag. Intent
  Anchor is a local simulation only: no chain, no tokens, and the post-quantum code is unaudited
  reference code. Keep the copy that way.
- `pillars`: the six sovereignty pillars shown on the orbit.
- `projects`: completed work; the one with `feature` images gets the large row.
- `terminals`: the scripted backstage sessions, driven by one elapsed-time clock.
- `runHistory`: a static snapshot transcribed from the Cursor Automations dashboard (which has no
  public read API), so update it by hand.

Images live in `assets/` as webp: `hero-skull.webp` (hero, 1152×2048), `mangasm-brand.webp` and
`mangasm-fold.webp` (Mangasm feature).

## WebGL effects (`iceberg-fx.js`)

Two lazily-created WebGL1 contexts, each paused when offscreen or when the tab is hidden, rendered at
1 device pixel:

| Effect                     | Context | What it does                                                                 |
| -------------------------- | ------- | ---------------------------------------------------------------------------- |
| Volumetric mist            | hero    | Two domain-warped fbm layers drifting through the valley and over the copy   |
| Fire flicker + reflection  | hero    | Noise-driven campfire halo and a broken reflection streak on the lagoon      |
| Lagoon shimmer             | hero    | Colour-keyed water mask with refraction wobble and glints                    |
| Gold dust                  | both    | Procedural drifting motes (marine snow underwater)                           |
| Iceberg waterline          | ice     | Moving surface line, caustics and light shafts fading from lagoon to abyss   |

The hero also has slow cursor parallax (sky and skull move less than the jungle) and a little
scroll parallax. The painting is drawn in a feathered panel; outside it, the same texture is sampled
with a heavy mip bias as an ambient backdrop.

`?fx=off` disables WebGL. Without WebGL, the hero shows the `<img>` with CSS mist and parallax, and
the iceberg stage uses a CSS gradient whose waterline follows the same scroll math. With
`prefers-reduced-motion`, each scene draws one static frame, and typing, counters and parallax are
skipped. All canvases are `aria-hidden`.

Screenshots: `node tools/iceberg-shot.mjs shots.json` (headless Chrome over CDP; see the header of
the script for the step format).

## Unicorn Studio hero

The hero runs the built-in skull-jungle scene. To use a Unicorn Studio scene instead, set
`unicornProjectId` in `data.js` (or preview with `?us=<PROJECT_ID>`). If the scene loads, the built-in
scene pauses and hides; if the ID is invalid or the browser lacks WebGL2, it stays.

## Other files

`cute-fx.js` and `sparkle.js` (the previous pastel page's effects) and `fx.js` / `fx-themes.js` /
`fx-demo.html` (the icy OvernightFX embed for other sites, see `EMBED.md`) are no longer loaded by
this page but are kept for the sites that use them.

## Deploy

- Vercel: create a project with Root Directory `studio`, framework "Other", no build command.
- Appwrite Sites: fill `projectId` / `endpoint` in `appwrite.config.json`, then
  `appwrite login && appwrite push sites --all --force` from this folder.
