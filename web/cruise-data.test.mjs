import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVITY,
  CLUSTER_RADIUS_PX,
  MAP_H,
  MAP_W,
  PRIVACY_CELL_PX,
  SEED_CHATS,
  SEED_PINS,
  YOU_PROFILE,
  clusterPins,
  escapeHTML,
  filterPins,
  formatDistance,
  fuzzPoint,
  isAdult,
  parseISODate,
  presenceTags,
  repTier,
} from "./cruise-data.js";

const NOW = new Date(Date.UTC(2026, 10, 27, 12, 0, 0));

test("age gate matches the 18th-birthday rule", () => {
  assert.equal(isAdult(parseISODate("2008-11-27"), NOW), true);
  assert.equal(isAdult(parseISODate("2008-11-26"), NOW), true);
  assert.equal(isAdult(parseISODate("2008-11-28"), NOW), false);
  assert.equal(isAdult(parseISODate("2027-01-01"), NOW), false);
  assert.equal(isAdult(parseISODate("1990-06-15"), NOW), true);
  assert.equal(parseISODate("2008-02-31"), null);
  assert.equal(isAdult(null, NOW), false);
});

test("distance labels stay coarse", () => {
  assert.equal(formatDistance(400), "400 m");
  assert.equal(formatDistance(960), "1.0 km");
  assert.equal(formatDistance(1200), "1.2 km");
  assert.equal(formatDistance(4600), "4.6 km");
  assert.equal(formatDistance(15000), "15 km");
});

test("reputation tiers match the app scale", () => {
  assert.equal(repTier(YOU_PROFILE.rep), "Veteran");
  assert.equal(repTier(88), "Elite");
  assert.equal(repTier(19), "New");
  assert.equal(repTier(96), "Legend");
});

test("fuzz snaps to a 500m cell and never returns the raw point", () => {
  assert.equal(PRIVACY_CELL_PX, 60);
  const origin = fuzzPoint(0, 0);
  assert.deepEqual(origin, { x: 30, y: 30 });
  const edge = fuzzPoint(59.9, 119);
  assert.deepEqual(edge, { x: 30, y: 90 });
  assert.deepEqual(fuzzPoint(120, 120), { x: 150, y: 150 });
  const raw = { x: 1081, y: 762 };
  const fuzzed = fuzzPoint(raw.x, raw.y);
  assert.notDeepEqual(fuzzed, raw);
});

test("filters OR presence pills and always honor distance", () => {
  const pins = [
    { id: "a", kind: "person", distanceM: 400, rightNow: true, hosting: true },
    { id: "b", kind: "person", distanceM: 1800, traveling: true },
    { id: "c", kind: "event", distanceM: 900 },
    { id: "d", kind: "group", distanceM: 6000 },
    { id: "e", kind: "spot", distanceM: 500 },
    { id: "f", kind: "person", distanceM: 200, hidden: true, rightNow: true },
  ];
  assert.deepEqual(
    filterPins(pins, { maxDistanceM: 5000 }).map((pin) => pin.id),
    ["a", "b", "c", "e"]
  );
  assert.deepEqual(
    filterPins(pins, { rightNow: true, maxDistanceM: 15000 }).map((pin) => pin.id),
    ["a"]
  );
  assert.deepEqual(
    filterPins(pins, { events: true, groups: true, maxDistanceM: 15000 }).map((pin) => pin.id),
    ["c", "d", "e"]
  );
  assert.deepEqual(
    filterPins(pins, { hosting: true, traveling: true }).map((pin) => pin.id),
    ["a", "b"]
  );
  assert.deepEqual(
    filterPins(pins, { maxDistanceM: 1000 }).map((pin) => pin.id),
    ["a", "c", "e"]
  );
});

test("clusters only pins inside the radius", () => {
  const pins = [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 10, y: 0 },
    { id: "c", x: 200, y: 0 },
  ];
  const clustered = clusterPins(pins, 34);
  assert.equal(clustered.length, 2);
  const blob = clustered.find((item) => item.type === "cluster");
  assert.ok(blob);
  assert.deepEqual(blob.pins.map((pin) => pin.id).sort(), ["a", "b"]);
  assert.equal(
    clusterPins(pins, 0).every((item) => item.type === "pin"),
    true
  );
});

test("seed is an adult privacy-zone chart with one palm hotspot", () => {
  const ids = new Set(SEED_PINS.map((pin) => pin.id));
  assert.equal(ids.size, SEED_PINS.length);
  assert.ok(SEED_PINS.length >= 20);

  for (const pin of SEED_PINS) {
    assert.equal(Object.hasOwn(pin, "hiv"), false);
    assert.equal(Object.hasOwn(pin, "health"), false);
    assert.equal(Object.hasOwn(pin, "into"), false);
    assert.ok(pin.x > 40 && pin.x < MAP_W - 40, pin.id);
    assert.ok(pin.y > 40 && pin.y < MAP_H - 40, pin.id);
    if (pin.kind === "person") {
      assert.ok(pin.age >= 24, pin.name);
      assert.ok(["Top", "Vers", "Bottom"].includes(pin.position));
    }
  }

  const serialized = JSON.stringify(SEED_PINS).toLowerCase();
  assert.equal(serialized.includes("hiv"), false);

  const kinds = new Set(SEED_PINS.map((pin) => pin.kind));
  assert.ok(kinds.has("person") && kinds.has("event") && kinds.has("group") && kinds.has("spot"));
  assert.ok(SEED_PINS.filter((pin) => pin.rightNow).length >= 5);

  const zoomedOut = clusterPins(SEED_PINS, CLUSTER_RADIUS_PX);
  const clusters = zoomedOut.filter((item) => item.type === "cluster");
  assert.equal(
    clusters.length,
    1,
    JSON.stringify(clusters.map((item) => item.pins.map((pin) => pin.id)))
  );
  const hotspot = clusters[0].pins.map((pin) => pin.id).sort();
  assert.deepEqual(hotspot, ["e2", "m13", "m4"]);

  const zoomedIn = clusterPins(SEED_PINS, 0);
  assert.equal(zoomedIn.length, SEED_PINS.length);

  const near = filterPins(SEED_PINS, { maxDistanceM: 1000 }).map((pin) => pin.id);
  assert.ok(near.includes("m1"));
  assert.equal(near.includes("m5"), false);
  assert.equal(near.includes("m14"), false);

  const five = filterPins(SEED_PINS, { maxDistanceM: 5000 });
  assert.equal(
    five.some((pin) => pin.id === "m5"),
    true
  );
  assert.equal(
    five.some((pin) => pin.id === "m14"),
    false
  );

  assert.equal(presenceTags(SEED_PINS.find((pin) => pin.id === "m1")).includes("Right Now"), true);
  assert.equal(presenceTags(SEED_PINS.find((pin) => pin.id === "m1")).includes("Hosting"), true);
});

test("chats point at real people and activity is non-empty", () => {
  for (const chat of SEED_CHATS) {
    assert.ok(SEED_PINS.some((pin) => pin.id === chat.personId));
    assert.ok(chat.messages.length >= 1);
  }
  assert.ok(ACTIVITY.length >= 4);
});

test("escapeHTML neutralizes dropped-pin text", () => {
  assert.equal(
    escapeHTML(`<img alt="x" onload='alert(1)'>&`),
    "&lt;img alt=&quot;x&quot; onload=&#39;alert(1)&#39;&gt;&amp;"
  );
});
