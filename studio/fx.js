/*
 * OvernightFX — dependency-free, Unicorn-Studio-style WebGL effects.
 *
 * Every effect renders through ONE shared WebGL context (an offscreen canvas) and is copied
 * into its own 2D canvas, so a page with any number of effects holds a single live context.
 * Instances init lazily on first intersection, pause offscreen and while the tab is hidden,
 * cap DPR, and respect prefers-reduced-motion. Without WebGL nothing is mounted.
 *
 *   OvernightFX.mount(el, { effect: "liquid", palette: "ganesh.guru", intensity: 0.8 })
 *   <section data-fx="aurora" data-fx-intensity="0.7">
 *   <script src="fx.js" data-site="ganesh.guru" defer></script>
 *   ?fx=off · ?fx=liquid,grain · ?fx=-grain
 */
(() => {
  if (window.OvernightFX) return;

  const script = document.currentScript;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const warn = (...a) => console.warn("[OvernightFX]", ...a);

  /* ---------------- toggles: ?fx= and data-fx-disable ---------------- */
  const fxParam = (new URLSearchParams(location.search).get("fx") || "").trim().toLowerCase();
  const disabledAttr = [script?.dataset.fxDisable, document.documentElement.dataset.fxDisable]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  const allowed = (name) => {
    if (disabledAttr.includes(name) || (disabledAttr.includes("all") && name !== "ice")) return false;
    if (!fxParam) return true;
    // the ice scene is the page background, not an add-on: only "-ice" turns it off
    if (name === "ice") return !fxParam.split(",").includes("-ice");
    if (["off", "0", "none", "false"].includes(fxParam)) return false;
    const list = fxParam.split(",").map((s) => s.trim());
    if (list.includes("-" + name)) return false;
    const positives = list.filter((s) => s && s[0] !== "-");
    return positives.length ? positives.includes(name) : true;
  };

  /* ---------------- palette ---------------- */
  const DEFAULT_PALETTE = {
    bg: "#0b0d12",
    ink: "#e1e6f1",
    a: "#d1e3ff",
    b: "#7f9cff",
    c: "#8ff0c3",
  };
  const hex = (h) => {
    h = String(h || "#000").replace("#", "");
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const themes = () => window.OvernightFXThemes || {};
  const resolvePalette = (p) => {
    if (typeof p === "string") p = themes()[p]?.palette;
    return { ...DEFAULT_PALETTE, ...(defaultTheme?.palette || {}), ...(p || {}) };
  };
  let defaultTheme = null;

  /* ---------------- shared GL renderer ---------------- */
  const VERT =
    "attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";
  const HEAD = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    varying vec2 vUv;
    uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uI;
    uniform vec3 uBg, uInk, uA, uB, uC;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
      return v;
    }
  `;

  let R; // undefined: not tried, false: unsupported, object: renderer
  function renderer() {
    if (R !== undefined) return R;
    R = false;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
      if (!gl) return R;
      R = { canvas, gl, programs: new Map(), lost: false, w: 1, h: 1 };
      initGL(R);
      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        R.lost = true;
      });
      canvas.addEventListener("webglcontextrestored", () => {
        R.lost = false;
        R.programs.clear();
        initGL(R);
        instances.forEach((inst) => (inst.ready = false));
        schedule();
      });
    } catch (err) {
      warn("WebGL unavailable", err);
      R = false;
    }
    return R;
  }
  function initGL(r) {
    const gl = r.gl;
    r.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, r.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  }
  function program(src) {
    const r = R;
    if (r.programs.has(src)) return r.programs.get(src);
    const gl = r.gl;
    const sh = (type, s) => {
      const o = gl.createShader(type);
      gl.shaderSource(o, s);
      gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
      return o;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, HEAD + src));
    gl.bindAttribLocation(p, 0, "p");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const prog = { p, loc: {} };
    r.programs.set(src, prog);
    return prog;
  }
  function use(prog, inst, extra = {}) {
    const gl = R.gl;
    gl.useProgram(prog.p);
    const set = (name, v) => {
      let l = prog.loc[name];
      if (l === undefined) l = prog.loc[name] = gl.getUniformLocation(prog.p, name);
      if (l === null) return;
      if (typeof v === "number") gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
      else if (v.tex) gl.uniform1i(l, v.unit);
    };
    const pal = inst.pal;
    set("uRes", [inst.w, inst.h]);
    set("uTime", inst.time);
    set("uMouse", [inst.mx, inst.my]);
    set("uI", inst.intensity);
    set("uBg", pal.bg);
    set("uInk", pal.ink);
    set("uA", pal.a);
    set("uB", pal.b);
    set("uC", pal.c);
    for (const k in extra) {
      const v = extra[k];
      if (v && v.texture) {
        gl.activeTexture(gl.TEXTURE0 + v.unit);
        gl.bindTexture(gl.TEXTURE_2D, v.texture);
        set(k, { tex: true, unit: v.unit });
      } else set(k, v);
    }
  }
  const draw = () => R.gl.drawArrays(R.gl.TRIANGLES, 0, 3);
  function texture(w, h, data = null) {
    const gl = R.gl;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (data instanceof HTMLCanvasElement) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return t;
  }
  function target(w, h) {
    const gl = R.gl;
    const tex = texture(w, h);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fb, w, h };
  }
  function freeTarget(t) {
    if (!t || !R || R.lost) return;
    R.gl.deleteTexture(t.tex);
    R.gl.deleteFramebuffer(t.fb);
  }

  /* ---------------- effects ---------------- */
  const EFFECTS = {};

  /* 0 · ice — the original Voronoi ice with chromatic dispersion near the cursor. */
  EFFECTS.ice = {
    layer: "canvas",
    reduced: "static",
    opaque: true,
    scroll: true,
    frag: `
      uniform float uScroll, uZoom;
      vec2 hash2(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }
      vec3 voro(vec2 x) {
        vec2 n = floor(x), f = fract(x);
        float m1 = 8.0, m2 = 8.0; vec2 id = n;
        for (int j = -1; j <= 1; j++)
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          o = 0.5 + 0.5 * sin(uTime * 0.18 + 6.2831 * o);
          vec2 r = g + o - f;
          float d = dot(r, r);
          if (d < m1) { m2 = m1; m1 = d; id = n + g; } else if (d < m2) { m2 = d; }
        }
        return vec3(sqrt(m1), sqrt(m2) - sqrt(m1), hash2(id).x);
      }
      float facet(vec2 uv, float lift) {
        vec3 v = voro(uv * uZoom);
        float edge = 1.0 - smoothstep(0.0, 0.04 + lift * 0.05, v.y);
        float body = 0.28 + 0.42 * v.z;
        float fres = pow(clamp(v.x, 0.0, 1.0), 1.6);
        return body * 0.6 + edge * (0.55 + lift * 0.9) + fres * 0.22 + lift * 0.18;
      }
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
        vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
        uv.y += uScroll * 0.9;
        vec2 mm = m + vec2(0.0, uScroll * 0.9);
        float md = length(uv - mm);
        float lift = exp(-md * md * 9.0);
        vec2 dir = normalize(uv - mm + 1e-4);
        vec2 off = dir * (0.003 + lift * 0.012);
        vec3 col = vec3(facet(uv + off, lift), facet(uv, lift), facet(uv - off, lift));
        col = mix(uBg, uA, col * 0.55);
        float vig = smoothstep(1.25, 0.2, length(uv - vec2(0.0, uScroll * 0.9)));
        col *= 0.55 + 0.45 * vig;
        col = mix(col, uBg, clamp(uScroll * 0.55, 0.0, 0.78));
        gl_FragColor = vec4(col, 1.0);
      }`,
    init(inst) {
      inst.prog = program(this.frag);
      inst.scroll = 0;
      inst.smx = inst.smy = null;
    },
    frame(inst) {
      const o = inst.opts;
      if (inst.smx === null || inst.w !== inst.lastW) {
        inst.smx = inst.w * 0.78;
        inst.smy = inst.h * 0.62;
        inst.lastW = inst.w;
      }
      const follow = o.scrollLinked || inst.pointerInside;
      const k = inst.static ? 1 : 0.08;
      if (follow && inst.hasPointer) {
        inst.smx += (inst.mx - inst.smx) * k;
        inst.smy += (inst.my - inst.smy) * k;
      }
      if (o.scrollLinked) inst.scroll += (scrollY / innerHeight - inst.scroll) * k;
      const mx = inst.mx,
        my = inst.my;
      inst.mx = inst.smx;
      inst.my = inst.smy;
      use(inst.prog, inst, { uScroll: inst.scroll, uZoom: o.zoom || 2.6 });
      inst.mx = mx;
      inst.my = my;
      draw();
    },
  };

  /* 1 · liquid — ping-pong trail FBO advected by its own velocity, rendered as refractive,
     iridescent caustics. A ghost cursor keeps it alive when nobody is pointing. */
  EFFECTS.liquid = {
    layer: "under",
    reduced: "skip",
    scale: 0.6,
    sim: `
      uniform sampler2D uPrev; uniform vec2 uSim, uPt, uPtPrev; uniform float uForce;
      void main() {
        vec2 uv = vUv, px = 1.0 / uSim;
        vec2 vel = texture2D(uPrev, uv).gb * 2.0 - 1.0;
        vec4 a = texture2D(uPrev, uv - vel * px * 2.5);
        float blur = 0.25 * (texture2D(uPrev, uv + vec2(px.x, 0.0)).r + texture2D(uPrev, uv - vec2(px.x, 0.0)).r
                           + texture2D(uPrev, uv + vec2(0.0, px.y)).r + texture2D(uPrev, uv - vec2(0.0, px.y)).r);
        float f = mix(a.r, blur, 0.3);
        f = max(f * 0.968 - 0.003, 0.0);
        vec2 v = (a.gb * 2.0 - 1.0) * 0.96;
        float asp = uSim.x / uSim.y;
        vec2 p = vec2(uv.x * asp, uv.y), a0 = vec2(uPtPrev.x * asp, uPtPrev.y), b0 = vec2(uPt.x * asp, uPt.y);
        vec2 ba = b0 - a0;
        float h = clamp(dot(p - a0, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
        float d = length(p - a0 - ba * h);
        float sp = exp(-d * d / 0.0035) * uForce;
        f = min(f + sp * 0.5, 1.0);
        vec2 dir = ba / max(length(ba), 1e-4);
        v = mix(v, dir * min(length(ba) * 40.0, 1.0), clamp(sp, 0.0, 1.0) * 0.8);
        gl_FragColor = vec4(f, v * 0.5 + 0.5, 1.0);
      }`,
    frag: `
      uniform sampler2D uTrail; uniform vec2 uSim;
      void main() {
        vec2 uv = vUv, px = 1.5 / uSim;
        float f = texture2D(uTrail, uv).r;
        vec2 n = vec2(texture2D(uTrail, uv + vec2(px.x, 0.0)).r - texture2D(uTrail, uv - vec2(px.x, 0.0)).r,
                      texture2D(uTrail, uv + vec2(0.0, px.y)).r - texture2D(uTrail, uv - vec2(0.0, px.y)).r);
        float asp = uRes.x / uRes.y;
        vec2 q = vec2(uv.x * asp, uv.y) * 3.2;
        vec2 w = q + n * 7.0 + vec2(fbm(q + uTime * 0.15), fbm(q - uTime * 0.12 + 3.0)) * 1.3;
        float c = fbm(w * 1.5 + uTime * 0.1);
        float caust = pow(1.0 - abs(c * 2.0 - 1.0), 7.0);
        float edge = smoothstep(0.015, 0.3, f);
        vec3 film = mix(uA, uB, 0.5 + 0.5 * sin(f * 10.0 + c * 5.0 + uTime * 0.6));
        film = mix(film, uC, 0.35 + 0.35 * sin(f * 6.0 - uTime * 0.4 + 2.0));
        vec3 nrm = normalize(vec3(-n * 16.0, 1.0));
        float spec = pow(max(dot(nrm, normalize(vec3(0.45, 0.6, 1.0))), 0.0), 30.0);
        float rim = smoothstep(0.0, 0.25, length(n) * 8.0);
        vec3 col = film * edge * (0.1 + caust * 1.1 + rim * 0.4) + uInk * spec * edge * 0.9;
        col *= uI;
        gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0));
      }`,
    init(inst) {
      inst.simProg = program(this.sim);
      inst.prog = program(this.frag);
      inst.pt = inst.ptPrev = null;
    },
    resize(inst) {
      freeTarget(inst.ta);
      freeTarget(inst.tb);
      const sw = Math.max(48, Math.round(inst.w * 0.35)),
        sh = Math.max(48, Math.round(inst.h * 0.35));
      inst.ta = target(sw, sh);
      inst.tb = target(sw, sh);
    },
    destroy(inst) {
      freeTarget(inst.ta);
      freeTarget(inst.tb);
    },
    frame(inst) {
      const gl = R.gl;
      const idle = now() - lastPointerAt > 2500 || !inst.pointerInside;
      if (idle !== inst.wasIdle) inst.pt = null;
      inst.wasIdle = idle;
      let pt, force;
      if (idle && inst.opts.ghost !== false) {
        const t = inst.time;
        pt = [0.62 + 0.3 * Math.sin(t * 0.55), 0.52 + 0.3 * Math.sin(t * 0.9 + 1.2)];
        force = 0.55;
      } else if (!idle) {
        pt = [inst.mx / inst.w, inst.my / inst.h];
        const prev = inst.pt || pt;
        const speed = Math.hypot((pt[0] - prev[0]) * inst.w, (pt[1] - prev[1]) * inst.h);
        force = Math.min(1, 0.25 + speed / 40);
      } else {
        pt = inst.pt || [0.5, 0.5];
        force = 0;
      }
      inst.ptPrev = inst.pt || pt;
      inst.pt = pt;
      const { ta, tb } = inst;
      gl.bindFramebuffer(gl.FRAMEBUFFER, tb.fb);
      gl.viewport(0, 0, tb.w, tb.h);
      use(inst.simProg, inst, {
        uPrev: { texture: ta.tex, unit: 0 },
        uSim: [ta.w, ta.h],
        uPt: pt,
        uPtPrev: inst.ptPrev,
        uForce: force,
      });
      draw();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, inst.w, inst.h);
      use(inst.prog, inst, { uTrail: { texture: tb.tex, unit: 0 }, uSim: [tb.w, tb.h] });
      draw();
      inst.ta = tb;
      inst.tb = ta;
    },
  };

  /* 2 · text — the element's own text is rasterised to a texture and re-drawn with RGB split,
     wave displacement and slice glitches that follow the pointer. The DOM text stays in place
     (transparent) so it is still selectable and read by assistive tech. */
  EFFECTS.text = {
    layer: "over",
    reduced: "skip",
    pad: 48,
    fps: 40,
    frag: `
      uniform sampler2D uTex; uniform float uHover, uPulse;
      void main() {
        vec2 uv = vUv, fc = gl_FragCoord.xy;
        float d = length(fc - uMouse) / uRes.y;
        float k = exp(-d * d * 6.0) * uHover;
        float band = floor(uv.y * 26.0);
        float g = step(0.78, hash(vec2(band, floor(uTime * 14.0)))) * uPulse;
        float amt = k + g * 0.7;
        vec2 wave = vec2(sin(uv.y * 70.0 + uTime * 7.0) * 0.006 * k, 0.0);
        vec2 slice = vec2((hash(vec2(band, floor(uTime * 20.0))) - 0.5) * 0.06 * g, 0.0);
        vec2 dir = normalize(fc - uMouse + 0.001);
        vec2 off = vec2(0.010, 0.002) * amt + dir * 0.006 * k;
        vec2 st = uv + wave + slice;
        vec4 r = texture2D(uTex, st + off);
        vec4 m = texture2D(uTex, st);
        vec4 b = texture2D(uTex, st - off);
        float a = max(max(r.a, m.a), b.a);
        vec3 col = vec3(r.r, m.g, b.b);
        gl_FragColor = vec4(col, a) * uI + m * (1.0 - uI);
      }`,
    async init(inst) {
      inst.prog = program(this.frag);
      inst.hover = 0;
      inst.pulse = 0;
      inst.waiting = true;
      await waitStill(inst.el);
      if (inst.dead) return;
      inst.waiting = false;
      inst.ro = new ResizeObserver(() => (inst.needsRaster = true));
      inst.ro.observe(inst.el);
      // typewriter / scramble scripts change the text without changing the box
      inst.mo = new MutationObserver((list) => {
        if (list.some((m) => m.target !== inst.canvas)) inst.needsRaster = true;
      });
      inst.mo.observe(inst.el, { subtree: true, childList: true, characterData: true });
      inst.needsRaster = true;
    },
    destroy(inst) {
      inst.ro?.disconnect();
      inst.mo?.disconnect();
      inst.el.classList.remove("ofx-text-live");
      if (inst.tex && R && !R.lost) R.gl.deleteTexture(inst.tex);
    },
    frame(inst) {
      if (inst.waiting) return false;
      if (inst.needsRaster || inst.rasterW !== inst.w || inst.rasterH !== inst.h) {
        const src = rasterizeText(inst.el, inst.pad, inst.w, inst.h);
        if (!src) return false;
        if (inst.tex) R.gl.deleteTexture(inst.tex);
        inst.tex = texture(0, 0, src);
        inst.rasterW = inst.w;
        inst.rasterH = inst.h;
        inst.needsRaster = false;
      }
      const near = inst.pointerNear(80);
      inst.hover += ((near ? 1 : 0) - inst.hover) * 0.12;
      const cycle = (inst.time % 6.5) / 6.5;
      inst.pulse = cycle > 0.9 ? Math.sin(((cycle - 0.9) / 0.1) * Math.PI) : 0;
      use(inst.prog, inst, { uTex: { texture: inst.tex, unit: 0 }, uHover: inst.hover, uPulse: inst.pulse });
      draw();
      return true;
    },
    afterDraw(inst) {
      if (!inst.el.classList.contains("ofx-text-live")) inst.el.classList.add("ofx-text-live");
    },
  };

  /* 3 · grain — animated film grain + Bayer-dithered vignette + faint scanlines, fixed over
     the viewport at half resolution (pixelated) for a print/CRT texture. */
  EFFECTS.grain = {
    layer: "fixed",
    reduced: "static",
    scale: 0.5,
    fps: 24,
    frag: `
      float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
      float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
      void main() {
        vec2 fc = gl_FragCoord.xy, uv = fc / uRes;
        float t = floor(uTime * 24.0);
        float g = hash(fc + vec2(t * 13.17, t * 7.73)) - 0.5;
        float v = length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0));
        float dark = smoothstep(0.62, 1.25, v);
        float dith = step(bayer8(fc), dark * 0.85);
        float scan = step(0.5, fract(fc.y * 0.5)) * 0.035;
        float lightA = max(g, 0.0) * 2.0 * 0.10 * uI;
        float darkA = max(-g, 0.0) * 2.0 * 0.10 * uI + dith * 0.32 * uI + scan * uI;
        float a = clamp(lightA + darkA, 0.0, 1.0);
        gl_FragColor = vec4(uInk * lightA, a);
      }`,
    init(inst) {
      inst.prog = program(this.frag);
    },
    frame(inst) {
      use(inst.prog, inst);
      draw();
    },
  };

  /* 4 · dissolve — scroll-driven pixel/noise dissolve. Blocks of the page background cover the
     element and burn away along an fbm front with a glowing, flickering edge as it scrolls in. */
  EFFECTS.dissolve = {
    layer: "over",
    reduced: "skip",
    fps: 40,
    frag: `
      uniform float uP, uCell;
      void main() {
        vec2 fc = gl_FragCoord.xy;
        vec2 cell = floor(fc / uCell);
        vec2 cuv = cell * uCell / uRes.y;
        float n = clamp((fbm(cuv * 2.6 + 7.0) * 0.8 + hash(cell) * 0.2 - 0.2) / 0.62, 0.0, 1.0);
        float th = mix(-0.1, 1.1, uP);
        float e = n - th;
        float covered = step(0.0, e);
        float edge = 1.0 - smoothstep(0.0, 0.09, abs(e));
        vec2 f = fract(fc / uCell);
        float sq = step(0.1, f.x) * step(0.1, f.y);
        float flick = 0.55 + 0.45 * hash(cell + floor(uTime * 12.0));
        vec3 glow = mix(uA, uC, hash(cell * 1.7));
        float ge = edge * sq * flick * uI;
        float dots = covered * step(0.93, hash(cell + 3.1)) * 0.25;
        vec3 rgb = uBg * covered + glow * ge + uA * dots * sq;
        gl_FragColor = vec4(min(rgb, vec3(1.0)), clamp(max(covered, ge), 0.0, 1.0));
      }`,
    init(inst) {
      inst.prog = program(this.frag);
      inst.p = this.progress(inst);
      inst.drawnP = -1;
    },
    progress(inst) {
      const r = inst.el.getBoundingClientRect();
      const vh = innerHeight;
      return Math.max(0, Math.min(1, (vh * 0.95 - r.top) / (vh * 0.6)));
    },
    frame(inst) {
      const tp = this.progress(inst);
      inst.p += (tp - inst.p) * 0.12;
      if (Math.abs(tp - inst.p) < 0.002) inst.p = tp;
      const settled = inst.p === tp && (tp >= 1 || tp <= 0);
      if (settled && inst.drawnP === inst.p) return false;
      inst.drawnP = settled ? inst.p : -1;
      const cell = Math.max(6, Math.round((inst.opts.cell || 22) * inst.dpr));
      use(inst.prog, inst, { uP: inst.p, uCell: cell });
      draw();
      return true;
    },
  };

  /* 5 · aurora — domain-warped fbm gradient mesh with ribbon bands and a bloom core, rendered
     at low resolution behind a section and feathered into the page. */
  EFFECTS.aurora = {
    layer: "under",
    reduced: "static",
    scale: 0.4,
    fps: 30,
    frag: `
      void main() {
        vec2 uv = vUv;
        float asp = uRes.x / uRes.y;
        vec2 p = vec2((uv.x - 0.5) * asp, uv.y - 0.5) * 1.6;
        float t = uTime * 0.07;
        vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t)));
        vec2 r = vec2(fbm(p * 1.2 + 2.0 * q + vec2(1.7, 9.2) + t * 0.8), fbm(p * 1.2 + 2.0 * q + vec2(8.3, 2.8) - t * 0.6));
        float f = fbm(p * 1.4 + 2.4 * r);
        float rib = pow(0.5 + 0.5 * sin(f * 10.0 + p.y * 2.5 + uTime * 0.3), 4.0);
        vec3 col = mix(uB, uC, clamp(q.x * 1.6 - 0.3, 0.0, 1.0));
        col = mix(col, uA, clamp(r.y * r.y * 2.2 - 0.5, 0.0, 1.0));
        float glow = f * f * 1.8 + rib * 0.7;
        float m = smoothstep(0.0, 0.22, uv.x) * smoothstep(1.0, 0.78, uv.x) * smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);
        vec3 rgb = (col * glow + uA * pow(glow, 3.0) * 0.3) * m * uI;
        gl_FragColor = vec4(rgb, clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0));
      }`,
    init(inst) {
      inst.prog = program(this.frag);
    },
    frame(inst) {
      use(inst.prog, inst);
      draw();
    },
  };

  /* ---------------- text helpers ---------------- */
  function waitStill(el) {
    const start = now();
    return new Promise((resolve) => {
      const check = () => {
        const busy = el
          .getAnimations?.({ subtree: true })
          .some((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity);
        let hidden = false;
        for (let n = el; n && n !== document.body && !hidden; n = n.parentElement)
          hidden = +getComputedStyle(n).opacity < 0.99;
        el.querySelectorAll("*").forEach((c) => {
          if (+getComputedStyle(c).opacity < 0.99) hidden = true;
        });
        if ((!busy && !hidden) || now() - start > 6000) resolve();
        else setTimeout(check, 150);
      };
      (document.fonts?.ready || Promise.resolve()).then(check);
    });
  }
  const transform = (s, tt) =>
    tt === "uppercase"
      ? s.toUpperCase()
      : tt === "lowercase"
        ? s.toLowerCase()
        : tt === "capitalize"
          ? s.replace(/\b\w/g, (c) => c.toUpperCase())
          : s;
  function rasterizeText(el, pad, w, h) {
    const live = el.classList.contains("ofx-text-live");
    if (live) el.classList.remove("ofx-text-live");
    try {
      const box = el.getBoundingClientRect();
      const sx = w / (box.width + pad * 2),
        sy = h / (box.height + pad * 2);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.scale(sx, sy);
      const range = document.createRange();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode()); ) {
        const parent = node.parentElement;
        if (!parent || parent.closest("canvas")) continue;
        const cs = getComputedStyle(parent);
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        if ("letterSpacing" in ctx) ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
        ctx.fillStyle = cs.color;
        const sh = cs.textShadow && cs.textShadow !== "none" ? cs.textShadow.match(/^(rgba?\([^)]*\)|#\w+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/) : null;
        ctx.shadowColor = sh ? sh[1] : "transparent";
        ctx.shadowBlur = sh ? +sh[4] : 0;
        const text = node.textContent;
        const re = /\S+/g;
        for (let m; (m = re.exec(text)); ) {
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const rects = range.getClientRects();
          if (!rects.length) continue;
          const rr = rects[0];
          const word = transform(m[0], cs.textTransform);
          const mt = ctx.measureText(word);
          const asc = mt.fontBoundingBoxAscent ?? mt.actualBoundingBoxAscent;
          const desc = mt.fontBoundingBoxDescent ?? mt.actualBoundingBoxDescent;
          const y = rr.top - box.top + pad + (rr.height - (asc + desc)) / 2 + asc;
          ctx.fillText(word, rr.left - box.left + pad, y);
        }
      }
      return c;
    } finally {
      if (live) el.classList.add("ofx-text-live");
    }
  }

  /* ---------------- instances + loop ---------------- */
  const now = () => performance.now();
  const instances = new Set();
  let lastPointerAt = -1e9;
  const pointer = { x: -1e4, y: -1e4, has: false };
  addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.has = true;
      lastPointerAt = now();
    },
    { passive: true }
  );
  addEventListener(
    "scroll",
    () => {
      instances.forEach((i) => i.def.scroll && (i.dirty = true));
      schedule();
    },
    { passive: true }
  );
  addEventListener("resize", () => {
    instances.forEach((i) => (i.dirty = true));
    schedule();
  });
  document.addEventListener("visibilitychange", () => !document.hidden && schedule());

  let styleInjected = false;
  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    const s = document.createElement("style");
    s.textContent = `
      .ofx-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block}
      .ofx-under{z-index:-1}
      .ofx-fixed{position:fixed;inset:0;width:100vw;height:100vh;z-index:60}
      .ofx-canvas[data-ofx=grain]{image-rendering:pixelated}
      .ofx-host{isolation:isolate}
      .ofx-text-live,.ofx-text-live *:not(canvas){color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}`;
    document.head.appendChild(s);
  }

  // long pages: keep any one effect's buffer within ~2.4 MP and the GL size limits
  const MAX_PIXELS = 2.4e6;
  const MAX_SIDE = 4096;
  let raf = 0;
  function schedule() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(loop);
  }

  function loop(t) {
    raf = 0;
    if (document.hidden || !R || R.lost) return;
    let keepGoing = false;
    for (const inst of instances) {
      if (!inst.visible || inst.dead) continue;
      if (!inst.static) keepGoing = true;
      if (inst.static && !inst.dirty) continue;
      if (!inst.static && t - inst.last < 1000 / inst.fps - 4) continue;
      try {
        renderInstance(inst, t);
      } catch (err) {
        warn(inst.name, err);
        inst.destroy();
      }
    }
    stats.frames++;
    if (keepGoing) schedule();
  }

  function renderInstance(inst, t) {
    if (!inst.ready) {
      if (inst.initing) return;
      inst.initing = true;
      Promise.resolve(inst.def.init(inst)).then(
        () => {
          inst.initing = false;
          inst.ready = true;
          inst.w = 0;
          schedule();
        },
        (err) => {
          warn(inst.name, err);
          inst.destroy();
        }
      );
      return;
    }
    const gl = R.gl;
    const cv = inst.canvas;
    const fixed = inst.layer === "fixed";
    const cssW = fixed ? innerWidth : cv.clientWidth;
    const cssH = fixed ? innerHeight : cv.clientHeight;
    if (!cssW || !cssH) return;
    inst.dpr = Math.min(devicePixelRatio || 1, inst.maxDpr);
    let k = inst.dpr * inst.scale;
    k = Math.min(k, Math.sqrt(MAX_PIXELS / (cssW * cssH)), MAX_SIDE / cssW, MAX_SIDE / cssH);
    const w = Math.max(1, Math.round(cssW * k));
    const h = Math.max(1, Math.round(cssH * k));
    if (w !== inst.w || h !== inst.h) {
      inst.w = cv.width = w;
      inst.h = cv.height = h;
      inst.def.resize?.(inst);
    }
    if (R.w < w || R.h < h) {
      R.w = R.canvas.width = Math.max(R.w, w);
      R.h = R.canvas.height = Math.max(R.h, h);
    }
    const rect = fixed ? { left: 0, top: 0, width: cssW, height: cssH } : cv.getBoundingClientRect();
    inst.rect = rect;
    inst.hasPointer = pointer.has;
    inst.mx = ((pointer.x - rect.left) / rect.width) * w;
    inst.my = (1 - (pointer.y - rect.top) / rect.height) * h;
    inst.pointerInside =
      pointer.has &&
      pointer.x >= rect.left &&
      pointer.x <= rect.left + rect.width &&
      pointer.y >= rect.top &&
      pointer.y <= rect.top + rect.height;
    inst.time = inst.static ? 0 : (t - inst.t0) / 1000;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (inst.def.frame(inst) === false) return;
    if (!inst.def.opaque) inst.ctx.clearRect(0, 0, w, h);
    inst.ctx.drawImage(R.canvas, 0, R.h - h, w, h, 0, 0, w, h);
    inst.def.afterDraw?.(inst);
    inst.last = t;
    inst.dirty = false;
  }

  function mount(el, opts = {}) {
    try {
      if (typeof el === "string") el = document.querySelector(el);
      const name = opts.effect;
      const def = EFFECTS[name];
      if (!el || !def) return null;
      if (!allowed(name)) return null;
      if (reduceMotion && def.reduced === "skip") return null;
      el.__ofx = el.__ofx || {};
      if (el.__ofx[name]) return el.__ofx[name];
      if (!renderer()) {
        el.classList.add("ofx-nogl");
        return null;
      }
      if (name === "text") {
        const clear = (c) => c === "transparent" || /,\s*0\)$/.test(c);
        const seeThrough = [el, ...el.querySelectorAll("*")].some((n) => {
          const cs = getComputedStyle(n);
          return clear(cs.color) || clear(cs.webkitTextFillColor || "");
        });
        if (seeThrough) {
          warn("text effect skipped: element text is transparent (gradient text?)", el);
          return null;
        }
      }
      injectStyle();
      const theme = (typeof opts.palette === "string" ? themes()[opts.palette] : null) || defaultTheme;
      const themeIntensity =
        typeof theme?.intensity === "number" ? theme.intensity : theme?.intensity?.[name];
      const inst = {
        name,
        def,
        el,
        opts,
        pal: null,
        intensity: opts.intensity ?? themeIntensity ?? 1,
        scale: opts.scale ?? def.scale ?? 1,
        fps: opts.fps ?? def.fps ?? 60,
        maxDpr: opts.maxDpr ?? 1.5,
        pad: opts.pad ?? opts.bleed ?? def.pad ?? 0,
        layer: el instanceof HTMLCanvasElement ? "canvas" : opts.layer || def.layer,
        static: reduceMotion,
        visible: false,
        dirty: true,
        ready: false,
        last: -1e9,
        t0: now(),
        w: 0,
        h: 0,
        dpr: 1,
        time: 0,
        mx: 0,
        my: 0,
      };
      const p = resolvePalette(opts.palette);
      inst.pal = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, hex(v)]));
      inst.pointerNear = (margin) => {
        if (!pointer.has) return false;
        const r = inst.el.getBoundingClientRect();
        return (
          pointer.x > r.left - margin &&
          pointer.x < r.right + margin &&
          pointer.y > r.top - margin &&
          pointer.y < r.bottom + margin
        );
      };

      let cv;
      if (inst.layer === "canvas") cv = el;
      else {
        cv = document.createElement("canvas");
        cv.className = "ofx-canvas ofx-" + inst.layer;
        cv.dataset.ofx = name;
        if (inst.layer === "fixed") (el === document.body || el === document.documentElement ? document.body : el).appendChild(cv);
        else {
          if (getComputedStyle(el).position === "static") el.style.position = "relative";
          if (inst.layer === "under") el.classList.add("ofx-host");
          if (inst.pad) {
            cv.style.inset = "auto";
            cv.style.left = cv.style.top = `-${inst.pad}px`;
            cv.style.width = `calc(100% + ${inst.pad * 2}px)`;
            cv.style.height = `calc(100% + ${inst.pad * 2}px)`;
          }
          if (opts.z !== undefined) cv.style.zIndex = opts.z;
          inst.layer === "under" ? el.prepend(cv) : el.appendChild(cv);
        }
      }
      cv.setAttribute("aria-hidden", "true");
      if (inst.layer === "fixed" && opts.z !== undefined) cv.style.zIndex = opts.z;
      if (opts.blend) cv.style.mixBlendMode = opts.blend;
      inst.canvas = cv;
      inst.ctx = cv.getContext("2d");
      if (!inst.ctx) return null;

      if (inst.layer === "fixed") inst.visible = true;
      else {
        inst.io = new IntersectionObserver(
          ([en]) => {
            inst.visible = en.isIntersecting;
            if (inst.visible) {
              inst.dirty = true;
              schedule();
            }
          },
          { rootMargin: "200px" }
        );
        inst.io.observe(el);
      }
      inst.destroy = () => {
        if (inst.dead) return;
        inst.dead = true;
        instances.delete(inst);
        inst.io?.disconnect();
        try {
          inst.def.destroy?.(inst);
        } catch (_) {}
        if (inst.layer !== "canvas") cv.remove();
        if (el.__ofx) delete el.__ofx[name];
        if (inst.layer === "under" && !Object.keys(el.__ofx || {}).some((k) => EFFECTS[k].layer === "under"))
          el.classList.remove("ofx-host");
      };
      inst.handle = {
        effect: name,
        el,
        canvas: cv,
        destroy: inst.destroy,
        set(o) {
          if (o.intensity !== undefined) inst.intensity = o.intensity;
          if (o.palette) {
            const np = resolvePalette(o.palette);
            inst.pal = Object.fromEntries(Object.entries(np).map(([k, v]) => [k, hex(v)]));
          }
          inst.dirty = true;
          schedule();
        },
        // legacy createIce() compatibility
        stop: () => inst.destroy(),
      };
      el.__ofx[name] = inst.handle;
      instances.add(inst);
      schedule();
      return inst.handle;
    } catch (err) {
      warn("mount failed", err);
      return null;
    }
  }

  /* ---------------- declarative + site presets ---------------- */
  const DEFAULT_TARGETS = {
    liquid: () => heroOf(document.querySelector("h1")) || document.querySelector("section, header"),
    text: () => document.querySelector("h1"),
    grain: () => document.body,
    aurora: () => document.querySelectorAll("main section, body > section")[1] || null,
    dissolve: () => document.querySelector("[data-fx-dissolve]"),
  };
  function heroOf(h1) {
    if (!h1) return null;
    return h1.closest("header, section, [class*='hero' i]") || h1.parentElement;
  }
  const num = (v) => (v === undefined || v === "" ? undefined : +v);
  function mountDeclared(root = document, palette) {
    const out = [];
    const els = [...root.querySelectorAll("[data-fx]")];
    if (root.matches?.("[data-fx]")) els.unshift(root);
    for (const el of els) {
      for (const effect of el.dataset.fx.split(/[\s,]+/).filter(Boolean)) {
        const h = mount(el, {
          effect,
          palette: el.dataset.fxPalette || palette,
          intensity: num(el.dataset.fxIntensity),
          scale: num(el.dataset.fxScale),
          z: el.dataset.fxZ,
          zoom: num(el.dataset.fxZoom),
          cell: num(el.dataset.fxCell),
          blend: el.dataset.fxBlend,
          bleed: num(el.dataset.fxBleed),
          layer: el.dataset.fxLayer,
        });
        if (h) out.push(h);
      }
    }
    return out;
  }
  function declaredEffects() {
    return new Set(
      [...document.querySelectorAll("[data-fx]")].flatMap((el) => el.dataset.fx.split(/[\s,]+/).filter(Boolean))
    );
  }
  function findTarget(effect, sel) {
    if (typeof sel === "string") return document.querySelector(sel);
    return DEFAULT_TARGETS[effect]?.() || null;
  }
  function applySite(site) {
    site = normalizeSite(site);
    const theme = themes()[site];
    if (!theme) {
      warn(`no theme preset for "${site}"`);
      return [];
    }
    defaultTheme = theme;
    const declared = declaredEffects();
    const handles = mountDeclared(document, site);
    const pending = Object.entries(theme.effects || {}).filter(([e, on]) => on && !declared.has(e));
    const tryMount = () => {
      for (let i = pending.length - 1; i >= 0; i--) {
        const [effect] = pending[i];
        const el = findTarget(effect, theme.targets?.[effect]);
        if (!el) continue;
        const h = mount(el, { effect, palette: site, ...(theme.options?.[effect] || {}) });
        if (h) handles.push(h);
        pending.splice(i, 1);
      }
      return pending.length === 0;
    };
    if (!tryMount()) {
      // SPA sites render late; keep looking for targets for a while.
      const mo = new MutationObserver(() => tryMount() && mo.disconnect());
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => mo.disconnect(), 10000);
    }
    return handles;
  }
  function normalizeSite(site) {
    if (!site || site === "auto") site = location.hostname;
    return site.replace(/^www\./i, "").toLowerCase();
  }
  function destroyAll() {
    [...instances].forEach((i) => i.destroy());
  }
  function loadThemes() {
    if (window.OvernightFXThemes) return Promise.resolve();
    if (!script?.src) return Promise.resolve();
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = new URL("fx-themes.js", script.src).href;
      s.onload = s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  const stats = { frames: 0 };
  window.OvernightFX = {
    version: "1.0.0",
    effects: Object.keys(EFFECTS),
    get supported() {
      return !!renderer();
    },
    get contexts() {
      return R ? 1 : 0;
    },
    get instances() {
      return [...instances].map((i) => i.handle);
    },
    reduceMotion,
    allowed,
    mount,
    mountDeclared,
    applySite,
    destroyAll,
    setTheme(name) {
      defaultTheme = themes()[name] || null;
    },
    stats,
  };

  const boot = () => {
    const site = script?.dataset.site;
    const theme = script?.dataset.theme;
    loadThemes().then(() => {
      if (theme) window.OvernightFX.setTheme(theme);
      if (site) applySite(site);
      else if (script?.dataset.auto !== "false") mountDeclared(document, theme);
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
