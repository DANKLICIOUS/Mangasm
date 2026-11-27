import assert from "node:assert/strict";
import test from "node:test";
import {
  COLS,
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
  tilesIn,
} from "./lounge-data.js";

test("the room is a closed, even grid", () => {
  assert.equal(GRID.length, ROWS);
  for (const row of GRID) assert.equal(row.length, COLS);
  assert.equal(isWall(0, 0), true);
  assert.equal(isWall(YOU_START.c, YOU_START.r), false);
});

test("every floor tile is reachable from the door", () => {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (isWall(c, r)) continue;
      const path = findPath(YOU_START, { c, r });
      assert.ok(path.length > 0, `${c},${r}`);
      assert.equal(
        path.some((tile) => isWall(tile.c, tile.r)),
        false
      );
    }
  }
});

test("seed personas stand on their zones and can be pathed to", () => {
  const names = OCCUPANTS.map((person) => person.name).sort();
  assert.deepEqual(names, ["Kai", "Marco", "Rafa", "Sven", "Theo"]);
  for (const person of OCCUPANTS) {
    assert.equal(isWall(person.c, person.r), false);
    assert.equal(GRID[person.r][person.c], person.zone);
    assert.ok(findPath(YOU_START, person).length > 1);
    assert.equal(Object.hasOwn(person, "hiv"), false);
  }
});

test("advance consumes a waypoint and moveFree stops at a wall", () => {
  const stepped = advance({ x: 1.5, y: 1.5 }, [{ c: 2, r: 1 }], 0.4);
  assert.ok(stepped.pos.x > 1.5);
  assert.equal(stepped.path.length, 1);
  const arrived = advance({ x: 2.2, y: 1.5 }, [{ c: 2, r: 1 }], 1);
  assert.equal(arrived.path.length, 0);
  assert.ok(Math.abs(arrived.pos.x - 2.5) < 0.01);

  const blocked = moveFree({ x: 1.5, y: 1.5 }, -2, 0);
  assert.ok(blocked.x > 1);
  assert.equal(isWall(Math.floor(blocked.x), Math.floor(blocked.y)), false);
});

test("bubbles expire and wander picks stay inside the zone", () => {
  assert.equal(activeBubble({ text: "hey", until: 10 }, 9).text, "hey");
  assert.equal(activeBubble({ text: "hey", until: 10 }, 10), null);
  const tiles = tilesIn("D");
  const pick = pickTile(tiles, () => 0);
  assert.equal(tiles[0].c, pick.c);
  assert.equal(
    pickTile([], () => 0.5),
    null
  );
});
