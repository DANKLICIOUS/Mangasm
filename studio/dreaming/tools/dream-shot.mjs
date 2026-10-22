// Headless-Chrome screenshot driver for Recursive Dreaming (Node 22+, no dependencies).
//
//   node studio/dreaming/tools/dream-shot.mjs shots.json
//
// shots.json: [{ "url", "width", "height", "mobile"?, "reducedMotion"?, "clearStorage"?,
//   "steps": [ { "wait": ms } | { "click": "#selector" } | { "eval": "js", "log"?: true }
//            | { "scroll": "#selector", "offset"?: -20 } | { "shot": "/opt/cursor/artifacts/x.png", "full"?: true, "el"?: "#sel" } ] }]
// Prints console errors and warnings, uncaught exceptions and failed requests per page.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CHROME = process.env.CHROME || "/usr/local/bin/google-chrome";
const PORT = +(process.env.CDP_PORT || 9466);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-sandbox",
    "--user-data-dir=/tmp/chrome-dream",
    "--use-gl=swiftshader",
    "--enable-unsafe-swiftshader",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);

async function version() {
  for (let i = 0; i < 60; i++) {
    try {
      return await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    } catch {
      await sleep(200);
    }
  }
  throw new Error("chrome did not start");
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else listeners.forEach((l) => l(msg));
  };
  return new Promise((resolve) => {
    ws.onopen = () =>
      resolve({
        send: (method, params = {}, sessionId) =>
          new Promise((res, rej) => {
            const mid = ++id;
            pending.set(mid, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
          }),
        on: (fn) => listeners.push(fn),
        close: () => ws.close(),
      });
  });
}

const shots = JSON.parse(readFileSync(process.argv[2], "utf8"));
const { webSocketDebuggerUrl } = await version();
const cdp = await connect(webSocketDebuggerUrl);
let failures = 0;

for (const shot of shots) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p) => cdp.send(m, p, sessionId);
  const problems = [];
  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type))
      problems.push(`console.${msg.params.type}: ` + msg.params.args.map((a) => a.value ?? a.description).join(" "));
    if (msg.method === "Runtime.exceptionThrown") problems.push("exception: " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") problems.push("log: " + msg.params.entry.text + " " + (msg.params.entry.url || ""));
  });
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: shot.width, height: shot.height, deviceScaleFactor: shot.scale || 1, mobile: !!shot.mobile });
  if (shot.reducedMotion) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (shot.clearStorage) {
    // The dashboard saves its state on pagehide, so block that save before clearing.
    await send("Page.navigate", { url: shot.url });
    await sleep(800);
    await send("Runtime.evaluate", { expression: "Storage.prototype.setItem = function () {}; localStorage.clear()" });
  }
  await send("Page.navigate", { url: shot.url });
  await sleep(shot.settle ?? 1800);

  for (const step of shot.steps || []) {
    if (step.wait) await sleep(step.wait);
    if (step.click) {
      const r = await send("Runtime.evaluate", { expression: `(() => { const el = document.querySelector(${JSON.stringify(step.click)}); if (!el) return "missing"; el.click(); return "ok"; })()`, returnByValue: true });
      if (r.result.value !== "ok") problems.push("click target missing: " + step.click);
    }
    if (step.scroll) {
      await send("Runtime.evaluate", { expression: `(() => { const el = document.querySelector(${JSON.stringify(step.scroll)}); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + ${step.offset || 0}); })()` });
      await sleep(400);
    }
    if (step.eval) {
      const r = await send("Runtime.evaluate", { expression: step.eval, returnByValue: true, awaitPromise: true });
      if (step.log) console.log("  eval:", JSON.stringify(r.result.value ?? r.exceptionDetails?.text));
    }
    if (step.shot) {
      const params = { format: "png" };
      if (step.full) {
        const { cssContentSize } = await send("Page.getLayoutMetrics");
        params.captureBeyondViewport = true;
        params.clip = { x: 0, y: 0, width: shot.width, height: Math.ceil(cssContentSize.height), scale: 1 };
      }
      if (step.el) {
        const r = await send("Runtime.evaluate", { expression: `(() => { const b = document.querySelector(${JSON.stringify(step.el)}).getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`, returnByValue: true });
        const b = r.result.value;
        params.captureBeyondViewport = true;
        params.clip = { x: Math.max(0, b.x - 12), y: Math.max(0, b.y - 12), width: b.width + 24, height: b.height + 24, scale: 1 };
      }
      const { data } = await send("Page.captureScreenshot", params);
      writeFileSync(step.shot, Buffer.from(data, "base64"));
      console.log("  saved", step.shot);
    }
  }
  console.log(`${shot.url} @${shot.width}x${shot.height}${shot.reducedMotion ? " reduced-motion" : ""}: ${problems.length ? problems.length + " problem(s)" : "no console errors"}`);
  problems.forEach((p) => console.log("    " + p));
  failures += problems.length;
  await cdp.send("Target.closeTarget", { targetId });
}

cdp.close();
chrome.kill();
process.exit(failures ? 1 : 0);
