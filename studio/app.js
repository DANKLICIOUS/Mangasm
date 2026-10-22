(() => {
  const S = window.STUDIO;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const UNICORN_SDK =
    "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.4.3/dist/unicornStudio.umd.js";
  const brandById = Object.fromEntries(S.brands.map((b) => [b.id, b]));

  /* ---------------- loader ---------------- */
  const loader = $("#loader"),
    pct = $("#loader-pct");
  const loadStart = performance.now();
  const LOAD_MS = reduceMotion ? 0 : 1100;
  const loadTick = (now) => {
    const f = LOAD_MS ? Math.min(1, (now - loadStart) / LOAD_MS) : 1;
    pct.textContent = Math.round(f * f * (3 - 2 * f) * 100);
    if (f < 1) return requestAnimationFrame(loadTick);
    loader.classList.add("done");
    document.body.classList.add("ready");
  };
  requestAnimationFrame(loadTick);

  /* ---------------- hero: CSS parallax for the no-WebGL image ---------------- */
  const hero = $(".hero");
  if (!reduceMotion) {
    addEventListener(
      "pointermove",
      (e) => {
        hero.style.setProperty("--mx", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        hero.style.setProperty("--my", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      },
      { passive: true }
    );
  }

  /* ---------------- houses ---------------- */
  const CRESTS = {
    slay: `<svg viewBox="0 0 48 48"><path d="M10 18 16 8h16l6 10-14 22Z"/><path d="M10 18h28M16 8l4 10 4-10 4 10 4-10M20 18l4 22 4-22"/><path d="M24 2v3M40 6l-2 2M8 6l2 2"/></svg>`,
    coexist: `<svg viewBox="0 0 48 48"><path d="M6 16 24 5l18 11Z"/><path d="M8 16h32M8 40h32M6 44h36"/><path d="M12 19v18M20 19v18M28 19v18M36 19v18"/></svg>`,
    lynx: `<svg viewBox="0 0 48 48"><path d="M4 24c6-9 13-13 20-13s14 4 20 13c-6 9-13 13-20 13S10 33 4 24Z"/><circle cx="24" cy="24" r="6.5"/><path d="M24 17.5c-2 2-2 11 0 13"/><path d="M12 9l3 4M36 9l-3 4M24 4v5"/></svg>`,
  };
  $("#units-grid").innerHTML = S.brands
    .map(
      (b) => `
      <div class="reveal">
        <article class="house glass" style="--tint:${esc(b.hue)}">
          <div class="crest" aria-hidden="true">${CRESTS[b.id] || ""}</div>
          <span class="house-code">${esc(b.code)}</span>
          <h3>${esc(b.name)}</h3>
          <span class="role">${esc(b.role)}</span>
          <p>${esc(b.pitch)}</p>
          <ul>${b.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        </article>
      </div>`
    )
    .join("");

  /* ---------------- the opsec iceberg ---------------- */
  const LAYERS = S.iceberg;
  const VB_W = 500,
    VB_H = 1560,
    WATER = 187;
  const EDGES = [0, WATER, 421, 671, 936, 1217, VB_H];
  const CENTERS = LAYERS.map((_, i) => (i === 0 ? 0.06 : (EDGES[i] + EDGES[i + 1]) / 2 / VB_H));
  const BERG =
    "M250 8 L282 52 L300 40 L322 96 L346 130 L372 187 L410 260 L452 350 L476 470 L488 600 L470 720 L482 840 L458 960 L430 1080 L440 1180 L400 1290 L360 1390 L300 1480 L262 1552 L232 1500 L180 1430 L130 1330 L84 1220 L60 1100 L36 980 L26 860 L40 740 L20 620 L34 500 L64 380 L110 270 L140 187 L160 150 L176 104 L198 118 L214 60 L232 70 Z";
  const FACETS = [
    "M250 8 L262 187 L300 420 L250 700 L330 960 L300 1240 L262 1552",
    "M214 60 L200 187 L150 420 L250 700",
    "M322 96 L300 187",
    "M372 187 L400 420 L300 420",
    "M34 500 L150 420",
    "M488 600 L400 420",
    "M250 700 L130 980 L84 1220",
    "M330 960 L458 960",
    "M250 700 L470 720",
    "M130 980 L300 1240 L440 1180",
    "M60 1100 L130 980",
  ];
  const LABELS = ["I · Surface", "II · DNS · TLS · Mail", "III · Identity & keys", "IV · Infra", "V · Namespace", "VI · Abyss"];
  const LABEL_Y = [164, 300, 548, 806, 1080, 1360];
  $("#ice-berg").innerHTML = `
    <svg viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMin meet">
      <defs>
        <clipPath id="berg-clip"><path d="${BERG}"/></clipPath>
        <linearGradient id="berg-tip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f6ead0" stop-opacity="0.62"/>
          <stop offset="0.6" stop-color="#d9bd7c" stop-opacity="0.28"/>
          <stop offset="1" stop-color="#c9a24a" stop-opacity="0.16"/>
        </linearGradient>
        <linearGradient id="berg-sub" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9ff3ea" stop-opacity="0.34"/>
          <stop offset="0.35" stop-color="#5fd6cc" stop-opacity="0.13"/>
          <stop offset="1" stop-color="#0b3a3f" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="berg-stroke" x1="0" y1="0" x2="0" y2="${VB_H}" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#f3dc9c"/>
          <stop offset="0.12" stop-color="#e6c77a"/>
          <stop offset="0.13" stop-color="#9ff3ea"/>
          <stop offset="0.6" stop-color="#5fd6cc" stop-opacity="0.6"/>
          <stop offset="1" stop-color="#c9a24a" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      <g clip-path="url(#berg-clip)">
        <rect x="0" y="0" width="${VB_W}" height="${WATER}" fill="url(#berg-tip)"/>
        <rect x="0" y="${WATER}" width="${VB_W}" height="${VB_H - WATER}" fill="url(#berg-sub)"/>
        ${LAYERS.map((_, i) => `<rect class="berg-band" data-band="${i}" x="0" y="${EDGES[i]}" width="${VB_W}" height="${EDGES[i + 1] - EDGES[i]}"/>`).join("")}
        <g class="berg-facets">${FACETS.map((d) => `<path d="${d}"/>`).join("")}</g>
        ${EDGES.slice(2, -1).map((y) => `<line class="berg-sep" x1="0" x2="${VB_W}" y1="${y}" y2="${y}"/>`).join("")}
      </g>
      <path class="berg-outline" d="${BERG}"/>
      ${LABELS.map((l, i) => `<text class="berg-label" data-band="${i}" x="250" y="${LABEL_Y[i]}" text-anchor="middle">${esc(l.toUpperCase())}</text>`).join("")}
    </svg>`;

  $("#ice-layers").innerHTML = LAYERS.map(
    (L, i) => `
    <li class="ice-layer" data-layer="${i}">
      <article class="ice-card" aria-labelledby="ice-${esc(L.id)}">
        <p class="ice-meta"><span>${esc(L.kicker)}</span><b>${esc(L.depth)}</b></p>
        <h3 id="ice-${esc(L.id)}">${esc(L.title)}</h3>
        <p>${esc(L.body)}</p>
        ${
          L.glyph
            ? `<div class="glyph"><span class="glyph-label" role="img" aria-label="skull, fire, star">${esc(L.glyph.label)}</span><code>${esc(L.glyph.ascii)}</code>${L.prototype ? `<span class="proto">Prototype · local sim</span>` : ""}</div>`
            : ""
        }
        <ul class="ice-points">${L.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        <ul class="ice-refs" aria-label="Further reading">${L.refs
          .map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`)
          .join("")}</ul>
      </article>
    </li>`
  ).join("");

  const iceTrack = $("#ice-track"),
    iceStage = $("#ice-stage"),
    berg = $("#ice-berg"),
    iceDepth = $("#ice-depth"),
    iceName = $("#ice-name"),
    iceFill = $("#ice-fill");
  const iceItems = $$(".ice-layer"),
    bands = $$(".berg-band"),
    bandLabels = $$(".berg-label");
  const NAMES = ["Surface", "Domains & DNS", "Identity & keys", "Infra you control", "Sovereign namespace", "The abyss"];
  let activeLayer = -1;
  const smooth = (x) => x * x * (3 - 2 * x);
  function layoutIce() {
    const vh = iceStage.clientHeight;
    const H = berg.offsetHeight;
    const r = iceTrack.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    const f = p * (LAYERS.length - 1);
    const k = Math.min(LAYERS.length - 2, Math.floor(f));
    const c = CENTERS[k] + (CENTERS[k + 1] - CENTERS[k]) * smooth(clamp(f - k));
    const bergY = vh * 0.5 - c * H;
    const waterY = bergY + (WATER / VB_H) * H;
    berg.style.setProperty("--berg-y", `${bergY.toFixed(1)}px`);
    iceStage.style.setProperty("--wl", `${((waterY / vh) * 100).toFixed(2)}%`);
    iceFill.parentElement.style.setProperty("--p", p.toFixed(3));
    window.IcebergFX?.setIce(waterY, H * (1 - WATER / VB_H));
    const idx = Math.round(f);
    if (idx !== activeLayer) {
      activeLayer = idx;
      iceItems.forEach((el, i) => el.classList.toggle("on", i === idx));
      bands.forEach((el, i) => el.classList.toggle("on", i === idx));
      bandLabels.forEach((el, i) => el.classList.toggle("on", i === idx));
      iceDepth.textContent = LAYERS[idx].depth;
      iceName.textContent = NAMES[idx];
    }
  }

  /* ---------------- self-sovereignty orbit ---------------- */
  const PILLAR_ICONS = {
    keys: `<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.5"/><path d="M12.5 12H22M18 12v3.5M21 12v2.5"/></svg>`,
    namespace: `<svg viewBox="0 0 24 24"><path d="M5 20V5h11l-2 4 2 4H5"/><path d="M5 22v-2"/></svg>`,
    infra: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/></svg>`,
    data: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/></svg>`,
    revenue: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16.5s-4-2.4-4-5a2.2 2.2 0 0 1 4-1.2 2.2 2.2 0 0 1 4 1.2c0 2.6-4 5-4 5Z"/></svg>`,
    agents: `<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/><path d="M15.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z"/></svg>`,
  };
  const R = 300 / 860;
  $("#orbit-nodes").innerHTML = S.pillars
    .map((pl, i) => {
      const a = ((-90 + i * 60) * Math.PI) / 180;
      const x = 50 + Math.cos(a) * R * 100,
        y = 50 + Math.sin(a) * R * 100;
      return `<li class="orbit-node reveal" style="--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%">
        <div class="on-head"><span class="on-icon" aria-hidden="true">${PILLAR_ICONS[pl.id] || ""}</span><h3>${esc(pl.title)}</h3><span class="on-num" aria-hidden="true">${["I", "II", "III", "IV", "V", "VI"][i]}</span></div>
        <p>${esc(pl.body)}</p>
      </li>`;
    })
    .join("");
  $(".or-arrows").innerHTML = S.pillars
    .map((_, i) => {
      const a = ((-60 + i * 60) * Math.PI) / 180;
      const P = [430 + Math.cos(a) * 300, 430 + Math.sin(a) * 300];
      const t = [-Math.sin(a), Math.cos(a)],
        n = [Math.cos(a), Math.sin(a)];
      const p1 = [P[0] - t[0] * 9 + n[0] * 7, P[1] - t[1] * 9 + n[1] * 7];
      const p2 = [P[0] - t[0] * 9 - n[0] * 7, P[1] - t[1] * 9 - n[1] * 7];
      return `<path d="M${p1.map((v) => v.toFixed(1))} L${P.map((v) => v.toFixed(1))} L${p2.map((v) => v.toFixed(1))}"/>`;
    })
    .join("");

  /* ---------------- backstage: three terminals on one clock ---------------- */
  const TYPE_MS = 34;
  const jitter = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.6;
  const timelines = Object.fromEntries(
    Object.entries(S.terminals).map(([id, lines]) => {
      let acc = 0;
      const tl = lines.map(([delay, raw, cls], i) => {
        const text = raw.replace(/ {2,}/g, "  ");
        const start = acc + delay;
        const typed = text.startsWith("$ ");
        const charTimes = [];
        let ct = start;
        if (typed)
          for (let c = 0; c < text.length; c++) {
            ct += TYPE_MS * (0.7 + Math.abs(jitter(i * 97 + c)));
            charTimes.push(ct);
          }
        acc = typed ? ct : start;
        return { start, end: acc, text, cls: cls || "", typed, charTimes };
      });
      return [id, tl];
    })
  );
  const SHIFT_MS = Math.max(...Object.values(timelines).map((tl) => tl[tl.length - 1].end)) + 300;

  const termsEl = $("#terms");
  termsEl.innerHTML = Object.keys(S.terminals)
    .map((id) => {
      const b = brandById[id];
      return `
      <div class="term" data-term="${id}">
        <div class="term-head"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(b.name)}<span class="state">idle</span></div>
        <pre class="term-body" aria-live="off"></pre>
      </div>`;
    })
    .join("");
  const termView = Object.fromEntries(
    Object.keys(S.terminals).map((id) => {
      const el = termsEl.querySelector(`[data-term="${id}"]`);
      return [id, { el, body: $(".term-body", el), state: $(".state", el), lines: [], key: "" }];
    })
  );
  const lineHTML = (ln, chars) => {
    const txt = ln.text.slice(0, chars);
    if (ln.typed) return `<b>$</b>${esc(txt.slice(1))}`;
    return esc(txt);
  };

  function renderTerminals(t) {
    for (const [id, tl] of Object.entries(timelines)) {
      const v = termView[id];
      let shown = 0,
        partial = -1;
      for (const ln of tl) {
        if (t < ln.start) break;
        shown++;
        if (ln.typed && t < ln.end) {
          partial = ln.charTimes.findIndex((ct) => ct > t);
          break;
        }
      }
      const done = shown === tl.length && partial < 0;
      const key = `${shown}:${partial}`;
      if (key === v.key) continue;
      v.key = key;
      while (v.lines.length > shown) v.lines.pop().remove();
      v.body.querySelector(".caret")?.remove();
      for (let i = 0; i < shown; i++) {
        let span = v.lines[i];
        if (!span) {
          span = document.createElement("span");
          span.className = tl[i].typed ? "cmd" : tl[i].cls;
          v.body.appendChild(span);
          v.lines[i] = span;
        }
        const chars = i === shown - 1 && partial >= 0 ? partial : tl[i].text.length;
        const html = lineHTML(tl[i], chars) + (i === shown - 1 && partial >= 0 ? "" : "\n");
        if (span.dataset.n !== String(chars)) {
          span.innerHTML = html;
          span.dataset.n = chars;
        }
      }
      if (!done) {
        const caret = document.createElement("span");
        caret.className = "caret";
        (v.lines[shown - 1] && partial >= 0 ? v.lines[shown - 1] : v.body).appendChild(caret);
      }
      v.body.scrollTop = v.body.scrollHeight;
      v.el.className = `term ${done ? "done" : shown ? "running" : ""}`;
      v.state.textContent = done ? "done ✓" : shown ? "typing" : "idle";
    }
  }

  const metrics = $$("[data-metric]");
  const dashFill = $("#dash-fill"),
    dashTime = $("#dash-time");
  const fmtNight = (f) => {
    const mins = Math.round(f * 8 * 60);
    const h = (22 + Math.floor(mins / 60)) % 24;
    return `${String(h).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  };
  const shift = { elapsed: 0, running: false, visible: false, last: 0, raf: 0 };
  function renderShift() {
    const t = shift.elapsed;
    const f = Math.min(1, t / SHIFT_MS);
    renderTerminals(t);
    dashFill.style.width = `${f * 100}%`;
    dashTime.textContent = fmtNight(f);
    const e = 1 - Math.pow(1 - f, 2);
    metrics.forEach((m) => {
      const v = +m.dataset.from + (+m.dataset.to - +m.dataset.from) * e;
      m.textContent = Math.round(v) + (m.dataset.suffix || "");
    });
  }
  function shiftFrame(now) {
    shift.raf = 0;
    if (!shift.running) return;
    if (shift.visible) shift.elapsed += Math.min(100, now - (shift.last || now));
    shift.last = now;
    renderShift();
    if (shift.elapsed >= SHIFT_MS) {
      shift.running = false;
      return;
    }
    shift.raf = requestAnimationFrame(shiftFrame);
  }
  function runShift() {
    shift.elapsed = reduceMotion ? SHIFT_MS : 0;
    shift.last = 0;
    renderShift();
    if (reduceMotion) return;
    shift.running = true;
    if (!shift.raf) shift.raf = requestAnimationFrame(shiftFrame);
  }
  let shiftStarted = false;
  new IntersectionObserver(
    ([en]) => {
      shift.visible = en.isIntersecting;
      shift.last = 0;
      if (en.isIntersecting && !shiftStarted) {
        shiftStarted = true;
        runShift();
      }
    },
    { threshold: 0.25 }
  ).observe($("#dash"));
  $("#dash-replay").addEventListener("click", runShift);

  /* ---------------- backstage: run history (static dashboard snapshot) ---------------- */
  const RH = S.runHistory;
  const rhEl = $("#run-history");
  const fmtInt = (n) => n.toLocaleString("en-US");
  const dayLabel = (i) => {
    const d = new Date(RH.start + "T12:00:00");
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const maxDay = Math.max(...RH.days.map(([s, f]) => s + f));
  const RH_STATS = [
    ["runs", RH.totals.runs, "runs · 30 days", "ivory"],
    ["succeeded", RH.totals.succeeded, "succeeded", "gold"],
    ["failed", RH.totals.failed, "failed", "ember"],
    ["automations", RH.totals.automations, "automations", "lagoon"],
  ];
  const listed = RH.automations.length;
  rhEl.innerHTML = `
    <div class="rh-head">
      <div>
        <h3 id="rh-title">Run history</h3>
        <p class="rh-sub">Our own Cursor Automations, last 30 days: the agents that work while we sleep</p>
      </div>
      <p class="rh-legend" aria-hidden="true"><span class="ok">succeeded</span><span class="bad">failed</span></p>
    </div>
    <dl class="rh-stats">
      ${RH_STATS.map(
        ([k, v, label, tone]) =>
          `<div class="rh-stat rh-${tone}"><dt>${label}</dt><dd data-count="${v}">${fmtInt(v)}</dd></div>`
      ).join("")}
    </dl>
    <figure class="rh-chart">
      <div class="rh-bars" role="img" aria-label="Daily runs from ${dayLabel(0)} to ${dayLabel(RH.days.length - 1)}: ${fmtInt(RH.totals.succeeded)} succeeded and ${fmtInt(RH.totals.failed)} failed. Runs ramp up in late September; failures cluster in two stretches in early and mid October.">
        ${RH.days
          .map(([s, f], i) => {
            const h = ((s + f) / maxDay) * 100;
            return `<div class="rh-col" style="--i:${i}" data-tip="${dayLabel(i)} · ${s} ✓${f ? ` · ${f} ✗` : ""}"><div class="rh-bar${h < 6 ? " dot" : ""}" style="--h:${h.toFixed(1)}%">${
              f ? `<i class="bad" style="flex-grow:${f}"></i>` : ""
            }<i class="ok" style="flex-grow:${s}"></i></div></div>`;
          })
          .join("")}
      </div>
      <figcaption class="rh-axis"><span>${dayLabel(0)}</span><span>${dayLabel(RH.days.length - 1)}</span></figcaption>
    </figure>
    <div class="rh-cols">
      <div class="rh-panel">
        <h4>Automations <small>${listed} of ${RH.totals.automations} · all active</small></h4>
        <ul class="rh-autos">
          ${RH.automations
            .map(
              (a) => `<li>
                <span class="rh-ico" aria-hidden="true">✦</span>
                <span class="rh-name">${esc(a.name)}<small>${esc(a.schedule || "Schedule not shown in snapshot")}${a.next ? ` · next ${esc(a.next)}` : ""}</small></span>
                <span class="rh-active">Active</span>
              </li>`
            )
            .join("")}
        </ul>
      </div>
      <div class="rh-panel">
        <h4>Recent runs <button type="button" class="rh-replay" id="rh-replay">↻ replay</button></h4>
        <ol class="rh-runs" id="rh-runs">
          ${RH.runs
            .map(
              (r) => `<li>
                <span class="rh-check" aria-hidden="true">✓</span>
                <span class="rh-name">${esc(r.name)}<small>${esc(r.automation)}</small></span>
                <time>${esc(r.time).replace(/^(\w+ \d+) /, "<b>$1</b> ")}</time>
              </li>`
            )
            .join("")}
        </ol>
      </div>
    </div>
    <p class="rh-note">Static snapshot of the Cursor Automations dashboard from ${esc(RH.snapshot)}; the dashboard can't be read live.</p>`;

  const runItems = $$(".rh-runs li", rhEl);
  const counters = $$("[data-count]", rhEl);
  const FEED_GAP = 480;
  const feed = { elapsed: 0, visible: false, last: 0, raf: 0, shown: -1 };
  const FEED_MS = 500 + runItems.length * FEED_GAP;
  function renderFeed() {
    const t = feed.elapsed;
    const shown = Math.min(runItems.length, Math.max(0, Math.floor((t - 500) / FEED_GAP) + 1));
    if (shown !== feed.shown) {
      feed.shown = shown;
      runItems.forEach((li, i) => {
        const on = i >= runItems.length - shown;
        li.classList.toggle("on", on);
        li.classList.toggle("latest", on && i === runItems.length - shown);
      });
    }
    const e = 1 - Math.pow(1 - Math.min(1, t / 1600), 3);
    counters.forEach((c) => (c.textContent = fmtInt(Math.round(+c.dataset.count * e))));
  }
  function feedFrame(now) {
    feed.raf = 0;
    if (feed.visible) feed.elapsed += Math.min(100, now - (feed.last || now));
    feed.last = now;
    renderFeed();
    if (feed.elapsed < FEED_MS) feed.raf = requestAnimationFrame(feedFrame);
  }
  function runFeed() {
    rhEl.classList.remove("grow");
    void rhEl.offsetWidth;
    rhEl.classList.add("grow");
    feed.elapsed = reduceMotion ? FEED_MS : 0;
    feed.last = 0;
    feed.shown = -1;
    renderFeed();
    if (!reduceMotion && !feed.raf) feed.raf = requestAnimationFrame(feedFrame);
  }
  let feedStarted = false;
  new IntersectionObserver(
    ([en]) => {
      feed.visible = en.isIntersecting;
      feed.last = 0;
      if (en.isIntersecting && !feedStarted) {
        feedStarted = true;
        runFeed();
      }
    },
    { threshold: 0.2 }
  ).observe(rhEl);
  $("#rh-replay").addEventListener("click", runFeed);

  /* ---------------- before / after ---------------- */
  const compare = $("#compare"),
    handle = $("#compare-handle");
  const setPos = (v) => {
    v = clamp(v, 0, 100);
    compare.style.setProperty("--pos", v + "%");
    handle.setAttribute("aria-valuenow", Math.round(v));
  };
  let dragging = false;
  const fromEvent = (e) => {
    const r = compare.getBoundingClientRect();
    setPos(((e.clientX - r.left) / r.width) * 100);
  };
  compare.addEventListener("pointerdown", (e) => {
    dragging = true;
    compare.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  compare.addEventListener("pointermove", (e) => dragging && fromEvent(e));
  compare.addEventListener("pointerup", () => (dragging = false));
  compare.addEventListener("pointercancel", () => (dragging = false));
  handle.addEventListener("keydown", (e) => {
    const cur = +handle.getAttribute("aria-valuenow");
    if (e.key === "ArrowLeft") setPos(cur - 5);
    if (e.key === "ArrowRight") setPos(cur + 5);
    if (e.key === "Home") setPos(0);
    if (e.key === "End") setPos(100);
  });

  /* ---------------- completed work ---------------- */
  const chipsFor = (p) =>
    p.units.map((u) => `<span class="chip unit-chip" style="--tint:${esc(brandById[u].hue)}">${esc(brandById[u].name)}</span>`).join("") +
    p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("");
  const featured = S.projects.find((p) => p.feature);
  if (featured) {
    const [a, b] = featured.feature;
    $("#work-feature").innerHTML = `
      <article class="feature glass reveal">
        <div class="feature-art">
          <img class="fa-a" src="${esc(a.src)}" alt="${esc(a.alt)}" width="${a.w}" height="${a.h}" loading="lazy" decoding="async" />
          ${b ? `<img class="fa-b" src="${esc(b.src)}" alt="${esc(b.alt)}" width="${b.w}" height="${b.h}" loading="lazy" decoding="async" />` : ""}
        </div>
        <div class="feature-copy">
          <span class="code">${esc(featured.code)} · ${esc(featured.kind)}</span>
          <h3>${esc(featured.name)}</h3>
          ${featured.tagline ? `<p class="tagline">${esc(featured.tagline)}</p>` : ""}
          <p class="summary">${esc(featured.summary)}</p>
          <div class="chips">${chipsFor(featured)}</div>
          <a class="btn btn-ghost" href="${esc(featured.url)}" target="_blank" rel="noopener">${esc(new URL(featured.url).host)} ↗</a>
        </div>
      </article>`;
  }
  const TINTS = ["#5fd6cc", "#d9b45e", "#e8826a"];
  $("#work-list").innerHTML = S.projects
    .filter((p) => p !== featured)
    .map(
      (p, i) => `
      <div class="reveal">
        <a class="work-item glass" href="${esc(p.url)}" target="_blank" rel="noopener" style="--tint:${TINTS[i % TINTS.length]}">
          <div class="work-thumb">
            <span class="code">${esc(p.code)}</span>
            <span class="initial" aria-hidden="true">${esc(p.name[0])}</span>
          </div>
          <div class="work-body">
            <div class="work-name"><h3>${esc(p.name)}</h3><small>${esc(p.kind)}</small></div>
            <p class="work-summary">${esc(p.summary)}</p>
            <div class="chips">${chipsFor(p)}</div>
            <span class="work-link">${esc(new URL(p.url).host)}</span>
          </div>
        </a>
      </div>`
    )
    .join("");

  /* ---------------- reveal ---------------- */
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      }),
    { threshold: 0.12 }
  );
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 90}ms`;
    io.observe(el);
  });

  /* ---------------- scroll: night clock, hero drift, iceberg descent ---------------- */
  const clock = $("#clock"),
    clockLeft = $("#clock-left");
  const faB = $(".fa-b");
  let scrollRaf = 0;
  const onScroll = () => {
    scrollRaf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const f = max > 0 ? Math.min(1, scrollY / max) : 0;
    const left = 8 * (1 - f);
    clock.textContent = fmtNight(f);
    clockLeft.textContent =
      left < 0.05 ? "launched ✓" : `${Math.floor(left)}h ${String(Math.floor((left % 1) * 60)).padStart(2, "0")}m until launch`;
    if (!reduceMotion) {
      hero.style.setProperty("--sy", clamp(scrollY / hero.offsetHeight).toFixed(3));
      if (faB) faB.style.setProperty("--fy", ((faB.parentElement.getBoundingClientRect().top - innerHeight / 2) * -0.06).toFixed(1));
    }
    layoutIce();
  };
  const queueScroll = () => {
    if (!scrollRaf) scrollRaf = requestAnimationFrame(onScroll);
  };
  addEventListener("scroll", queueScroll, { passive: true });
  addEventListener("resize", queueScroll, { passive: true });

  /* ---------------- WebGL + Unicorn Studio hook ---------------- */
  const fxStatus = $("#fx-status");
  const showStatus = () => {
    const st = window.IcebergFX?.status();
    fxStatus.textContent = st?.webgl
      ? `WebGL · on · ${st.contexts} ctx · dpr 1${reduceMotion ? " · static" : ""}`
      : "WebGL · off · CSS fallback";
  };
  window.IcebergFX?.start({
    hero,
    heroCanvas: $("#hero-gl"),
    heroArt: $("#hero-art"),
    iceStage,
    iceCanvas: $("#ice-gl"),
  });
  onScroll();
  showStatus();
  setInterval(showStatus, 2000);

  const startUnicorn = (projectId) => {
    const host = $("#unicorn");
    host.dataset.usProject = projectId;
    const s = document.createElement("script");
    s.src = UNICORN_SDK;
    s.onload = () =>
      window.UnicornStudio.init()
        .then((scenes) => {
          if (!scenes.length) return;
          document.body.classList.add("unicorn-on");
          window.IcebergFX?.setHeroScene(false);
        })
        .catch((err) => console.warn("[unicorn]", err));
    s.onerror = () => console.warn("[unicorn] sdk blocked; keeping the built-in skull-jungle scene");
    document.head.appendChild(s);
  };
  const unicornId = new URLSearchParams(location.search).get("us") || S.unicornProjectId;
  if (unicornId && document.createElement("canvas").getContext("webgl2")) startUnicorn(unicornId);
})();
