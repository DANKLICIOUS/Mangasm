(() => {
  const S = window.STUDIO;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const UNICORN_SDK =
    "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.4.3/dist/unicornStudio.umd.js";
  const brandById = Object.fromEntries(S.brands.map((b) => [b.id, b]));

  /* ---------------- loader ---------------- */
  const loader = $("#loader"),
    pct = $("#loader-pct");
  const loadStart = performance.now();
  const LOAD_MS = reduceMotion ? 0 : 900;
  const loadTick = (now) => {
    const f = LOAD_MS ? Math.min(1, (now - loadStart) / LOAD_MS) : 1;
    pct.textContent = Math.round(f * f * (3 - 2 * f) * 100);
    if (f < 1) return requestAnimationFrame(loadTick);
    loader.classList.add("done");
    document.body.classList.add("ready");
  };
  requestAnimationFrame(loadTick);

  /* ---------------- mascot ---------------- */
  const tpl = $("#mascot-tpl");
  const mascots = ["#mascot", "#contact-mascot"].map((sel) => {
    const host = $(sel);
    host.appendChild(tpl.content.cloneNode(true));
    return host;
  });
  const [heroMascot] = mascots;
  const eyeState = mascots.map(() => ({ x: 0, y: 0, tx: 0, ty: 0 }));
  let pointer = null;
  addEventListener("pointermove", (e) => (pointer = { x: e.clientX, y: e.clientY }), {
    passive: true,
  });
  let lastY = scrollY,
    squash = 0,
    lookDown = 0;
  const mascotTick = () => {
    const vy = scrollY - lastY;
    lastY = scrollY;
    squash += (Math.max(-1, Math.min(1, vy / 40)) - squash) * 0.18;
    lookDown += ((Math.abs(vy) > 1 ? Math.sign(vy) : 0) - lookDown) * 0.1;
    mascots.forEach((m, i) => {
      const r = m.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const st = eyeState[i];
      if (pointer) {
        const dx = pointer.x - (r.left + r.width / 2),
          dy = pointer.y - (r.top + r.height * 0.58);
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, d / 260);
        st.tx = (dx / d) * 9 * reach;
        st.ty = (dy / d) * 7 * reach;
      }
      st.ty += lookDown * 4;
      st.x += (st.tx - st.x) * 0.2;
      st.y += (st.ty - st.y) * 0.2;
      $(".m-eyes", m).style.transform = `translate(${st.x.toFixed(2)}px, ${st.y.toFixed(2)}px)`;
      const s = Math.abs(squash) * 0.09;
      m.style.transform = s > 0.002 ? `scale(${1 + s}, ${1 - s})` : "";
    });
    requestAnimationFrame(mascotTick);
  };
  if (!reduceMotion) requestAnimationFrame(mascotTick);

  const setHappy = (on) => mascots.forEach((m) => m.classList.toggle("happy", on));
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest?.(".btn, .work-item")) setHappy(true);
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest?.(".btn, .work-item")) setHappy(false);
  });
  let boingTimer = 0;
  heroMascot.addEventListener("click", () => {
    heroMascot.classList.remove("boing");
    void heroMascot.offsetWidth;
    heroMascot.classList.add("boing", "happy");
    clearTimeout(boingTimer);
    boingTimer = setTimeout(() => heroMascot.classList.remove("boing", "happy"), 1100);
    const r = heroMascot.getBoundingClientRect();
    window.CuteFX?.confetti(r.left + r.width / 2, r.top + r.height * 0.3, 40);
  });

  /* ---------------- units ---------------- */
  const ICONS = {
    slay: `<svg viewBox="0 0 48 48"><path d="M24 4c2 10 6 14 16 16-10 2-14 6-16 16-2-10-6-14-16-16 10-2 14-6 16-16Z" fill="#ff9ecb" stroke="#2b2140" stroke-width="3" stroke-linejoin="round"/><path d="M39 31c.8 3.6 2.2 5 5.6 5.8-3.4.8-4.8 2.2-5.6 5.8-.8-3.6-2.2-5-5.6-5.8 3.4-.8 4.8-2.2 5.6-5.8Z" fill="#ffe48a" stroke="#2b2140" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
    coexist: `<svg viewBox="0 0 48 48"><rect x="7" y="7" width="34" height="14" rx="7" fill="#a4ecca" stroke="#2b2140" stroke-width="3"/><rect x="7" y="27" width="34" height="14" rx="7" fill="#a7d5ff" stroke="#2b2140" stroke-width="3"/><circle cx="15" cy="14" r="2.6" fill="#2b2140"/><circle cx="15" cy="34" r="2.6" fill="#2b2140"/><path d="M24 14h10M24 34h10" stroke="#2b2140" stroke-width="3" stroke-linecap="round"/></svg>`,
    lynx: `<svg viewBox="0 0 48 48"><path d="M24 4v6" stroke="#2b2140" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="4.5" r="3" fill="#ffe48a" stroke="#2b2140" stroke-width="2.5"/><rect x="6" y="11" width="36" height="30" rx="12" fill="#cdb9ff" stroke="#2b2140" stroke-width="3"/><circle cx="17" cy="25" r="4" fill="#2b2140"/><circle cx="31" cy="25" r="4" fill="#2b2140"/><circle cx="18.4" cy="23.6" r="1.4" fill="#fff"/><circle cx="32.4" cy="23.6" r="1.4" fill="#fff"/><path d="M20 33q4 3 8 0" fill="none" stroke="#2b2140" stroke-width="3" stroke-linecap="round"/></svg>`,
  };
  $("#units-grid").innerHTML = S.brands
    .map(
      (b) => `
      <div class="card-wrap reveal">
        <article class="card unit" data-sheen style="--tint:${esc(b.hue)}">
          <div class="unit-icon" aria-hidden="true">${ICONS[b.id] || ""}</div>
          <span class="unit-code">${esc(b.code)}</span>
          <h3>${esc(b.name)}</h3>
          <span class="role">${esc(b.role)}</span>
          <p>${esc(b.pitch)}</p>
          <ul>${b.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        </article>
      </div>`
    )
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

  /* ---------------- before / after ---------------- */
  const compare = $("#compare"),
    handle = $("#compare-handle");
  const setPos = (v) => {
    v = Math.max(0, Math.min(100, v));
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
  const THUMBS = [
    "linear-gradient(135deg, #ffc7e0, #cdb9ff)",
    "linear-gradient(135deg, #a4ecca, #a7d5ff)",
    "linear-gradient(135deg, #ffe48a, #ffc2a1)",
    "linear-gradient(135deg, #cdb9ff, #a7d5ff)",
  ];
  $("#work-list").innerHTML = S.projects
    .map((p, i) => {
      const grad = THUMBS[i % THUMBS.length];
      const thumb = p.image ? `url("${esc(p.image)}"), ${grad}` : grad;
      return `
      <div class="card-wrap reveal">
        <a class="card work-item" data-sheen href="${esc(p.url)}" target="_blank" rel="noopener">
          <div class="work-thumb" style='--thumb:${thumb}'>
            <span class="code">${esc(p.code)}</span>
            ${p.image ? "" : `<span class="initial" aria-hidden="true">${esc(p.name[0])}</span>`}
          </div>
          <div class="work-body">
            <div class="work-name"><h3>${esc(p.name)}</h3><small>${esc(p.kind)}</small></div>
            <p class="work-summary">${esc(p.summary)}</p>
            <div class="chips">
              ${p.units.map((u) => `<span class="chip unit-chip" style="--tint:${esc(brandById[u].hue)}">${esc(brandById[u].name)}</span>`).join("")}
              ${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}
            </div>
            <span class="work-link">${esc(new URL(p.url).host)}</span>
          </div>
        </a>
      </div>`;
    })
    .join("");

  /* ---------------- confetti buttons ---------------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-confetti]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.CuteFX?.confetti(r.left + r.width / 2, r.top + r.height / 2, 110);
  });

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

  /* ---------------- scroll-linked night clock ---------------- */
  const clock = $("#clock"),
    clockLeft = $("#clock-left");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const f = max > 0 ? Math.min(1, scrollY / max) : 0;
    const left = 8 * (1 - f);
    clock.textContent = fmtNight(f);
    clockLeft.textContent =
      left < 0.05 ? "launched ✓" : `${Math.floor(left)}h ${String(Math.floor((left % 1) * 60)).padStart(2, "0")}m until launch`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- WebGL + Unicorn Studio hook ---------------- */
  const fxStatus = $("#fx-status");
  const showStatus = () => {
    const st = window.CuteFX?.status();
    fxStatus.textContent = st?.webgl
      ? `WebGL · on · ${st.contexts} ctx · ${st.scale}×`
      : "WebGL · off · CSS fallback";
  };
  const startFX = () => {
    window.CuteFX?.start({
      hero: $(".hero"),
      sections: $$("[data-palette]"),
      cards: $$("[data-sheen]"),
    });
    showStatus();
    setInterval(showStatus, 2000);
  };
  (window.requestIdleCallback || ((cb) => setTimeout(cb, 1)))(startFX, { timeout: 400 });

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
          window.CuteFX?.setHeroScene(false);
        })
        .catch((err) => console.warn("[unicorn]", err));
    s.onerror = () => console.warn("[unicorn] sdk blocked; keeping the built-in jelly scene");
    document.head.appendChild(s);
  };
  const unicornId = new URLSearchParams(location.search).get("us") || S.unicornProjectId;
  if (unicornId && document.createElement("canvas").getContext("webgl2")) startUnicorn(unicornId);
})();
