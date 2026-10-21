(() => {
  const S = window.STUDIO;
  const $ = (sel, root = document) => root.querySelector(sel);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const UNICORN_SDK =
    "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.4.3/dist/unicornStudio.umd.js";

  /* ---------------- ice shader ---------------- */
  const FRAG = `
    precision highp float;
    uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uScroll; uniform float uZoom;

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }
    // x: distance to nearest seed, y: F2 - F1 (facet edge), z: cell id
    vec3 voro(vec2 x) {
      vec2 n = floor(x), f = fract(x);
      float m1 = 8.0, m2 = 8.0; vec2 id = n;
      for (int j = -1; j <= 1; j++)
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        o = 0.5 + 0.5 * sin(uTime * 0.18 + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < m1) { m2 = m1; m1 = d; id = n + g; } else if (d < m2) { m2 = d; }
      }
      return vec3(sqrt(m1), sqrt(m2) - sqrt(m1), hash2(id).x);
    }
    float facet(vec2 uv, float lift) {
      vec3 v = voro(uv * uZoom);
      float edge = 1.0 - smoothstep(0.0, 0.04 + lift * 0.05, v.y);
      float body = 0.28 + 0.42 * v.z;
      float fres = pow(clamp(v.x, 0.0, 1.0), 1.6);
      return body * 0.6 + edge * (0.55 + lift * 0.9) + fres * 0.22 + lift * 0.18;
    }
    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
      uv.y += uScroll * 0.9;
      vec2 mm = m + vec2(0.0, uScroll * 0.9);
      float md = length(uv - mm);
      float lift = exp(-md * md * 9.0);
      vec2 dir = normalize(uv - mm + 1e-4);
      vec2 off = dir * (0.003 + lift * 0.012);
      vec3 col = vec3(
        facet(uv + off, lift),
        facet(uv, lift),
        facet(uv - off, lift)
      );
      vec3 deep = vec3(0.043, 0.051, 0.071);
      vec3 ice = vec3(0.82, 0.89, 1.0);
      col = mix(deep, ice, col * 0.55);
      float vig = smoothstep(1.25, 0.2, length(uv - vec2(0.0, uScroll * 0.9)));
      col *= 0.55 + 0.45 * vig;
      col = mix(col, deep, clamp(uScroll * 0.55, 0.0, 0.78));
      gl_FragColor = vec4(col, 1.0);
    }`;
  const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

  function createIce(canvas, { zoom = 2.6, maxDpr = 1.5, scrollLinked = false } = {}) {
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"),
      uTime = u("uTime"),
      uMouse = u("uMouse"),
      uScroll = u("uScroll"),
      uZoom = u("uZoom");

    const state = { mx: 0, my: 0, tx: 0, ty: 0, scroll: 0, visible: true, dpr: 1, running: true };
    const resize = () => {
      state.dpr = Math.min(devicePixelRatio || 1, maxDpr);
      const w = Math.max(1, Math.floor(canvas.clientWidth * state.dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * state.dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };
    resize();
    addEventListener("resize", resize);
    state.tx = state.mx = canvas.width / 2;
    state.ty = state.my = canvas.height / 2;
    const target = scrollLinked ? window : canvas;
    target.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      state.tx = (e.clientX - r.left) * state.dpr;
      state.ty = (r.height - (e.clientY - r.top)) * state.dpr;
    });
    new IntersectionObserver(([en]) => (state.visible = en.isIntersecting)).observe(canvas);

    const t0 = performance.now();
    const frame = (now) => {
      if (!state.running) return;
      if (state.visible) {
        state.mx += (state.tx - state.mx) * 0.08;
        state.my += (state.ty - state.my) * 0.08;
        if (scrollLinked) {
          const target = scrollY / innerHeight;
          state.scroll += (target - state.scroll) * 0.08;
        }
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, reduceMotion ? 0 : (now - t0) / 1000);
        gl.uniform2f(uMouse, state.mx, state.my);
        gl.uniform1f(uScroll, state.scroll);
        gl.uniform1f(uZoom, zoom);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return { stop: () => (state.running = false), canvas };
  }

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
        <div class="term-head"><i></i>${brandById[id].name} · ${brandById[id].role.split(" ")[0]}<span class="state">idle</span></div>
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
      preview.style.left = e.clientX + 180 + "px";
      preview.style.top = e.clientY + "px";
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
      fpsEl.textContent = `WebGL · ${frames} fps`;
      frames = 0;
      last = now;
    }
    requestAnimationFrame(fps);
  };
  requestAnimationFrame(fps);
})();
