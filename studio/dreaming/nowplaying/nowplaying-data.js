// Now Playing data layer.
//
// Feed shape (JSON, or window.NOW_PLAYING):
//   { live?: boolean, label?: string, tag?: string (badge text when not live, e.g. "SIMULATED"),
//     items: [{ type: 'music' | 'run' | 'event', title, artist, source,
//               startedAt: ISO string | epoch ms | epoch s, durationSec, url? }] }
//
// Source precedence: explicit `url` option → `?nowplaying=<url>` → `data-feed` → window.NOW_PLAYING →
// built-in demo loop. Remote URLs are polled every `pollSec` seconds and count as live.

const DEMO_ITEMS = [
  {
    type: "music",
    title: "Tulum Nights: Live from the Cavern",
    artist: "Mangasm Sound System",
    source: "Cavern Stage · Tulum",
    durationSec: 214,
  },
  {
    type: "run",
    title: "America's Got AI: New Judges",
    artist: "Cursor Automations",
    source: "automation run",
    durationSec: 96,
  },
  {
    type: "music",
    title: "Turquoise Undertow",
    artist: "DJ Matryxx",
    source: "Sacred Loop set",
    durationSec: 188,
  },
  {
    type: "run",
    title: "Recursive Interpreter: Score 1/100",
    artist: "Cursor Automations",
    source: "automation run",
    durationSec: 72,
  },
  {
    type: "event",
    title: "Skull Falls After Dark",
    artist: "Live from the Cavern",
    source: "Mangasm Events",
    durationSec: 150,
  },
  {
    type: "run",
    title: "US Citizen Rights & AI Coexistence Update",
    artist: "Cursor Automations",
    source: "automation run",
    durationSec: 84,
  },
  {
    type: "music",
    title: "Gold Filigree (Night Swim Edit)",
    artist: "Mangasm Sound System",
    source: "Cavern Stage · Tulum",
    durationSec: 176,
  },
  {
    type: "run",
    title: "Coexist cash & Whop urgent fixes",
    artist: "Cursor Automations",
    source: "automation run",
    durationSec: 64,
  },
  {
    type: "run",
    title: "Bifocals 2026 pitch ready",
    artist: "Cursor Automations",
    source: "automation run",
    durationSec: 58,
  },
];

const TYPES = new Set(["music", "run", "event"]);

function toMs(v) {
  if (v == null || v === "") return NaN;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  const n = Number(v);
  if (!Number.isNaN(n)) return toMs(n);
  return Date.parse(v);
}

export function normalize(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return list
    .filter((it) => it && it.title)
    .map((it) => ({
      type: TYPES.has(it.type) ? it.type : "music",
      title: String(it.title),
      artist: it.artist ? String(it.artist) : "",
      source: it.source ? String(it.source) : "",
      startedAt: toMs(it.startedAt),
      durationSec: Math.max(0, Number(it.durationSec) || 0),
      url: typeof it.url === "string" && /^https?:\/\//.test(it.url) ? it.url : undefined,
    }))
    .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
}

function demoSchedule(anchor) {
  let t = anchor;
  return DEMO_ITEMS.map((it) => {
    const item = { ...it, startedAt: t };
    t += it.durationSec * 1000;
    return item;
  });
}

const DEMO_TOTAL = DEMO_ITEMS.reduce((s, it) => s + it.durationSec, 0) * 1000;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

function createNowPlaying() {
  const listeners = new Set();
  let timer = 0;
  let anchor = 0;
  const state = {
    items: [],
    mode: "demo",
    label: "",
    url: "",
    updatedAt: 0,
    error: null,
    live: false,
    tag: "",
  };

  // A tag can rename the non-live badge but can never claim LIVE; only `live: true` does that.
  const toTag = (v) => {
    const t = typeof v === "string" ? v.trim().toUpperCase().slice(0, 16) : "";
    return t && t !== "LIVE" ? t : "";
  };

  const emit = () => listeners.forEach((fn) => fn(state));

  function setDemo() {
    // The demo starts mid-way through the first track so the progress bar is visibly moving.
    anchor = Date.now() - 41_000;
    Object.assign(state, {
      items: demoSchedule(anchor),
      mode: "demo",
      live: false,
      tag: "",
      label: "Demo feed · snapshot of recent automation runs, not live",
    });
  }

  function setInline(data) {
    const items = normalize(data);
    if (!items.length) return false;
    Object.assign(state, {
      items,
      mode: "inline",
      live: data.live === true,
      tag: toTag(data.tag),
      label: data.label || (data.live === true ? "Live · inline feed" : "Snapshot · inline feed"),
      updatedAt: Date.now(),
      error: null,
    });
    return true;
  }

  async function poll() {
    try {
      const res = await fetch(state.url, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = normalize(data);
      if (!items.length) throw new Error("feed has no items");
      const live = data.live !== false;
      Object.assign(state, {
        items,
        live,
        tag: toTag(data.tag),
        label: data.label || `${live ? "Live" : "Snapshot"} · ${new URL(state.url, location.href).host || "local feed"}`,
        updatedAt: Date.now(),
        error: null,
      });
    } catch (err) {
      state.error = String(err.message || err);
      if (!state.items.length) setDemo();
    }
    emit();
  }

  const api = {
    state,

    async load({ url, pollSec = 15, inline } = {}) {
      clearInterval(timer);
      const qs = new URLSearchParams(location.search).get("nowplaying");
      const feedUrl = url || qs || "";
      const inlineData = inline || window.NOW_PLAYING;
      if (feedUrl) {
        state.url = feedUrl;
        state.mode = "remote";
        await poll();
        timer = setInterval(poll, Math.max(3, pollSec) * 1000);
      } else if (!(inlineData && setInline(inlineData))) {
        setDemo();
      }
      emit();
      return state;
    },

    set(data) {
      clearInterval(timer);
      if (!setInline(data)) return false;
      emit();
      return true;
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    current(now = Date.now()) {
      if (state.mode === "demo" && now - anchor >= DEMO_TOTAL) {
        anchor += Math.floor((now - anchor) / DEMO_TOTAL) * DEMO_TOTAL;
        state.items = demoSchedule(anchor);
        queueMicrotask(emit);
      }
      const items = state.items;
      if (!items.length) return null;
      let index = -1;
      for (let i = 0; i < items.length; i++) {
        if (!(items[i].startedAt > now)) index = i;
      }
      if (index < 0)
        return { item: items[0], index: 0, elapsed: 0, progress: 0, status: "upcoming" };
      const item = items[index];
      const elapsed = Number.isFinite(item.startedAt) ? (now - item.startedAt) / 1000 : 0;
      const dur = item.durationSec;
      const ended = dur > 0 && elapsed >= dur;
      return {
        item,
        index,
        elapsed: dur ? Math.min(elapsed, dur) : elapsed,
        progress: dur ? Math.min(1, elapsed / dur) : 0,
        status: ended ? "ended" : "playing",
      };
    },

    // The ON AIR badge: LIVE only for polled or explicitly-live feeds that are playing right now.
    badge(cur = api.current()) {
      if (!cur || cur.status !== "playing") return { text: "OFF AIR", tone: "off" };
      if (state.mode === "demo") return { text: "DEMO", tone: "demo" };
      if (state.error) return { text: "RECONNECTING", tone: "warn" };
      return state.live ? { text: "LIVE", tone: "live" } : { text: state.tag || "SNAPSHOT", tone: "demo" };
    },

    // Deterministic pseudo-spectrum shared by the ticker EQ and the robot's visor so they move together.
    levels(n = 6, t = performance.now() / 1000, cur = api.current()) {
      const out = new Array(n);
      const playing = cur && cur.status === "playing";
      const seed = cur ? hash(cur.item.title) * 10 : 0;
      const run = cur && cur.item.type === "run";
      const bpm = run ? 72 : 112 + seed * 4;
      const beat = Math.pow(0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (bpm / 60)), 3);
      for (let i = 0; i < n; i++) {
        if (!playing) {
          out[i] = 0.08 + 0.04 * Math.sin(t * 0.8 + i);
          continue;
        }
        const wob = Math.abs(Math.sin(t * (1.7 + i * 0.63) + seed + i * 1.3));
        const shimmer = 0.5 + 0.5 * Math.sin(t * (5.1 + i * 1.9) + seed * 2);
        const v = run
          ? 0.22 + 0.5 * Math.pow(0.5 + 0.5 * Math.sin(t * 3 - i * 0.9), 2) + 0.1 * shimmer
          : 0.16 + 0.42 * wob + 0.3 * beat * (1 - i / (n * 1.4)) + 0.12 * shimmer;
        out[i] = Math.min(1, v);
      }
      return out;
    },

    stop() {
      clearInterval(timer);
    },
  };
  return api;
}

export const NowPlaying = window.NowPlaying || createNowPlaying();
window.NowPlaying = NowPlaying;
