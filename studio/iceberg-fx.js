// IcebergFX — WebGL effects for the Opsec Iceberg landing page (no dependencies).
//
// Two contexts, both created lazily when their section nears the viewport and paused offscreen:
//   hero: the skull-jungle painting with drifting volumetric mist, campfire flicker + reflection,
//         lagoon shimmer, gold dust and slow cursor/scroll parallax.
//   ice:  the iceberg waterline: a moving water surface, caustics and light shafts that fade from
//         lagoon turquoise into the abyss as you descend, plus marine snow.
// Render scale is capped at 1 device pixel. `?fx=off` disables WebGL. With
// prefers-reduced-motion each scene draws a single static frame and redraws only on resize/scroll.
// The hero texture comes from `data-gl-src` on the art <img> (or its src) and needs CORS if cross-origin.
(() => {
  const params = new URLSearchParams(location.search);
  const disabled = params.get("fx") === "off";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STATIC_T = 14.0;

  const VERT = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const COMMON = `
precision highp float;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p){ float h = hash(p); return vec2(h, hash(p + h + 17.17)); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
// Drifting gold dust: one soft mote per grid cell, about a third of cells lit.
float dust(vec2 px, float cell, float t, float speed){
  vec2 g = px / cell + vec2(sin(t * 0.07) * 0.6, t * speed);
  vec2 id = floor(g), f = fract(g) - 0.5;
  vec2 h = hash2(id);
  vec2 o = (h - 0.5) * 0.6 + 0.14 * vec2(sin(t * 0.5 + h.x * 6.28), cos(t * 0.43 + h.y * 6.28));
  float d = length(f - o);
  float tw = 0.45 + 0.55 * sin(t * (1.1 + h.x * 1.7) + h.y * 31.0);
  float lit = step(0.66, hash(id + 7.13));
  return lit * max(tw, 0.0) * (exp(-d * d * 2200.0) + 0.18 * exp(-d * d * 160.0));
}
`;

  const HERO_FS = `${COMMON}
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec4 uRect;     // art panel in canvas px, top-left origin
uniform vec4 uMask;     // left feather end, right feather start, bottom feather start, horizontal feather on/off
uniform float uAspect;  // image w / h
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform vec2 uFire;

vec2 cover(vec2 p, vec4 r, vec2 focus){
  vec2 local = (p - r.xy) / r.zw;
  float ra = r.z / r.w;
  vec2 s = ra > uAspect ? vec2(1.0, uAspect / ra) : vec2(ra / uAspect, 1.0);
  return (local - focus) * s + focus;
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float t = uTime;
  vec2 focus = vec2(0.5, 0.46);
  vec2 uv0 = cover(p, uRect, focus);

  // Layered parallax: sky and skull far, jungle and palms near.
  float near = smoothstep(0.42, 0.98, uv0.y);
  near = max(near, smoothstep(0.30, 0.47, abs(uv0.x - 0.5)) * smoothstep(0.18, 0.42, uv0.y));
  vec2 par = uMouse * (0.004 + 0.016 * near) + vec2(0.0, -uScroll * 0.06 * (1.0 - near));
  vec2 uv = uv0 + par;

  // Lagoon mask, keyed on the painting's turquoise.
  vec3 c0 = texture2D(uTex, uv).rgb;
  float teal = smoothstep(0.035, 0.11, min(c0.g, c0.b) - c0.r) * step(c0.g * 0.8, c0.b);
  float water = teal * smoothstep(0.655, 0.685, uv.y) * smoothstep(0.88, 0.84, uv.y) * smoothstep(0.08, 0.14, uv.x) * smoothstep(0.8, 0.72, uv.x);
  vec2 wob = vec2(sin(uv.y * 260.0 + t * 1.7) * 0.0011 + (noise(vec2(uv.x * 60.0, t * 0.6)) - 0.5) * 0.002,
                  sin(uv.x * 120.0 - t * 1.2) * 0.0006);
  vec3 art = texture2D(uTex, uv + wob * water).rgb;
  float glint = pow(noise(vec2(uv.x * 46.0 - t * 0.2, uv.y * 420.0 - t * 0.9)), 7.0);
  art += water * (glint * vec3(0.55, 0.95, 0.9) * 0.9 + 0.035 * vec3(0.2, 0.6, 0.55) * (0.5 + 0.5 * sin(t * 0.8 + uv.x * 30.0)));

  // Campfire: flicker, halo and a broken reflection streak on the water.
  vec2 fd = (uv - uFire) * vec2(uAspect, 1.0);
  float r = length(fd);
  float fl = 0.72 + 0.2 * noise(vec2(t * 7.0, 1.3)) + 0.12 * noise(vec2(t * 17.0, 4.1)) - 0.06 * step(0.93, noise(vec2(t * 3.0, 9.0)));
  vec3 fireCol = vec3(1.0, 0.62, 0.26);
  art += fireCol * (exp(-r * r * 5200.0) * 1.1 + exp(-r * 70.0) * 0.32 + exp(-r * 18.0) * 0.06) * fl;
  float below = fd.y - 0.004;
  float streak = exp(-pow(fd.x * 90.0 * (1.0 + below * 30.0), 2.0)) * smoothstep(0.0, 0.006, below) * exp(-below * 26.0);
  streak *= 0.55 + 0.45 * sin(uv.y * 700.0 - t * 3.4 + noise(vec2(uv.y * 90.0, t)) * 4.0);
  art += fireCol * streak * fl * 0.55 * (0.4 + water);

  // Ambient backdrop outside the panel: the same painting, heavily blurred via mip bias.
  vec2 uvb = cover(p, vec4(0.0, 0.0, uRes), vec2(0.5, 0.55)) + uMouse * 0.003;
  vec3 back = texture2D(uTex, uvb, 6.0).rgb * 0.34;
  vec2 lp = (p - uRect.xy) / uRect.zw;
  float m = (1.0 - smoothstep(uMask.z, 1.0, lp.y)) * step(0.0, lp.y);
  float mh = smoothstep(0.0, uMask.x, lp.x) * (1.0 - smoothstep(uMask.y, 1.0, lp.x));
  m *= mix(step(0.0, lp.x) * step(lp.x, 1.0), mh, uMask.w);
  vec3 col = mix(back, art, clamp(m, 0.0, 1.0));

  // Volumetric mist: two domain-warped layers drifting at different speeds, banked in the valley.
  vec2 q = p / uRes.y;
  float w = fbm(q * vec2(1.6, 3.2) + vec2(t * 0.018, 0.0) + uMouse * 0.05);
  float mist = fbm(q * vec2(2.4, 4.6) + vec2(t * 0.032 + w * 1.6, w * 0.8 - t * 0.006));
  float mist2 = fbm(q * vec2(5.0, 8.0) - vec2(t * 0.05, 0.0) + w);
  float band = 0.75 * exp(-pow((uv0.y - 0.5) / 0.13, 2.0)) + 0.45 * exp(-pow((uv0.y - 0.655) / 0.05, 2.0)) + 0.22 * smoothstep(0.82, 1.0, uv0.y);
  band = mix(0.32, band, clamp(m * 1.4, 0.0, 1.0));
  float dens = smoothstep(0.38, 0.85, mist) * band + smoothstep(0.55, 0.9, mist2) * band * 0.35;
  vec3 mistCol = mix(vec3(0.5, 0.56, 0.54), vec3(0.95, 0.72, 0.45), exp(-r * 9.0) * 0.8);
  col = mix(col, mistCol * (0.6 + 0.4 * m), clamp(dens * 0.48, 0.0, 0.55));

  // Gold dust, two depths.
  float d1 = dust(p, 120.0, t, 0.05);
  float d2 = dust(p + 37.0, 64.0, t * 1.2, 0.08) * 0.55;
  col += vec3(1.0, 0.8, 0.45) * (d1 + d2) * 0.9;

  // Grade: lift the golds, crush the blacks a touch, vignette.
  col = pow(max(col, 0.0), vec3(1.06, 1.03, 1.0));
  vec2 vq = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - dot(vq, vq) * 0.35;
  gl_FragColor = vec4(col, 1.0);
}
`;

  const ICE_FS = `${COMMON}
uniform vec2 uRes;
uniform float uTime;
uniform float uWaterY;   // waterline, canvas px from top
uniform float uSpan;     // px from waterline to the berg's keel
uniform vec2 uMouse;

float caustic(vec2 uv, float t){
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0, inten = 0.005;
  for (int n = 0; n < 4; n++){
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}

void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float t = uTime;
  float x = p.x / uRes.y;
  float wave = sin(x * 7.0 + t * 0.8) * 5.0 + sin(x * 19.0 - t * 1.25) * 2.2 + (noise(vec2(x * 5.0, t * 0.35)) - 0.5) * 7.0;
  float dy = p.y - (uWaterY + wave);
  vec3 col;

  if (dy < 0.0) {
    float h = -dy / uRes.y;
    col = mix(vec3(0.075, 0.062, 0.045), vec3(0.012, 0.013, 0.018), smoothstep(0.0, 0.55, h));
    col += vec3(0.62, 0.45, 0.2) * exp(-h * 14.0) * 0.22;
    float haze = fbm(vec2(x * 2.0 + t * 0.02, h * 6.0));
    col += vec3(0.4, 0.42, 0.4) * smoothstep(0.45, 0.85, haze) * exp(-h * 5.0) * 0.12;
    col += vec3(1.0, 0.8, 0.45) * dust(p, 110.0, t, 0.04) * 0.8;
    float rim = exp(dy / 2.0);
    col += vec3(0.7, 0.95, 0.9) * rim * 0.5;
  } else {
    float d = dy / max(uSpan, 1.0);
    vec3 shallow = vec3(0.09, 0.46, 0.45);
    vec3 mid = vec3(0.02, 0.17, 0.2);
    vec3 deep = vec3(0.006, 0.035, 0.045);
    vec3 abyss = vec3(0.0, 0.004, 0.008);
    col = mix(shallow, mid, smoothstep(0.0, 0.16, d));
    col = mix(col, deep, smoothstep(0.12, 0.5, d));
    col = mix(col, abyss, smoothstep(0.55, 1.0, d));

    vec2 cu = vec2(x, dy / uRes.y) * vec2(2.2, 3.0) + uMouse * 0.04;
    float caus = caustic(cu, t * 0.35) + caustic(cu * 1.7 + 3.1, t * 0.28) * 0.5;
    col += vec3(0.55, 0.95, 0.88) * caus * 0.32 * exp(-d * 7.0);

    float slant = x - dy / uRes.y * 0.32;
    float rays = pow(fbm(vec2(slant * 7.0, t * 0.05)), 3.0) * 2.4;
    col += vec3(0.4, 0.85, 0.8) * rays * exp(-d * 4.5) * 0.28;

    col += vec3(0.75, 0.95, 0.9) * exp(-dy / 3.0) * 0.55;
    col += vec3(0.2, 0.5, 0.48) * exp(-dy / 60.0) * 0.18;

    float snow = dust(p * vec2(1.0, 0.8), 70.0, t, -0.03);
    col += vec3(0.6, 0.85, 0.82) * snow * 0.35 * (0.3 + 0.7 * smoothstep(0.1, 0.6, d)) * (1.0 - smoothstep(0.9, 1.3, d));
    col += vec3(1.0, 0.75, 0.4) * dust(p + 91.0, 140.0, t, -0.015) * 0.25 * smoothstep(0.8, 1.2, d);
  }

  vec2 vq = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - dot(vq, vq) * 0.7;
  gl_FragColor = vec4(col, 1.0);
}
`;

  const status = { webgl: false, contexts: 0, scale: 1, hero: "idle", ice: "idle", error: "" };
  let pointer = { x: 0, y: 0 };
  let mouse = { x: 0, y: 0 };
  addEventListener(
    "pointermove",
    (e) => {
      pointer = { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 };
    },
    { passive: true }
  );

  function makeContext(canvas) {
    const opts = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" };
    return canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
  }

  function buildProgram(gl, fs) {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader compile failed");
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link failed");
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i);
      u[info.name] = gl.getUniformLocation(prog, info.name);
    }
    return u;
  }

  // A scene owns one canvas + context; it is created when its host nears the viewport and its
  // loop only runs while the host is on screen and the tab is visible.
  function scene({ canvas, host, fs, setup, uniforms, onReady, name, active = () => true }) {
    let gl = null,
      u = null,
      raf = 0,
      visible = false,
      ready = false,
      failed = false,
      t0 = performance.now();
    const size = () => {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)),
        h = Math.max(1, Math.round(r.height));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      return [w, h];
    };
    const draw = (now) => {
      if (!gl || !ready) return;
      const [w, h] = size();
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uTime, reduce ? STATIC_T : (now - t0) / 1000);
      uniforms(gl, u, w, h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now) => {
      raf = 0;
      if (!visible || document.hidden || !active()) return;
      mouse.x += (pointer.x - mouse.x) * 0.035;
      mouse.y += (pointer.y - mouse.y) * 0.035;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      status[name] = ready ? (visible ? (reduce ? "static" : "running") : "paused") : status[name];
      if (reduce) return draw(performance.now());
      if (visible && ready && active() && !raf) raf = requestAnimationFrame(loop);
    };
    const init = () => {
      if (gl || failed) return;
      gl = makeContext(canvas);
      if (!gl) {
        failed = true;
        status[name] = "no-webgl";
        return;
      }
      try {
        u = buildProgram(gl, fs);
      } catch (err) {
        failed = true;
        gl = null;
        status[name] = "error";
        status.error = String(err.message || err).slice(0, 200);
        console.warn(`[IcebergFX:${name}]`, err);
        return;
      }
      status.webgl = true;
      status.contexts++;
      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        ready = false;
        status[name] = "lost";
      });
      setup(gl, u, () => {
        ready = true;
        draw(performance.now());
        onReady();
        kick();
      });
    };
    new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) init();
      },
      { rootMargin: "600px 0px" }
    ).observe(host);
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      kick();
    }).observe(host);
    document.addEventListener("visibilitychange", kick);
    addEventListener("resize", () => draw(performance.now()), { passive: true });
    return { redraw: () => reduce && draw(performance.now()), isRunning: () => !!raf };
  }

  let heroScene = null,
    iceScene = null,
    heroOn = true;
  const ice = { waterY: 0, span: 1 };

  function start({ hero, heroCanvas, heroArt, iceStage, iceCanvas, onReady = () => {} }) {
    if (disabled) {
      status.hero = status.ice = "off";
      return;
    }
    const probe = document.createElement("canvas");
    if (!makeContext(probe)) {
      status.hero = status.ice = "no-webgl";
      return;
    }

    heroScene = scene({
      name: "hero",
      canvas: heroCanvas,
      host: hero,
      fs: HERO_FS,
      setup(gl, u, done) {
        const img = new Image();
        img.decoding = "async";
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const pot = document.createElement("canvas");
          pot.width = 1024;
          pot.height = 2048;
          pot.getContext("2d").drawImage(img, 0, 0, pot.width, pot.height);
          const tex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, pot);
          } catch (err) {
            status.hero = "no-image";
            console.warn("[IcebergFX:hero] texture blocked; keeping the static image", err);
            return;
          }
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.uniform1i(u.uTex, 0);
          gl.uniform1f(u.uAspect, img.naturalWidth / img.naturalHeight);
          gl.uniform2f(u.uFire, 0.638, 0.727);
          done();
        };
        img.onerror = () => {
          status.hero = "no-image";
        };
        img.src = heroArt.dataset.glSrc || heroArt.currentSrc || heroArt.src;
      },
      uniforms(gl, u) {
        const narrow = matchMedia("(max-width: 860px)").matches;
        gl.uniform4f(u.uRect, heroArt.offsetLeft, heroArt.offsetTop, heroArt.offsetWidth, heroArt.offsetHeight);
        gl.uniform4f(u.uMask, 0.24, 0.86, narrow ? 0.6 : 0.82, narrow ? 0 : 1);
        gl.uniform2f(u.uMouse, reduce ? 0 : mouse.x, reduce ? 0 : mouse.y);
        gl.uniform1f(u.uScroll, Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight))));
      },
      active: () => heroOn,
      onReady() {
        if (heroOn) document.body.classList.add("gl-hero");
        onReady("hero");
      },
    });

    iceScene = scene({
      name: "ice",
      canvas: iceCanvas,
      host: iceStage.parentElement,
      fs: ICE_FS,
      setup(gl, u, done) {
        done();
      },
      uniforms(gl, u) {
        gl.uniform1f(u.uWaterY, ice.waterY);
        gl.uniform1f(u.uSpan, ice.span);
        gl.uniform2f(u.uMouse, reduce ? 0 : mouse.x, reduce ? 0 : mouse.y);
      },
      onReady() {
        document.body.classList.add("gl-ice");
        onReady("ice");
      },
    });
  }

  window.IcebergFX = {
    start,
    setIce(waterY, span) {
      ice.waterY = waterY;
      ice.span = span;
      iceScene?.redraw();
    },
    setHeroScene(on) {
      heroOn = on;
      document.body.classList.toggle("gl-hero", on && status.hero !== "idle");
    },
    status: () => ({ ...status, heroRunning: !!heroScene?.isRunning(), iceRunning: !!iceScene?.isRunning() }),
  };
})();
