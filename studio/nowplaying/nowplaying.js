// Drop-in Now Playing stage: gold sigil + live ticker + RANGER-26.
//
//   <div id="np"></div>
//   <script type="module" src="nowplaying/nowplaying.js" data-mount="#np"
//           data-ticker="both" data-mode="intelligence" data-feed="/now.json" data-poll="15"></script>
//
// Or programmatically: import { mount } from "./nowplaying.js"; await mount(el, { ticker: "band" });
import { NowPlaying } from "./nowplaying-data.js";
import { createTicker } from "./ticker.js";
import { createSigil } from "./sigil.js";

export { NowPlaying };

const HERE = new URL(".", import.meta.url);
const TICKER_MODES = ["band", "ring", "both"];

function injectStyles() {
  let css = document.querySelector("link[data-np-css]");
  if (!css) {
    css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("nowplaying.css", HERE).href;
    css.dataset.npCss = "";
    css.loaded = new Promise((resolve) => {
      css.onload = css.onerror = resolve;
    });
    document.head.append(css);
  }
  if (
    !document.querySelector("link[data-np-fonts]") &&
    !document.querySelector('link[href*="family=Cinzel"]')
  ) {
    const f = document.createElement("link");
    f.rel = "stylesheet";
    f.href =
      "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=JetBrains+Mono:wght@400;600&display=swap";
    f.dataset.npFonts = "";
    document.head.append(f);
  }
  return css.loaded || Promise.resolve();
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const FALLBACK_SVG = `
<svg class="np-robot-svg" viewBox="0 0 200 400" role="img" aria-label="RANGER-26 silhouette (WebGL unavailable)">
  <defs>
    <linearGradient id="npg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6dc93"/><stop offset=".5" stop-color="#b88a35"/><stop offset="1" stop-color="#ffe9b0"/>
    </linearGradient>
  </defs>
  <g fill="#0d0d12" stroke="url(#npg)" stroke-width="2.2" stroke-linejoin="round">
    <path d="M58 92 L18 80 L10 150 L56 120 Z M142 92 L182 80 L190 150 L144 120 Z" opacity=".75"/>
    <circle cx="100" cy="48" r="40" fill="rgba(160,240,255,.06)"/>
    <path d="M78 40 Q78 18 100 16 Q122 18 122 40 Q122 64 100 68 Q78 64 78 40 Z"/>
    <path d="M80 36 Q100 28 120 36 L119 50 Q100 56 81 50 Z" fill="#020203"/>
    <path d="M60 90 Q100 78 140 90 L132 160 Q100 170 68 160 Z"/>
    <path d="M72 162 L128 162 L124 196 L76 196 Z"/>
    <path d="M58 92 Q46 96 44 110 L38 196 Q40 206 48 204 L58 120 Z M142 92 Q154 96 156 110 L162 196 Q160 206 152 204 L142 120 Z"/>
    <path d="M78 198 L98 198 L96 296 L92 372 L70 378 L74 296 Z M102 198 L122 198 L126 296 L130 378 L108 372 L104 296 Z"/>
  </g>
  <g fill="#3ff0dc"><rect x="88" y="38" width="9" height="5" rx="2"/><rect x="103" y="38" width="9" height="5" rx="2"/></g>
  <circle cx="100" cy="118" r="4" fill="#3ff0dc"/>
</svg>`;

export async function mount(target, opts = {}) {
  const host = typeof target === "string" ? document.querySelector(target) : target;
  if (!host) throw new Error(`NowPlaying: mount target not found: ${target}`);
  // Layout (and the ring's text measurement) depends on the stylesheet, so wait for it.
  await injectStyles();

  const reducedMotion =
    opts.reducedMotion ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.createElement("div");
  root.className = "np-root";
  root.dataset.ticker = TICKER_MODES.includes(opts.ticker) ? opts.ticker : "both";
  root.dataset.mode = opts.mode === "intelligence" ? "intelligence" : "standard";
  if (reducedMotion) root.dataset.reducedMotion = "";
  root.innerHTML = `
    <div class="np-stage">
      <canvas class="np-sigil" aria-hidden="true"></canvas>
      <div class="np-robot"></div>
    </div>
    ${
      opts.controls === false
        ? ""
        : `<div class="np-controls" role="toolbar" aria-label="RANGER-26 controls">
      <button type="button" data-act="wave"><kbd>W</kbd> Wave</button>
      <button type="button" data-act="fly"><kbd>F</kbd> Fly</button>
      <button type="button" data-act="intel" aria-pressed="false"><kbd>I</kbd> Intelligence</button>
      <button type="button" data-act="ticker"><kbd>T</kbd> Ticker: <span>both</span></button>
    </div>`
    }`;
  host.append(root);

  const stage = root.querySelector(".np-stage");
  const robotBox = root.querySelector(".np-robot");
  const sigil = createSigil(root.querySelector(".np-sigil"), { reducedMotion });
  await NowPlaying.load({ url: opts.feed, pollSec: opts.poll });
  const ticker = createTicker(stage, NowPlaying, { reducedMotion });

  let robot = null;
  const onFloor = (y, h) => stage.style.setProperty("--np-floor", `${((y / h) * 100).toFixed(2)}%`);
  if (opts.robot !== false) {
    if (hasWebGL()) {
      try {
        const { createRanger } = await import("./ranger.js");
        robot = await createRanger(robotBox, {
          np: NowPlaying,
          reducedMotion,
          onFloor,
          onAction: (a) =>
            root.dispatchEvent(new CustomEvent("np:action", { detail: a, bubbles: true })),
        });
      } catch (err) {
        console.warn("NowPlaying: WebGL robot unavailable, using SVG fallback.", err);
      }
    }
    if (!robot) {
      robotBox.innerHTML = FALLBACK_SVG;
      root.dataset.fallback = "";
    }
  }

  const api = {
    root,
    np: NowPlaying,
    wave: () => robot?.wave?.(),
    fly: () => robot?.fly?.(),
    advance: (sec) => robot?.advance?.(sec),
    setMode(mode) {
      root.dataset.mode = mode === "intelligence" ? "intelligence" : "standard";
      robot?.setIntelligence?.(root.dataset.mode === "intelligence");
      const b = root.querySelector('[data-act="intel"]');
      b?.setAttribute("aria-pressed", String(root.dataset.mode === "intelligence"));
    },
    setTicker(mode) {
      root.dataset.ticker = TICKER_MODES.includes(mode) ? mode : "both";
      const s = root.querySelector('[data-act="ticker"] span');
      if (s) s.textContent = root.dataset.ticker;
    },
    status: () => ({
      feed: {
        mode: NowPlaying.state.mode,
        live: NowPlaying.state.live,
        items: NowPlaying.state.items.length,
        error: NowPlaying.state.error,
      },
      current: NowPlaying.current()?.item.title,
      ticker: root.dataset.ticker,
      mode: root.dataset.mode,
      robot: robot ? robot.status() : { webgl: false, fallback: "svg" },
    }),
  };
  api.setMode(root.dataset.mode);
  api.setTicker(root.dataset.ticker);

  root.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "wave") api.wave();
    else if (act === "fly") api.fly();
    else if (act === "intel")
      api.setMode(root.dataset.mode === "intelligence" ? "standard" : "intelligence");
    else if (act === "ticker")
      api.setTicker(TICKER_MODES[(TICKER_MODES.indexOf(root.dataset.ticker) + 1) % 3]);
  });
  window.addEventListener("keydown", (e) => {
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      /input|textarea|select/i.test(e.target.tagName) ||
      e.target.isContentEditable
    )
      return;
    const k = e.key.toLowerCase();
    if (k === "w") api.wave();
    else if (k === "f") api.fly();
    else if (k === "i")
      api.setMode(root.dataset.mode === "intelligence" ? "standard" : "intelligence");
    else if (k === "t")
      api.setTicker(TICKER_MODES[(TICKER_MODES.indexOf(root.dataset.ticker) + 1) % 3]);
  });

  const sizeSigil = () => sigil.resize();
  new ResizeObserver(sizeSigil).observe(stage);

  let raf = 0;
  let visible = true;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const t = now / 1000;
    ticker.update();
    const levels = NowPlaying.levels(5, t);
    ticker.animateEq(levels);
    sigil.setPulse(levels.reduce((a, b) => a + b, 0) / levels.length);
    sigil.draw(t);
  };
  if (reducedMotion) {
    ticker.update();
    ticker.animateEq(NowPlaying.levels(5, 0));
    sigil.draw(0);
    setInterval(() => ticker.update(), 1000);
  } else {
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(frame);
    }).observe(stage);
  }

  root.classList.add("np-ready");
  window.NowPlayingStage = api;
  return api;
}

const script = document.querySelector('script[type="module"][src*="nowplaying.js"][data-mount]');
if (script) {
  const d = script.dataset;
  const q = new URLSearchParams(location.search);
  mount(d.mount, {
    ticker: q.get("ticker") || d.ticker,
    mode: q.get("mode") || d.mode,
    feed: d.feed,
    poll: d.poll ? Number(d.poll) : undefined,
    controls: d.controls !== "off",
    robot: d.robot !== "off",
  }).then(
    () => document.body.classList.add("np-ready"),
    (err) => console.error(err)
  );
}
