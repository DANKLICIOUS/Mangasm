/* Sparkle — a tiny drop-in for dark sites: a cursor sparkle trail (glints, hearts, dots) plus a faint
 * aurora, drawn on one WebGL canvas that is screen-blended over the page so it only ever adds light.
 *
 *   <script src="https://cdn.jsdelivr.net/gh/DANKLICIOUS/Mangasm@<commit>/studio/sparkle.js"
 *           data-colors="#e83a7a,#ff6b9d,#c9a227" data-aurora="0.12" defer></script>
 *
 * data-colors  up to three hex colours (default pink / rose / gold)
 * data-aurora  aurora strength 0–1 (default 0.12, 0 turns it off)
 * data-z       canvas z-index (default 90)
 * Does nothing without WebGL or with ?fx=off. Under prefers-reduced-motion the trail is off and the
 * aurora is drawn once, without motion. window.Sparkle = { burst(x, y, n), status(), destroy() }.
 */
(() => {
  if (window.Sparkle) return;
  const me = document.currentScript;
  const opt = (k, d) => (me && me.dataset[k]) || d;
  if (new URLSearchParams(location.search).get("fx") === "off") return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hex = (h) => {
    const n = parseInt(h.trim().replace("#", ""), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const colors = opt("colors", "#e83a7a,#ff6b9d,#c9a227").split(",").slice(0, 3).map(hex);
  while (colors.length < 3) colors.push(colors[colors.length - 1]);
  const auroraAmt = Math.max(0, Math.min(1, parseFloat(opt("aurora", "0.12")) || 0));

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:${+opt("z", 90)};mix-blend-mode:screen`;
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };

  let aurora, sprites;
  try {
    aurora = program(
      `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`,
      `precision mediump float;
      uniform vec2 uRes;uniform float uT,uAmt;uniform vec3 uC0,uC1,uC2;
      float blob(vec2 p,vec2 c,float r){vec2 d=p-c;return exp(-dot(d,d)/(r*r));}
      void main(){
        vec2 p=gl_FragCoord.xy/uRes;p.x*=uRes.x/uRes.y;float w=uRes.x/uRes.y;
        float t=uT*.05;
        float a0=blob(p,vec2(w*(.2+.12*sin(t*1.3)),1.02+.05*sin(t*1.7)),.42);
        float a1=blob(p,vec2(w*(.78+.1*cos(t*1.1)),.96+.06*cos(t*1.5)),.38);
        float a2=blob(p,vec2(w*(.5+.22*sin(t*.8+1.)),1.08),.5);
        float band=.6+.4*sin(p.x*3.1+t*2.+sin(p.y*4.-t)*.8);
        vec3 c=uC0*a0+uC1*a1*.9+uC2*a2*.7;
        float m=(a0+a1+a2*.8)*band*uAmt;
        gl_FragColor=vec4(c*band*uAmt,m);
      }`
    );
    sprites = program(
      `attribute vec2 aPos;attribute vec4 aCol;attribute vec3 aMisc;
      uniform vec2 uRes;varying vec4 vCol;varying vec2 vMisc;
      void main(){vec2 c=aPos/uRes*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);gl_PointSize=aMisc.x;vCol=aCol;vMisc=aMisc.yz;}`,
      `precision mediump float;varying vec4 vCol;varying vec2 vMisc;
      void main(){
        vec2 p=gl_PointCoord*2.-1.;float r=vMisc.y;p=mat2(cos(r),-sin(r),sin(r),cos(r))*p;
        float s=vMisc.x,a;
        if(s<.5){
          float core=max(0.,1.-length(p)*2.2);
          float rays=exp(-abs(p.x)*14.)*max(0.,1.-abs(p.y))+exp(-abs(p.y)*14.)*max(0.,1.-abs(p.x));
          a=min(1.,core+rays);
        }else if(s<1.5){
          vec2 q=p*1.35;q.y=-q.y+.35;
          float h=abs(atan(q.x,q.y))/3.14159;float l=length(q);
          float d=(13.*h-22.*h*h+10.*h*h*h)/(6.-5.*h);
          a=smoothstep(.06,-.04,l-d)+.35*exp(-l*l*3.);
        }else{a=exp(-dot(p,p)*5.);}
        vec3 c=mix(vCol.rgb,vec3(1.),.35*a*a);
        gl_FragColor=vec4(c,1.)*a*vCol.a;
      }`
    );
  } catch (err) {
    console.warn("[sparkle]", err);
    return;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const AU = {
    a: gl.getAttribLocation(aurora, "a"),
    res: gl.getUniformLocation(aurora, "uRes"),
    t: gl.getUniformLocation(aurora, "uT"),
    amt: gl.getUniformLocation(aurora, "uAmt"),
    c: [0, 1, 2].map((i) => gl.getUniformLocation(aurora, "uC" + i)),
  };
  const SP = {
    pos: gl.getAttribLocation(sprites, "aPos"),
    col: gl.getAttribLocation(sprites, "aCol"),
    misc: gl.getAttribLocation(sprites, "aMisc"),
    res: gl.getUniformLocation(sprites, "uRes"),
  };
  const MAX = 240,
    STRIDE = 9;
  const data = new Float32Array(MAX * STRIDE);
  const spriteBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spriteBuf);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  let dpr = 1,
    W = 0,
    H = 0;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = Math.round(innerWidth * dpr);
    H = Math.round(innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    gl.viewport(0, 0, W, H);
    wake();
  };

  const parts = [];
  const spawn = (x, y, burst) => {
    if (parts.length >= MAX) parts.shift();
    const shape = Math.random() < 0.18 ? 1 : Math.random() < 0.55 ? 0 : 2;
    const ang = Math.random() * Math.PI * 2;
    const sp = burst ? 60 + Math.random() * 160 : 10 + Math.random() * 30;
    parts.push({
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - (shape === 1 ? 30 : 0),
      life: 0,
      max: 0.8 + Math.random() * 0.7,
      size: (shape === 2 ? 9 + Math.random() * 9 : shape === 1 ? 16 + Math.random() * 10 : 22 + Math.random() * 18) * dpr,
      c: colors[(Math.random() * 3) | 0],
      shape,
      rot: shape === 1 ? (Math.random() - 0.5) * 0.5 : Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 3,
      tw: Math.random() * 6.28,
    });
    wake();
  };

  let last = null;
  const onMove = (e) => {
    if (e.pointerType === "touch") return;
    const x = e.clientX * dpr,
      y = e.clientY * dpr;
    if (!last) return void (last = { x, y });
    const d = Math.hypot(x - last.x, y - last.y);
    const step = 14 * dpr;
    if (d < step) return;
    const n = Math.min(3, Math.floor(d / step));
    for (let i = 1; i <= n; i++) spawn(last.x + ((x - last.x) * i) / n, last.y + ((y - last.y) * i) / n, false);
    last = { x, y };
  };
  const onDown = (e) => {
    for (let i = 0; i < (e.pointerType === "touch" ? 6 : 10); i++) spawn(e.clientX * dpr, e.clientY * dpr, true);
  };

  let raf = 0,
    prev = 0,
    lastAurora = 0;
  const t0 = performance.now();
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    const idle = !parts.length;
    if (idle && now - lastAurora < 33 && !reduce) return void (raf = requestAnimationFrame(frame));
    lastAurora = now;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (auroraAmt > 0) {
      gl.useProgram(aurora);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(AU.a);
      gl.vertexAttribPointer(AU.a, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(AU.res, W, H);
      gl.uniform1f(AU.t, reduce ? 20 : (now - t0) / 1000);
      gl.uniform1f(AU.amt, auroraAmt);
      AU.c.forEach((u, i) => gl.uniform3fv(u, colors[i]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(AU.a);
    }

    let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) {
        parts.splice(i, 1);
        continue;
      }
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + (p.shape === 1 ? -14 : 26) * dt;
      p.x += p.vx * dt * dpr;
      p.y += p.vy * dt * dpr;
      p.rot += p.spin * dt;
      const k = p.life / p.max;
      const fade = Math.min(1, k * 8) * (1 - k) * (1 - k);
      const tw = p.shape === 0 ? 0.65 + 0.35 * Math.sin(p.tw + p.life * 22) : 1;
      const o = n * STRIDE;
      data[o] = p.x;
      data[o + 1] = p.y;
      data[o + 2] = p.c[0];
      data[o + 3] = p.c[1];
      data[o + 4] = p.c[2];
      data[o + 5] = fade * tw;
      data[o + 6] = p.size * (p.shape === 0 ? 0.6 + 0.4 * (1 - k) : 1);
      data[o + 7] = p.shape;
      data[o + 8] = p.rot;
      n++;
    }
    if (n) {
      gl.useProgram(sprites);
      gl.bindBuffer(gl.ARRAY_BUFFER, spriteBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, n * STRIDE));
      const F = 4;
      gl.enableVertexAttribArray(SP.pos);
      gl.enableVertexAttribArray(SP.col);
      gl.enableVertexAttribArray(SP.misc);
      gl.vertexAttribPointer(SP.pos, 2, gl.FLOAT, false, STRIDE * F, 0);
      gl.vertexAttribPointer(SP.col, 4, gl.FLOAT, false, STRIDE * F, 2 * F);
      gl.vertexAttribPointer(SP.misc, 3, gl.FLOAT, false, STRIDE * F, 6 * F);
      gl.uniform2f(SP.res, W, H);
      gl.drawArrays(gl.POINTS, 0, n);
      gl.disableVertexAttribArray(SP.pos);
      gl.disableVertexAttribArray(SP.col);
      gl.disableVertexAttribArray(SP.misc);
    }
    if (!reduce || parts.length) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  const mount = () => {
    document.body.appendChild(canvas);
    resize();
    addEventListener("resize", resize, { passive: true });
    if (!reduce) {
      addEventListener("pointermove", onMove, { passive: true });
      addEventListener("pointerdown", onDown, { passive: true });
    }
  };
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
  });
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", mount, { once: true }) : mount();

  window.Sparkle = {
    status: () => ({ webgl: true, particles: parts.length, reducedMotion: reduce }),
    burst: (x, y, n = 18) => {
      if (!reduce) for (let i = 0; i < n; i++) spawn(x * dpr, y * dpr, true);
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onDown);
      canvas.remove();
      delete window.Sparkle;
    },
  };
})();
