/**
 * Pixel Lounge — a walkable room drawn in chunky pixels.
 * Presence, chat, and emotes stay on this device.
 */

import { escapeHTML } from "./cruise-data.js";
import {
  COLS,
  EMOTES,
  GRID,
  OCCUPANTS,
  ROWS,
  YOU_START,
  activeBubble,
  advance,
  findPath,
  isWall,
  moveFree,
  pickTile,
  tileOf,
  tilesIn,
  zoneAt,
} from "./lounge-data.js";

const TILE = 16;
const WALK = 3.2;
const NPC_WALK = 1.45;

const INK = {
  you: "#e4c97e",
  m1: "#e83a7a",
  m2: "#7aa2ff",
  m3: "#3ddecb",
  m4: "#d56bff",
  m5: "#ff8a4c",
};

function paintRoom(ctx) {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const cell = GRID[r][c];
      const x = c * TILE;
      const y = r * TILE;
      const floor = {
        "#": "#141821",
        B: "#2a2118",
        P: "#14241c",
        D: (c + r) % 2 ? "#241028" : "#1a1024",
        C: "#1c1420",
        L: "#241820",
        ".": "#1a1e28",
      }[cell];
      ctx.fillStyle = floor;
      ctx.fillRect(x, y, TILE, TILE);
      if (cell === "#") {
        ctx.fillStyle = "#0c1016";
        ctx.fillRect(x + 2, y + 2, TILE - 4, 4);
      } else if ((c + r) % 5 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(x + 6, y + 6, 3, 3);
      }
      if (cell === "B" && r === 3) {
        ctx.fillStyle = "#c9a84c";
        ctx.fillRect(x, y + TILE - 3, TILE, 3);
      }
      if (cell === "D") {
        ctx.fillStyle = "rgba(232,58,122,0.25)";
        ctx.fillRect(x + 6, y + 6, 4, 4);
      }
      if (cell === "P" && c % 4 === 0 && r === 1) {
        ctx.fillStyle = "#3ddecb";
        ctx.fillRect(x + 6, y + 2, 4, 8);
      }
    }
  }
}

function drawPerson(ctx, x, y, color, frame, you, facing) {
  const left = Math.round(x) - 6;
  const top = Math.round(y) - 14;
  const look = facing < 0 ? -1 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(left + 2, top + 14, 8, 2);
  ctx.fillStyle = color;
  ctx.fillRect(left + 3, top + 1, 6, 4);
  ctx.fillStyle = "#f4efe8";
  ctx.fillRect(left + 3, top + 5, 6, 4);
  ctx.fillStyle = "#1a140c";
  ctx.fillRect(left + 4 + look, top + 6, 1, 1);
  ctx.fillRect(left + 7 + look, top + 6, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(left + 2, top + 9, 8, 4);
  const step = frame ? 1 : 0;
  ctx.fillStyle = "#2a2118";
  ctx.fillRect(left + 3, top + 13, 2, 2 + (step ? 0 : 1));
  ctx.fillRect(left + 7, top + 13, 2, 2 + (step ? 1 : 0));
  if (you) {
    ctx.strokeStyle = "#e4c97e";
    ctx.strokeRect(left + 1.5, top + 0.5, 9, 15);
  }
}

function dirVector(held) {
  let x = 0;
  let y = 0;
  if (held.has("n")) y -= 1;
  if (held.has("s")) y += 1;
  if (held.has("w")) x -= 1;
  if (held.has("e")) x += 1;
  const len = Math.hypot(x, y);
  if (!len) return null;
  return { x: x / len, y: y / len };
}

function keyDir(key) {
  if (key === "ArrowUp" || key === "w" || key === "W") return "n";
  if (key === "ArrowDown" || key === "s" || key === "S") return "s";
  if (key === "ArrowLeft" || key === "a" || key === "A") return "w";
  if (key === "ArrowRight" || key === "d" || key === "D") return "e";
  return null;
}

export function mountLounge(root, hooks = {}) {
  root.innerHTML = `
    <div class="lounge-stage">
      <canvas id="lounge-canvas" width="${COLS * TILE}" height="${ROWS * TILE}" aria-hidden="true"></canvas>
      <div class="lounge-overlay" id="lounge-overlay"></div>
      <div class="lounge-pad" aria-label="Move">
        <button type="button" data-move="n" aria-label="Walk up">▲</button>
        <button type="button" data-move="w" aria-label="Walk left">◀</button>
        <button type="button" data-move="e" aria-label="Walk right">▶</button>
        <button type="button" data-move="s" aria-label="Walk down">▼</button>
      </div>
      <p class="lounge-hint">WASD or arrows · tap the floor to walk</p>
    </div>
    <aside class="lounge-side">
      <header class="lounge-head">
        <div>
          <p class="kicker">Pixel Lounge</p>
          <h2>The room</h2>
        </div>
        <p class="sub">Local only · no GPS</p>
      </header>
      <div class="lounge-emotes" role="group" aria-label="Emotes">
        ${EMOTES.map((emote) => `<button type="button" data-emote="${emote.id}">${escapeHTML(emote.label)}</button>`).join("")}
      </div>
      <div class="lounge-log" id="lounge-log" role="log" aria-live="polite"></div>
      <p class="lounge-dm" id="lounge-dm" hidden></p>
      <form id="lounge-form" class="composer">
        <input name="text" maxlength="160" autocomplete="off" placeholder="Say something" aria-label="Say something in the lounge" />
        <button class="btn primary small" type="submit">Send</button>
      </form>
    </aside>
    <article class="lounge-card" id="lounge-card" hidden></article>
  `;

  const canvas = root.querySelector("#lounge-canvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  const base = document.createElement("canvas");
  base.width = canvas.width;
  base.height = canvas.height;
  paintRoom(base.getContext("2d"));
  const overlay = root.querySelector("#lounge-overlay");
  const logEl = root.querySelector("#lounge-log");
  const form = root.querySelector("#lounge-form");
  const input = form.querySelector("input");
  const dmEl = root.querySelector("#lounge-dm");
  const card = root.querySelector("#lounge-card");

  const you = {
    id: "you",
    name: hooks.youName || "Julian",
    age: 32,
    pos: { x: YOU_START.c + 0.5, y: YOU_START.r + 0.5 },
    path: [],
    facing: 1,
    bubble: null,
    emote: null,
    walked: 0,
  };
  const people = OCCUPANTS.map((person) => ({
    ...person,
    pos: { x: person.c + 0.5, y: person.r + 0.5 },
    path: [],
    facing: 1,
    bubble: null,
    emote: null,
    nextMove: 800 + Math.random() * 1200,
    line: 0,
    walked: 0,
  }));
  const actors = [you, ...people];
  const held = new Set();
  const messages = [
    { name: "Marco", text: "Bar's open.", mine: false },
    { name: "Kai", text: "Negroni's at the bar.", mine: false },
  ];
  let dm = null;
  let visible = false;
  let raf = 0;
  let last = 0;
  let selected = null;

  function zoneName(actor) {
    const tile = tileOf(actor.pos);
    return zoneAt(tile.c, tile.r) || "Lounge";
  }

  function paintLog() {
    logEl.innerHTML = messages
      .slice(-30)
      .map(
        (message) =>
          `<p class="${message.mine ? "mine" : ""}"><strong>${escapeHTML(message.name)}</strong> ${escapeHTML(message.text)}</p>`
      )
      .join("");
    logEl.scrollTop = logEl.scrollHeight;
  }

  function say(actor, text, ms = 4200) {
    actor.bubble = { text, until: performance.now() + ms };
  }

  function project(px, py) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const drawnW = canvas.width * scale;
    const drawnH = canvas.height * scale;
    const originX = rect.left + (rect.width - drawnW) / 2;
    const originY = rect.top + (rect.height - drawnH) / 2;
    return {
      x: originX + px * scale,
      y: originY + py * scale,
      scale,
    };
  }

  function unproject(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const drawnW = canvas.width * scale;
    const drawnH = canvas.height * scale;
    const originX = rect.left + (rect.width - drawnW) / 2;
    const originY = rect.top + (rect.height - drawnH) / 2;
    const x = (clientX - originX) / scale / TILE;
    const y = (clientY - originY) / scale / TILE;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return { c: Math.floor(x), r: Math.floor(y) };
  }

  function renderCard() {
    const person = people.find((actor) => actor.id === selected);
    if (!person) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const tags = (person.tags || [])
      .map(
        (tag) =>
          `<span class="tag${tag === "Right Now" ? " tag-live" : ""}">${escapeHTML(tag)}</span>`
      )
      .join("");
    card.innerHTML = `
      <header>
        <p class="kicker">${escapeHTML(zoneName(person))}</p>
        <h3>${escapeHTML(person.name)} ${person.age}</h3>
        <button type="button" data-card="close" aria-label="Close profile">✕</button>
      </header>
      <div class="tags">${tags}</div>
      <p>${escapeHTML(person.bio)}</p>
      <div class="actions">
        <button type="button" class="btn primary small" data-card="message">Message</button>
        <button type="button" class="btn ghost small" data-card="tap">Tap</button>
      </div>
    `;
  }

  function ensureHits() {
    if (overlay.childElementCount === actors.length) return;
    overlay.innerHTML = actors
      .map((actor) => {
        const label = actor.id === "you" ? "You" : `${actor.name}. Open profile`;
        return `<button type="button" class="lounge-hit" data-person="${escapeHTML(actor.id)}" aria-label="${escapeHTML(label)}"><span class="lounge-name">${escapeHTML(actor.id === "you" ? "You" : actor.name)}</span></button>`;
      })
      .join("");
  }

  function syncFloat(button, className, text) {
    let node = button.querySelector(`.${className}`);
    if (!text) {
      node?.remove();
      return;
    }
    if (!node) {
      node = document.createElement("span");
      node.className = className;
      button.prepend(node);
    }
    if (node.textContent !== text) node.textContent = text;
  }

  function renderOverlay(now) {
    ensureHits();
    const stage = canvas.getBoundingClientRect();
    actors.forEach((actor, index) => {
      const button = overlay.children[index];
      const head = project(actor.pos.x * TILE, actor.pos.y * TILE - 18);
      button.style.left = `${head.x - stage.left}px`;
      button.style.top = `${head.y - stage.top}px`;
      button.classList.toggle("is-on", actor.id === selected);
      syncFloat(button, "lounge-bubble", activeBubble(actor.bubble, now)?.text || "");
      syncFloat(button, "lounge-emote", activeBubble(actor.emote, now)?.text || "");
    });
  }

  function draw(now) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0);
    const ordered = actors.slice().sort((a, b) => a.pos.y - b.pos.y);
    for (const actor of ordered) {
      const frame = Math.floor(actor.walked * 2) % 2;
      drawPerson(
        ctx,
        actor.pos.x * TILE,
        actor.pos.y * TILE,
        INK[actor.id] || "#f4efe8",
        frame,
        actor.id === "you",
        actor.facing
      );
    }
    ctx.fillStyle = "#8b95a8";
    ctx.font = "8px sans-serif";
    ctx.fillText("BAR", 2 * TILE, 2 * TILE);
    ctx.fillText("PATIO", 13 * TILE, 2 * TILE);
    ctx.fillText("DANCE", 8 * TILE, 6 * TILE);
    ctx.fillText("CORNER", 1 * TILE, 10 * TILE);
    ctx.fillText("NOOK", 16 * TILE, 10 * TILE);
    renderOverlay(now);
  }

  function steerNpc(actor, dt, now) {
    if (actor.path.length) {
      const before = actor.pos.x;
      const stepped = advance(actor.pos, actor.path, NPC_WALK * dt);
      actor.facing = Math.sign(stepped.pos.x - before) || actor.facing;
      actor.pos = stepped.pos;
      actor.path = stepped.path;
      actor.walked += dt;
      return;
    }
    if (now < actor.nextMove) return;
    const choices = tilesIn(actor.zone);
    const goal = pickTile(choices, Math.random);
    const path = findPath(tileOf(actor.pos), goal);
    actor.path = path.slice(1);
    actor.nextMove = now + 2800 + Math.random() * 3600;
    if (Math.random() < 0.35 && !activeBubble(actor.bubble, now)) {
      const line = actor.lines[actor.line % actor.lines.length];
      actor.line += 1;
      say(actor, line, 3200);
      messages.push({ name: actor.name, text: line, mine: false });
      paintLog();
    }
  }

  function tick(now) {
    if (!visible) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    const vector = dirVector(held);
    if (vector) {
      const before = you.pos.x;
      you.pos = moveFree(you.pos, vector.x * WALK * dt, vector.y * WALK * dt);
      you.facing = Math.sign(you.pos.x - before) || you.facing;
      you.path = [];
      you.walked += dt;
    } else if (you.path.length) {
      const before = you.pos.x;
      const stepped = advance(you.pos, you.path, WALK * dt);
      you.facing = Math.sign(stepped.pos.x - before) || you.facing;
      you.pos = stepped.pos;
      you.path = stepped.path;
      you.walked += dt;
    }
    for (const actor of people) steerNpc(actor, dt, now);
    draw(now);
    raf = requestAnimationFrame(tick);
  }

  function walkTo(tile) {
    if (!tile || isWall(tile.c, tile.r)) return;
    const path = findPath(tileOf(you.pos), tile);
    you.path = path.slice(1);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.target !== canvas) return;
    walkTo(unproject(event.clientX, event.clientY));
  });

  overlay.addEventListener("click", (event) => {
    const button = event.target.closest("[data-person]");
    if (!button) return;
    if (button.dataset.person === "you") {
      selected = null;
      renderCard();
      return;
    }
    selected = button.dataset.person;
    renderCard();
  });

  card.addEventListener("click", (event) => {
    const action = event.target.closest("[data-card]")?.dataset.card;
    if (!action) return;
    const person = people.find((actor) => actor.id === selected);
    if (action === "close" || !person) {
      selected = null;
      renderCard();
      return;
    }
    if (action === "tap") {
      hooks.onTap?.(person);
      person.emote = { text: "tapped", until: performance.now() + 1600 };
      return;
    }
    if (action === "message") {
      dm = person;
      dmEl.hidden = false;
      dmEl.textContent = `To ${person.name}`;
      input.placeholder = `Message ${person.name}`;
      input.focus();
    }
  });

  dmEl.addEventListener("click", () => {
    dm = null;
    dmEl.hidden = true;
    input.placeholder = "Say something";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = String(new FormData(form).get("text") || "").trim();
    if (!text) return;
    form.reset();
    if (dm) {
      say(you, text);
      messages.push({ name: `You → ${dm.name}`, text, mine: true });
      hooks.onDirect?.(dm, text);
      dm = null;
      dmEl.hidden = true;
      input.placeholder = "Say something";
    } else {
      say(you, text);
      messages.push({ name: "You", text, mine: true });
    }
    paintLog();
  });

  root.querySelectorAll("[data-emote]").forEach((button) => {
    button.addEventListener("click", () => {
      const emote = EMOTES.find((item) => item.id === button.dataset.emote);
      if (!emote) return;
      you.emote = { text: emote.label, until: performance.now() + 1800 };
      messages.push({ name: "You", text: emote.label, mine: true });
      paintLog();
    });
  });

  function hold(dir, down) {
    if (down) held.add(dir);
    else held.delete(dir);
    if (down) you.path = [];
  }
  root.querySelectorAll("[data-move]").forEach((button) => {
    const dir = button.dataset.move;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      hold(dir, true);
    });
    button.addEventListener("pointerup", () => hold(dir, false));
    button.addEventListener("pointerleave", () => hold(dir, false));
    button.addEventListener("pointercancel", () => hold(dir, false));
  });

  function onKey(event) {
    if (!visible) return;
    const dir = keyDir(event.key);
    if (!dir || event.target.closest("input, textarea")) return;
    event.preventDefault();
    hold(dir, event.type === "keydown");
  }
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKey);

  paintLog();
  people[0].bubble = { text: "Bar's open.", until: performance.now() + 2800 };

  return {
    show() {
      visible = true;
      root.hidden = false;
      last = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    },
    hide() {
      visible = false;
      root.hidden = true;
      held.clear();
      cancelAnimationFrame(raf);
    },
    closeCard() {
      if (card.hidden) return false;
      selected = null;
      renderCard();
      return true;
    },
    isOpen() {
      return visible;
    },
  };
}
