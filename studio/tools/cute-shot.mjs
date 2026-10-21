// Headless-Chrome screenshot driver for the cute landing page (Node 22+, no dependencies).
//
//   node studio/tools/cute-shot.mjs shots.json
//
// shots.json: [{ "url", "width", "height", "mobile"?, "reducedMotion"?, "noWebGL"?,
//   "steps": [ { "scroll": "#units", "offset": -90 } | { "move": [[x,y],...], "every": 40 }
//            | { "click": [x,y] } | { "clickSel": "#dash-replay" } | { "hoverSel": ".rh-col" } | { "eval": "js" }
//            | { "wait": ms } | { "shot": "/opt/cursor/artifacts/x.png" } ] }]
// Prints console errors/warnings, uncaught exceptions and CuteFX.status() per page.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CHROME = process.env.CHROME || "/usr/local/bin/google-chrome";
const PORT = +(process.env.CDP_PORT || 9444);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-sandbox",
    "--user-data-dir=/tmp/chrome-cute",
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
            setTimeout(() => {
              if (pending.has(mid)) {
                pending.delete(mid);
                rej(new Error(`timeout: ${method}`));
              }
            }, 90000);
          }),
        on: (fn) => listeners.push(fn),
        close: () => ws.close(),
      });
  });
}

const shots = JSON.parse(readFileSync(process.argv[2], "utf8"));
const v = await version();
const cdp = await connect(v.webSocketDebuggerUrl);
const report = [];

try {
  for (const shot of shots) {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId: s } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (m, p) => cdp.send(m, p, s);
    const logs = [];
    cdp.on((msg) => {
      if (msg.sessionId !== s) return;
      if (msg.method === "Runtime.consoleAPICalled" && /error|warn/.test(msg.params.type))
        logs.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(" ")}`);
      if (msg.method === "Runtime.exceptionThrown")
        logs.push(`exception: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
      if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error")
        logs.push(`log: ${msg.params.entry.text} ${msg.params.entry.url || ""}`);
    });
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: shot.width,
      height: shot.height,
      deviceScaleFactor: shot.dpr || 1,
      mobile: !!shot.mobile,
    });
    if (shot.mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    if (shot.reducedMotion)
      await send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "reduce" }],
      });
    if (shot.noWebGL)
      await send("Page.addScriptToEvaluateOnNewDocument", {
        source:
          "const _gc=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:_gc.call(this,t,...a)};",
      });
    await send("Page.navigate", { url: shot.url });
    const evaluate = async (expr) =>
      (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result
        .value;
    for (let i = 0; i < 100; i++) {
      if (await evaluate("document.body && document.body.classList.contains('ready')")) break;
      await sleep(150);
    }
    await evaluate("document.fonts.ready.then(()=>1)");
    await evaluate("document.documentElement.style.scrollBehavior='auto';1");
    await sleep(shot.settle ?? 800);
    for (const st of shot.steps || []) {
      if (st.scroll) {
        await evaluate(
          `(()=>{const e=document.querySelector(${JSON.stringify(st.scroll)});scrollTo(0,e.getBoundingClientRect().top+scrollY+${st.offset || 0});return 1})()`
        );
        await sleep(st.after ?? 900);
      }
      if (st.move) {
        for (const [x, y] of st.move) {
          await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
          await sleep(st.every ?? 40);
        }
      }
      if (st.click) {
        const [x, y] = st.click;
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
      }
      if (st.clickSel || st.hoverSel) {
        const [x, y] = await evaluate(
          `(()=>{const r=document.querySelector(${JSON.stringify(st.clickSel || st.hoverSel)}).getBoundingClientRect();return [r.left+r.width/2,r.bottom-24]})()`
        );
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      }
      if (st.clickSel) {
        const [x, y] = await evaluate(
          `(()=>{const r=document.querySelector(${JSON.stringify(st.clickSel)}).getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`
        );
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
      }
      if (st.eval) await evaluate(st.eval);
      if (st.wait) await sleep(st.wait);
      if (st.shot) {
        const { data } = await send("Page.captureScreenshot", { format: "png" });
        writeFileSync(st.shot, Buffer.from(data, "base64"));
        console.log("saved", st.shot);
      }
    }
    const status = await evaluate("JSON.stringify(window.CuteFX && CuteFX.status())");
    report.push({ url: shot.url, width: shot.width, status, logs });
    await cdp.send("Target.closeTarget", { targetId });
  }
} finally {
  console.log(JSON.stringify(report, null, 2));
  cdp.close();
  chrome.kill();
}
