/**
 * Mangasm public marketing landing
 * - No internal ops / API inventory
 * - Public trust metrics only (pct + hours)
 * - Waitlist: POST /api/waitlist (server) — no silent local-only leads
 */

const ACTS = [
  { sel: "#act-01", vo: "They built it for us. Then they forgot us." },
  {
    sel: "#patterns",
    vo: "Different faces. Same failure mode. They promised connection… too often they delivered extraction.",
  },
  { sel: "#act-03", vo: "The receipts of a broken category. Patterns don’t lie." },
  {
    sel: "#honesty",
    vo: "What the category sold you was a soft promise. What too many built was a machine that fed on loneliness.",
  },
  {
    sel: "#act-05",
    vo: "We’re not the product. We are the reason. Mangasm was built different.",
  },
  {
    sel: "#act-06",
    vo: "Not another app — a home we rebuild together. The autopsy is over. The rebuild begins.",
  },
];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function setActiveRail(index) {
  $$(".rail-dot").forEach((d, i) => d.classList.toggle("active", i === index));
}

function scrollToAct(index) {
  const el = document.querySelector(ACTS[index]?.sel);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  setActiveRail(index);
}

function setupRail() {
  $$(".rail-dot").forEach((btn) => {
    btn.addEventListener("click", () => scrollToAct(Number(btn.dataset.act)));
  });
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const i = Number(en.target.dataset.act);
        if (!Number.isNaN(i)) setActiveRail(i);
      });
    },
    { threshold: 0.35, rootMargin: "-10% 0px -40% 0px" }
  );
  $$(".act-panel[data-act]").forEach((p) => io.observe(p));
}

let voTimer = null;
let voIndex = 0;

function stopVo() {
  if (voTimer) clearTimeout(voTimer);
  voTimer = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  const panel = $("#vo-panel");
  if (panel) panel.hidden = true;
}

function playVo() {
  const panel = $("#vo-panel");
  const line = $("#vo-line");
  const bar = $("#vo-bar");
  panel.hidden = false;
  voIndex = 0;
  const total = ACTS.length;
  const stepMs = 10000;

  function tick() {
    if (voIndex >= total) {
      line.textContent = "The rebuild begins.";
      bar.style.width = "100%";
      setTimeout(stopVo, 2000);
      return;
    }
    line.textContent = ACTS[voIndex].vo;
    scrollToAct(voIndex);
    bar.style.width = `${((voIndex + 1) / total) * 100}%`;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(ACTS[voIndex].vo);
      u.rate = 0.92;
      u.pitch = 0.95;
      window.speechSynthesis.speak(u);
    }
    voIndex += 1;
    voTimer = setTimeout(tick, stepMs);
  }
  tick();
}

/** Public-safe metrics only — never load internal status.json with keys */
async function loadPublicStatus() {
  try {
    const res = await fetch("./public-status.json?t=" + Date.now());
    const s = await res.json();
    const pct = s.completion_pct ?? "—";
    const hours = s.hours_to_complete_est ?? "—";
    const pctLabel = typeof pct === "number" ? `${pct}%` : pct;
    const hoursLabel = typeof hours === "number" ? `${hours}h` : hours;

    if ($("#stat-pct")) $("#stat-pct").textContent = pctLabel;
    if ($("#stat-hours")) $("#stat-hours").textContent = hoursLabel;
    if ($("#stat-tagline"))
      $("#stat-tagline").textContent = s.headline || "Building in public";

    if ($("#third-body") && s.what_were_building) {
      $("#third-body").textContent = s.what_were_building;
    }
    if ($("#third-pct")) $("#third-pct").textContent = pctLabel;
    if ($("#third-hours")) $("#third-hours").textContent = hoursLabel;
    if ($("#third-bar") && typeof pct === "number")
      $("#third-bar").style.width = `${pct}%`;

    // Dedicated status board
    if ($("#pub-pct")) $("#pub-pct").textContent = pctLabel;
    if ($("#pub-hours")) $("#pub-hours").textContent = hoursLabel;
    if ($("#pub-milestone"))
      $("#pub-milestone").textContent =
        s.current_milestone_plain || s.current_milestone || "—";
    if ($("#pub-body"))
      $("#pub-body").textContent = s.what_were_building || "";
    if ($("#pub-disclaimer"))
      $("#pub-disclaimer").textContent = s.disclaimer || "";
    if ($("#status-headline"))
      $("#status-headline").textContent =
        s.tagline || "Honest progress — not a ship-date promise.";

    if ($("#pub-phases")) {
      $("#pub-phases").innerHTML = (s.phases || [])
        .map((p) => {
          const cls = p.done ? "done" : "";
          // mark first incomplete as current
          return `<span class="phase-chip ${cls}" data-id="${p.id}">${p.label}</span>`;
        })
        .join("");
      // highlight first not-done
      const chips = $$("#pub-phases .phase-chip");
      const firstOpen = (s.phases || []).findIndex((p) => !p.done);
      if (firstOpen >= 0 && chips[firstOpen])
        chips[firstOpen].classList.add("current");
    }

    if ($("#pub-promises")) {
      $("#pub-promises").innerHTML = (s.promises || [])
        .map((t) => `<li>${t}</li>`)
        .join("");
    }
  } catch {
    if ($("#stat-pct")) $("#stat-pct").textContent = "…";
    if ($("#stat-hours")) $("#stat-hours").textContent = "…";
  }
}

function setupForm() {
  const form = $("#join-form");
  const note = $("#form-note");
  const btn = $("#join-btn");

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

      // Do NOT silently keep leads only on the visitor's device
      note.className = "form-note err";
      if (res.status === 501 || res.status === 404) {
        note.innerHTML =
          "Signup is temporarily offline (mail API not deployed). " +
          "Email us directly: <a href=\"mailto:bae@slay.llc?subject=Mangasm%20rebuild%20waitlist\">bae@slay.llc</a> " +
          "— please don’t rely on this page until green.";
      } else {
        note.innerHTML =
          (data.error || "Could not save your email") +
          ". Try again or email <a href=\"mailto:bae@slay.llc?subject=Mangasm%20rebuild%20waitlist\">bae@slay.llc</a>.";
      }
    } catch {
      note.className = "form-note err";
      note.innerHTML =
        "Can’t reach the signup server. Email <a href=\"mailto:bae@slay.llc?subject=Mangasm%20rebuild%20waitlist\">bae@slay.llc</a> so we don’t lose you.";
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function main() {
  setupRail();
  setupForm();
  loadPublicStatus();
  $("#btn-story")?.addEventListener("click", () => scrollToAct(0));
  $("#btn-play-vo")?.addEventListener("click", playVo);
  $("#btn-stop-vo")?.addEventListener("click", stopVo);
}

main();
