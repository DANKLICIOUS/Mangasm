// Generates the Floot port of the board from the static sources in this folder.
//   node tools/floot-port.mjs [outDir]   (default /tmp/floot-dreaming)
// Floot serves module CSS in pure mode (every selector needs a local class) and cannot ship raw JS
// as a static file, so the CSS is scoped under `.root` and the script becomes a helper function.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] || "/tmp/floot-dreaming";
const read = (f) => readFileSync(join(here, f), "utf8");
const write = (f, s) => {
  mkdirSync(dirname(join(out, f)), { recursive: true });
  writeFileSync(join(out, f), s);
};

// data.js assigns window.DREAMING_DATA = {...};
const dataSrc = read("data.js");
const dataObj = dataSrc.slice(dataSrc.indexOf("{", dataSrc.indexOf("DREAMING_DATA")), dataSrc.lastIndexOf("}") + 1);
const data = Function("return (" + dataObj + ")")();
write("helpers/dreamingData.tsx", "// Snapshot data for the board; see the data contract in the repo's studio/dreaming/README.md.\nexport const dreamingData = " + JSON.stringify(data, null, 2).replace(/\[\s*(-?[\d.]+(?:,\s*-?[\d.]+)*)\s*\]/g, (m, inner) => "[" + inner.split(/,\s*/).join(", ") + "]") + ";\n");

const html = read("index.html");
const body = html.slice(html.indexOf(">", html.indexOf("<body")) + 1, html.indexOf("</body>")).replace(/\s*<script[^>]*><\/script>/g, "").trim();
if (/[`]|\$\{/.test(body)) throw new Error("markup contains a backtick or ${; emit it as a JSON string instead");
write("helpers/dreamingMarkup.tsx", "// Generated from studio/dreaming/index.html by tools/floot-port.mjs.\nexport const dreamingMarkup = String.raw`\n" + body + "\n`;\n");

const js = read("dreaming.js");
const start = js.indexOf('"use strict";') + '"use strict";'.length;
const tail = js.lastIndexOf('if (document.readyState === "loading")');
if (start < 20 || tail < 0) throw new Error("dreaming.js layout changed; update the port");
const engine =
  "// @ts-nocheck\n// Generated from studio/dreaming/dreaming.js by tools/floot-port.mjs. Returns a teardown function.\n" +
  "export function dreamingEngine(data, np) {\n  window.DREAMING_DATA = data;\n  window.DREAMING_NP = np;\n" +
  js.slice(start, tail) +
  "  boot();\n  return () => stopCurrent && stopCurrent();\n}\n";
write("helpers/dreamingEngine.tsx", engine);

// The Now Playing data layer and ticker are ES modules; inline both into one lazily-built helper so
// nothing touches `window` at import time.
const unmodule = (src) => {
  const s = src.replace(/^import [^;]+;\n/gm, "").replace(/^export (?=(const|function|async function) )/gm, "").replace(/^export \{[^}]*\};\n/gm, "");
  if (/^\s*(import|export)\b/m.test(s)) throw new Error("unexpected import/export left in a Now Playing module");
  return s;
};
write(
  "helpers/dreamingNowPlaying.tsx",
  "// @ts-nocheck\n// Generated from studio/dreaming/nowplaying/{nowplaying-data,ticker}.js by tools/floot-port.mjs.\n" +
    "let built = null;\nexport function dreamingNowPlaying() {\n  if (built) return built;\n" +
    unmodule(read("nowplaying/nowplaying-data.js")) +
    unmodule(read("nowplaying/ticker.js")) +
    "  built = { NowPlaying, createTicker };\n  return built;\n}\n"
);

// Scope every rule under `.root` and mark the original selectors global.
function scopeSelector(sel) {
  return sel
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s === ":root" || s === "html" || s === "body") return ".root";
      if (/^body(::?[\w-]+)$/.test(s)) return ".root" + s.slice(4);
      if (s.startsWith("body ")) s = s.slice(5);
      return ".root :global(" + s + ")";
    })
    .join(",\n");
}
function transform(css) {
  let res = "";
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) {
      res += css.slice(i);
      break;
    }
    const head = css.slice(i, open);
    const lead = head.match(/^\s*(\/\*[\s\S]*?\*\/\s*)*/)[0];
    const prelude = head.slice(lead.length).trim();
    let depth = 1;
    let j = open + 1;
    while (depth && j < css.length) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const inner = css.slice(open + 1, j - 1);
    if (prelude.startsWith("@keyframes")) res += lead + prelude + " {" + inner + "}";
    else if (prelude.startsWith("@")) res += lead + prelude + " {" + transform(inner) + "\n}";
    else res += lead + scopeSelector(prelude) + " {" + inner + "}";
    i = j;
  }
  return res;
}
const css = read("nowplaying/nowplaying.css") + "\n" + read("dreaming.css");
const scoped = transform(css)
  .replace(/^\.root \{/m, ".root {\n  min-height: 100vh;\n  position: relative;\n  isolation: isolate;");
write("pages/_index.module.css", "/* Generated from studio/dreaming/nowplaying/nowplaying.css and dreaming.css by tools/floot-port.mjs. */\n" + scoped);

write(
  "pages/_index.tsx",
  `import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { dreamingData } from "../helpers/dreamingData";
import { dreamingMarkup } from "../helpers/dreamingMarkup";
import { dreamingEngine } from "../helpers/dreamingEngine";
import { dreamingNowPlaying } from "../helpers/dreamingNowPlaying";
import styles from "./_index.module.css";

export default function IndexPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  // The engine decorates and mutates this subtree directly, so React must never own its children.
  useEffect(() => {
    if (!rootRef.current) return;
    rootRef.current.innerHTML = dreamingMarkup;
    return dreamingEngine(dreamingData, dreamingNowPlaying());
  }, []);
  return (
    <>
      <Helmet>
        <title>Recursive Dreaming · Night Cycle Monitor</title>
        <meta name="description" content="Recursive Dreaming: the night-cycle activation ritual and monitoring board for the ARPG, Diabolic and Crypto Carnival tracks." />
      </Helmet>
      <div className={styles.root} data-dreaming-root="" ref={rootRef} />
    </>
  );
}
`
);
write("pages/_index.pageLayout.tsx", "export default [];\n");

const font = (html.match(/href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/) || [])[1];
write(
  "base.css",
  `@import url(${font});
:root {
  /* Content layers */
  --z-content-low: 10; /* Minor elevated content */
  --z-content: 20; /* Standard elevated content */
  --z-content-high: 30; /* Important content that needs prominence */

  /* Navigation layers */
  --z-nav-low: 100; /* Secondary navigation components */
  --z-nav: 200; /* Primary navigation bars */
  --z-nav-sticky: 300; /* Sticky navigation elements */

  --z-overlay: 400; /* All overlays like dropdowns, dialogs, popovers */

  --z-spotlight: 1000; /* Tutorial spotlights/guided help */

  /* System layers */
  --z-critical: 2000; /* Critical system notifications */
}

:root {
  color-scheme: dark;
  --background: #0a0908;
  --foreground: #ece2cb;
  --surface: #120f0c;
  --surface-foreground: var(--foreground);
  --sidebar: #120f0c;
  --sidebar-foreground: #ece2cb;
  --card: #16120e;
  --card-foreground: var(--foreground);
  --popup: #16120e;
  --popup-foreground: var(--foreground);
  --primary: #d2ad62;
  --primary-foreground: #1e1408;
  --secondary: #a3c7ea;
  --secondary-foreground: #0b1420;
  --accent: #ff6adb;
  --accent-foreground: #1a0d29;
  --muted: #2a2218;
  --muted-foreground: #a39478;
  --success: #d2ad62;
  --success-foreground: #1e1408;
  --error: #ff6d58;
  --error-foreground: #1e0806;
  --warning: #ff7c55;
  --warning-foreground: #1e0806;
  --info: #a9d9ee;
  --info-foreground: #0b1420;
  --info-hover: #93cbe3;
  --info-active: #7dbdd8;
  --analytics: #c896ff;
  --analytics-foreground: #1a0d29;
  --dashboard: #45ebcf;
  --dashboard-foreground: #06201b;
  --border: rgba(210, 173, 98, 0.42);
  --font-family-base: "Cormorant Garamond", Garamond, Georgia, serif;
  --font-family-heading: "Cinzel", "Trajan Pro", Georgia, serif;
  --font-family-monospace: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --font-family-cursive: "Cinzel Decorative", Cinzel, Georgia, serif;
  --radius-sm: 2px;
  --radius: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --radius-full: 9999px;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 3px 6px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 10px 24px rgba(0, 0, 0, 0.55);
  --shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.6);
  --shadow-focus: 0 0 0 2px rgba(243, 214, 150, 0.5);
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 250ms;
  --animation-duration-slow: 350ms;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;
  --chart-color-1: #d2ad62;
  --chart-color-2: #ff7c55;
  --chart-color-3: #a3c7ea;
  --chart-color-4: #c896ff;
  --chart-color-5: #45ebcf;
}

.dark {
}

body {
  margin: 0;
  background: var(--background);
}
`
);
write(
  "static/__dev/design-principles.md",
  `# Recursive Dreaming: design principles

- Dark gothic cyber-fantasy, after the lore boards: near-black stone, gold Cinzel titles, filigree corners, sigils and thin gold circuit lines.
- Gold is the house colour. Each track has its own accent: ARPG steel blue, Diabolic blood and ember, Crypto Carnival purple, magenta and teal.
- Red pulses mean failure; a gold flash means recovery. Simulated data is drawn hatched and labelled "simulated"; snapshot data is labelled "snapshot".
- Type: Cinzel Decorative for the title, Cinzel for headings and labels, Cormorant Garamond for body text, a monospace face for numbers and logs.
- Motion is atmosphere, never information: with reduced motion every panel shows a static frame.
- The page is generated from studio/dreaming/ in the Mangasm repo by tools/floot-port.mjs. Edit the source there and regenerate rather than editing the port here.
`
);
write("static/sample-feed.json", read("sample-feed.json"));
console.log("wrote Floot port to " + out);
