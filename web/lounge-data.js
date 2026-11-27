/**
 * Pixel Lounge room rules. Tile coordinates only — no GPS, no network.
 * Walls are "#". Every other glyph is a walkable zone.
 */

export const GRID = [
  "######################",
  "#BBBBB......PPPPPP...#",
  "#BBBBB......PPPPPP...#",
  "#BBBBB......PPPPPP...#",
  "#....................#",
  "#.....DDDDDDDDDD.....#",
  "#.....DDDDDDDDDD.....#",
  "#.....DDDDDDDDDD.....#",
  "#....................#",
  "#CCCCC..........LLLL.#",
  "#CCCCC..........LLLL.#",
  "#....................#",
  "#....................#",
  "######################",
].map((row) => row.split(""));

export const COLS = GRID[0].length;
export const ROWS = GRID.length;

export const ZONE_LABEL = {
  B: "Bar",
  P: "Patio",
  D: "Dance floor",
  C: "Corner",
  ".": "Lounge",
};

export const EMOTES = [
  { id: "wave", label: "Wave" },
  { id: "hey", label: "Hey" },
  { id: "heart", label: "♥" },
  { id: "fire", label: "Fire" },
];

export const YOU_START = { c: 11, r: 11 };

export const OCCUPANTS = [
  {
    id: "m1",
    name: "Marco",
    age: 34,
    zone: "B",
    c: 3,
    r: 2,
    tags: ["Right Now", "Hosting"],
    bio: "Yacht broker by day, vinyl DJ by night. The bar stool is his.",
    lines: ["Bar's open.", "This pressing is mean."],
  },
  {
    id: "m2",
    name: "Theo",
    age: 31,
    zone: "D",
    c: 8,
    r: 6,
    tags: ["Traveling"],
    bio: "Mixologist with a vintage Porsche problem. He keeps the floor moving.",
    lines: ["Come through.", "One song, then the patio."],
  },
  {
    id: "m3",
    name: "Rafa",
    age: 36,
    zone: "P",
    c: 14,
    r: 2,
    tags: ["Hosting"],
    bio: "Architect, sailor, hopeless romantic. Patio side, not the speaker.",
    lines: ["Quieter out here.", "Door's a suggestion."],
  },
  {
    id: "m4",
    name: "Sven",
    age: 33,
    zone: "C",
    c: 3,
    r: 10,
    tags: ["Hosting"],
    bio: "Old-money taste, new-school energy. He holds the corner.",
    lines: ["Corner's taken. Ask.", "Low light, good."],
  },
  {
    id: "m5",
    name: "Kai",
    age: 29,
    zone: "D",
    c: 13,
    r: 7,
    tags: ["Right Now"],
    bio: "Bartender-philosopher. He makes the negroni and then he dances.",
    lines: ["Right now means now.", "Negroni's at the bar."],
  },
];

export function isWall(c, r) {
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return true;
  return GRID[r][c] === "#";
}

export function zoneAt(c, r) {
  if (isWall(c, r)) return null;
  return ZONE_LABEL[GRID[r][c]] || "Lounge";
}

export function tilesIn(zoneChar) {
  const tiles = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (GRID[r][c] === zoneChar) tiles.push({ c, r });
    }
  }
  return tiles;
}

function keyOf(c, r) {
  return `${c},${r}`;
}

function heuristic(a, b) {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
}

/** 4-direction path of tiles, including the start. Empty when unreachable. */
export function findPath(start, goal) {
  if (!start || !goal || isWall(start.c, start.r) || isWall(goal.c, goal.r)) return [];
  if (start.c === goal.c && start.r === goal.r) return [{ c: start.c, r: start.r }];
  const open = [{ c: start.c, r: start.r }];
  const openKeys = new Set([keyOf(start.c, start.r)]);
  const came = new Map();
  const gScore = new Map([[keyOf(start.c, start.r), 0]]);
  const fScore = new Map([[keyOf(start.c, start.r), heuristic(start, goal)]]);
  while (open.length) {
    open.sort((a, b) => fScore.get(keyOf(a.c, a.r)) - fScore.get(keyOf(b.c, b.r)));
    const current = open.shift();
    openKeys.delete(keyOf(current.c, current.r));
    if (current.c === goal.c && current.r === goal.r) {
      const path = [current];
      let cursor = keyOf(current.c, current.r);
      while (came.has(cursor)) {
        const prev = came.get(cursor);
        path.push(prev);
        cursor = keyOf(prev.c, prev.r);
      }
      path.reverse();
      return path;
    }
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = { c: current.c + dc, r: current.r + dr };
      if (isWall(next.c, next.r)) continue;
      const nextKey = keyOf(next.c, next.r);
      const score = gScore.get(keyOf(current.c, current.r)) + 1;
      if (score >= (gScore.get(nextKey) ?? Infinity)) continue;
      came.set(nextKey, current);
      gScore.set(nextKey, score);
      fScore.set(nextKey, score + heuristic(next, goal));
      if (!openKeys.has(nextKey)) {
        open.push(next);
        openKeys.add(nextKey);
      }
    }
  }
  return [];
}

export function tileOf(pos) {
  return { c: Math.floor(pos.x), r: Math.floor(pos.y) };
}

function fits(x, y) {
  const inset = 0.22;
  return [
    [x - inset, y - inset],
    [x + inset, y - inset],
    [x - inset, y + inset],
    [x + inset, y + inset],
  ].every(([px, py]) => !isWall(Math.floor(px), Math.floor(py)));
}

/** Slide by (dx, dy) tile units and stop at walls. */
export function moveFree(pos, dx, dy) {
  let x = pos.x + dx;
  let y = pos.y + dy;
  if (!fits(x, pos.y)) x = pos.x;
  if (!fits(x, y)) y = pos.y;
  return { x, y };
}

/**
 * Walk `dist` tile-units along a tile path. Positions are tile floats;
 * a tile's center is (c + 0.5, r + 0.5).
 */
export function advance(pos, path, dist) {
  let x = pos.x;
  let y = pos.y;
  const rest = path.slice();
  let left = dist;
  while (rest.length && left > 0) {
    const targetX = rest[0].c + 0.5;
    const targetY = rest[0].r + 0.5;
    const dx = targetX - x;
    const dy = targetY - y;
    const gap = Math.hypot(dx, dy);
    if (gap <= 0.04) {
      x = targetX;
      y = targetY;
      rest.shift();
      continue;
    }
    if (gap <= left) {
      x = targetX;
      y = targetY;
      left -= gap;
      rest.shift();
    } else {
      x += (dx / gap) * left;
      y += (dy / gap) * left;
      left = 0;
    }
  }
  return { pos: { x, y }, path: rest };
}

export function activeBubble(bubble, now) {
  if (!bubble || bubble.until <= now) return null;
  return bubble;
}

export function pickTile(tiles, rng) {
  if (!tiles.length) return null;
  const index = Math.min(tiles.length - 1, Math.floor(rng() * tiles.length));
  return tiles[index];
}
