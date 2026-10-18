const THEMES = [
  {
    id: "viral",
    lane: "Viral · most popular",
    name: "Afterglow",
    why: "The look people save: black frame, lime punch, pink edge light. Short-form energy without a dating-grid.",
    hero: "assets/themes/viral.jpg",
    kicker: "Most saved look",
    tag: "SHOTS · CIRCLE · TONIGHT",
    cta: "Enter the circle",
    nearby: "Live",
    chip: "Circle",
    chip2: "Open Door",
  },
  {
    id: "effective",
    lane: "Effective · most used",
    name: "Long Table",
    why: "The pattern most social apps actually ship: one accent, clear type, photo-first cards. Lowest friction for review and daily use.",
    hero: "assets/themes/effective.jpg",
    kicker: "Most used pattern",
    tag: "HOSTED · MEMBERS · 18+",
    cta: "Enter the community",
    nearby: "Nearby",
    chip: "Circle",
    chip2: "Open Door",
  },
  {
    id: "fantasy",
    lane: "Fantasy · futuristic",
    name: "Aether",
    why: "HUD type, cyan orbit, floating-temple plate. Hard to mistake for a generic dating template.",
    hero: "assets/themes/fantasy.jpg",
    kicker: "Sector 18+",
    tag: "ORBIT · CIRCLE · VERIFY",
    cta: "Request access",
    nearby: "Orbit",
    chip: "Circle",
    chip2: "Mixer",
  },
  {
    id: "steampunk",
    lane: "Steampunk · gothic punk tattoo",
    name: "Inkhouse",
    why: "Brass, oxblood, tattoo flash, gaslight. Victorian parlor — not a gold/Lambo grid.",
    hero: "assets/themes/steampunk.jpg",
    kicker: "Members parlor",
    tag: "INK · BRASS · AFTER DARK",
    cta: "Cross the threshold",
    nearby: "Parlor",
    chip: "Circle",
    chip2: "Costume",
  },
];

const phone = document.getElementById("phone");
const phoneBg = document.getElementById("phoneBg");
const cardsEl = document.getElementById("cards");
const pickLine = document.getElementById("pickLine");
const tabSignin = document.getElementById("tabSignin");
const tabEvents = document.getElementById("tabEvents");
const screenSignin = document.getElementById("screenSignin");
const screenEvents = document.getElementById("screenEvents");

function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  phone.dataset.theme = theme.id;
  phoneBg.style.backgroundImage = `url("${theme.hero}")`;
  document.querySelectorAll("[data-copy]").forEach((node) => {
    const key = node.getAttribute("data-copy");
    if (theme[key]) node.textContent = theme[key];
  });
  document.querySelectorAll(".card").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.id === theme.id);
  });
  const live = theme.id === "steampunk";
  pickLine.textContent = live
    ? `Live iOS chrome: ${theme.id} — ${theme.name}.`
    : `Preview only: ${theme.id} — ${theme.name}. Live iOS chrome is steampunk — Inkhouse.`;
  localStorage.setItem("mangasm_theme_choice", theme.id);
}

function setScreen(name) {
  const events = name === "events";
  screenEvents.classList.toggle("is-on", events);
  screenSignin.classList.toggle("is-on", !events);
  tabEvents.classList.toggle("is-on", events);
  tabSignin.classList.toggle("is-on", !events);
}

THEMES.forEach((theme) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "card";
  btn.dataset.id = theme.id;
  btn.innerHTML = `<div class="meta"><span>${theme.lane}</span><span>${theme.id}</span></div>
    <h2>${theme.name}</h2>
    <p>${theme.why}</p>`;
  btn.addEventListener("click", () => applyTheme(theme.id));
  cardsEl.appendChild(btn);
});

tabSignin.addEventListener("click", () => setScreen("signin"));
tabEvents.addEventListener("click", () => setScreen("events"));

applyTheme("steampunk");
