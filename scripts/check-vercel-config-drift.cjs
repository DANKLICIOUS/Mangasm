#!/usr/bin/env node
/**
 * Guard: root vercel.json is the deploy source of truth, but production still
 * serves a deploy built from web/vercel.json. Until that legacy copy is
 * retired, every route it declares must also exist in the root config, so a
 * redeploy from root can never drop a live URL.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const rootCfg = read("vercel.json");
const webCfg = read("web/vercel.json");

const key = (r) => JSON.stringify([r.source, r.destination, r.has ?? null]);
const missing = [];
for (const section of ["rewrites", "redirects", "headers"]) {
  const have = new Set((rootCfg[section] ?? []).map(key));
  for (const r of webCfg[section] ?? []) {
    if (!have.has(key(r))) missing.push(`${section}: ${r.source} -> ${r.destination ?? "(headers)"}`);
  }
}

if (missing.length) {
  console.error("Root vercel.json is missing entries present in web/vercel.json:");
  for (const m of missing) console.error("  " + m);
  process.exit(1);
}
console.log("check-vercel-config-drift: OK");
