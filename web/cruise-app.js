import {
  ACTIVITY,
  DISTANCE_PRESETS,
  PX_PER_KM,
  SEED_CHATS,
  SEED_PINS,
  YOU,
  YOU_PROFILE,
  accentFor,
  clusterPins,
  clusterRadiusForZoom,
  escapeHTML,
  filterPins,
  formatDistance,
  fuzzPoint,
  isAdult,
  monogram,
  nearestZone,
  parseISODate,
  place,
  presenceTags,
  repTier,
} from "./cruise-data.js";
import { mountMap } from "./cruise-map.js";

const AGE_KEY = "mangasm.ageOk";
const CHECKIN_ID = "you-checkin";
const $ = (sel) => document.querySelector(sel);

const state = {
  pins: SEED_PINS.map((pin) => ({ ...pin })),
  chats: SEED_CHATS.map((chat) => ({
    ...chat,
    messages: chat.messages.map((message) => ({ ...message })),
  })),
  filters: {
    rightNow: false,
    hosting: false,
    traveling: false,
    groups: false,
    events: false,
    maxDistanceM: DISTANCE_PRESETS[2].meters,
  },
  distanceIndex: 2,
  mode: null,
  sheetReturn: null,
  rosterView: "list",
  selectedId: null,
  threadId: null,
  blocked: new Set(),
  rsvped: new Set(),
  joined: new Set(),
  tapped: new Set(),
  spotIns: new Set(),
  you: { rightNow: false, hosting: false },
  dropKind: "checkin",
  booted: false,
  ticker: 0,
};

const gate = $("#age-gate");
const app = $("#app");
const sheet = $("#sheet");
const sheetBody = $("#sheet-body");
const toast = $("#toast");
let map;
let toastTimer = 0;

function civilToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function readAgeOk() {
  try {
    return sessionStorage.getItem(AGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAgeOk() {
  try {
    sessionStorage.setItem(AGE_KEY, "1");
  } catch {
    /* private mode: the in-memory pass still opens the map */
  }
}

function visiblePins() {
  return filterPins(
    state.pins.filter((pin) => !state.blocked.has(pin.id)),
    state.filters
  );
}

function present(pin) {
  return {
    ...pin,
    accent: accentFor(pin.id),
    mark: monogram(pin),
    distanceLabel: formatDistance(pin.distanceM),
  };
}

function findPin(id) {
  return state.pins.find((pin) => pin.id === id && !state.blocked.has(pin.id));
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function biasForSheet() {
  if (!state.mode) return { x: 0, y: 0 };
  if (window.innerWidth >= 960) return { x: -190, y: 0 };
  return { x: 0, y: -Math.min(window.innerHeight * 0.16, 130) };
}

function paintMarkers() {
  const visible = visiblePins().map(present);
  const radius = clusterRadiusForZoom(map.getZoom());
  map.setSelected(state.selectedId, false);
  map.setMarkers(clusterPins(visible, radius));
  const live =
    visible.filter((pin) => pin.kind === "person" && pin.rightNow).length +
    (state.you.rightNow ? 1 : 0);
  $("#stat-live").textContent = `${live} right now`;
  const empty = $("#map-empty");
  empty.hidden = visible.length !== 0;
  const scale = 0.5 * PX_PER_KM * map.getZoom();
  $("#scale-bar").style.width = `${Math.max(18, scale)}px`;
}

function unreadCount() {
  return state.chats.reduce((sum, chat) => sum + (chat.unread || 0), 0);
}

function renderChrome() {
  const badge = $("#chat-badge");
  const unread = unreadCount();
  badge.hidden = unread === 0;
  badge.textContent = String(unread);
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", state.filters[button.dataset.filter] ? "true" : "false");
  });
  $("#filter-distance").textContent = DISTANCE_PRESETS[state.distanceIndex].label;
  document.querySelectorAll("[data-dock]").forEach((button) => {
    const dock = button.dataset.dock;
    const on =
      dock === "map"
        ? state.mode == null
        : state.mode === dock ||
          (dock === "roster" && state.mode === "pin" && state.sheetReturn === "roster");
    button.setAttribute("aria-pressed", on ? "true" : "false");
  });
  map?.setYouFlags(state.you);
}

function openMode(mode) {
  state.mode = mode;
  sheet.hidden = false;
  document.body.classList.add("sheet-open");
  renderSheet();
  requestAnimationFrame(() => sheet.classList.add("open"));
  renderChrome();
}

function closeSheet() {
  state.mode = null;
  state.threadId = null;
  state.sheetReturn = null;
  state.selectedId = null;
  sheet.classList.remove("open", "expanded");
  document.body.classList.remove("sheet-open");
  map?.setSelected(null);
  window.setTimeout(() => {
    if (!state.mode) sheet.hidden = true;
  }, 280);
  renderChrome();
}

function tagsHTML(pin) {
  return presenceTags(pin)
    .map(
      (tag) =>
        `<span class="tag${tag === "Right Now" ? " tag-live" : ""}">${escapeHTML(tag)}</span>`
    )
    .join("");
}

function avatarHTML(pin, extra = "") {
  const kind = pin.kind === "person" ? "" : pin.kind;
  return `<span class="avatar ${kind}" style="--pin:${escapeHTML(pin.accent || accentFor(pin.id))}">${escapeHTML(monogram(pin))}</span>${extra}`;
}

function renderPinSheet(pin) {
  const shown = present(pin);
  const linked = pin.linkedEventId ? findPin(pin.linkedEventId) : null;
  const going = pin.kind === "event" ? (pin.going || 0) + (state.rsvped.has(pin.id) ? 1 : 0) : null;
  const chip = linked
    ? `<button type="button" class="event-chip" data-act="open" data-id="${escapeHTML(linked.id)}"><strong>${escapeHTML(linked.name)}</strong><span>${escapeHTML(linked.when)} · ${escapeHTML(linked.zone)}</span></button>`
    : "";
  let actions = "";
  if (pin.kind === "person") {
    actions = `<div class="actions"><button type="button" class="btn primary" data-act="message" data-id="${escapeHTML(pin.id)}">Message</button><button type="button" class="btn ghost" data-act="tap" data-id="${escapeHTML(pin.id)}" aria-pressed="${state.tapped.has(pin.id)}">${state.tapped.has(pin.id) ? "Tapped" : "Tap"}</button></div>`;
  } else if (pin.kind === "event") {
    const host = state.pins.find((item) => item.kind === "person" && item.name === pin.hostName);
    const rsvpLabel = state.rsvped.has(pin.id) ? "Going" : "RSVP";
    actions = `<div class="actions"><button type="button" class="btn gold" data-act="rsvp" data-id="${escapeHTML(pin.id)}" aria-pressed="${state.rsvped.has(pin.id)}">${rsvpLabel}</button>${host ? `<button type="button" class="btn ghost" data-act="message" data-id="${escapeHTML(host.id)}">Message host</button>` : ""}</div>`;
  } else if (pin.kind === "group") {
    actions = `<div class="actions"><button type="button" class="btn primary" data-act="join" data-id="${escapeHTML(pin.id)}" aria-pressed="${state.joined.has(pin.id)}">${state.joined.has(pin.id) ? "Joined" : "Join"}</button></div>`;
  } else {
    actions = `<div class="actions"><button type="button" class="btn primary" data-act="checkin-spot" data-id="${escapeHTML(pin.id)}" aria-pressed="${state.spotIns.has(pin.id)}">${state.spotIns.has(pin.id) ? "Checked in" : "Check in"}</button></div>`;
  }
  const meta =
    pin.kind === "event"
      ? `${escapeHTML(pin.when)} · ${escapeHTML(pin.place)} · ${going}/${pin.capacity} · ${escapeHTML(pin.privacy)}`
      : pin.kind === "group"
        ? `${escapeHTML(pin.memberCount)} members · ${escapeHTML(pin.tagline)}`
        : pin.kind === "spot"
          ? escapeHTML(pin.tagline || pin.zone)
          : `${shown.distanceLabel} · ${escapeHTML(pin.zone)}${pin.checkedInMin != null ? ` · ${pin.checkedInMin}m ago` : ""}`;
  const rep =
    pin.rep != null ? `<p class="rep">Rep ${pin.rep} · ${escapeHTML(repTier(pin.rep))}</p>` : "";
  const safety =
    pin.kind === "person" || pin.kind === "event"
      ? `<div class="linkish"><button type="button" data-act="block" data-id="${escapeHTML(pin.id)}">Block</button><button type="button" data-act="report" data-id="${escapeHTML(pin.id)}">Report</button></div>`
      : "";
  return `
    <div class="who">
      ${avatarHTML(shown)}
      <div>
        <p class="kicker">${escapeHTML(pin.kind === "person" ? "Nearby" : pin.kind)}</p>
        <h2 tabindex="-1">${escapeHTML(pin.name)}${pin.age ? ` <span style="font-size:.7em;color:#a89f94">${pin.age}</span>` : ""}</h2>
        <p class="sub">${meta}</p>
        ${rep}
      </div>
      <button type="button" class="icon-btn" data-act="close" aria-label="Close">✕</button>
    </div>
    <div class="tags">${tagsHTML(pin)}</div>
    <p class="bio">${escapeHTML(pin.bio || "")}</p>
    ${chip}
    ${actions}
    ${safety}`;
}

function renderRoster() {
  const items = visiblePins();
  const cards = items
    .map((pin) => {
      const shown = present(pin);
      return `<button type="button" class="card" data-act="open" data-id="${escapeHTML(pin.id)}">${avatarHTML(shown)}<span><strong>${escapeHTML(pin.name)}</strong><em>${escapeHTML(shown.distanceLabel)} · ${escapeHTML(pin.zone)}</em></span></button>`;
    })
    .join("");
  return `
    <div class="sheet-head">
      <div>
        <p class="kicker">On the chart</p>
        <h2 tabindex="-1">${items.length} nearby</h2>
      </div>
      <button type="button" class="icon-btn" data-act="close" aria-label="Close">✕</button>
    </div>
    <div class="segment" role="group" aria-label="List or grid">
      <button type="button" data-act="layout" data-layout="list" aria-pressed="${state.rosterView === "list"}">List</button>
      <button type="button" data-act="layout" data-layout="grid" aria-pressed="${state.rosterView === "grid"}">Grid</button>
    </div>
    <div class="roster ${state.rosterView}">${cards || `<p class="empty">Nothing in this radius. Widen distance or clear a filter.</p>`}</div>`;
}

function renderChat() {
  const thread = state.chats.find((chat) => chat.id === state.threadId);
  if (!thread) {
    const rows = state.chats
      .map((chat) => {
        const last = chat.messages[chat.messages.length - 1];
        return `<button type="button" class="card chat-row" data-act="thread" data-id="${escapeHTML(chat.id)}">${avatarHTML({ id: chat.personId, name: chat.name, kind: "person" })}<span><strong>${escapeHTML(chat.name)}${chat.unread ? ` · ${chat.unread}` : ""}</strong><em>${escapeHTML(last?.text || "New chat")}</em></span></button>`;
      })
      .join("");
    return `
      <div class="sheet-head">
        <div><p class="kicker">Inbox</p><h2 tabindex="-1">Chats</h2></div>
        <button type="button" class="icon-btn" data-act="close" aria-label="Close">✕</button>
      </div>
      <div class="roster">${rows}</div>`;
  }
  const bubbles = thread.messages
    .map(
      (message) =>
        `<div class="bubble${message.mine ? " mine" : ""}">${escapeHTML(message.text)}</div>`
    )
    .join("");
  return `
    <div class="sheet-head">
      <div>
        <button type="button" class="text-link" data-act="inbox">← Chats</button>
        <h2 tabindex="-1">${escapeHTML(thread.name)}</h2>
      </div>
      <button type="button" class="icon-btn" data-act="close" aria-label="Close">✕</button>
    </div>
    <div class="thread">${bubbles || `<p class="empty">Say something. This preview stays on this device.</p>`}</div>
    <form class="composer" id="chat-form">
      <input name="text" maxlength="280" autocomplete="off" placeholder="Message" aria-label="Message" />
      <button class="btn primary small" type="submit">Send</button>
    </form>`;
}

function renderYou() {
  const flags = [
    state.you.rightNow ? "Right Now" : null,
    state.you.hosting ? "Hosting" : null,
  ].filter(Boolean);
  return `
    <div class="sheet-head">
      <div>
        <p class="kicker">You · ${escapeHTML(YOU_PROFILE.zone)}</p>
        <h2 tabindex="-1">${escapeHTML(YOU_PROFILE.name)} ${YOU_PROFILE.age}</h2>
      </div>
      <button type="button" class="icon-btn" data-act="close" aria-label="Close">✕</button>
    </div>
    <p class="rep">Rep ${YOU_PROFILE.rep} · ${escapeHTML(repTier(YOU_PROFILE.rep))} · ${escapeHTML(YOU_PROFILE.position)}</p>
    <div class="tags">${flags.map((flag) => `<span class="tag${flag === "Right Now" ? " tag-live" : ""}">${flag}</span>`).join("") || `<span class="tag">In a privacy zone</span>`}</div>
    <p class="bio">${escapeHTML(YOU_PROFILE.headline)}. ${escapeHTML(YOU_PROFILE.bio)}</p>
    <p class="sub">Your dot is a 500m zone. The chart never asks this browser for GPS.</p>
    <div class="actions">
      <a class="btn gold" href="/plus">Mangasm+</a>
      <a class="btn ghost" href="/story">The story</a>
    </div>
    <div class="linkish">
      <a class="text-link" href="/privacy.html">Privacy</a>
      <a class="text-link" href="/terms.html">Terms</a>
      <a class="text-link" href="/moderation.html">Moderation</a>
    </div>`;
}

function renderDrop() {
  const eventFields =
    state.dropKind === "event"
      ? `<input name="title" maxlength="80" required placeholder="Event title" aria-label="Event title" />
         <select name="when" aria-label="When"><option>Tonight</option><option>Tomorrow</option><option>Sat night</option></select>
         <select name="eventType" aria-label="Type"><option>Circle</option><option>Open Door</option><option>Social Mixer</option><option>Cosplay / Roleplay</option></select>`
      : "";
  return `
    <div class="sheet-head">
      <div>
        <p class="kicker">Privacy zone</p>
        <h2 tabindex="-1">Drop a pin</h2>
      </div>
      <button type="button" class="icon-btn" data-act="close" aria-label="Close">✕</button>
    </div>
    <p class="sub">Shown as a neighborhood zone, never a door number. Nothing here is uploaded.</p>
    <form id="drop-form" class="stack">
      <div class="choice" role="group" aria-label="Pin type">
        <button type="button" data-act="drop-kind" data-kind="checkin" aria-pressed="${state.dropKind === "checkin"}">Check in</button>
        <button type="button" data-act="drop-kind" data-kind="hosting" aria-pressed="${state.dropKind === "hosting"}">Hosting</button>
        <button type="button" data-act="drop-kind" data-kind="event" aria-pressed="${state.dropKind === "event"}">Event</button>
      </div>
      ${eventFields}
      <button class="btn primary" type="submit">${state.dropKind === "event" ? "Host event" : "Drop pin"}</button>
    </form>`;
}

function renderSheet() {
  if (!state.mode) return;
  const pin = state.selectedId ? findPin(state.selectedId) : null;
  let html;
  let label;
  if (state.mode === "pin" && pin) {
    html = renderPinSheet(pin);
    label = pin.name;
  } else if (state.mode === "roster") {
    html = renderRoster();
    label = "Nearby";
  } else if (state.mode === "chat") {
    html = renderChat();
    label = "Chats";
  } else if (state.mode === "you") {
    html = renderYou();
    label = "You";
  } else if (state.mode === "drop") {
    html = renderDrop();
    label = "Drop a pin";
  } else {
    closeSheet();
    return;
  }
  sheetBody.innerHTML = html;
  sheet.setAttribute("aria-label", label);
  const field = sheetBody.querySelector("#chat-form input, #drop-form input");
  if (field) field.focus();
  else sheetBody.querySelector("h2")?.focus();
}

function openPin(id, fromRoster = false) {
  const pin = findPin(id);
  if (!pin) return;
  state.selectedId = id;
  state.sheetReturn = fromRoster ? "roster" : null;
  map.setSelected(id);
  map.centerOn(pin.x, pin.y, Math.max(map.getZoom(), 1.9), true, biasForSheet());
  openMode("pin");
}

function openChat(personId) {
  const person = findPin(personId);
  if (!person) return;
  let thread = state.chats.find((chat) => chat.personId === personId);
  if (!thread) {
    thread = { id: `conv-${personId}`, personId, name: person.name, unread: 0, messages: [] };
    state.chats.unshift(thread);
  }
  thread.unread = 0;
  state.threadId = thread.id;
  openMode("chat");
}

function findOpenPoint() {
  for (let i = 0; i < 18; i += 1) {
    const bearing = (36 + i * 23) % 360;
    const km = 0.62 + (i % 5) * 0.1;
    const raw = place(km, bearing);
    const point = fuzzPoint(raw.x, raw.y);
    const crowded = state.pins.some((pin) => Math.hypot(pin.x - point.x, pin.y - point.y) < 56);
    const onChart = point.x > 80 && point.y > 80 && point.x < 1720 && point.y < 1120;
    if (!crowded && onChart) return point;
  }
  return fuzzPoint(YOU.x + 70, YOU.y - 70);
}

function revealDropped(pin) {
  state.selectedId = pin.id;
  map.setSelected(pin.id, false);
  paintMarkers();
  map.centerOn(pin.x, pin.y, 2.05, true, biasForSheet());
  openMode("pin");
}

function upsertCheckin() {
  const point = findOpenPoint();
  const distanceM = Math.round((Math.hypot(point.x - YOU.x, point.y - YOU.y) * 1000) / PX_PER_KM);
  const existing = state.pins.find((pin) => pin.id === CHECKIN_ID);
  const next = {
    id: CHECKIN_ID,
    kind: "spot",
    name: state.you.hosting ? "Hosting nearby" : "Live check-in",
    age: null,
    rightNow: state.you.rightNow,
    hosting: state.you.hosting,
    traveling: false,
    position: "",
    bio: "Your privacy-zone pin. It marks the block, not the door, and it stays on this device.",
    rep: YOU_PROFILE.rep,
    when: "",
    place: "",
    going: null,
    capacity: null,
    privacy: "",
    eventType: "",
    hostName: YOU_PROFILE.name,
    memberCount: "",
    tagline: "You · just now",
    checkedInMin: 0,
    linkedEventId: "",
    monogram: "You",
    source: "you",
    x: point.x,
    y: point.y,
    distanceM,
    zone: nearestZone(point.x, point.y),
  };
  if (existing) Object.assign(existing, next);
  else state.pins.push(next);
}

function dropEvent(form) {
  const title = String(new FormData(form).get("title") || "").trim();
  if (!title) {
    showToast("Give the event a title.");
    return;
  }
  const hosted = state.pins.filter((pin) => pin.source === "you" && pin.kind === "event").length;
  if (hosted >= 8) {
    showToast("That's enough hosted pins for this preview.");
    return;
  }
  const point = findOpenPoint();
  const distanceM = Math.round((Math.hypot(point.x - YOU.x, point.y - YOU.y) * 1000) / PX_PER_KM);
  const data = new FormData(form);
  state.pins.push({
    id: `drop-${Date.now()}`,
    kind: "event",
    name: title,
    age: null,
    rightNow: false,
    hosting: true,
    traveling: false,
    position: "",
    bio: "Hosted from this map. Guests see the zone, not an address. Preview only — not saved to the server.",
    rep: YOU_PROFILE.rep,
    when: String(data.get("when") || "Tonight"),
    place: "Privacy zone",
    going: 1,
    capacity: 12,
    privacy: "approval",
    eventType: String(data.get("eventType") || "Circle"),
    hostName: YOU_PROFILE.name,
    memberCount: "",
    tagline: "",
    checkedInMin: 0,
    linkedEventId: "",
    monogram: "",
    source: "you",
    x: point.x,
    y: point.y,
    distanceM,
    zone: nearestZone(point.x, point.y),
  });
  const created = state.pins[state.pins.length - 1];
  showToast("Event dropped in your privacy zone.");
  revealDropped(created);
}

function onSheetClick(event) {
  const button = event.target.closest("[data-act]");
  if (!button) return;
  const act = button.dataset.act;
  const id = button.dataset.id;
  if (act === "close") {
    if (state.mode === "pin" && state.sheetReturn === "roster") {
      state.selectedId = null;
      map.setSelected(null);
      openMode("roster");
      return;
    }
    closeSheet();
    return;
  }
  if (act === "open") {
    openPin(id, state.mode === "roster");
    return;
  }
  if (act === "layout") {
    state.rosterView = button.dataset.layout;
    renderSheet();
    return;
  }
  if (act === "message") {
    openChat(id);
    return;
  }
  if (act === "tap") {
    if (state.tapped.has(id)) state.tapped.delete(id);
    else state.tapped.add(id);
    showToast(state.tapped.has(id) ? "Tap sent." : "Tap removed.");
    renderSheet();
    return;
  }
  if (act === "rsvp") {
    const pin = findPin(id);
    if (!pin) return;
    if (state.rsvped.has(id)) state.rsvped.delete(id);
    else if ((pin.going || 0) + 1 > pin.capacity) {
      showToast("It's full — message the host.");
      return;
    } else state.rsvped.add(id);
    showToast(state.rsvped.has(id) ? "You're on the list." : "RSVP removed.");
    renderSheet();
    return;
  }
  if (act === "join") {
    if (state.joined.has(id)) state.joined.delete(id);
    else state.joined.add(id);
    showToast(state.joined.has(id) ? "Joined. We'll keep it on this device." : "Left the group.");
    renderSheet();
    return;
  }
  if (act === "checkin-spot") {
    if (state.spotIns.has(id)) state.spotIns.delete(id);
    else state.spotIns.add(id);
    showToast(state.spotIns.has(id) ? "Checked in at the spot." : "Check-in cleared.");
    renderSheet();
    return;
  }
  if (act === "block") {
    state.blocked.add(id);
    showToast("Blocked on this device. They leave your chart.");
    state.selectedId = null;
    closeSheet();
    paintMarkers();
    return;
  }
  if (act === "report") {
    showToast("Report noted here. Safety review sends once you're signed in.");
    return;
  }
  if (act === "thread") {
    const thread = state.chats.find((chat) => chat.id === id);
    if (!thread) return;
    thread.unread = 0;
    state.threadId = thread.id;
    renderSheet();
    renderChrome();
    return;
  }
  if (act === "inbox") {
    state.threadId = null;
    renderSheet();
    return;
  }
  if (act === "drop-kind") {
    state.dropKind = button.dataset.kind;
    renderSheet();
  }
}

function onSheetSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.id === "chat-form") {
    const thread = state.chats.find((chat) => chat.id === state.threadId);
    const text = String(new FormData(form).get("text") || "").trim();
    if (!thread || !text) return;
    thread.messages.push({ id: `local-${Date.now()}`, mine: true, text });
    renderSheet();
    return;
  }
  if (form.id === "drop-form") {
    if (state.dropKind === "event") {
      dropEvent(form);
      return;
    }
    state.you.rightNow = state.dropKind === "checkin" || state.you.rightNow;
    state.you.hosting = state.dropKind === "hosting" || state.you.hosting;
    if (state.dropKind === "checkin") state.you.rightNow = true;
    if (state.dropKind === "hosting") state.you.hosting = true;
    upsertCheckin();
    paintMarkers();
    renderChrome();
    showToast(
      state.dropKind === "hosting" ? "Hosting in your privacy zone." : "Checked in. Zone only."
    );
    closeSheet();
  }
}

function recenter() {
  const zoom = window.innerWidth < 720 ? 1.7 : 1.45;
  map.centerOn(YOU.x, YOU.y, zoom, true, { x: 0, y: 0 });
}

function bootMap() {
  if (state.booted) return;
  state.booted = true;
  map = mountMap($("#map"), {
    onSelect(hit) {
      if (hit.type === "cluster" && hit.marker) {
        map.centerOn(hit.marker.x, hit.marker.y, 2.2, true, biasForSheet());
        return;
      }
      if (hit.type === "pin") openPin(hit.id, false);
    },
    onClear() {
      if (state.mode === "pin") closeSheet();
    },
    onView() {
      const bar = $("#scale-bar");
      if (bar && map) bar.style.width = `${Math.max(18, 0.5 * PX_PER_KM * map.getZoom())}px`;
      if (!map) return;
      const radius = clusterRadiusForZoom(map.getZoom());
      if (radius !== state.lastRadius) {
        state.lastRadius = radius;
        const visible = visiblePins().map(present);
        map.setSelected(state.selectedId, false);
        map.setMarkers(clusterPins(visible, radius));
      }
    },
  });
  requestAnimationFrame(() => {
    recenter();
    state.lastRadius = clusterRadiusForZoom(map.getZoom());
    paintMarkers();
    renderChrome();
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.filter;
      state.filters[key] = !state.filters[key];
      if (
        state.selectedId &&
        !visiblePins().some((pin) => pin.id === state.selectedId) &&
        state.mode === "pin"
      ) {
        closeSheet();
      }
      paintMarkers();
      renderChrome();
      if (state.mode === "roster" || state.mode === "pin") renderSheet();
    });
  });
  $("#filter-distance").addEventListener("click", () => {
    state.distanceIndex = (state.distanceIndex + 1) % DISTANCE_PRESETS.length;
    state.filters.maxDistanceM = DISTANCE_PRESETS[state.distanceIndex].meters;
    if (
      state.selectedId &&
      !visiblePins().some((pin) => pin.id === state.selectedId) &&
      state.mode === "pin"
    ) {
      closeSheet();
    }
    paintMarkers();
    renderChrome();
    if (state.mode === "roster") renderSheet();
  });
  document.querySelectorAll("[data-dock]").forEach((button) => {
    button.addEventListener("click", () => {
      const dock = button.dataset.dock;
      if (dock === "map") {
        closeSheet();
        recenter();
        return;
      }
      if (dock === "roster") {
        if (state.mode === "roster") {
          state.rosterView = state.rosterView === "list" ? "grid" : "list";
          renderSheet();
          return;
        }
        state.sheetReturn = null;
        openMode("roster");
        return;
      }
      if (state.mode === dock && dock !== "chat") {
        closeSheet();
        return;
      }
      if (dock === "chat") state.threadId = null;
      openMode(dock);
    });
  });
  document.querySelectorAll("[data-fab]").forEach((button) => {
    button.addEventListener("click", () => {
      const fab = button.dataset.fab;
      if (fab === "in") map.zoomBy(1.2);
      if (fab === "out") map.zoomBy(1 / 1.2);
      if (fab === "recenter") recenter();
      if (fab === "roster") document.querySelector('[data-dock="roster"]').click();
      if (fab === "drop") document.querySelector('[data-dock="drop"]').click();
      if (fab === "chat") document.querySelector('[data-dock="chat"]').click();
    });
  });
  sheet.addEventListener("click", onSheetClick);
  sheet.addEventListener("submit", onSheetSubmit);
  $("#sheet-handle").addEventListener("click", () => sheet.classList.toggle("expanded"));
  document.addEventListener("keydown", (event) => {
    if (!app.hidden && event.key === "Escape") {
      if (state.mode === "chat" && state.threadId) {
        state.threadId = null;
        renderSheet();
        return;
      }
      if (state.mode) closeSheet();
      return;
    }
    if (app.hidden || event.target.closest("input, textarea, select")) return;
    if (event.key === "+" || event.key === "=") map.zoomBy(1.18);
    if (event.key === "-" || event.key === "_") map.zoomBy(1 / 1.18);
    if (event.key === "r" || event.key === "R") recenter();
  });
  window.addEventListener("resize", () => map.resize());
  window.setInterval(() => {
    state.ticker = (state.ticker + 1) % ACTIVITY.length;
    $("#ticker-text").textContent = ACTIVITY[state.ticker].text;
  }, 4200);
}

function openApp() {
  gate.hidden = true;
  app.hidden = false;
  app.removeAttribute("inert");
  bootMap();
}

$("#age-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#age-dob");
  const error = $("#age-error");
  const birth = parseISODate(input.value);
  if (!birth) {
    error.textContent = "Enter your date of birth.";
    return;
  }
  if (!isAdult(birth, civilToday())) {
    error.textContent = "Mangasm is 18+.";
    return;
  }
  input.value = "";
  error.textContent = "";
  writeAgeOk();
  openApp();
});

if (readAgeOk()) openApp();
else $("#age-dob").focus();
