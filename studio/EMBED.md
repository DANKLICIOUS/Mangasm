# OvernightFX embed

One script tag adds the site's preset of Unicorn-Studio-style WebGL effects (liquid cursor
trail, headline RGB split, film grain + dither, scroll dissolve, aurora). It loads
`fx-themes.js` from the same folder, waits for the page's `<h1>` and sections (SPAs included),
uses one WebGL context, pauses offscreen, and does nothing without WebGL. Under
`prefers-reduced-motion` the moving effects are skipped.

```html
<script src="https://cdn.jsdelivr.net/gh/DANKLICIOUS/Mangasm@main/studio/fx.js" data-site="ganesh.guru" defer></script>
```

Put it just before `</body>` (or in `<head>` — it is `defer`red). `@main` works once this
branch is merged; pin a commit (`@<sha>`) or a tag for production so a later push can't change
a live site. To self-host, copy `fx.js` and `fx-themes.js` side by side into the site's public
folder and use `src="/fx.js"`.

## Per-site snippets

| Site | Preset (palette · effects) | Source repo | Framework / host | Add the tag to |
| --- | --- | --- | --- | --- |
| mangasm.app | `#0a090c` pink/gold · liquid, text, grain, aurora | this repo (`web/`) | static HTML on Vercel | `web/index.html` — done on this branch |
| lynxlogix.net | `#070707` brushed gold · liquid, grain, dissolve, aurora | [gothamgodzilla/lynxlogix-net](https://github.com/gothamgodzilla/lynxlogix-net) (mirror [Matryx-Magic/lynxlogix-net](https://github.com/Matryx-Magic/lynxlogix-net)) | static HTML on Vercel | `index.html`, after `<script src="js/site.js">` |
| ganesh.guru | `#000502` phosphor green · liquid, text, grain, dissolve | not found | Vite SPA on Replit (Google Frontend) | root `index.html` of the Vite project, before `</body>` |
| nostalgia.sh | `#0a0712` gold/violet/cyan · liquid, text, grain, aurora | not found | Vite SPA on Vercel | root `index.html` of the Vite project, before `</body>` |
| coexist.llc | `#0a0806` amber · liquid, text, grain, aurora | not found | static "Coming Soon" HTML on Vercel | `index.html`, before `</body>` |
| helping.llc | `#0c1416` teal/sun/coral (inferred) · liquid, text, grain, aurora | not found | unreachable (TLS name mismatch, HTTP 429 from Netlify) | the site's root HTML, before `</body>` |

```html
<!-- mangasm.app -->
<script src="https://cdn.jsdelivr.net/gh/DANKLICIOUS/Mangasm@main/studio/fx.js" data-site="mangasm.app" defer></script>
<!-- lynxlogix.net -->
<script src="https://cdn.jsdelivr.net/gh/DANKLICIOUS/Mangasm@main/studio/fx.js" data-site="lynxlogix.net" defer></script>
<!-- ganesh.guru -->
<script src="https://cdn.jsdelivr.net/gh/DANKLICIOUS/Mangasm@main/studio/fx.js" data-site="ganesh.guru" defer></script>
<!-- nostalgia.sh -->
<script src="https://cdn.jsdelivr.net/gh/DANKLICIOUS/Mangasm@main/studio/fx.js" data-site="nostalgia.sh" defer></script>
<!-- coexist.llc -->
<script src="https://cdn.jsdelivr.net/gh/DANKLICIOUS/Mangasm@main/studio/fx.js" data-site="coexist.llc" defer></script>
<!-- helping.llc -->
<script src="https://cdn.jsdelivr.net/gh/DANKLICIOUS/Mangasm@main/studio/fx.js" data-site="helping.llc" defer></script>
```

`data-site="auto"` picks the preset from `location.hostname` (leading `www.` dropped).

## Tuning on a site

- Turn one effect off: `data-fx-disable="text"` on the script tag. From the URL: `?fx=off`,
  `?fx=liquid,grain`, `?fx=-grain`.
- Choose where an effect goes: add `data-fx="aurora"` (or `liquid`, `dissolve`, …) to an
  element. A declared element replaces the preset's automatic target for that effect.
  Options: `data-fx-intensity="0.6"`, `data-fx-z="1"`, `data-fx-bleed="120"`, `data-fx-cell="16"`.
- Change colours, intensity or default targets: edit the site's entry in `fx-themes.js`, and
  preview it at `fx-demo.html?site=<domain>`.

Automatic targets when a preset doesn't set one: `liquid` = the section/header that contains
the first `<h1>`, `text` = the first `<h1>` (skipped for gradient/transparent text), `grain` =
the viewport, `aurora` = the second `<section>`, `dissolve` = `[data-fx-dissolve]`.

## JavaScript API

```js
const h = OvernightFX.mount("#hero", { effect: "liquid", palette: "nostalgia.sh", intensity: 0.8 });
h.set({ intensity: 0.4 });
h.destroy();
OvernightFX.applySite("coexist.llc"); // what data-site does
OvernightFX.destroyAll();
```
