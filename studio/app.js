(() => {
  const S = window.STUDIO;
  const $ = (sel, root = document) => root.querySelector(sel);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const UNICORN_SDK =
    "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.4.3/dist/unicornStudio.umd.js";

  /* ---------------- ice shader (rendered by fx.js on the shared WebGL context) ---------------- */
  const createIce = (canvas, opts = {}) =>
    window.OvernightFX ? window.OvernightFX.mount(canvas, { effect: "ice", ...opts }) : null;

  /* ---------------- hero scene: Unicorn Studio or local shader ---------------- */
  const sceneLabel = $("#scene-label");
  const iceCanvas = $("#ice");
  let ice = null;
  const startOwnShader = (reason) => {
    if (!ice) ice = createIce(iceCanvas, { scrollLinked: true });
    sceneLabel.textContent = `Scene: ice shader${reason ? " · " + reason : ""} · Scroll to discover`;
  };
  const startUnicorn = (projectId) => {
    const host = $("#unicorn");
    host.dataset.usProject = projectId;
    const s = document.createElement("script");
    s.src = UNICORN_SDK;
    s.onload = () =>
      window.UnicornStudio.init()
        .then((scenes) => {
          if (!scenes.length) return startOwnShader("unicorn: no scenes");
          iceCanvas.style.display = "none";
          sceneLabel.textContent = "Scene: Unicorn Studio · Scroll to discover";
        })
        .catch((err) => {
          console.warn("[unicorn]", err);
          startOwnShader("unicorn unavailable");
        });
    s.onerror = () => startOwnShader("unicorn sdk blocked");
    document.head.appendChild(s);
  };
  const hasWebGL2 = !!document.createElement("canvas").getContext("webgl2");
  const unicornId = new URLSearchParams(location.search).get("us") || S.unicornProjectId;
  if (unicornId && hasWebGL2) startUnicorn(unicornId);
  else startOwnShader();

  /* ---------------- loader ---------------- */
  const loader = $("#loader"),
    pct = $("#loader-pct");
  let p = 0;
  const tick = () => {
    p = Math.min(100, p + (reduceMotion ? 100 : 2 + Math.random() * 6));
    pct.textContent = String(Math.floor(p)).padStart(3, "0");
    if (p < 100) setTimeout(tick, 28);
    else
      setTimeout(() => {
        loader.classList.add("done");
        document.body.classList.add("ready");
      }, 200);
  };
  tick();

  /* ---------------- text scramble ---------------- */
  const GLYPHS = "!<>-_\\/[]{}=+*^?#";
  const scramble = (el) => {
    if (reduceMotion || el.dataset.scrambling) return;
    const text = el.dataset.text || (el.dataset.text = el.textContent);
    el.dataset.scrambling = "1";
    let frame = 0;
    const total = text.length + 12;
    const step = () => {
      el.textContent = [...text]
        .map((c, i) =>
          c === " " || i < frame - 12
            ? c
            : i < frame
              ? GLYPHS[(Math.random() * GLYPHS.length) | 0]
              : c
        )
        .join("");
      if (++frame <= total) requestAnimationFrame(step);
      else {
        el.textContent = text;
        delete el.dataset.scrambling;
      }
    };
    step();
  };
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    if (el.children.length) return;
    el.addEventListener("mouseenter", () => scramble(el));
  });

  /* ---------------- units ---------------- */
  const unitsGrid = $("#units-grid");
  unitsGrid.innerHTML = S.brands
    .map(
      (b) => `
      <article class="unit reveal" style="color:${b.hue}">
        <i class="unit-crystal" aria-hidden="true"></i>
        <span class="unit-code">${b.code}</span>
        <h3 style="color:var(--ice-0)">${b.name}</h3>
        <span class="role">${b.role}</span>
        <p>${b.pitch}</p>
        <ul style="color:var(--ice-0)">${b.features.map((f) => `<li>${f}</li>`).join("")}</ul>
      </article>`
    )
    .join("");
  if (!reduceMotion) {
    unitsGrid.querySelectorAll(".unit").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      card.addEventListener("pointerleave", () => (card.style.transform = ""));
    });
  }

  /* ---------------- backstage: three terminals ---------------- */
  const brandById = Object.fromEntries(S.brands.map((b) => [b.id, b]));
  const termsEl = $("#terms");
  termsEl.innerHTML = Object.keys(S.terminals)
    .map(
      (id) => `
      <div class="term" data-term="${id}">
        <div class="term-head"><i></i>${brandById[id].name} · ${brandById[id].role.split(/[ ,]/)[0]}<span class="state">idle</span></div>
        <pre class="term-body" aria-live="off"></pre>
      </div>`
    )
    .join("");

  const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
  let runId = 0;

  async function runTerminal(id, myRun) {
    const term = termsEl.querySelector(`[data-term="${id}"]`);
    const body = $(".term-body", term);
    const state = $(".state", term);
    body.innerHTML = "";
    term.className = "term running";
    state.textContent = "running";
    const caret = document.createElement("span");
    caret.className = "caret";
    for (const [delay, text, cls] of S.terminals[id]) {
      await sleep(delay);
      if (myRun !== runId) return;
      const line = document.createElement("span");
      line.className = cls || "";
      body.appendChild(line);
      body.appendChild(caret);
      if (text.startsWith("$ ") && !reduceMotion) {
        for (const ch of text) {
          line.textContent += ch;
          await sleep(18 + Math.random() * 30);
          if (myRun !== runId) return;
        }
      } else {
        line.textContent = text;
      }
      line.insertAdjacentText("beforeend", "\n");
      body.appendChild(caret);
    }
    term.className = "term done";
    state.textContent = "done";
  }

  const metrics = [...document.querySelectorAll("[data-metric]")];
  const dashFill = $("#dash-fill"),
    dashTime = $("#dash-time");
  const fmtNight = (f) => {
    const mins = Math.round(f * 8 * 60);
    const h = (22 + Math.floor(mins / 60)) % 24;
    return `${String(h).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  };

  async function runShift() {
    const myRun = ++runId;
    const totalMs = Math.max(
      ...Object.values(S.terminals).map((lines) =>
        lines.reduce((t, [d, txt]) => t + d + (txt.startsWith("$ ") ? txt.length * 33 : 0), 0)
      )
    );
    const start = performance.now();
    const progress = () => {
      if (myRun !== runId) return;
      const f = reduceMotion ? 1 : Math.min(1, (performance.now() - start) / totalMs);
      dashFill.style.width = `${f * 100}%`;
      dashTime.textContent = fmtNight(f);
      metrics.forEach((m) => {
        const v = +m.dataset.from + (+m.dataset.to - +m.dataset.from) * f;
        m.textContent = Math.round(v) + (m.dataset.suffix || "");
      });
      if (f < 1) requestAnimationFrame(progress);
    };
    requestAnimationFrame(progress);
    await Promise.all(Object.keys(S.terminals).map((id) => runTerminal(id, myRun)));
  }

  let shiftStarted = false;
  new IntersectionObserver(
    ([en]) => {
      if (en.isIntersecting && !shiftStarted) {
        shiftStarted = true;
        runShift();
      }
    },
    { threshold: 0.35 }
  ).observe($("#dash"));
  $("#dash-replay").addEventListener("click", () => runShift());

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
  handle.addEventListener("keydown", (e) => {
    const cur = +handle.getAttribute("aria-valuenow");
    if (e.key === "ArrowLeft") setPos(cur - 5);
    if (e.key === "ArrowRight") setPos(cur + 5);
  });
  createIce($("#mock-ice"), { zoom: 3.4, maxDpr: 1 });

  /* ---------------- completed work ---------------- */
  const workList = $("#work-list");
  workList.innerHTML = S.projects
    .map(
      (p, i) => `
      <a class="work-item reveal" href="${p.url}" target="_blank" rel="noopener" data-i="${i}">
        <span class="work-code">${p.code}</span>
        <span class="work-name">${p.name}<small>${p.kind}</small></span>
        <p class="work-summary">${p.summary}</p>
        <span class="work-meta">
          <span class="chips">
            ${p.units.map((u) => `<span class="chip unit-chip">${brandById[u].name}</span>`).join("")}
            ${p.stack.map((s) => `<span class="chip">${s}</span>`).join("")}
          </span>
          <span class="work-link">[ ${new URL(p.url).host} ↗ ]</span>
        </span>
      </a>`
    )
    .join("");
  const preview = document.createElement("div");
  preview.className = "work-preview";
  document.body.appendChild(preview);
  workList.querySelectorAll(".work-item").forEach((item) => {
    const proj = S.projects[+item.dataset.i];
    item.addEventListener("pointerenter", () => {
      preview.style.backgroundImage = proj.image
        ? `url(${proj.image})`
        : "radial-gradient(circle at 30% 30%, rgba(209,227,255,.25), rgba(11,13,18,.95))";
      preview.textContent = proj.image ? "" : `${proj.code} · ${proj.name}`;
      preview.classList.add("on");
    });
    item.addEventListener("pointermove", (e) => {
      const w = preview.offsetWidth,
        h = preview.offsetHeight;
      const x = e.clientX + 28 + w > innerWidth ? e.clientX - 28 - w : e.clientX + 28;
      preview.style.left = x + "px";
      preview.style.top = Math.max(h / 2 + 8, Math.min(innerHeight - h / 2 - 8, e.clientY)) + "px";
    });
    item.addEventListener("pointerleave", () => preview.classList.remove("on"));
  });

  /* ---------------- reveal + eyebrow decode ---------------- */
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  const eyebrowIO = new IntersectionObserver((entries) =>
    entries.forEach((en) => en.isIntersecting && scramble(en.target))
  );
  document.querySelectorAll(".eyebrow[data-scramble]").forEach((el) => eyebrowIO.observe(el));

  /* ---------------- scroll-linked night clock + fps ---------------- */
  const clock = $("#clock");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const f = max > 0 ? scrollY / max : 0;
    const left = 8 * (1 - f);
    const h = Math.floor(left),
      m = Math.floor((left - h) * 60);
    clock.textContent = `${fmtNight(f)}:00 · T-${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const fpsEl = $("#fps");
  let frames = 0,
    last = performance.now();
  const fps = (now) => {
    frames++;
    if (now - last > 1000) {
      const fx = window.OvernightFX;
      fpsEl.textContent = fx?.contexts
        ? `WebGL · ${frames} fps · ${fx.instances.length} fx · ${fx.contexts} ctx`
        : "WebGL · off";
      frames = 0;
      last = now;
    }
    requestAnimationFrame(fps);
  };
  requestAnimationFrame(fps);
})();
