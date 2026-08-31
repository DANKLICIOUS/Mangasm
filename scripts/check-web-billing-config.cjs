#!/usr/bin/env node
/**
 * Guard: /plus payment path must target the live Supabase project, never a
 * retired host. Also checks public-config.js never leaks service_role keys.
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { spawnSync } = require("child_process");

const LIVE = "dvomzrvslwdabwcwtvrg";
const RETIRED = [
  "hcpzbxplnkyythzwkovy",
  "zfwzrloxqqkkikedpruf",
  "pwmddvigardiyhqtihdw",
];

const root = path.join(__dirname, "..");
const plus = fs.readFileSync(path.join(root, "web/plus.html"), "utf8");
const revenue = fs.readFileSync(path.join(root, "web/admin/revenue.html"), "utf8");
const publicConfig = fs.readFileSync(path.join(root, "web/api/public-config.js"), "utf8");

function supabaseHosts(src) {
  return [...src.matchAll(/https:\/\/([a-z0-9]+)\.supabase\.co/g)].map((m) => m[1]);
}

for (const [name, src] of [
  ["web/plus.html", plus],
  ["web/admin/revenue.html", revenue],
  ["web/api/public-config.js", publicConfig],
]) {
  const hosts = supabaseHosts(src);
  const bad = hosts.filter((h) => RETIRED.includes(h));
  assert.deepStrictEqual(bad, [], `${name} still uses a retired Supabase URL host: ${bad.join(", ")}`);
  assert(hosts.includes(LIVE), `${name} must reference live project ${LIVE}`);
}

assert(
  plus.includes("${CONFIG.SUPABASE_URL}/functions/v1/stripe-checkout"),
  "plus.html must POST stripe-checkout on CONFIG.SUPABASE_URL",
);
assert(
  plus.includes(`LIVE_SUPABASE_URL = "https://${LIVE}.supabase.co"`),
  "plus.html must hardcode the live host as LIVE_SUPABASE_URL",
);
assert(
  /const EMBEDDED_ANON_KEY = ""/.test(plus),
  "plus.html must not embed a guessed anon key; leave EMBEDDED_ANON_KEY empty",
);

const handlerPath = path.join(root, "web/api/public-config.js");
const probe = `
const handler = require(${JSON.stringify(handlerPath)});
function run(env, method = "GET") {
  for (const k of [
    "SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","NEXT_PUBLIC_SUPABASE_URL",
  ]) delete process.env[k];
  Object.assign(process.env, env);
  let status = 0, body = "";
  const res = {
    setHeader() {},
    end(s) { if (s) body = s; },
    set statusCode(v) { status = v; },
    get statusCode() { return status; },
  };
  return Promise.resolve(handler({ method }, res)).then(() => ({ status, body: body ? JSON.parse(body) : {} }));
}
(async () => {
  const live = await run({});
  if (live.status !== 200) throw new Error("default GET should 200, got " + live.status);
  if (live.body.supabaseUrl !== "https://${LIVE}.supabase.co") throw new Error("default url " + live.body.supabaseUrl);
  if (live.body.supabaseAnonKey !== "") throw new Error("empty env must not invent a key");

  const retired = await run({ SUPABASE_URL: "https://hcpzbxplnkyythzwkovy.supabase.co" });
  if (retired.body.supabaseUrl !== "https://${LIVE}.supabase.co") throw new Error("retired url leaked");

  const payload = Buffer.from(JSON.stringify({ role: "service_role", ref: "${LIVE}" })).toString("base64url");
  const secretJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + payload + ".sig";
  const leaked = await run({ SUPABASE_ANON_KEY: secretJwt });
  if (leaked.body.supabaseAnonKey !== "") throw new Error("service_role jwt must be stripped");

  const pub = await run({ SUPABASE_PUBLISHABLE_KEY: "sb_publishable_testkey_not_real_but_long" });
  if (pub.body.supabaseAnonKey !== "sb_publishable_testkey_not_real_but_long") throw new Error("publishable key not passed through");
  console.log("public-config handler: OK");
})().catch((e) => { console.error(e); process.exit(1); });
`.replaceAll("${LIVE}", LIVE);

const r = spawnSync(process.execPath, ["-e", probe], { encoding: "utf8" });
if (r.status !== 0) {
  process.stderr.write(r.stdout + r.stderr);
  process.exit(r.status || 1);
}
process.stdout.write(r.stdout);
console.log("check-web-billing-config: OK");
