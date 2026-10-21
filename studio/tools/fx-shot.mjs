// Headless-Chrome driver for OvernightFX visual checks (Node 22+, no dependencies).
//
//   node studio/tools/fx-shot.mjs shots.json
//
// shots.json: [{ "url": "...", "out": "/opt/cursor/artifacts/fx-x.png", "width": 1440, "height": 900,
//   "waitReady": true, "reducedMotion": false, "noWebGL": false,
//   "steps": [ { "scroll": "#backstage", "offset": -80 }, { "move": [[x,y], ...], "every": 60 },
//              { "eval": "js" }, { "wait": 1500 } ], "clip": { "x": 0, "y": 0, "width": 400, "height": 300, "scale": 2 } }]
// Prints console errors/warnings and OvernightFX stats per shot.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const CHROME = process.env.CHROME || "/usr/local/bin/google-chrome";
const PORT = 9300 + Math.floor(Math.random() * 500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-sandbox",
    "--user-data-dir=/tmp/chrome-fx",
    "--use-gl=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);

async function version() {
  for (let i = 0; i < 50; i++) {
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
            const m = { id: ++id, method, params };
            if (sessionId) m.sessionId = sessionId;
            pending.set(m.id, { resolve: res, reject: rej });
            ws.send(JSON.stringify(m));
          }),
        on: (fn) => listeners.push(fn),
        close: () => ws.close(),
      });
  });
}

const NO_WEBGL = `(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (/webgl/i.test(type)) return null;
    return orig.call(this, type, ...rest);
  };
})();`;

async function shoot(cdp, shot) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => cdp.send(m, p, sessionId);
  const logs = [];
  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning", "warn"].includes(msg.params.type))
      logs.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
    if (msg.method === "Runtime.exceptionThrown")
      logs.push(`exception: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error")
      logs.push(`log: ${msg.params.entry.text} ${msg.params.entry.url || ""}`);
  });
  await s("Runtime.enable");
  await s("Log.enable");
  await s("Page.enable");
  const width = shot.width || 1440,
    height = shot.height || 900;
  await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  if (shot.reducedMotion)
    await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (shot.noWebGL) await s("Page.addScriptToEvaluateOnNewDocument", { source: NO_WEBGL });
  const evaluate = async (expression) =>
    (await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
  await s("Page.navigate", { url: shot.url });
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const ok = await evaluate(
      shot.waitReady
        ? "document.readyState === 'complete' && document.body.classList.contains('ready')"
        : "document.readyState === 'complete'"
    ).catch(() => false);
    if (ok) break;
    await sleep(250);
  }
  for (const step of shot.steps || []) {
    if (step.scroll !== undefined) {
      await evaluate(`(() => {
        const t = ${JSON.stringify(step.scroll)};
        const y = typeof t === "number" ? t : document.querySelector(t).getBoundingClientRect().top + scrollY;
        window.scrollTo({ top: y + ${step.offset || 0}, behavior: "instant" });
      })()`);
    }
    if (step.move) {
      for (const [x, y] of step.move) {
        await s("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await sleep(step.every || 50);
      }
    }
    if (step.eval) await evaluate(step.eval);
    if (step.wait) await sleep(step.wait);
  }
  await sleep(shot.settle ?? 800);
  const stats = await evaluate(`JSON.stringify(window.OvernightFX ? {
    supported: OvernightFX.supported, contexts: OvernightFX.contexts,
    fx: OvernightFX.instances.map(h => h.effect), frames: OvernightFX.stats.frames,
    textLive: !!document.querySelector('.ofx-text-live') } : null)`);
  const { data } = await s("Page.captureScreenshot", {
    format: "png",
    ...(shot.clip ? { clip: { scale: 1, ...shot.clip } } : {}),
  });
  const { writeFileSync } = await import("node:fs");
  writeFileSync(shot.out, Buffer.from(data, "base64"));
  console.log(`\n${shot.out}\n  stats: ${stats}`);
  logs.forEach((l) => console.log("  " + l));
  await cdp.send("Target.closeTarget", { targetId });
}

try {
  const shots = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const { webSocketDebuggerUrl } = await version();
  const cdp = await connect(webSocketDebuggerUrl);
  for (const shot of shots) await shoot(cdp, shot);
  cdp.close();
} finally {
  chrome.kill();
}
