/* Recursive Dreaming: night-cycle simulation and monitoring board. No dependencies.
 *
 * One clock drives everything: `S.t`, simulated minutes since 22:00 (0 to 480). The whole night is
 * generated up front from a seed (`buildNight`), so any `t` maps to exactly one state. That makes
 * pause, replay, speed changes and the localStorage restore trivial: they only move the clock.
 */
(function () {
  "use strict";

  const NIGHT = 480;
  const REAL_SECONDS = 60;
  const STORE_KEY = "recursive-dreaming:v1";
  const DEFAULT_SEED = 20261021;
  const STEP_AT = [0, 5, 11, 17];
  const RESOLVE_AT = 23;
  const STEP_NAMES = ["Detect", "Isolate", "Repair", "Evolve"];
  const STEP_LINES = ["anomaly scan", "contain & analyse", "patch & reinforce", "adapt & level up"];
  const TRACK_LABEL = { arpg: "ARPG", diabolic: "Diabolic", carnival: "Crypto Carnival", automations: "Automations", unreal: "Unreal" };
  const VECTORS = [
    ["soulLattice", "Soul Lattice"],
    ["bloodScript", "Blood Script"],
    ["echoChamber", "Echo Chamber"],
  ];
  const PHASES = [
    ["I", "The Wound Awakens", "The core is exposed. Flesh is bound. Mortals may strike."],
    ["II", "The Veil Unravels", "Form fractures. Corruption spills. The ritual rewrites."],
    ["III", "The Self Repairs", "Essence retreats. Patterns realign. The Beast remembers."],
    ["IV", "The Loop Eternal", "Repair complete. The ritual resumes. We begin again."],
  ];

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = mqReduce.matches;

  /* ---------- DOM helpers ---------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const SVGNS = "http://www.w3.org/2000/svg";

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    setAttrs(el, attrs);
    kids.flat().forEach((k) => k != null && el.append(k instanceof Node ? k : String(k)));
    return el;
  }
  function sv(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    setAttrs(el, attrs);
    kids.flat().forEach((k) => k != null && el.append(k instanceof Node ? k : String(k)));
    return el;
  }
  function setAttrs(el, attrs) {
    if (!attrs) return;
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "text") el.textContent = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  }

  const fmtInt = (n) => Math.round(n).toLocaleString("en-US");
  const fmtPct = (n, d = 1) => n.toFixed(d) + "%";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  function clock(t) {
    const mins = (22 * 60 + Math.floor(t)) % (24 * 60);
    return String(Math.floor(mins / 60)).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0");
  }

  /* ---------- Data ---------- */

  /**
   * loadData() → Promise<{ data, note, remote }>
   *
   * Returns the built-in `window.DREAMING_DATA` (data.js) or, with `?data=<url>`, that JSON merged over
   * it (objects merge key by key, arrays replace). Shape, documented in README.md:
   *
   *   {
   *     version: 1,
   *     source: "snapshot" | "live",
   *     generatedAt: ISO-8601 string,
   *     automations: {
   *       label: string,                                   // shown on the snapshot tag
   *       totals: { runs, succeeded, failed, automations }, // integers
   *       history: { start: "YYYY-MM-DD", days: [[succeeded, failed], ...] },  // oldest first
   *       list: [{ name, schedule?, next?, status?: "active" | "paused" }],
   *       runs: [{ name, automation, time, status?: "succeeded" | "failed" }]  // newest first
   *     },
   *     tracks: { arpg: { xp, xpPerLevel }, diabolic: { vectors: { soulLattice, bloodScript, echoChamber } },
   *               carnival: { value, decayLog: [pct, ...] } },   // simulation starting values
   *     unreal: { assets, blueprints, logic, ai }                  // simulation starting counts
   *   }
   *
   * If the URL fails or the JSON is malformed, the snapshot is used and `note` explains why.
   */
  async function loadData() {
    const base = structuredClone(window.DREAMING_DATA);
    const url = new URLSearchParams(location.search).get("data");
    if (!url) return { data: base, note: null, remote: false };
    try {
      const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const remote = await res.json();
      const problems = validate(remote);
      if (problems.length) throw new Error(problems.slice(0, 3).join("; "));
      return { data: merge(base, remote), note: null, remote: true };
    } catch (err) {
      return { data: base, note: "Could not load data from " + url + " (" + err.message + "). Showing the built-in snapshot.", remote: false };
    }
  }

  function validate(d) {
    const p = [];
    const isNum = (v) => typeof v === "number" && isFinite(v) && v >= 0;
    if (!d || typeof d !== "object" || Array.isArray(d)) return ["the document is not a JSON object"];
    if (d.source != null && d.source !== "snapshot" && d.source !== "live") p.push('source must be "snapshot" or "live"');
    const a = d.automations;
    if (a != null) {
      if (typeof a !== "object") return ["automations must be an object"];
      if (a.totals != null) ["runs", "succeeded", "failed", "automations"].forEach((k) => a.totals[k] != null && !isNum(a.totals[k]) && p.push("automations.totals." + k + " must be a number"));
      if (a.history != null) {
        if (!Array.isArray(a.history.days) || !a.history.days.every((x) => Array.isArray(x) && x.length === 2 && isNum(x[0]) && isNum(x[1])))
          p.push("automations.history.days must be [[succeeded, failed], ...]");
        if (a.history.start != null && isNaN(Date.parse(a.history.start))) p.push("automations.history.start must be a date");
      }
      ["list", "runs"].forEach((k) => {
        if (a[k] != null && (!Array.isArray(a[k]) || !a[k].every((x) => x && typeof x.name === "string"))) p.push("automations." + k + " must be an array of objects with a name");
      });
    }
    return p;
  }

  function merge(a, b) {
    if (Array.isArray(b) || b === null || typeof b !== "object") return b;
    const out = a && typeof a === "object" && !Array.isArray(a) ? { ...a } : {};
    for (const k of Object.keys(b)) out[k] = merge(out[k], b[k]);
    return out;
  }

  /* ---------- Night script ---------- */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const INCIDENT_PLAN = [
    [46, "diabolic", "soulLattice"],
    [88, "automations"],
    [128, "carnival", "mask"],
    [170, "arpg", "desync"],
    [212, "diabolic", "bloodScript"],
    [258, "automations"],
    [298, "unreal"],
    [336, "carnival", "loop"],
    [376, "diabolic", "echoChamber"],
    [412, "arpg", "affix"],
    [440, "carnival", "chance"],
  ];
  const RUN_SLOTS = [14, 40, 66, 88, 112, 146, 190, 232, 258, 280, 318, 354, 392, 430, 466];
  const LOOT_ITEMS = {
    common: ["Ashen Greaves", "Chipped Rune", "Tallow Charm", "Iron Sigil", "Grave Dust"],
    uncommon: ["Echo-forged Blade", "Vitae Ampoule", "Lattice Shard", "Moonsteel Vambrace"],
    rare: ["Crown of the Recursion", "Blood Script Codex", "Eye of the Detect Sigil", "Phoenix Ember"],
  };
  const RUN_NAMES = ["Overnight digest", "Dream pass", "Recursive sweep", "Echo replay", "Night watch", "Lattice audit", "Dawn brief"];

  function buildNight(data, seed) {
    const r = mulberry32(seed);
    const between = (a, b) => a + r() * (b - a);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const autos = (data.automations.list || []).map((a) => a.name).filter(Boolean);
    const T = data.tracks || {};
    const xpBase = (T.arpg && T.arpg.xp) || 12480;
    const xpPerLevel = (T.arpg && T.arpg.xpPerLevel) || 2000;
    const vStart = Object.assign({ soulLattice: 64, bloodScript: 52, echoChamber: 71 }, T.diabolic && T.diabolic.vectors);
    const decaySeed = (T.carnival && T.carnival.decayLog) || [];
    const tokenStart = (T.carnival && T.carnival.value) || 100;
    const U = Object.assign({ assets: 1204, blueprints: 86, logic: 312, ai: 18 }, data.unreal);

    const runs = RUN_SLOTS.map((t, i) => ({
      t,
      name: RUN_NAMES[i % RUN_NAMES.length] + " #" + String(i + 1).padStart(2, "0"),
      automation: autos.length ? pick(autos) : "Automation",
      fails: false,
    }));

    const incidents = INCIDENT_PLAN.map(([t0, track, kind], i) => {
      const t = t0 + Math.round((r() - 0.5) * 6);
      const inc = { id: i, t, track, kind, steps: STEP_AT.map((o) => t + o), resolveT: t + RESOLVE_AT };
      if (track === "diabolic") {
        const v = VECTORS.find((x) => x[0] === kind);
        inc.vector = kind;
        inc.drop = Math.round(between(14, 22));
        inc.bonus = kind === "bloodScript" ? 12 : Math.round(between(8, 14));
        inc.anomaly = { soulLattice: "Soul anchor fracture", bloodScript: "Blood Script rune corruption", echoChamber: "Echo Chamber state drift" }[kind];
        inc.action = { soulLattice: "Rebind dispersed essence to the core scaffold", bloodScript: "Recompile flesh-patterns through runes of vitae", echoChamber: "Replay past states to stabilise the present" }[kind];
        inc.result = v[1] + " restored +" + inc.bonus + "%";
        inc.loreFail = { soulLattice: "The lattice cracks. Dispersed essence slips its anchors.", bloodScript: "The blood runes blur. The flesh-pattern forgets itself.", echoChamber: "The echoes fall out of time. Past and present disagree." }[kind];
        inc.loreRepair = "The Beast rewrites: " + inc.result + ".";
      } else if (track === "arpg") {
        inc.bonusXp = Math.round(between(300, 700));
        inc.anomaly = kind === "desync" ? "Progression ledger desync" : "Affix overflow on a rare drop";
        inc.action = kind === "desync" ? "Re-roll loot-table weights, replay the held drops" : "Clamp the affixes, reweight the table";
        inc.loreFail = kind === "desync" ? "The slain stop teaching. Experience pools, unspent." : "A rare drop breaks its own table. Rarity bleeds.";
      } else if (track === "carnival") {
        const pct = decaySeed[1] != null ? decaySeed[1] : -21.37;
        inc.repair = kind;
        inc.anomaly = { mask: "Token decay spike " + String(pct).replace("-", "−") + "%", loop: "Event loop stall at the wheel", chance: "Half-life drift past threshold" }[kind];
        inc.action = { mask: "Rebuild the event loop: celebrate, rebuild, repeat", loop: "Spin the wheel again and re-seed the loop", chance: "Re-mint the chance table" }[kind];
        inc.result = "+1 " + kind + " · event loop resilient";
        inc.loreFail = { mask: "The masks slip. Value runs toward zero.", loop: "The wheel stops mid-turn. The crowd holds its breath.", chance: "The half-life lengthens. The carnival feels it." }[kind];
        inc.loreRepair = "The carnival repairs itself so the game can continue: +1 " + kind + ".";
      } else if (track === "automations") {
        const run = runs.reduce((best, x) => (Math.abs(x.t - t0) < Math.abs(best.t - t0) ? x : best), runs[0]);
        run.fails = true;
        run.t = t;
        run.recoverT = inc.resolveT;
        inc.run = run;
        inc.anomaly = "Run failed: " + run.automation;
        inc.action = "Quarantine the run, retry with backoff";
        inc.result = "Re-run succeeded";
        inc.loreFail = "A dream collapses mid-run: “" + run.automation + "”.";
        inc.loreRepair = "The dream is dreamt again. “" + run.automation + "” wakes clean.";
      } else if (track === "unreal") {
        inc.anomaly = "Blueprint hash mismatch at handoff";
        inc.action = "Isolate the graph, resync from engine state";
        inc.result = "Handoff re-synced";
        inc.loreFail = "The bridge to Unreal flickers. Blueprints disagree with the dream.";
        inc.loreRepair = "The bridge holds. Blueprint graph re-synced with the engine.";
      }
      return inc;
    });

    const loot = [];
    for (let t = 6 + Math.round(r() * 6); t < NIGHT - 2; t += Math.round(between(11, 19))) {
      const roll = r();
      const tier = roll < 0.18 ? "rare" : roll < 0.5 ? "uncommon" : "common";
      const mult = { rare: 1.8, uncommon: 1.25, common: 1 }[tier];
      const rare = tier === "rare";
      loot.push({ t, tier, rare, xp: Math.round(between(500, 1300) * mult), shift: +(between(0.3, 1.4) * (rare ? 2 : 1)).toFixed(2), item: pick(LOOT_ITEMS[tier]) });
    }

    const decay = [];
    for (let k = 1; k <= NIGHT / 60; k++) {
      const pct = decaySeed[k - 1] != null ? decaySeed[k - 1] : -+between(8, 19).toFixed(2);
      decay.push({ t: k * 60, pct });
    }

    const ticks = [];
    for (let t = 20, n = 1; t < NIGHT; t += 40, n++) {
      ticks.push({ t, n, assets: Math.round(between(18, 64)), blueprints: Math.round(between(0, 4)), logic: Math.round(between(3, 14)), ai: Math.round(between(0, 2)) });
    }

    // Per-minute series. Vectors heal slowly through the night, so dawn lands near full integrity.
    const bonusTotal = { soulLattice: 0, bloodScript: 0, echoChamber: 0 };
    incidents.forEach((i) => i.vector && (bonusTotal[i.vector] += i.bonus));
    const heal = {};
    for (const [k] of VECTORS) heal[k] = Math.max(0, (99 - vStart[k] - bonusTotal[k]) / NIGHT);

    const at = new Map();
    const on = (t, fn) => {
      const m = clamp(Math.round(t), 0, NIGHT);
      if (!at.has(m)) at.set(m, []);
      at.get(m).push(fn);
    };

    const st = { xp: xpBase, held: 0, desync: false, drift: false, drops: 0, weight: 0, v: { ...vStart }, token: tokenStart, repairs: { mask: 0, loop: 0, chance: 0 }, open: 0, simDone: 0, simOk: 0, simFailOpen: 0 };
    loot.forEach((l) =>
      on(l.t, () => {
        st.drops++;
        st.weight += l.shift;
        if (st.desync) st.held += l.xp;
        else st.xp += l.xp;
      })
    );
    incidents.forEach((inc) => {
      on(inc.t, () => {
        st.open++;
        if (inc.vector) st.v[inc.vector] = Math.max(4, st.v[inc.vector] - inc.drop);
        if (inc.track === "arpg") st.desync = true;
        if (inc.track === "unreal") st.drift = true;
      });
      on(inc.steps[2], () => {
        if (inc.vector) st.v[inc.vector] = Math.min(100, st.v[inc.vector] + inc.drop + inc.bonus);
        if (inc.track === "arpg") {
          inc.restored = st.held + inc.bonusXp;
          st.xp += inc.restored;
          st.held = 0;
          st.desync = false;
          inc.result = "XP restored +" + fmtInt(inc.restored);
          inc.loreRepair = "The wheel feeds itself: " + fmtInt(inc.restored) + " XP returns to the ledger.";
        }
        if (inc.track === "carnival") {
          st.repairs[inc.repair]++;
          st.token *= 1.035;
        }
        if (inc.track === "unreal") st.drift = false;
      });
      on(inc.resolveT, () => {
        st.open--;
        if (inc.run) {
          st.simOk++;
          st.simFailOpen--;
        }
      });
    });
    runs.forEach((run) =>
      on(run.t, () => {
        st.simDone++;
        if (run.fails) st.simFailOpen++;
        else st.simOk++;
      })
    );

    const snapT = data.automations.totals || { succeeded: 0, failed: 0 };
    const series = { xp: [], drops: [], weight: [], v: { soulLattice: [], bloodScript: [], echoChamber: [] }, integrity: [], token: [], health: [], open: [] };
    let k = 0;
    for (let m = 0; m <= NIGHT; m++) {
      if (m > 0) {
        for (const [key] of VECTORS) st.v[key] = Math.min(100, st.v[key] + heal[key]);
        while (k < decay.length - 1 && m > decay[k].t) k++;
        st.token *= Math.pow(1 + decay[k].pct / 100, 1 / 60);
      }
      (at.get(m) || []).forEach((fn) => fn());
      const integ = (st.v.soulLattice + st.v.bloodScript + st.v.echoChamber) / 3;
      const autoRate = ((snapT.succeeded + st.simOk) / Math.max(1, snapT.succeeded + snapT.failed + st.simDone)) * 100;
      const rep = st.repairs.mask + st.repairs.loop + st.repairs.chance;
      const health = 0.35 * autoRate + 0.25 * integ + 0.15 * (st.desync ? 55 : 100) + 0.15 * (st.drift ? 55 : 100) + 0.1 * Math.min(100, 72 + 9 * rep) - 7 * st.open - 3 * st.simFailOpen;
      series.xp.push(st.xp);
      series.drops.push(st.drops);
      series.weight.push(st.weight);
      for (const [key] of VECTORS) series.v[key].push(st.v[key]);
      series.integrity.push(integ);
      series.token.push(st.token);
      series.health.push(clamp(health, 0, 100));
      series.open.push(st.open);
    }

    const journal = [{ t: 0, kind: "dawn", text: "22:00. The Dreamer closes their eyes. The Recursion Engine wakes." }];
    PHASES.forEach((p, i) => journal.push({ t: i * 120 + 0.5, kind: "phase", text: "Phase " + p[0] + " · " + p[1] + ". " + p[2] }));
    incidents.forEach((inc) => {
      journal.push({ t: inc.t, kind: "fail", text: inc.loreFail });
      journal.push({ t: inc.steps[2], kind: "repair", text: inc.loreRepair || inc.result });
    });
    loot.filter((l) => l.rare).forEach((l) => journal.push({ t: l.t, kind: "", text: "The slain teach the system. A rare drop: table weights shift +" + (+l.shift).toFixed(1) + "%." }));
    decay.slice(0, 3).forEach((d) => journal.push({ t: d.t, kind: "", text: "The carnival decays " + String(d.pct).replace("-", "−") + "%. Even entropy wears a smile." }));
    ticks.filter((x) => x.n % 3 === 1).forEach((x) => journal.push({ t: x.t, kind: "", text: "The dream crosses into Unreal: " + x.assets + " assets, " + x.blueprints + " blueprints carried over." }));
    journal.push({ t: NIGHT, kind: "dawn", text: "06:00. Dawn. You do not master the system. You become part of its memory." });
    journal.sort((a, b) => a.t - b.t);

    return { seed, xpPerLevel, runs: runs.sort((a, b) => a.t - b.t), incidents, loot, decay, ticks, series, journal, U, tokenStart };
  }

  /* ---------- State at time t ---------- */

  function sample(arr, t) {
    const m = Math.floor(t);
    if (m >= arr.length - 1) return arr[arr.length - 1];
    return lerp(arr[m], arr[m + 1], t - m);
  }

  function stateAt(N, t) {
    const s = N.series;
    const xp = s.xp[Math.floor(t)];
    const incidents = N.incidents
      .filter((i) => i.t <= t)
      .map((i) => {
        let stage = 0;
        STEP_AT.forEach((o, k) => t >= i.t + o && (stage = k));
        return { inc: i, stage, resolved: t >= i.resolveT };
      });
    const active = incidents.filter((x) => !x.resolved);
    const runs = N.runs
      .filter((r) => r.t <= t)
      .map((r) => ({ run: r, status: r.fails ? (t >= r.recoverT ? "recovered" : "failed") : "succeeded" }));
    const ticks = N.ticks.filter((x) => x.t <= t);
    const sum = (k) => ticks.reduce((a, x) => a + x[k], 0);
    const v = {};
    for (const [k] of VECTORS) v[k] = sample(s.v[k], t);
    const token = sample(s.token, t);
    const repairs = { mask: 0, loop: 0, chance: 0 };
    incidents.forEach((x) => x.inc.repair && x.stage >= 2 && repairs[x.inc.repair]++);
    return {
      t,
      loot: N.loot.filter((l) => l.t <= t),
      phase: t >= NIGHT ? 4 : Math.floor(t / 120),
      phaseK: (t % 120) / 120,
      xp,
      level: 1 + Math.floor(xp / N.xpPerLevel),
      levelK: (xp % N.xpPerLevel) / N.xpPerLevel,
      skill: 1000 + Math.floor(xp / 18),
      drops: s.drops[Math.floor(t)],
      weight: s.weight[Math.floor(t)],
      v,
      integrity: sample(s.integrity, t),
      token,
      halfLife: token < N.tokenStart - 0.01 && t > 0 ? (t * Math.LN2) / -Math.log(token / N.tokenStart) : null,
      decayLog: N.decay.filter((d) => d.t <= t),
      repairs,
      resilience: Math.min(100, 72 + 9 * (repairs.mask + repairs.loop + repairs.chance)),
      incidents,
      active,
      runs,
      ticks,
      unreal: { assets: N.U.assets + sum("assets"), blueprints: N.U.blueprints + sum("blueprints"), logic: N.U.logic + sum("logic"), ai: N.U.ai + sum("ai") },
      journal: N.journal.filter((j) => j.t <= t),
      health: sample(s.health, t),
    };
  }

  /* ---------- Engine (2D canvas, no WebGL needed) ---------- */

  function Engine(canvas, signal) {
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) return null;
    const r = mulberry32(7);
    const runes = Array.from({ length: 28 }, () => {
      const pts = [[0, -1], [0, 1], [-0.6, -0.5], [0.6, -0.5], [-0.6, 0.4], [0.6, 0.4], [0, 0]];
      const strokes = [[0, 1]];
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.floor(r() * pts.length);
        let b = Math.floor(r() * pts.length);
        if (b === a) b = (a + 3) % pts.length;
        strokes.push([a, b]);
      }
      return strokes.map(([a, b]) => [pts[a], pts[b]]);
    });
    const TRACKS = [
      { key: "arpg", color: "163,199,234", rx: 0.74, ry: 0.24, tilt: -0.42, speed: 0.33, phase: 0.3 },
      { key: "diabolic", color: "255,124,85", rx: 0.66, ry: 0.3, tilt: 0.5, speed: -0.27, phase: 2.2 },
      { key: "carnival", color: "200,150,255", rx: 0.8, ry: 0.19, tilt: 1.45, speed: 0.22, phase: 4.1 },
    ];
    const parts = Array.from({ length: 150 }, () => newPart(true));
    const pulses = [];
    let W = 0, H = 0, dpr = 1, rot = 0, spin = 0.04, lastNow = 0;
    let alerts = {};
    let health = 80;
    let running = false;

    function newPart(anywhere) {
      const tr = r();
      return { a: r() * Math.PI * 2, d: anywhere ? 0.2 + r() * 0.8 : 0.92 + r() * 0.1, sp: 0.15 + r() * 0.35, in: 0.015 + r() * 0.035, size: 0.6 + r() * 1.6, c: tr < 0.6 ? "236,200,130" : TRACKS[Math.floor(r() * 3)].color, tw: r() * 6 };
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(rect.width * dpr));
      H = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = W;
      canvas.height = H;
    }

    function ring(cx, cy, rad, alpha, width) {
      ctx.strokeStyle = "rgba(226,190,120," + alpha + ")";
      ctx.lineWidth = width * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    function draw(now, dt) {
      if (!W) resize();
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.47;
      const t = now / 1000;
      spin = lerp(spin, running ? 0.34 : 0.05, Math.min(1, dt * 1.5));
      rot += spin * dt;
      const crit = health < 60, strained = health < 80;
      const coreRGB = crit ? "255,110,80" : strained ? "240,170,90" : "243,214,150";

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.05);
      bg.addColorStop(0, "rgba(" + coreRGB + ",0.16)");
      bg.addColorStop(0.45, "rgba(120,70,30,0.08)");
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Outer ticks.
      ring(cx, cy, R, 0.75, 1.4);
      ring(cx, cy, R * 0.955, 0.4, 0.8);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot * 0.5);
      for (let i = 0; i < 144; i++) {
        const a = (i / 144) * Math.PI * 2;
        const long = i % 12 === 0, mid = i % 4 === 0;
        const r0 = R * 0.955, r1 = R * (long ? 0.895 : mid ? 0.915 : 0.932);
        ctx.strokeStyle = "rgba(226,190,120," + (long ? 0.9 : 0.5) + ")";
        ctx.lineWidth = (long ? 1.6 : 0.8) * dpr;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
        if (long) {
          ctx.fillStyle = "rgba(243,214,150,0.9)";
          ctx.beginPath();
          ctx.arc(Math.cos(a) * R * 0.875, Math.sin(a) * R * 0.875, 1.8 * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Rune ring.
      ring(cx, cy, R * 0.85, 0.55, 1);
      ring(cx, cy, R * 0.72, 0.55, 1);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-rot * 0.8);
      ctx.lineCap = "round";
      runes.forEach((strokes, i) => {
        const a = (i / runes.length) * Math.PI * 2;
        const rr = R * 0.785, sz = R * 0.04;
        const glow = 0.55 + 0.45 * Math.sin(t * 1.3 + i * 0.7);
        ctx.save();
        ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
        ctx.rotate(a + Math.PI / 2);
        ctx.strokeStyle = "rgba(243,214,150," + (0.45 + glow * 0.5) + ")";
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        strokes.forEach(([p, q]) => {
          ctx.moveTo(p[0] * sz, p[1] * sz);
          ctx.lineTo(q[0] * sz, q[1] * sz);
        });
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();

      // Sacred geometry.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot * 0.3);
      ctx.strokeStyle = "rgba(226,190,120,0.55)";
      ctx.lineWidth = 1.1 * dpr;
      [0, Math.PI].forEach((off) => {
        ctx.beginPath();
        for (let i = 0; i <= 3; i++) {
          const a = off - Math.PI / 2 + (i * Math.PI * 2) / 3;
          const x = Math.cos(a) * R * 0.6, y = Math.sin(a) * R * 0.6;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.rotate(-rot * 0.75);
      ctx.strokeStyle = "rgba(226,190,120,0.28)";
      [0, Math.PI / 4].forEach((off) => {
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
          const a = off + (i * Math.PI) / 2;
          const x = Math.cos(a) * R * 0.44, y = Math.sin(a) * R * 0.44;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();
      ring(cx, cy, R * 0.6, 0.35, 0.8);
      ring(cx, cy, R * 0.31, 0.6, 1);

      // Track orbits.
      TRACKS.forEach((tr) => {
        const alert = alerts[tr.key];
        const col = alert ? "255,96,72" : tr.color;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tr.tilt);
        ctx.strokeStyle = "rgba(" + col + "," + (alert ? 0.45 + 0.35 * Math.sin(t * 8) : 0.42) + ")";
        ctx.lineWidth = (alert ? 1.6 : 1.1) * dpr;
        ctx.setLineDash(alert ? [6 * dpr, 5 * dpr] : []);
        ctx.beginPath();
        ctx.ellipse(0, 0, R * tr.rx, R * tr.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const a = tr.phase + rot * tr.speed * 9;
        for (let k = 14; k >= 0; k--) {
          const aa = a - k * 0.05 * Math.sign(tr.speed);
          const x = Math.cos(aa) * R * tr.rx, y = Math.sin(aa) * R * tr.ry;
          ctx.fillStyle = "rgba(" + col + "," + ((1 - k / 15) * 0.5).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(x, y, (2.6 - k * 0.12) * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        const x = Math.cos(a) * R * tr.rx, y = Math.sin(a) * R * tr.ry;
        ctx.shadowColor = "rgba(" + col + ",1)";
        ctx.shadowBlur = (alert ? 22 : 14) * dpr;
        ctx.fillStyle = "rgba(" + col + ",1)";
        ctx.beginPath();
        ctx.arc(x, y, (alert ? 6 + 2 * Math.sin(t * 10) : 5) * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.arc(x, y, 9 * dpr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Motes spiralling into the core.
      ctx.globalCompositeOperation = "lighter";
      parts.forEach((p, i) => {
        if (dt) {
          p.a += p.sp * dt * (running ? 1.8 : 0.6);
          p.d -= p.in * dt * (running ? 2.4 : 0.5);
          if (p.d < 0.2) parts[i] = newPart(false);
        }
        const x = cx + Math.cos(p.a) * R * p.d, y = cy + Math.sin(p.a) * R * p.d;
        const al = 0.35 + 0.45 * Math.sin(t * 2 + p.tw);
        ctx.fillStyle = "rgba(" + p.c + "," + al.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(x, y, p.size * dpr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Pulses from events.
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const age = (now - p.t0) / 1600;
        if (age >= 1 || age < 0) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = "rgba(" + p.c + "," + (1 - age).toFixed(3) + ")";
        ctx.lineWidth = (3 - age * 2) * dpr;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (0.3 + age * 0.75), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Core.
      const beat = 1 + 0.07 * Math.sin(t * (running ? 3.2 : 1.4));
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.29 * beat);
      core.addColorStop(0, "rgba(255,248,225,0.95)");
      core.addColorStop(0.25, "rgba(" + coreRGB + ",0.8)");
      core.addColorStop(0.6, "rgba(150,80,30,0.35)");
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.29 * beat, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      ctx.fillStyle = "rgba(30,18,8,0.9)";
      ctx.font = "900 " + Math.round(R * 0.11) + "px 'Cinzel Decorative', Cinzel, Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("HSI", cx, cy + R * 0.005);
      lastNow = now;
    }

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { resize(); if (reduced) draw(lastNow || 0, 0); });
      ro.observe(canvas);
      if (signal) signal.addEventListener("abort", () => ro.disconnect());
    }
    return {
      draw,
      set(opts) {
        alerts = opts.alerts;
        health = opts.health;
        running = opts.running;
      },
      pulse(kind) {
        if (reduced) return;
        pulses.push({ t0: performance.now(), c: kind === "fail" ? "255,96,72" : "243,214,150" });
      },
    };
  }

  /* ---------- Static decoration ---------- */

  function decorate() {
    $$("[data-corners]").forEach((el) => {
      if (el.querySelector(":scope > .corner")) return;
      ["tl", "tr", "bl", "br"].forEach((c) => {
        el.append(sv("svg", { class: "corner corner--" + c, "aria-hidden": "true", focusable: "false" }, sv("use", { href: "#filigree" })));
      });
    });

    const svg = $("#spires");
    const r = mulberry32(1307);
    svg.setAttribute("viewBox", "0 0 1600 400");
    svg.replaceChildren();
    const layer = (cls, base, hMin, hMax, step) => {
      let d = "M0 400V" + base;
      let x = 0;
      const wins = [];
      while (x < 1600) {
        const w = step * (0.6 + r() * 0.9);
        const hgt = hMin + r() * (hMax - hMin);
        const top = base - hgt;
        d += "H" + x.toFixed(0) + "V" + (top + 30).toFixed(0) + "L" + (x + w / 2).toFixed(0) + " " + (top - 40 - r() * 60).toFixed(0) + "L" + (x + w).toFixed(0) + " " + (top + 30).toFixed(0) + "V" + base;
        if (cls === "near" && r() < 0.35) wins.push([x + w / 2 - 2, top + 50 + r() * 40]);
        x += w + step * r() * 0.6;
      }
      d += "H1600V400Z";
      svg.append(sv("path", { class: cls, d }));
      wins.forEach(([wx, wy]) => svg.append(sv("rect", { class: "win", x: wx.toFixed(0), y: wy.toFixed(0), width: 4, height: 9, rx: 2 })));
    };
    layer("far", 330, 40, 170, 70);
    layer("near", 380, 20, 120, 54);

    $$(".track__scene").forEach((el) => scene(el, el.dataset.scene));
  }

  // Banner illustrations for the track cards, after the lore boards' track panels.
  function scene(svg, kind) {
    const r = mulberry32(kind.length * 977);
    const id = "sc-" + kind;
    const skies = { arpg: ["#1d3552", "#0b1420"], diabolic: ["#5a1012", "#160506"], carnival: ["#3d1760", "#0e0618"] };
    const kids = [
      sv("defs", null, sv("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, sv("stop", { offset: 0, "stop-color": skies[kind][1] }), sv("stop", { offset: 0.75, "stop-color": skies[kind][0] }), sv("stop", { offset: 1, "stop-color": skies[kind][1] }))),
      sv("rect", { width: 400, height: 110, fill: "url(#" + id + ")" }),
    ];
    const spires = (fill, base, hMin, hMax, step) => {
      let d = "M0 110V" + base, x = -10;
      while (x < 410) {
        const w = step * (0.5 + r()), top = base - (hMin + r() * (hMax - hMin));
        d += "H" + x.toFixed(0) + "V" + top.toFixed(0) + "L" + (x + w / 2).toFixed(0) + " " + (top - 14 - r() * 24).toFixed(0) + "L" + (x + w).toFixed(0) + " " + top.toFixed(0) + "V" + base;
        x += w + r() * step * 0.5;
      }
      return sv("path", { d: d + "H410V110Z", fill });
    };
    const motes = (n, color, yMax) => {
      const g = sv("g", { fill: color });
      for (let i = 0; i < n; i++) g.append(sv("circle", { cx: (r() * 400).toFixed(0), cy: (r() * yMax).toFixed(0), r: (0.4 + r() * 1.2).toFixed(1), opacity: (0.3 + r() * 0.7).toFixed(2) }));
      return g;
    };
    if (kind === "arpg") {
      kids.push(sv("circle", { cx: 318, cy: 30, r: 13, fill: "#e4ecf4", opacity: 0.75, filter: "url(#f-glow)" }));
      kids.push(motes(40, "#d8e1ea", 70));
      kids.push(spires("#18293d", 96, 18, 46, 34), spires("#0c1520", 108, 6, 30, 26));
      kids.push(sv("path", { d: "M70 108l6-34 4-6 4 6 3 34z", fill: "#0c1520" }));
      kids.push(sv("path", { d: "M84 70c30-22 70-22 96-6", fill: "none", stroke: "#ff9a5a", "stroke-width": 1.6, "stroke-linecap": "round", filter: "url(#f-glow)", opacity: 0.85 }));
      kids.push(sv("path", { d: "M77 68l-3-8 3-3 3 3z", fill: "#a3c7ea", filter: "url(#f-glow)" }));
    } else if (kind === "diabolic") {
      kids.push(sv("circle", { cx: 300, cy: 64, r: 52, fill: "#ff5a3a", opacity: 0.16, filter: "url(#f-glow)" }));
      kids.push(spires("#2a0809", 100, 16, 50, 30));
      kids.push(sv("path", { d: "M236 110c6-38 30-58 64-58s58 20 64 58z", fill: "#120304" }));
      kids.push(sv("path", { d: "M282 60c-18-16-24-34-16-54 4 20 14 32 26 44zM318 60c18-16 24-34 16-54-4 20-14 32-26 44z", fill: "#120304" }));
      kids.push(sv("g", { fill: "#ff3b2a", filter: "url(#f-glow)" }, sv("path", { d: "M286 76l9 3-9 2zM314 76l-9 3 9 2z" })));
      kids.push(sv("path", { d: "M300 88l5 10-5 7-5-7z", fill: "#ff5a3a", filter: "url(#f-glow)", opacity: 0.9 }));
      kids.push(spires("#0e0203", 110, 4, 22, 22));
      kids.push(motes(46, "#ff8a5a", 104));
    } else {
      kids.push(motes(50, "#ff6adb", 80), motes(30, "#45ebcf", 80));
      const wheel = sv("g", { fill: "none", stroke: "#c896ff", "stroke-width": 1, opacity: 0.9 });
      wheel.append(sv("circle", { cx: 88, cy: 56, r: 42 }), sv("circle", { cx: 88, cy: 56, r: 36, "stroke-dasharray": "2 3" }), sv("path", { d: "M88 56L66 110M88 56l22 54", "stroke-width": 1.6 }));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        wheel.append(sv("line", { x1: 88, y1: 56, x2: (88 + Math.cos(a) * 42).toFixed(1), y2: (56 + Math.sin(a) * 42).toFixed(1), "stroke-width": 0.6 }));
        wheel.append(sv("circle", { cx: (88 + Math.cos(a) * 42).toFixed(1), cy: (56 + Math.sin(a) * 42).toFixed(1), r: 2.4, fill: i % 2 ? "#45ebcf" : "#ff6adb", stroke: "none", filter: "url(#f-glow)" }));
      }
      kids.push(wheel);
      kids.push(sv("path", { d: "M196 110l58-62 58 62z", fill: "#2a1040" }));
      for (let i = 0; i < 6; i++) kids.push(sv("path", { d: "M254 48L" + (200 + i * 22) + " 110", stroke: i % 2 ? "#ff6adb" : "#c896ff", "stroke-width": 1.2, opacity: 0.55 }));
      kids.push(sv("path", { d: "M254 48v-14l12 5-12 4", fill: "#45ebcf", stroke: "#45ebcf", "stroke-width": 0.8 }));
      const lights = sv("g", { filter: "url(#f-glow)" });
      lights.append(sv("path", { d: "M130 24Q230 58 400 20", fill: "none", stroke: "#c896ff", "stroke-width": 0.5, opacity: 0.6 }));
      for (let i = 0; i <= 18; i++) {
        const k = i / 18, x = (1 - k) * (1 - k) * 130 + 2 * (1 - k) * k * 230 + k * k * 400, y = (1 - k) * (1 - k) * 24 + 2 * (1 - k) * k * 58 + k * k * 20;
        lights.append(sv("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 1.6, fill: ["#ff6adb", "#45ebcf", "#f3d28c"][i % 3] }));
      }
      kids.push(lights);
      kids.push(sv("path", { d: "M330 110v-22l14-12 14 12v22z", fill: "#1a0a29" }));
    }
    svg.replaceChildren(...kids);
  }

  function renderSnapshot(data) {
    const A = data.automations;
    const T = A.totals;
    $("#t-runs").textContent = fmtInt(T.runs);
    $("#t-ok").textContent = fmtInt(T.succeeded);
    $("#t-fail").textContent = fmtInt(T.failed);
    $("#t-autos").textContent = fmtInt(T.automations);
    $("#t-rate").textContent = fmtPct((T.succeeded / Math.max(1, T.succeeded + T.failed)) * 100);

    const live = data.source === "live";
    const label = live ? "Live feed · " + (data.generatedAt ? new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "now") : "Snapshot · " + A.label;
    ["#source-badge", "#autos-snap"].forEach((s) => {
      $(s).textContent = label;
      $(s).classList.toggle("badge--live", live);
    });

    const body = $("#auto-body");
    body.replaceChildren(
      ...A.list.map((a) =>
        h("tr", null,
          h("td", { "data-k": "Automation", text: a.name }),
          h("td", { "data-k": "Schedule", class: a.schedule ? null : "is-empty", text: a.schedule || "—" }),
          h("td", { "data-k": "Next run", class: a.next ? null : "is-empty", text: a.next || "—" }),
          h("td", { "data-k": "Status" }, h("span", { class: "status" + (a.status ? "" : " status--unknown"), text: a.status ? a.status : "Unknown" }))
        )
      )
    );
    $("#auto-count").textContent = "Showing " + A.list.length + " of " + fmtInt(T.automations) + " automations: the dashboard's first page plus two seen in the runs feed.";
  }

  /* ---------- Render ---------- */

  const prev = {};
  const tweens = new Set();
  function tween(el, value, fmt) {
    if (!el) return;
    if (el._target === value) return;
    el._target = value;
    el._fmt = fmt;
    if (reduced || el._cur == null) {
      el._cur = value;
      el.textContent = fmt(value);
      tweens.delete(el);
    } else tweens.add(el);
  }
  function stepTweens(dt) {
    tweens.forEach((el) => {
      const k = Math.min(1, dt * 7);
      el._cur = lerp(el._cur, el._target, k);
      if (Math.abs(el._cur - el._target) < 0.05) {
        el._cur = el._target;
        tweens.delete(el);
      }
      el.textContent = el._fmt(el._cur);
    });
  }

  function changed(key, sig) {
    if (prev[key] === sig) return false;
    prev[key] = sig;
    return true;
  }

  function sparkline(svg, arr, t, o) {
    const W = 300, Hh = o.h || 64;
    const m = Math.floor(t);
    const pts = [];
    for (let i = 0; i <= m; i += 4) pts.push([i, arr[i]]);
    if (pts[pts.length - 1][0] !== m) pts.push([m, arr[m]]);
    const lo = o.min, hi = o.max;
    const X = (i) => (i / NIGHT) * W;
    const Y = (v) => Hh - 4 - ((v - lo) / (hi - lo)) * (Hh - 10);
    const id = svg.id + "-g";
    const kids = [
      sv("defs", null, sv("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, sv("stop", { offset: 0, "stop-color": o.color, "stop-opacity": 0.55 }), sv("stop", { offset: 1, "stop-color": o.color, "stop-opacity": 0 }))),
      sv("line", { class: "base", x1: 0, x2: W, y1: Hh - 4, y2: Hh - 4 }),
    ];
    for (let hr = 60; hr < NIGHT; hr += 60) kids.push(sv("line", { class: "base", x1: X(hr), x2: X(hr), y1: Hh - (hr % 120 ? 7 : 10), y2: Hh - 4 }));
    if (m < NIGHT) kids.push(sv("rect", { x: X(m), y: 0, width: W - X(m), height: Hh - 4, fill: "rgba(255,255,255,0.025)" }));
    if (o.half) {
      const y = Y(o.half);
      kids.push(sv("line", { class: "half", x1: 0, x2: W, y1: y, y2: y }), sv("text", { class: "halftxt", x: W - 2, y: y - 4, "text-anchor": "end", text: "½ · HALF-LIFE" }));
    }
    if (pts.length > 1) {
      const line = pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join("");
      kids.push(sv("path", { d: line + "L" + X(m).toFixed(1) + " " + (Hh - 4) + "L0 " + (Hh - 4) + "Z", fill: "url(#" + id + ")", opacity: 0.5 }));
      kids.push(sv("path", { class: "line", d: line, stroke: o.color }));
    }
    const last = pts[pts.length - 1];
    kids.push(sv("circle", { class: "dot", cx: X(last[0]), cy: Y(last[1]), r: 3.5, fill: o.color }));
    svg.replaceChildren(...kids);
  }

  function historyChart(data, simOk, simFail, showSim) {
    const svg = $("#history-chart");
    const days = data.automations.history.days;
    const start = new Date(data.automations.history.start + "T00:00:00");
    const VW = Math.round(clamp(svg.clientWidth || 1000, 300, 1400));
    const VH = VW < 560 ? 200 : 230;
    svg.setAttribute("viewBox", "0 0 " + VW + " " + VH);
    const slots = days.length + 2;
    const x0 = 30, x1 = VW - 4, y0 = 12, y1 = VH - 44;
    const sw = (x1 - x0) / slots, bw = Math.max(4, sw * 0.62);
    const max = Math.max(10, ...days.map((d) => d[0] + d[1]), simOk + simFail);
    const top = Math.ceil(max / 20) * 20;
    const Y = (v) => y1 - (v / top) * (y1 - y0);
    const kids = [];
    for (let g = 0; g <= top; g += 20) {
      kids.push(sv("line", { class: "grid", x1: x0, x2: x1, y1: Y(g), y2: Y(g) }));
      kids.push(sv("text", { class: "axis", x: x0 - 6, y: Y(g) + 3, "text-anchor": "end", text: g }));
    }
    const dayLabel = (i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    days.forEach(([ok, fail], i) => {
      const x = x0 + i * sw + (sw - bw) / 2;
      const g = sv("g", { class: "bar" }, sv("title", { text: dayLabel(i) + ": " + ok + " succeeded, " + fail + " failed (snapshot)" }));
      if (ok) g.append(sv("rect", { class: "bar-ok", x, y: Y(ok), width: bw, height: y1 - Y(ok), rx: 1.5 }));
      if (fail) g.append(sv("rect", { class: "bar-fail", x, y: Y(ok + fail), width: bw, height: Y(ok) - Y(ok + fail) - 1, rx: 1.5 }));
      kids.push(g);
    });
    [0, Math.floor(days.length / 2), days.length - 1].forEach((i, n) =>
      kids.push(sv("text", { class: "axis", x: n === 0 ? x0 + (sw - bw) / 2 : n === 1 ? x0 + i * sw + sw / 2 : x0 + i * sw + (sw + bw) / 2, y: y1 + 16, "text-anchor": ["start", "middle", "end"][n], text: dayLabel(i) }))
    );
    const sx = x0 + (days.length + 1) * sw + (sw - bw) / 2;
    if (showSim) {
      const g = sv("g", { class: "bar" }, sv("title", { text: "Tonight (simulated): " + simOk + " succeeded or recovered, " + simFail + " failed" }));
      if (simOk) g.append(sv("rect", { class: "bar-sim", x: sx, y: Y(simOk), width: bw, height: y1 - Y(simOk) }));
      if (simFail) g.append(sv("rect", { class: "bar-sim-fail", x: sx, y: Y(simOk + simFail), width: bw, height: Y(simOk) - Y(simOk + simFail) - 1 }));
      if (!simOk && !simFail) g.append(sv("rect", { class: "bar-sim", x: sx, y: y1 - 1, width: bw, height: 1 }));
      kids.push(g);
      kids.push(sv("text", { class: "axis axis--sim", x: sx + bw, y: y1 + 34, "text-anchor": "end", text: "Tonight · simulated" }));
      kids.push(sv("line", { stroke: "rgba(169,217,238,.35)", "stroke-dasharray": "2 3", x1: sx - sw * 0.45, x2: sx - sw * 0.45, y1: y0, y2: y1 }));
    }
    svg.replaceChildren(...kids);
  }

  function render(ctx) {
    const { N, data, S } = ctx;
    const st = stateAt(N, S.t);
    const idle = S.status === "idle";
    ctx.st = st;

    // Clock, mode, ritual.
    if (changed("clock", clock(S.t))) $("#clock").textContent = clock(S.t);
    const modeText = { idle: "Idle · Snapshot only", running: "Dreaming · Simulated", paused: "Paused · Simulated", done: "Dawn · Night complete" }[S.status];
    if (changed("mode", S.status)) {
      const b = $("#mode-badge");
      b.dataset.mode = S.status;
      b.textContent = modeText;
      const btn = $("#activate");
      btn.dataset.state = S.status;
      btn.setAttribute("aria-pressed", String(S.status === "running"));
      $("#activate-verb").textContent = { idle: "Activate", running: "Dreaming", paused: "Resume", done: "Dream again" }[S.status];
      btn.setAttribute("aria-label", { idle: "Activate Recursive Dreaming", running: "Pause Recursive Dreaming", paused: "Resume Recursive Dreaming", done: "Replay the night" }[S.status]);
      const pause = $("#btn-pause");
      pause.disabled = S.status === "idle" || S.status === "done";
      pause.textContent = S.status === "paused" ? "Resume" : "Pause";
      $("#autos-simtag").hidden = idle;
      $("#t-sim").hidden = idle;
    }
    if (changed("speed", S.speed)) $$(".ctl--speed").forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.speed === S.speed)));

    const k = S.t / NIGHT;
    $("#night-fill").style.width = (k * 100).toFixed(2) + "%";
    $("#night-moon").style.left = (k * 100).toFixed(2) + "%";
    const marks = st.incidents.map((x) => x.inc.id + (x.resolved ? "h" : "o")).join();
    if (changed("marks", marks)) {
      const track = $("#night-track");
      $$(".night__mark", track).forEach((m) => m.remove());
      st.incidents.forEach((x) => track.append(h("span", { class: "night__mark" + (x.resolved ? " is-healed" : ""), style: "left:" + ((x.inc.t / NIGHT) * 100).toFixed(2) + "%" })));
    }
    let cap;
    if (idle) cap = "The engine idles. The night has not begun.";
    else if (S.status === "done") cap = "Dawn. Recursion confirmed. " + st.incidents.length + " anomalies healed, " + st.runs.length + " simulated runs dreamt.";
    else if (S.status === "paused") cap = "Paused at " + clock(S.t) + ". The dream holds its breath.";
    else {
      const p = PHASES[Math.min(3, st.phase)];
      cap = "Phase " + p[0] + " · " + p[1] + ". " + p[2];
    }
    if (changed("cap", cap)) $("#night-caption").textContent = cap;

    // Health.
    const hv = Math.round(st.health);
    tween($("#health-val"), st.health, (v) => String(Math.round(v)));
    tween($("#health-mini"), st.health, (v) => Math.round(v) + " / 100");
    $("#health-arc").style.strokeDasharray = st.health.toFixed(1) + " 100";
    const hState = hv >= 80 ? "ok" : hv >= 60 ? "strained" : "critical";
    if (changed("hstate", hState + idle)) {
      const el = $("#health");
      el.classList.toggle("is-strained", hState === "strained");
      el.classList.toggle("is-critical", hState === "critical");
      $("#health-state").textContent = idle ? "Snapshot baseline" : { ok: "Stable", strained: "Strained", critical: "Critical" }[hState];
    }

    // Self-repair diagram.
    const cur = st.active[st.active.length - 1];
    const last = st.incidents[st.incidents.length - 1];
    const shown = cur || last;
    const diagSig = shown ? shown.inc.id + ":" + shown.stage + ":" + shown.resolved : "none";
    if (changed("diag", diagSig)) {
      $$(".step").forEach((el, i) => {
        el.classList.toggle("is-active", !!shown && !shown.resolved && i === shown.stage);
        el.classList.toggle("is-done", !!shown && (shown.resolved || i < shown.stage));
      });
      $(".cycle").classList.toggle("is-alert", !!cur && cur.stage === 0);
      const c = $("#cycle-caption");
      if (!shown) c.textContent = "No anomaly. All vectors at rest.";
      else if (!shown.resolved) c.replaceChildren(h("b", { text: TRACK_LABEL[shown.inc.track] }), " · " + shown.inc.anomaly + ". " + STEP_NAMES[shown.stage] + ": " + STEP_LINES[shown.stage] + ".");
      else c.replaceChildren("Last: ", h("b", { text: TRACK_LABEL[shown.inc.track] }), " · " + shown.inc.anomaly + ", healed at " + clock(shown.inc.resolveT) + ". " + shown.inc.result + ".");
    }

    // Track alerts.
    const alerts = {};
    st.active.forEach((x) => (alerts[x.inc.track] = true));
    ["arpg", "diabolic", "carnival"].forEach((tk) => {
      if (changed("alert-" + tk, !!alerts[tk])) {
        $("#track-" + tk).classList.toggle("is-alert", !!alerts[tk]);
        $("#flag-" + tk).textContent = alerts[tk] ? "Anomaly" : idle ? "Stable" : "Dreaming";
      }
    });
    if (changed("idleflags", S.status)) ["arpg", "diabolic", "carnival"].forEach((tk) => !alerts[tk] && ($("#flag-" + tk).textContent = idle ? "Stable" : S.status === "done" ? "Evolved" : "Dreaming"));

    // ARPG.
    tween($("#arpg-xp"), st.xp, fmtInt);
    tween($("#arpg-level"), st.level, fmtInt);
    tween($("#arpg-skill"), st.skill, fmtInt);
    tween($("#arpg-drops"), st.drops, fmtInt);
    $("#arpg-xpbar").style.width = (st.levelK * 100).toFixed(1) + "%";
    const xpcap = fmtInt(st.levelK * N.xpPerLevel) + " / " + fmtInt(N.xpPerLevel) + " XP to level " + (st.level + 1) + (alerts.arpg ? " · ledger desync, drops held" : "");
    if (changed("xpcap", xpcap)) $("#arpg-xpcap").textContent = xpcap;
    if (changed("wt", st.weight.toFixed(1))) $("#arpg-weight").textContent = "+" + st.weight.toFixed(1) + "%";
    const dropsShown = idle ? [] : st.loot.slice(-3).reverse();
    if (changed("droplist", dropsShown.map((l) => l.t).join())) {
      const items = dropsShown.map((l, i) =>
        h("li", { class: "drop drop--" + l.tier + (i === 0 ? " is-new" : "") },
          h("span", { class: "drop__tier", text: l.tier }),
          h("span", { class: "drop__item", text: l.item }),
          h("span", { class: "drop__meta", text: clock(l.t) + " · +" + fmtInt(l.xp) + " XP · weight +" + l.shift.toFixed(1) + "%" })
        )
      );
      if (!items.length) items.push(h("li", { class: "drop drop--none" }, h("span", { class: "drop__item", text: "No drops yet. The slain have not spoken." })));
      $("#arpg-drops-list").replaceChildren(...items);
    }
    const stage = idle ? -1 : S.status === "done" ? 4 : Math.floor(S.t / 3) % 5;
    if (changed("loot", stage)) $$("#loot-ring li").forEach((li, i) => li.classList.toggle("is-on", i === stage));
    const minute = Math.floor(S.t);
    if (changed("spark", minute + S.status)) {
      sparkline($("#spark-arpg"), N.series.xp, S.t, { min: N.series.xp[0] * 0.95, max: N.series.xp[NIGHT] * 1.02, color: "#a3c7ea" });
      sparkline($("#spark-diabolic"), N.series.integrity, S.t, { min: 0, max: 100, color: "#ff7c55" });
      sparkline($("#spark-carnival"), N.series.token, S.t, { min: 0, max: N.tokenStart, color: "#ff6adb", half: N.tokenStart / 2, h: 96 });
    }

    // Diabolic.
    const ph = idle ? -1 : st.phase;
    if (changed("phase", ph + ":" + Math.round(st.phaseK * 50))) {
      $$("#phases li").forEach((li, i) => {
        li.classList.toggle("is-on", i === ph);
        li.classList.toggle("is-done", i < ph);
        $("i", li).style.width = i < ph ? "100%" : i === ph ? (st.phaseK * 100).toFixed(0) + "%" : "0";
      });
      $("#phase-cap").textContent = idle ? "Four phases. One loop. No end." : ph >= 4 ? "Recursion confirmed. You may banish it, but you cannot unwrite it." : PHASES[ph][2];
    }
    VECTORS.forEach(([key]) => {
      const li = $("#v-" + key);
      const val = st.v[key];
      $(".vector__bar i", li).style.width = val.toFixed(1) + "%";
      tween($(".vector__v", li), val, (v) => Math.round(v) + "%");
      const hurt = st.active.some((x) => x.inc.vector === key);
      const healed = !hurt && st.incidents.some((x) => x.inc.vector === key && x.resolved && S.t - x.inc.resolveT < 14);
      if (changed("vh-" + key, hurt + ":" + healed)) {
        li.classList.toggle("is-hurt", hurt);
        li.classList.toggle("is-healed", healed);
      }
    });

    $$("#strikes li").forEach((li) => {
      const x = st.incidents.find((i) => i.inc.vector === li.dataset.v);
      const s = !x ? "" : x.resolved || x.stage >= 2 ? "rewritten" : "striking";
      if (changed("strike-" + li.dataset.v, s)) {
        li.className = s ? "is-" + s : "";
        $("em", li).textContent = !s ? "Unstruck" : s === "striking" ? "Striking" : "Rewritten";
      }
    });

    // Carnival.
    tween($("#carn-value"), st.token, (v) => v.toFixed(1) + "%");
    const hl = st.halfLife;
    const hlText = hl ? Math.floor(hl / 60) + "h " + String(Math.round(hl % 60)).padStart(2, "0") + "m" : "—";
    if (changed("hl", hlText)) $("#carn-half").textContent = hlText;
    tween($("#carn-res"), st.resilience, (v) => Math.round(v) + "%");
    if (changed("decay", st.decayLog.length)) {
      const items = st.decayLog.slice().reverse().map((d, i) => h("li", { class: i === 0 && !idle ? "is-new" : null }, String(d.pct.toFixed(2)).replace("-", "−") + "%", h("span", { text: clock(d.t) })));
      items.push(h("li", null, "→ 0", h("span", { text: "recursion continues" })));
      $("#decay-log").replaceChildren(...items);
    }
    const carnOpen = st.active.find((x) => x.inc.track === "carnival");
    const loopStep = idle ? -1 : carnOpen ? Math.min(2, Math.max(0, carnOpen.stage - 1)) : S.status === "done" ? 2 : Math.floor(S.t / 5) % 3;
    if (changed("eloop", loopStep + ":" + !!carnOpen)) {
      $$("#eloop li").forEach((li, i) => li.classList.toggle("is-on", i === loopStep));
      $("#eloop").classList.toggle("is-repairing", !!carnOpen);
      const R = st.repairs;
      $("#eloop-note").textContent = carnOpen ? "Repairing: " + carnOpen.inc.action.toLowerCase() + "." : "Minted tonight: " + R.mask + " mask · " + R.loop + " loop · " + R.chance + " chance. Even entropy wears a smile.";
    }
    const repairs = st.incidents.filter((x) => x.inc.repair && x.stage >= 2);
    if (changed("repairs", repairs.length)) {
      const items = repairs.slice().reverse().map((x, i) => h("li", { class: i === 0 ? "is-new" : null }, "+1 " + x.inc.repair, h("span", { text: clock(x.inc.steps[2]) })));
      if (!items.length) items.push(h("li", { class: "empty-li", text: "No repairs yet" }));
      $("#repair-log").replaceChildren(...items);
    }

    // Incident log.
    const incSig = st.incidents.map((x) => x.inc.id + ":" + x.stage + ":" + x.resolved).join();
    if (changed("inc", incSig)) {
      const newest = st.incidents.length ? st.incidents[st.incidents.length - 1].inc.id : -1;
      const grew = (prev.incCount || 0) < st.incidents.length;
      prev.incCount = st.incidents.length;
      $("#incident-body").replaceChildren(
        ...st.incidents
          .slice()
          .reverse()
          .map((x) =>
            h("tr", { class: (x.resolved ? "" : "is-open") + (grew && x.inc.id === newest ? " is-new" : "") },
              h("td", { "data-k": "Time", text: clock(x.inc.t) }),
              h("td", { "data-k": "Track" }, h("span", { class: "trk trk--" + x.inc.track, text: TRACK_LABEL[x.inc.track] })),
              h("td", { "data-k": "Anomaly", text: x.inc.anomaly }),
              h("td", { "data-k": "Action", text: x.inc.action }),
              h("td", { "data-k": "Result" }, x.resolved ? h("span", { class: "res-ok", text: x.inc.result }) : h("span", { class: "res-open", text: STEP_NAMES[x.stage] + "…" }))
            )
          )
      );
      $("#incident-empty").hidden = st.incidents.length > 0;
    }

    // Journal.
    const jn = idle ? 0 : st.journal.length;
    if (changed("journal", jn)) {
      const list = $("#journal");
      const entries = idle ? [{ t: 0, kind: "", text: "The engine idles. Press Activate and the night begins." }] : st.journal;
      const grew = (prev.jCount || 0) < jn && jn - (prev.jCount || 0) < 4;
      const before = prev.jCount || 0;
      prev.jCount = jn;
      list.replaceChildren(
        ...entries
          .map((j, i) => h("li", { class: "jl" + (j.kind ? " jl--" + j.kind : "") + (grew && i >= before ? " is-new" : "") }, h("time", { text: clock(j.t) }), h("p", { text: j.text })))
          .reverse()
      );
    }

    // Automations (simulated runs on top of the snapshot).
    const simOk = st.runs.filter((x) => x.status !== "failed").length;
    const simFail = st.runs.length - simOk;
    const runSig = idle ? "idle" : st.runs.map((x) => x.status[0]).join("");
    if (changed("runs", runSig)) {
      historyChart(data, simOk, simFail, !idle);
      $("#t-sim-v").textContent = st.runs.length + (simFail ? " · " + simFail + " failed" : "");
      const grew = (prev.rCount || 0) < st.runs.length;
      prev.rCount = st.runs.length;
      const sim = idle
        ? []
        : st.runs
            .slice()
            .reverse()
            .map((x, i) =>
              h("li", { class: "run run--sim run--" + x.status + (grew && i === 0 ? " is-new" : "") },
                h("span", { class: "run__ico", "aria-hidden": "true", text: x.status === "failed" ? "!" : "✓" }),
                h("span", { class: "run__name" }, x.run.name, x.status === "recovered" ? " · recovered" : x.status === "failed" ? " · failed" : ""),
                h("span", { class: "run__time", text: "Tonight " + clock(x.run.t) }),
                h("span", { class: "run__auto", text: x.run.automation }),
                h("span", { class: "run__src" }, h("span", { class: "tag tag--sim", text: "Simulated" }))
              )
            );
      const snap = data.automations.runs.map((x) =>
        h("li", { class: "run run--" + (x.status || "succeeded") },
          h("span", { class: "run__ico", "aria-hidden": "true", text: x.status === "failed" ? "!" : "✓" }),
          h("span", { class: "run__name", text: x.name }),
          h("span", { class: "run__time", text: x.time }),
          h("span", { class: "run__auto", text: x.automation }),
          h("span", { class: "run__src" }, h("span", { class: "src-snap", text: data.source === "live" ? "Live" : "Snapshot" }))
        )
      );
      $("#runs").replaceChildren(...sim, ...snap);
    }

    // Unreal handoff.
    const tick = st.ticks[st.ticks.length - 1];
    const busy = !!tick && S.t - tick.t < 4 && S.status !== "done";
    const drift = !!alerts.unreal;
    const uSig = [idle, busy, drift, st.ticks.length].join();
    if (changed("unreal", uSig)) {
      const status = idle ? ["", "Idle"] : drift ? ["is-drift", "Drift"] : busy ? ["is-busy", "Syncing"] : tick ? ["is-sync", "Synced"] : ["", "Waiting"];
      $$("#handoff li").forEach((li) => {
        const key = li.dataset.k;
        const d = drift && (key === "sync" || key === "blueprints");
        const s = d || !drift ? status : ["is-sync", "Synced"];
        li.className = s[0];
        $(".pill", li).textContent = s[1];
      });
      const items = st.ticks
        .slice(-4)
        .reverse()
        .map((x, i) => h("li", { class: i === 0 ? "is-new" : null }, h("time", { text: clock(x.t) }), h("span", { text: "Tick #" + String(x.n).padStart(2, "0") + " · " + x.assets + " assets · " + x.blueprints + " blueprints · " + x.logic + " logic graphs · " + x.ai + " AI → UE runtime" })));
      if (!items.length) items.push(h("li", null, h("time", { text: "—" }), h("span", { text: idle ? "No handoff yet. Ticks begin at 22:20 once the night starts." : "First tick at 22:20." })));
      $("#handoff-ticks").replaceChildren(...items);
    }
    const hsync = $("#handoff li[data-k=sync] .handoff__v");
    const syncText = tick ? "#" + String(tick.n).padStart(2, "0") : "—";
    if (hsync.textContent !== syncText) hsync.textContent = syncText;
    ["assets", "blueprints", "logic", "ai"].forEach((key) => tween($("#handoff li[data-k=" + key + "] .handoff__v"), st.unreal[key], fmtInt));

    return { alerts, health: st.health };
  }

  /* ---------- Alerts ---------- */

  function toast(kind, title, text) {
    const box = $("#toasts");
    while (box.children.length >= 3) box.firstChild.remove();
    const el = h("div", { class: "toast toast--" + kind }, h("b", { text: title }), text);
    box.append(el);
    setTimeout(() => el.remove(), 4200);
    if (!reduced) {
      const f = h("div", { class: "flash flash--" + kind, "aria-hidden": "true" });
      ($("[data-dreaming-root]") || document.body).append(f);
      setTimeout(() => f.remove(), 1300);
    }
  }

  function fireCrossings(ctx, t0, t1) {
    ctx.N.incidents.forEach((inc) => {
      const label = TRACK_LABEL[inc.track];
      if (inc.t > t0 && inc.t <= t1) {
        toast("fail", "Anomaly · " + label + " · " + clock(inc.t), inc.anomaly);
        ctx.engine && ctx.engine.pulse("fail");
      }
      if (inc.resolveT > t0 && inc.resolveT <= t1) {
        toast("repair", "Recovered · " + label + " · " + clock(inc.resolveT), inc.result);
        ctx.engine && ctx.engine.pulse("repair");
        const panel = $("#track-" + inc.track);
        if (panel) {
          panel.classList.remove("is-healed");
          void panel.offsetWidth;
          panel.classList.add("is-healed");
          setTimeout(() => panel.classList.remove("is-healed"), 1700);
        }
      }
    });
  }

  /* ---------- Boot ---------- */

  function loadSaved() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!s || typeof s.t !== "number") return null;
      return {
        status: ["idle", "running", "paused", "done"].includes(s.status) ? s.status : "idle",
        t: clamp(s.t, 0, NIGHT),
        speed: [0.5, 1, 2, 4].includes(s.speed) ? s.speed : 1,
        seed: Number.isInteger(s.seed) ? s.seed : DEFAULT_SEED,
      };
    } catch (e) {
      return null;
    }
  }

  let stopCurrent = null;

  async function boot() {
    if (stopCurrent) stopCurrent();
    const ac = new AbortController();
    const { signal } = ac;
    stopCurrent = () => ac.abort();
    window.RecursiveDreaming = Object.assign(window.RecursiveDreaming || {}, { stop: () => stopCurrent && stopCurrent() });
    decorate();
    const { data, note } = await loadData();
    if (signal.aborted) return;
    if (note) {
      const n = $("#data-notice");
      n.textContent = note;
      n.hidden = false;
    }
    renderSnapshot(data);

    const S = loadSaved() || { status: "idle", t: 0, speed: 1, seed: DEFAULT_SEED };
    const ctx = { data, S, N: buildNight(data, S.seed), engine: Engine($("#engine-canvas"), signal) };

    const save = () => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ status: S.status, t: +S.t.toFixed(2), speed: S.speed, seed: S.seed }));
      } catch (e) {
        /* storage may be unavailable (private mode); the night still runs */
      }
    };
    const setStatus = (s) => {
      S.status = s;
      save();
    };

    $("#activate").addEventListener("click", () => {
      if (S.status === "idle") setStatus("running");
      else if (S.status === "running") setStatus("paused");
      else if (S.status === "paused") setStatus("running");
      else {
        S.t = 0;
        setStatus("running");
      }
    }, { signal });
    $("#btn-pause").addEventListener("click", () => {
      if (S.status === "running") setStatus("paused");
      else if (S.status === "paused") setStatus("running");
    }, { signal });
    $("#btn-replay").addEventListener("click", () => {
      S.t = 0;
      setStatus("running");
    }, { signal });
    $$(".ctl--speed").forEach((b) =>
      b.addEventListener("click", () => {
        S.speed = +b.dataset.speed;
        save();
      }, { signal })
    );
    window.addEventListener("pagehide", save, { signal });
    signal.addEventListener("abort", save);
    if (window.ResizeObserver) {
      let lastW = 0;
      const ro = new ResizeObserver(([e]) => {
        const w = Math.round(e.contentRect.width);
        if (Math.abs(w - lastW) > 8) {
          lastW = w;
          prev.runs = null;
        }
      });
      ro.observe($("#history-chart"));
      signal.addEventListener("abort", () => ro.disconnect());
    }

    let last = performance.now();
    let lastSave = 0;
    let lastT = S.t;
    let staticSig = "";
    const frame = (now) => {
      if (signal.aborted) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (S.status === "running") {
        S.t = Math.min(NIGHT, S.t + (dt * S.speed * NIGHT) / REAL_SECONDS);
        if (S.t >= NIGHT) setStatus("done");
        if (now - lastSave > 1000) {
          save();
          lastSave = now;
        }
      }
      if (S.t > lastT && S.t - lastT < 30) fireCrossings(ctx, lastT, S.t);
      lastT = S.t;
      const out = render(ctx);
      stepTweens(dt);
      if (ctx.engine) {
        ctx.engine.set({ alerts: out.alerts, health: out.health, running: S.status === "running" });
        if (!reduced) ctx.engine.draw(now, dt);
        else {
          const sig = Object.keys(out.alerts).join() + Math.round(out.health / 10);
          if (sig !== staticSig) {
            staticSig = sig;
            ctx.engine.draw(0, 0);
          }
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    const redrawStatic = () => ctx.engine && reduced && ctx.engine.draw(0, 0);
    mqReduce.addEventListener && mqReduce.addEventListener("change", (e) => {
      reduced = e.matches;
      redrawStatic();
    }, { signal });
    document.fonts && document.fonts.ready.then(redrawStatic);

    // Small hook for tests and for wiring a real feed later.
    window.RecursiveDreaming = {
      state: () => ({ ...S, health: ctx.st && +ctx.st.health.toFixed(1), incidents: ctx.st && ctx.st.incidents.length, open: ctx.st && ctx.st.active.length }),
      script: () => ctx.N.incidents.map((i) => ({ t: i.t, track: i.track, anomaly: i.anomaly })),
      seek(t, status) {
        S.t = clamp(+t || 0, 0, NIGHT);
        lastT = S.t;
        if (status) S.status = status;
        save();
      },
      loadData,
      stop: () => ac.abort(),
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
