/*
 * OvernightFX per-site presets. Loaded automatically by fx.js (same folder) when the embed
 * uses data-site, or include it before fx.js yourself.
 *
 * palette   bg = page background (dissolve cover colour), ink = text/specular highlight,
 *           a/b/c = accent ramp used by liquid, aurora, dissolve edge and grain tint.
 * intensity number (all effects) or { effect: number }, 0–1.
 * effects   which of liquid/text/grain/dissolve/aurora auto-mount for data-site embeds.
 * targets   CSS selector per effect; omitted = fx.js default (hero of the first <h1>, the <h1>,
 *           <body>, the second <section>, [data-fx-dissolve]). Elements with data-fx="…" win.
 * options   extra mount options per effect (layer, z, scale, bleed, cell, zoom, blend, intensity).
 *           layer: "fixed" pins an effect to the viewport (z: -1 puts it behind the content).
 * fonts     display/body families (fx-demo.html previews only).
 * source    where the palette came from.
 */
window.OvernightFXThemes = {
  overnight: {
    label: "Overnight_ studio",
    vibe: "Glacial HUD, ice facets, mint terminal accents",
    palette: { bg: "#0b0d12", ink: "#e1e6f1", a: "#d1e3ff", b: "#7f9cff", c: "#8ff0c3" },
    intensity: { liquid: 0.85, text: 1, grain: 0.55, dissolve: 1, aurora: 0.65 },
    effects: { liquid: true, text: true, grain: true, dissolve: true, aurora: true },
    fonts: { display: "Inter Tight", body: "IBM Plex Mono" },
    source: "studio/styles.css",
  },

  "helping.llc": {
    label: "Helping.LLC",
    vibe: "Warm, human, helpful — teal calm with a sunrise accent",
    palette: { bg: "#0c1416", ink: "#f4efe6", a: "#5eead4", b: "#fcd34d", c: "#fb923c" },
    intensity: { liquid: 0.75, text: 0.8, grain: 0.35, aurora: 0.7 },
    effects: { liquid: true, text: true, grain: true, dissolve: false, aurora: true },
    fonts: { display: "Fraunces", body: "Inter" },
    source: "inferred from the brand name — helping.llc was unreachable (TLS mismatch / HTTP 429)",
  },

  "lynxlogix.net": {
    label: "LynxLogix.NET",
    vibe: "Piano-black luxury crypto desk, brushed gold, restrained motion",
    palette: { bg: "#070707", ink: "#f3eee4", a: "#c4a574", b: "#e4d2ae", c: "#8d877b" },
    intensity: { liquid: 0.7, grain: 0.45, dissolve: 0.8, aurora: 0.55 },
    effects: { liquid: true, text: false, grain: true, dissolve: true, aurora: true },
    targets: { dissolve: "main section:nth-of-type(2), section:nth-of-type(2)" },
    fonts: { display: "Cinzel", body: "Josefin Sans" },
    source: "lynxlogix.net/css/site.css (--ink #070707, --gold #c4a574, --gold-2 #e4d2ae)",
  },

  "ganesh.guru": {
    label: "Ganesh AI",
    vibe: "Phosphor-green terminal, neon glow, AI catalog",
    palette: { bg: "#000502", ink: "#d6f7e8", a: "#00ff9c", b: "#9ffbd0", c: "#27e8e0" },
    intensity: { liquid: 0.6, text: 1, grain: 0.7, dissolve: 1 },
    effects: { liquid: true, text: true, grain: true, dissolve: true, aurora: false },
    targets: { dissolve: "main section:nth-of-type(2), section:nth-of-type(2)" },
    fonts: { display: "JetBrains Mono", body: "JetBrains Mono" },
    source: "ganesh.guru/assets/index-*.css (--bg #000502, --primary hsl(157 100% 50%) = #00ff9c)",
  },

  "mangasm.app": {
    label: "Mangasm",
    vibe: "Safety-first rebuild — campfire pink and gold on warm night",
    palette: { bg: "#0a090c", ink: "#f4efe8", a: "#ff6b9d", b: "#e83a7a", c: "#c9a227" },
    intensity: { liquid: 0.7, text: 0.9, grain: 0.5, aurora: 0.7 },
    effects: { liquid: true, text: true, grain: true, dissolve: false, aurora: true },
    targets: { liquid: "header.hero", text: ".hero h1", aurora: "#status, .public-status" },
    options: { liquid: { z: 1 } },
    fonts: { display: "Cormorant Garamond", body: "DM Sans" },
    source: "web/styles.css in this repo (--bg #0a090c, --pink #e83a7a, --pink-soft #ff6b9d, --gold #c9a227)",
  },

  "nostalgia.sh": {
    label: "NOSTALGIA",
    vibe: "The Celestial Machine — obsidian, brass and gold, VHS-era magenta/cyan",
    palette: { bg: "#0a0712", ink: "#e8d9b0", a: "#f0c75e", b: "#a45dff", c: "#27e8e0" },
    intensity: { liquid: 0.8, text: 0.9, grain: 0.8, aurora: 0.9 },
    effects: { liquid: true, text: true, grain: true, dissolve: false, aurora: true },
    targets: { liquid: "body", aurora: "body" },
    options: { liquid: { layer: "fixed", z: -1 }, aurora: { layer: "fixed", z: -1 } },
    fonts: { display: "Cinzel Decorative", body: "Cormorant Garamond" },
    source: "nostalgia.sh/assets/index-*.css (--obsidian #0a0712, --gold-bright #f0c75e, #a45dff, #27e8e0)",
  },

  "coexist.llc": {
    label: "Coexist.LLC",
    vibe: "Coming-soon amber glow on warm obsidian",
    palette: { bg: "#0a0806", ink: "#f3e9dc", a: "#f0c27b", b: "#c8893b", c: "#f6dcb0" },
    intensity: { liquid: 0.75, text: 0.85, grain: 0.5, aurora: 0.85 },
    effects: { liquid: true, text: true, grain: true, dissolve: false, aurora: true },
    targets: { aurora: "body > main, body > section, body > div" },
    fonts: { display: "Cormorant", body: "Inter" },
    source: "coexist.llc/styles.css (--obsidian #0a0806, --amber #c8893b, --ink #f3e9dc)",
  },
};
