# Overnight — Slay.LLC × Coexist.LLC × LynxLogix.Ai

Standalone static landing page (no build step), separate from the Mangasm site in `../web`.

Sections: jelly hero with the Nibbles mascot → the three units → behind-the-scenes dashboard (three
live terminals) → before/after slider → completed projects → contact (email + GitHub Sponsors).

The look is bright pastels on cream: Fredoka headings, Nunito body, DM Mono terminals, sticker cards
with white outlines, and candy pill buttons. Text uses the dark ink `#2b2140` for contrast.

## Run locally

```bash
cd studio && python3 -m http.server 4173
# open http://localhost:4173
```

## Edit content

All copy lives in `data.js`: brands (with their pastel `hue`), completed projects, and the scripted
terminal sessions. The terminals are driven by one elapsed-time clock built from those delays, so all
three type in parallel without drift.

`runHistory` feeds the backstage "Run history" panel: a 30-day success/failure chart, headline
totals, the automations list and a recent-runs feed. It is a static snapshot transcribed from the
Cursor Automations dashboard (which has no public read API), so update it by hand.

## Unicorn Studio hero

The hero runs the built-in jelly scene. To use a Unicorn Studio scene instead, set
`unicornProjectId` in `data.js` (or preview with `?us=<PROJECT_ID>`). If the scene loads, the jelly
pauses; if the ID is invalid or the browser lacks WebGL2, the jelly stays.

## WebGL effects (`cute-fx.js`)

Five native, dependency-free effects on two contexts (one behind the page, one overlay above it):

| Effect               | Where                       | What it does                                                    |
| -------------------- | --------------------------- | --------------------------------------------------------------- |
| Jelly metaballs      | hero                        | Raymarched SDF blobs with specular and rim light; follow cursor |
| Sparkle trail        | whole page (pointer)        | Star, heart and sparkle point sprites with soft glow            |
| Holographic sheen    | unit and project cards      | Iridescent foil border + glare that tracks the 3D pointer tilt  |
| Candy aurora         | page background             | Domain-warped gradient mesh; palette shifts per section         |
| Confetti + squish    | Replay, email, Sponsor; buttons | Confetti burst on click; CSS jelly squish on hover          |

The overlay context is created lazily; the hero jelly pauses offscreen; the render scale adapts to
frame time (`?q=0.5` pins it). `?fx=off` disables all WebGL. With `prefers-reduced-motion` the
aurora and jelly draw a static frame, and trail, confetti, tilt and typing are skipped. With no
WebGL, CSS gradient blobs and a CSS sheen are used instead. Screenshots:
`node tools/cute-shot.mjs shots.json` (headless Chrome over CDP).

`fx.js` / `fx-themes.js` / `fx-demo.html` are the separate icy OvernightFX library for other sites;
this page no longer loads them.

## Deploy

- Vercel: create a project with Root Directory `studio`, framework "Other", no build command.
- Appwrite Sites: fill `projectId` / `endpoint` in `appwrite.config.json`, then
  `appwrite login && appwrite push sites --all --force` from this folder.
