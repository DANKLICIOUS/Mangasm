/**
 * Mangasm interactive homepage — panorama controls + wave motion
 * Waitlist: same API as web/app.js (POST www.mangasm.app/api/waitlist)
 */
const $ = (s, r = document) => r.querySelector(s);

const COPY_SHORT =
  "Safety-first gay social for NYC, SF & Miami. Connection without extraction — no data sale, ever.";
const COPY_FULL =
  "Mangasm is a safety-first home: report & block in reach, privacy-zone location, honest subscriptions, full account deletion. We don’t sell your data for ads. Building in public for NYC, San Francisco, and Miami — campfire, not casino.";

function setupReputation() {
  const panel = $("#rep-panel");
  const more = $("#rep-more");
  const copy = $("#rep-copy");
  if (!panel || !more || !copy) return;

  copy.textContent = COPY_SHORT;
  more.addEventListener("click", () => {
    const open = panel.classList.toggle("is-expanded");
    more.setAttribute("aria-expanded", open ? "true" : "false");
    copy.textContent = open ? COPY_FULL : COPY_SHORT;
    more.textContent = open ? "LESS" : "MORE";
  });
}

async function loadReputationNumber() {
  const el = $("#rep-num");
  if (!el) return;
  try {
    const res = await fetch("./public-status.json?t=" + Date.now());
    const s = await res.json();
    const pct = s.completion_pct;
    el.textContent = typeof pct === "number" ? String(pct) : "42";
  } catch {
    el.textContent = "42";
  }
}

/* ---- Subtle ocean waves (canvas) under beach art ---- */
function createWaveController(canvas, stage) {
  const ctx = canvas.getContext("2d", { alpha: true });
  let running = false;
  let raf = 0;
  let t0 = performance.now();
  let dpr = 1;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height * 0.48));
    canvas.style.height = h + "px";
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    if (!running) return;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);

    const bands = [
      { amp: 10, len: 0.012, speed: 0.55, alpha: 0.18, y: 0.42, hue: "92,246,255" },
      { amp: 14, len: 0.008, speed: 0.38, alpha: 0.14, y: 0.55, hue: "176,124,255" },
      { amp: 8, len: 0.016, speed: 0.72, alpha: 0.12, y: 0.68, hue: "255,79,216" },
      { amp: 18, len: 0.006, speed: 0.28, alpha: 0.1, y: 0.78, hue: "92,200,255" },
    ];

    for (const b of bands) {
      ctx.beginPath();
      const baseY = h * b.y;
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const y =
          baseY +
          Math.sin(x * b.len + t * b.speed) * b.amp +
          Math.sin(x * b.len * 2.1 - t * b.speed * 0.7) * (b.amp * 0.35);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, baseY - 30, 0, h);
      g.addColorStop(0, `rgba(${b.hue},${b.alpha})`);
      g.addColorStop(1, `rgba(${b.hue},0)`);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // soft foam highlights
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const y = h * (0.5 + i * 0.12) + Math.sin(t * 0.9 + i) * 6;
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + i * 0.02})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const yy = y + Math.sin(x * 0.02 + t * (0.5 + i * 0.2) + i) * (5 + i * 2);
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    running = true;
    t0 = performance.now();
    resize();
    canvas.classList.add("is-on");
    stage.classList.add("waves-on");
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    canvas.classList.remove("is-on");
    stage.classList.remove("waves-on");
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
  }

  function toggle() {
    if (running) stop();
    else start();
    return running;
  }

  window.addEventListener("resize", () => {
    if (running) resize();
  });

  return { start, stop, toggle, isOn: () => running };
}

function setupPlay(waves) {
  const btn = $("#play-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const on = waves.toggle();
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Pause waves" : "Play waves");
  });
}

function setupForm() {
  const form = $("#join-form");
  const note = $("#form-note");
  const btn = $("#join-btn");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#email").value.trim();
    note.textContent = "Sending…";
    note.className = "form-note";
    if (btn) btn.disabled = true;

    try {
      // Always hit www so apex→www redirects cannot drop POST bodies.
      const res = await fetch("https://www.mangasm.app/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "mangasm-landing" }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        note.textContent =
          data.message ||
          "You're on the list. Welcome home — check your inbox.";
        note.className = "form-note ok";
        form.reset();
        return;
      }

      note.className = "form-note err";
      if (res.status === 501 || res.status === 404) {
        note.innerHTML =
          "Signup is temporarily offline (mail API not deployed). " +
          'Email us directly: <a href="mailto:bae@slay.llc?subject=Mangasm%20rebuild%20waitlist">bae@slay.llc</a> ' +
          "— please don’t rely on this page until green.";
      } else {
        note.innerHTML =
          (data.error || "Could not save your email") +
          '. Try again or email <a href="mailto:bae@slay.llc?subject=Mangasm%20rebuild%20waitlist">bae@slay.llc</a>.';
      }
    } catch {
      note.className = "form-note err";
      note.innerHTML =
        'Can’t reach the signup server. Email <a href="mailto:bae@slay.llc?subject=Mangasm%20rebuild%20waitlist">bae@slay.llc</a> so we don’t lose you.';
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function main() {
  const stage = $("#stage");
  const canvas = $("#wave-canvas");
  setupReputation();
  loadReputationNumber();
  setupForm();
  if (canvas && stage) {
    const waves = createWaveController(canvas, stage);
    setupPlay(waves);
    // Auto-start subtle waves once — cool-site energy (respect reduced motion)
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const btn = $("#play-btn");
      waves.start();
      if (btn) {
        btn.setAttribute("aria-pressed", "true");
        btn.setAttribute("aria-label", "Pause waves");
      }
    }
  }
}

main();
