/**
 * Mangasm cruise map — seed, filters, clustering, age gate.
 *
 * Privacy: coordinates are privacy-zone anchors on a stylized marina chart,
 * already coarsened. They are not GPS readings and are never sent anywhere.
 * One world pixel = 1000/120 meters (~8.33m). A 500m privacy cell is 60px.
 * Device geolocation is intentionally unused.
 *
 * No health / HIV fields. Fetish ("into") lists stay off this surface;
 * pins carry presence and intent only (Right Now, Hosting, Traveling).
 */

export const PX_PER_KM = 120;
export const PRIVACY_CELL_PX = (PX_PER_KM * 500) / 1000; // 60px = 500m
export const MAP_W = 1800;
export const MAP_H = 1200;
export const YOU = { x: 1080, y: 760, zone: "Dubai Marina", name: "You" };

/** Cluster nearby pins when the chart is zoomed out past this level. */
export const CLUSTER_ZOOM = 1.75;
export const CLUSTER_RADIUS_PX = 34;

export const DISTANCE_PRESETS = [
  { meters: 1000, label: "1 km" },
  { meters: 5000, label: "5 km" },
  { meters: 15000, label: "15 km" },
  { meters: null, label: "Any" },
];

const ACCENTS = ["#e83a7a", "#c9a84c", "#3ddecb", "#7aa2ff", "#ff8a4c", "#d56bff", "#8be28b"];

export function place(km, bearingDeg) {
  const r = (bearingDeg * Math.PI) / 180;
  return {
    x: Math.round(YOU.x + Math.cos(r) * km * PX_PER_KM),
    y: Math.round(YOU.y + Math.sin(r) * km * PX_PER_KM),
  };
}

export function formatDistance(meters) {
  if (meters < 1000) {
    const stepped = Math.max(100, Math.round(meters / 100) * 100);
    // 960m rounds to the 1km bucket; say 1.0 km instead of "1000 m".
    if (stepped >= 1000) return "1.0 km";
    return `${stepped} m`;
  }
  const km = meters / 1000;
  const text = km < 10 ? (Math.round(km * 10) / 10).toFixed(1) : String(Math.round(km));
  return `${text} km`;
}

export function repTier(score) {
  if (score < 20) return "New";
  if (score < 40) return "Rising";
  if (score < 70) return "Veteran";
  if (score < 90) return "Elite";
  return "Legend";
}

export function accentFor(id) {
  let hash = 0;
  const text = String(id);
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

export function monogram(pin) {
  if (pin.monogram) return pin.monogram;
  const parts = String(pin.name || "")
    .trim()
    .split(/\s+/);
  if (pin.kind === "group" && parts.length > 1) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return (parts[0] || "?").slice(0, 1).toUpperCase();
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/** Snap a chart point to the center of its 500m privacy cell. */
export function fuzzPoint(x, y, cell = PRIVACY_CELL_PX) {
  const snap = (value) => Math.floor(value / cell) * cell + cell / 2;
  return { x: snap(x), y: snap(y) };
}

export function parseISODate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Same rule as Sources/MangasmApp/Services/Domain/AgeGate.swift:
 * 18th birthday today counts; one day short does not. Dates are UTC.
 */
export function isAdult(birthDate, now) {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) return false;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return false;
  if (birthDate.getTime() > now.getTime()) return false;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = now.getUTCMonth() - birthDate.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age >= 18;
}

function pin(partial) {
  const { km, bearing, zone, ...rest } = partial;
  const pos = place(km, bearing);
  return {
    kind: "person",
    age: null,
    rightNow: false,
    hosting: false,
    traveling: false,
    position: "",
    bio: "",
    rep: null,
    when: "",
    place: "",
    going: null,
    capacity: null,
    privacy: "",
    eventType: "",
    hostName: "",
    memberCount: "",
    tagline: "",
    checkedInMin: null,
    linkedEventId: "",
    monogram: "",
    source: "seed",
    ...rest,
    x: pos.x,
    y: pos.y,
    distanceM: Math.round(km * 1000),
    zone,
  };
}

/**
 * Seeded from Candidate.samples, EventItem.samples, and Community.samples.
 * Extra cruisers fill the chart when live nearby data isn't available.
 * Bearings are chosen so the Palm hotspot clusters and the marina reads as pins.
 */
export const SEED_PINS = [
  pin({
    id: "m1",
    name: "Marco",
    age: 34,
    km: 0.4,
    bearing: 200,
    zone: "Dubai Marina",
    rightNow: true,
    hosting: true,
    position: "Top",
    rep: 88,
    checkedInMin: 2,
    linkedEventId: "e1",
    bio: "Yacht broker by day, vinyl DJ by night. I collect sunrises and rare pressings. Bring an appetite and an open mind.",
  }),
  pin({
    id: "m6",
    name: "Nico",
    age: 28,
    km: 0.72,
    bearing: 305,
    zone: "Dubai Marina",
    rightNow: true,
    position: "Vers",
    rep: 61,
    checkedInMin: 6,
    bio: "On the walk tonight. House music, late swims, and a short answer if you're close.",
  }),
  pin({
    id: "m7",
    name: "Ellis",
    age: 41,
    km: 0.88,
    bearing: 28,
    zone: "Dubai Marina",
    hosting: true,
    position: "Top",
    rep: 54,
    bio: "Door is open for a quiet drink. Tell me who invited you.",
  }),
  pin({
    id: "m8",
    name: "Andre",
    age: 38,
    km: 0.96,
    bearing: 95,
    zone: "Dubai Marina",
    rightNow: true,
    position: "Vers",
    rep: 47,
    checkedInMin: 11,
    bio: "Between sets. Looking for someone who can leave when the song does.",
  }),
  pin({
    id: "m2",
    name: "Theo",
    age: 31,
    km: 1.2,
    bearing: -42,
    zone: "Business Bay",
    traveling: true,
    position: "Vers",
    rep: 69,
    bio: "Mixologist with a vintage Porsche problem. Equal parts mischief and manners.",
  }),
  pin({
    id: "m9",
    name: "Omar",
    age: 35,
    km: 1.65,
    bearing: -12,
    zone: "Business Bay",
    position: "Bottom",
    rep: 58,
    bio: "In town through Sunday. Coffee first, trouble if we both mean it.",
  }),
  pin({
    id: "m10",
    name: "Malik",
    age: 39,
    km: 1.5,
    bearing: -72,
    zone: "Business Bay",
    rightNow: true,
    position: "Top",
    rep: 73,
    checkedInMin: 4,
    bio: "Right now means right now. Bay side, not a tour guide.",
  }),
  pin({
    id: "m3",
    name: "Rafa",
    age: 36,
    km: 2.0,
    bearing: 158,
    zone: "JBR",
    hosting: true,
    position: "Bottom",
    rep: 81,
    linkedEventId: "e3",
    bio: "Architect, sailor, hopeless romantic. I build things that last — let us see if we do.",
  }),
  pin({
    id: "m11",
    name: "Levi",
    age: 30,
    km: 2.35,
    bearing: 176,
    zone: "JBR",
    traveling: true,
    rightNow: true,
    position: "Vers",
    rep: 44,
    checkedInMin: 9,
    bio: "Passing through the beach road. Traveling, not lost.",
  }),
  pin({
    id: "m12",
    name: "Ren",
    age: 26,
    km: 1.9,
    bearing: 128,
    zone: "JBR",
    rightNow: true,
    position: "Vers",
    rep: 52,
    checkedInMin: 1,
    bio: "Just checked in. Neon, salt, and a free hour.",
  }),
  pin({
    id: "m4",
    name: "Sven",
    age: 33,
    km: 3.1,
    bearing: 188,
    zone: "Palm",
    hosting: true,
    position: "Top",
    rep: 74,
    linkedEventId: "e2",
    bio: "Old-money taste, new-school energy. Cars, cigars, and quiet luxury.",
  }),
  pin({
    id: "m13",
    name: "Hugo",
    age: 44,
    km: 3.31,
    bearing: 191,
    zone: "Palm",
    position: "Vers",
    rep: 66,
    bio: "On the fronds tonight. Ask before you cross the causeway.",
  }),
  pin({
    id: "m5",
    name: "Kai",
    age: 29,
    km: 4.6,
    bearing: -78,
    zone: "Jumeirah",
    rightNow: true,
    position: "Vers",
    rep: 63,
    checkedInMin: 3,
    bio: "Bartender-philosopher. I make a negroni that will change your evening.",
  }),
  pin({
    id: "m14",
    name: "Soren",
    age: 28,
    km: 5.8,
    bearing: -50,
    zone: "Jumeirah",
    traveling: true,
    position: "Top",
    rep: 40,
    bio: "Further up the coast. Traveling light, replies slow.",
  }),
  pin({
    id: "e1",
    kind: "event",
    name: "Sunset Circle",
    km: 1.05,
    bearing: 232,
    zone: "Dubai Marina",
    eventType: "Circle",
    hostName: "Marco",
    rep: 88,
    when: "Tonight · 10:30 PM",
    place: "Marina Penthouse",
    going: 9,
    capacity: 12,
    privacy: "approval",
    bio: "Rooftop lounge, house sets, skyline views. Hosted, members-only, verified guests.",
  }),
  pin({
    id: "e2",
    kind: "event",
    name: "Latex & Leather Night",
    km: 2.99,
    bearing: 184,
    zone: "Palm",
    eventType: "Cosplay / Roleplay",
    hostName: "Sven",
    rep: 74,
    when: "Sat · 11:00 PM",
    place: "Private villa",
    going: 18,
    capacity: 30,
    privacy: "public",
    bio: "Statement-style night — bold looks encouraged. Hosted, dress to impress, members verified.",
  }),
  pin({
    id: "e3",
    kind: "event",
    name: "Open House",
    km: 2.2,
    bearing: 142,
    zone: "JBR",
    eventType: "Open Door",
    hostName: "Rafa",
    rep: 81,
    when: "Fri · 9:00 PM",
    place: "Studio loft",
    going: 6,
    capacity: 10,
    privacy: "approval",
    bio: "Hosted open house with welcome drinks. ID-verified entry, hosts on site.",
  }),
  pin({
    id: "e4",
    kind: "event",
    name: "Lunch Express",
    km: 1.32,
    bearing: -24,
    zone: "Business Bay",
    eventType: "Social Mixer",
    hostName: "Theo",
    rep: 69,
    when: "Today · 1:00 PM",
    place: "Business Bay tower",
    going: 4,
    capacity: 8,
    privacy: "public",
    bio: "Midday professionals' mixer over coffee. Book a slot, verified members, intros hosted.",
  }),
  pin({
    id: "c1",
    kind: "group",
    name: "Pride Marina",
    km: 0.58,
    bearing: 255,
    zone: "Dubai Marina",
    monogram: "PM",
    memberCount: "4.2k",
    tagline: "Social · Allies welcome",
    bio: "The marina's standing circle. Social, hosted, allies welcome.",
  }),
  pin({
    id: "c6",
    kind: "group",
    name: "House & After-Hours",
    km: 1.08,
    bearing: -58,
    zone: "Business Bay",
    monogram: "HA",
    memberCount: "5.6k",
    tagline: "Music · Nightlife",
    bio: "After-hours regulars. Music first, names second.",
  }),
  pin({
    id: "c2",
    kind: "group",
    name: "Bears & Cubs",
    km: 2.15,
    bearing: 132,
    zone: "JBR",
    monogram: "BC",
    memberCount: "2.8k",
    tagline: "Body positive",
    bio: "A body-positive room with a long table and no commentary from the door.",
  }),
  pin({
    id: "c4",
    kind: "group",
    name: "Trans+ & Allies",
    km: 1.18,
    bearing: 62,
    zone: "Dubai Marina",
    monogram: "TA",
    memberCount: "1.1k",
    tagline: "Support · Safe space",
    bio: "A hosted safe room. Read the house notes before you knock.",
  }),
  pin({
    id: "s1",
    kind: "spot",
    name: "Marina Lounge",
    km: 0.48,
    bearing: 348,
    zone: "Dubai Marina",
    tagline: "Late bar · neighborhood spot",
    bio: "A late bar on the marina walk. Check in if you're actually here — the pin is the block, not the door.",
  }),
  pin({
    id: "s2",
    kind: "spot",
    name: "Bay Coffee",
    km: 1.85,
    bearing: -28,
    zone: "Business Bay",
    tagline: "Daytime · low key",
    bio: "Daytime tables, laptop optional, cruising discouraged before noon.",
  }),
];

export const SEED_CHATS = [
  {
    id: "conv-m1",
    personId: "m1",
    name: "Marco",
    unread: 2,
    messages: [
      { id: "msg-1", mine: false, text: "Hey — the stars said 94%. Bold of them." },
      { id: "msg-2", mine: true, text: "They don't lie. Marina this weekend?" },
      { id: "msg-3", mine: false, text: "Sunset Circle is still holding a seat." },
    ],
  },
  {
    id: "conv-m2",
    personId: "m2",
    name: "Theo",
    unread: 0,
    messages: [
      { id: "msg-4", mine: false, text: "Okay you have my attention." },
      { id: "msg-5", mine: true, text: "Pick the time — I'll bring the wine." },
    ],
  },
  {
    id: "conv-m3",
    personId: "m3",
    name: "Rafa",
    unread: 0,
    messages: [
      { id: "msg-6", mine: true, text: "RSVP me. I'm serious." },
      { id: "msg-7", mine: false, text: "You're trouble. I like it." },
    ],
  },
  {
    id: "conv-m4",
    personId: "m4",
    name: "Sven",
    unread: 1,
    messages: [{ id: "msg-8", mine: false, text: "Cigars and vintage cars — sounds like a plan?" }],
  },
];

export const ACTIVITY = [
  { id: "a1", text: "Marco checked in · Dubai Marina" },
  { id: "a2", text: "Sunset Circle · 9 going" },
  { id: "a3", text: "Theo is traveling · Business Bay" },
  { id: "a4", text: "Ren is right now · JBR" },
  { id: "a5", text: "Open House · 4 seats left" },
];

export const YOU_PROFILE = {
  name: "Julian",
  age: 32,
  rep: 42,
  position: "Vers",
  zone: "Dubai Marina",
  headline: "Slow mornings, fast cars",
  bio: "Jet-set architect of good nights. Sunsets, fast cars, and slow mornings.",
};

/**
 * Active pills are OR'd. Distance always applies.
 * No pills → everything inside the radius.
 */
export function filterPins(pins, filters = {}) {
  const max = filters.maxDistanceM;
  const selective = Boolean(
    filters.rightNow || filters.hosting || filters.traveling || filters.groups || filters.events
  );
  return pins.filter((pin) => {
    if (pin.hidden) return false;
    if (max != null && pin.distanceM > max) return false;
    if (!selective) return true;
    if (filters.rightNow && pin.rightNow) return true;
    if (filters.hosting && pin.hosting) return true;
    if (filters.traveling && pin.traveling) return true;
    if (filters.groups && pin.kind === "group") return true;
    if (filters.events && (pin.kind === "event" || pin.kind === "spot")) return true;
    return false;
  });
}

export function clusterRadiusForZoom(zoom) {
  return zoom < CLUSTER_ZOOM ? CLUSTER_RADIUS_PX : 0;
}

/** Single-link clusters. radius <= 0 returns every pin alone. */
export function clusterPins(pins, radius) {
  if (!radius || radius <= 0) return pins.map((item) => ({ type: "pin", pin: item }));
  const unused = new Set(pins.map((item) => item.id));
  const out = [];
  for (const seed of pins) {
    if (!unused.has(seed.id)) continue;
    const group = [];
    const queue = [seed];
    unused.delete(seed.id);
    while (queue.length) {
      const current = queue.pop();
      group.push(current);
      for (const other of pins) {
        if (!unused.has(other.id)) continue;
        const dx = other.x - current.x;
        const dy = other.y - current.y;
        if (dx * dx + dy * dy <= radius * radius) {
          unused.delete(other.id);
          queue.push(other);
        }
      }
    }
    if (group.length === 1) {
      out.push({ type: "pin", pin: group[0] });
    } else {
      const x = group.reduce((sum, item) => sum + item.x, 0) / group.length;
      const y = group.reduce((sum, item) => sum + item.y, 0) / group.length;
      out.push({
        type: "cluster",
        id: `cl-${group
          .map((item) => item.id)
          .sort()
          .join("-")}`,
        x,
        y,
        pins: group,
      });
    }
  }
  return out;
}

const ZONE_ANCHORS = [
  { name: "Dubai Marina", x: 1080, y: 780 },
  { name: "JBR", x: 880, y: 920 },
  { name: "Business Bay", x: 1240, y: 670 },
  { name: "Palm", x: 712, y: 710 },
  { name: "Jumeirah", x: 1360, y: 230 },
];

export function nearestZone(x, y) {
  let best = ZONE_ANCHORS[0];
  let bestD = Infinity;
  for (const zone of ZONE_ANCHORS) {
    const dx = zone.x - x;
    const dy = zone.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      best = zone;
      bestD = d;
    }
  }
  return best.name;
}

export function presenceTags(pin) {
  const tags = [];
  if (pin.rightNow) tags.push("Right Now");
  if (pin.hosting) tags.push("Hosting");
  if (pin.traveling) tags.push("Traveling");
  if (pin.position) tags.push(pin.position);
  if (pin.kind === "event" && pin.eventType) tags.push(pin.eventType);
  if (pin.kind === "group") tags.push("Group");
  if (pin.kind === "spot") tags.push("Spot");
  return tags;
}
