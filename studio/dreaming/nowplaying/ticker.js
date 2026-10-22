import { fmtTime } from "./nowplaying-data.js";

const GLYPH = { music: "♪", run: "⟳", event: "✦" };
const KIND = { music: "Now playing", run: "Automation run", event: "Event" };
const EQ_BARS = 5;
const PX_PER_SEC = 70;

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

export function createTicker(stage, np, { reducedMotion = false } = {}) {
  const band = document.createElement("div");
  band.className = "np-band";
  band.setAttribute("role", "region");
  band.setAttribute("aria-label", "Now playing");
  band.innerHTML = `
    <div class="np-now">
      <span class="np-pill" data-tone="off"><i aria-hidden="true"></i><b>OFF AIR</b></span>
      <span class="np-eq" aria-hidden="true">${"<i></i>".repeat(EQ_BARS)}</span>
      <div class="np-meta">
        <span class="np-kind">Now playing</span>
        <a class="np-title" target="_blank" rel="noopener"></a>
        <span class="np-artist"></span>
      </div>
      <div class="np-time" aria-hidden="true">
        <span class="np-el">0:00</span><span class="np-bar"><i></i></span><span class="np-dur">0:00</span>
      </div>
    </div>
    <div class="np-marquee"><div class="np-track"></div></div>
    <span class="np-src"></span>
    <span class="np-sr" aria-live="polite"></span>`;

  const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  ring.setAttribute("class", "np-ring");
  ring.setAttribute("viewBox", "0 0 1000 1000");
  ring.setAttribute("aria-hidden", "true");
  const pid = `np-ring-path-${Math.random().toString(36).slice(2, 8)}`;
  ring.innerHTML = `
    <defs><path id="${pid}" d="M500,500 m-452,0 a452,452 0 1,1 904,0 a452,452 0 1,1 -904,0"/></defs>
    <g class="np-ring-spin">
      <circle cx="500" cy="500" r="486" class="np-ring-rule"/>
      <circle cx="500" cy="500" r="420" class="np-ring-rule"/>
      <text class="np-ring-text"><textPath href="#${pid}" startOffset="0"></textPath></text>
    </g>`;

  stage.append(ring, band);

  const $ = (s) => band.querySelector(s);
  const pill = $(".np-pill");
  const eqBars = [...band.querySelectorAll(".np-eq i")];
  const kind = $(".np-kind");
  const title = $(".np-title");
  const artist = $(".np-artist");
  const el = $(".np-el");
  const dur = $(".np-dur");
  const bar = $(".np-bar i");
  const track = $(".np-track");
  const src = $(".np-src");
  const sr = $(".np-sr");
  const ringPath = ring.querySelector("textPath");
  const circumference = 2 * Math.PI * 452;

  let lastKey = "";
  let lastSecond = -1;
  let listKey = "";

  const queueTag = (i, cur, n) => {
    const d = (i - cur.index + n) % n;
    return d === 0 ? (cur.status === "playing" ? "Now" : "Last") : d === 1 ? "Up next" : "";
  };

  // Rebuilding the marquee restarts its scroll, so that only happens when the item list changes.
  // When just the current item moves on, the "Now" / "Up next" tags are updated in place.
  function renderQueue(cur) {
    const items = np.state.items;
    const n = items.length;
    const key = items.map((it) => it.title + "|" + it.startedAt).join("\n");
    if (key !== listKey) {
      listKey = key;
      const order = items.slice(cur.index).map((it, k) => [it, cur.index + k]).concat(items.slice(0, cur.index).map((it, k) => [it, k]));
      const html = order
        .map(
          ([it, i]) => `<span class="np-q" data-type="${it.type}" data-i="${i}">
          <em hidden></em><span class="np-g">${GLYPH[it.type]}</span>
          <strong>${esc(it.title)}</strong>${it.artist ? ` <span>— ${esc(it.artist)}</span>` : ""}${
            it.source ? ` <small>${esc(it.source)}</small>` : ""
          }</span><span class="np-sep" aria-hidden="true">◆</span>`
        )
        .join("");
      track.innerHTML = `<div class="np-run">${html}</div><div class="np-run" aria-hidden="true">${html}</div>`;
      if (!reducedMotion) {
        requestAnimationFrame(() => {
          const w = track.firstElementChild.scrollWidth;
          track.style.setProperty("--np-marquee-dur", `${Math.max(18, w / PX_PER_SEC)}s`);
        });
      }
    }
    track.querySelectorAll(".np-q").forEach((q) => {
      const tag = queueTag(Number(q.dataset.i), cur, n);
      const em = q.firstElementChild;
      em.textContent = tag;
      em.hidden = !tag;
      q.classList.toggle("is-now", Number(q.dataset.i) === cur.index);
    });

    const it = cur.item;
    const next = n > 1 ? items[(cur.index + 1) % n] : null;
    const phrase =
      `NOW ${it.type === "run" ? "RUNNING" : "PLAYING"} ✦ ${it.title}${it.artist ? " — " + it.artist : ""} ✦ ${
        next ? "UP NEXT ✦ " + next.title + " ✦ " : ""
      }`.toUpperCase();
    const text = ringPath.parentNode;
    text.removeAttribute("textLength");
    ringPath.textContent = phrase;
    let natural = 0;
    try {
      natural = text.getComputedTextLength();
    } catch {}
    if (!natural) natural = phrase.length * 21;
    ringPath.textContent = phrase.repeat(Math.max(1, Math.floor(circumference / natural)));
    text.setAttribute("textLength", String(Math.floor(circumference - 6)));
    text.setAttribute("lengthAdjust", "spacing");
  }

  function update(now = Date.now()) {
    const cur = np.current(now);
    if (!cur) return;
    const { item } = cur;
    const badge = np.badge(cur);
    const key = `${item.title}|${item.startedAt}|${cur.status}|${badge.text}|${np.state.items.length}`;
    if (key !== lastKey) {
      lastKey = key;
      pill.dataset.tone = badge.tone;
      pill.dataset.badge = badge.text.toLowerCase().replace(/\s+/g, "-");
      pill.querySelector("b").textContent = badge.text;
      kind.textContent = cur.status === "playing" ? KIND[item.type] : "Last played";
      title.textContent = item.title;
      if (item.url) title.href = item.url;
      else title.removeAttribute("href");
      artist.textContent = [item.artist, item.source].filter(Boolean).join(" · ");
      dur.textContent = item.durationSec ? fmtTime(item.durationSec) : "LIVE";
      src.textContent = np.state.label + (np.state.error ? ` · ${np.state.error}` : "");
      band.dataset.type = item.type;
      band.dataset.status = cur.status;
      sr.textContent = `${KIND[item.type]}: ${item.title}${item.artist ? " by " + item.artist : ""}`;
      renderQueue(cur);
    }
    const sec = Math.floor(cur.elapsed);
    if (sec !== lastSecond) {
      lastSecond = sec;
      el.textContent = fmtTime(cur.elapsed);
    }
    bar.style.transform = `scaleX(${item.durationSec ? cur.progress : 1})`;
    return cur;
  }

  function animateEq(levels) {
    for (let i = 0; i < eqBars.length; i++)
      eqBars[i].style.transform = `scaleY(${0.15 + 0.85 * levels[i]})`;
  }

  const refresh = () => {
    lastKey = "";
    update();
  };
  const unsubscribe = np.subscribe(refresh);
  document.fonts?.load("700 25px Cinzel").then(refresh, () => {});
  document.fonts?.addEventListener?.("loadingdone", refresh);

  function destroy() {
    unsubscribe();
    document.fonts?.removeEventListener?.("loadingdone", refresh);
    band.remove();
    ring.remove();
  }

  return { band, ring, update, animateEq, destroy };
}
