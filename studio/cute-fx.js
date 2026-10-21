/*
 * CuteFX — five native WebGL effects for the Overnight landing page. No dependencies.
 *
 *   bg context      (behind content)  4. candy-aurora gradient mesh, palette per section
 *                                     1. glossy raymarched jelly metaballs in the hero rect
 *   overlay context (above content)   2. sparkle / star / heart cursor trail
 *                                     3. holographic sticker sheen on [data-sheen] cards
 *                                     5. confetti bursts (CuteFX.confetti)
 *
 * The overlay has to sit above the DOM while the aurora sits below it, so two contexts is the
 * minimum. The overlay is only created on first need. Everything pauses with the tab, the hero
 * jelly skips frames while the hero is offscreen, and the overlay stops drawing when idle.
 * Card tilt is driven from here (with or without WebGL) so the sheen quad matches the
 * CSS transform exactly.
 */
(() => {
  const params = new URLSearchParams(location.search);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fxOff = params.get("fx") === "off";
  const lockedQ = parseFloat(params.get("q")) || 0;
  const coarse = matchMedia("(pointer: coarse)").matches;

  const hex = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  /* aurora palettes: four blob colours + base, keyed by data-palette */
  const PALETTES = {
    hero: ["#ff9ccb", "#ffbe98", "#c8b2ff", "#ffe07a", "#fff3ea"],
    units: ["#c9b4ff", "#9fe9c7", "#ffa6d2", "#a5d3ff", "#f8f2ff"],
    backstage: ["#a2d0ff", "#cdb6ff", "#a3ecd0", "#ffb3d8", "#f1f6ff"],
    transform: ["#ffe07a", "#ffbe98", "#ffa6d2", "#a3ecd0", "#fff8e8"],
    work: ["#9fe9c7", "#a5d3ff", "#ffe07a", "#c9b4ff", "#effbf5"],
    contact: ["#ff9ccb", "#ffe07a", "#ffbe98", "#c9b4ff", "#fff0f5"],
  };
  const palRGB = Object.fromEntries(Object.entries(PALETTES).map(([k, v]) => [k, v.map(hex)]));

  const BALL_COLORS = ["#ff8fc4", "#bba2ff", "#86e6bd", "#ffd966", "#8ec9ff", "#ffad85"].map(hex);
  const SPARK_COLORS = ["#ff5fa2", "#9b7bff", "#3fb2ff", "#22c993", "#ff9a52", "#ffbf1f"].map(hex);

  /* ------------------------------------------------------------------ GL helpers */
  const VS_QUAD = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

  function program(gl, vs, fs) {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, "");
      u[name] = gl.getUniformLocation(p, name);
    }
    const a = {};
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < na; i++) {
      const name = gl.getActiveAttrib(p, i).name;
      a[name] = gl.getAttribLocation(p, name);
    }
    return { p, u, a };
  }

  function context(canvas, opts) {
    try {
      return canvas.getContext("webgl", {
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
        ...opts,
      });
    } catch {
      return null;
    }
  }

  const hp = (gl) => {
    const f = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    return f && f.precision > 0 ? "highp" : "mediump";
  };

  /* ------------------------------------------------------------------ shaders */
  const FS_AURORA = `
precision mediump float;
uniform vec2 uRes;uniform float uT,uPhase;
uniform vec3 uA,uB,uC,uD,uBase;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*n(p);p=p*2.03+17.;a*=.5;}return s;}
float blob(vec2 p,vec2 c,float k){vec2 d=p-c;return exp(-dot(d,d)*k);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;
  vec2 p=vec2(uv.x*asp,uv.y);
  float t=uT*.07,ph=uPhase*2.2;
  vec2 w=vec2(fbm(p*1.5+vec2(t,-t)),fbm(p*1.5+vec2(-t*.8,t)+5.2));
  p+=(w-.5)*.6;
  float w1=blob(p,vec2(asp*(.82+.1*sin(t*1.3+ph)),.84+.1*cos(t*1.1)),2.6);
  float w2=blob(p,vec2(asp*(.16+.12*cos(t*.9-ph)),.62+.14*sin(t*1.4+ph)),2.4);
  float w3=blob(p,vec2(asp*(.62+.16*sin(t*.7+1.+ph)),.16+.1*cos(t*1.2)),2.4);
  float w4=blob(p,vec2(asp*(.3+.1*sin(t*1.7+2.)),.1+.12*sin(t*.8-ph)),3.2);
  float k=.42;
  vec3 col=(uBase*k+uA*w1+uB*w2+uC*w3+uD*w4)/(k+w1+w2+w3+w4);
  col+=.03*sin(p.y*7.+w.x*7.+t*4.);
  col=mix(col,vec3(1.),.1*smoothstep(.2,1.,1.-uv.y));
  col+=(h(gl_FragCoord.xy+fract(uT*7.))-.5)*.022;
  gl_FragColor=vec4(col,1.);
}`;

  const fsJelly = (prec) => `
precision ${prec} float;
uniform vec2 uRes,uOrigin;uniform float uT;
uniform vec4 uB[6];uniform vec3 uCol[6];
const float F=6.;
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float map(vec3 p){
  float d=1e5;
  for(int i=0;i<6;i++)d=smin(d,length(p-uB[i].xyz)-uB[i].w,.2);
  return d+.012*sin(p.x*9.+uT*2.1)*sin(p.y*8.-uT*1.7)*sin(p.z*7.+uT*1.3);
}
vec3 nor(vec3 p){vec2 e=vec2(.004,-.004);
  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
vec3 tint(vec3 p){vec3 c=vec3(0.);float s=0.;
  for(int i=0;i<6;i++){float d=length(p-uB[i].xyz)-uB[i].w;float w=exp(-11.*clamp(d,-.3,2.));c+=uCol[i]*w;s+=w;}
  return c/s;}
void main(){
  vec2 fc=gl_FragCoord.xy-uOrigin;
  vec2 q=(fc-.5*uRes)/uRes.y*2.;
  vec3 ro=vec3(0.,0.,F),rd=normalize(vec3(q,-F));
  float t=F-1.,md=1e5,tm=t;bool hit=false;
  for(int i=0;i<44;i++){
    float d=map(ro+rd*t);
    if(d<md){md=d;tm=t;}
    if(d<.0015){hit=true;break;}
    t+=d*.92;if(t>F+1.)break;
  }
  float px=2.4/uRes.y;
  if(!hit&&md>px)discard;
  float a=hit?1.:smoothstep(px,0.,md);
  vec3 p=ro+rd*(hit?t:tm),n=nor(p),base=tint(p);
  vec3 L=normalize(vec3(-.45,.75,.55));
  float wrap=.5+.5*dot(n,L);
  float fr=pow(1.-clamp(dot(n,-rd),0.,1.),2.4);
  float sp=pow(clamp(dot(n,normalize(L-rd)),0.,1.),80.);
  float sp2=pow(clamp(dot(n,normalize(normalize(vec3(.7,-.35,.6))-rd)),0.,1.),14.);
  vec3 c=base*(.58+.52*wrap);
  c=mix(c,min(base*1.18+.12,1.),fr*.6);
  c*=1.-.16*clamp(-n.y,0.,1.)*(1.-fr);
  c+=sp*.9+sp2*.12;
  float bounce=pow(clamp(dot(n,vec3(0.,-1.,.2)),0.,1.),2.);
  c+=base*bounce*.12;
  gl_FragColor=vec4(c,a);
}`;

  const VS_PART = `
attribute vec2 aPos;attribute float aSize;attribute vec4 aCol;attribute vec2 aMisc;
uniform vec2 uRes;uniform float uDpr;
varying vec4 vCol;varying vec2 vMisc;
void main(){vec2 c=aPos/uRes*2.-1.;gl_Position=vec4(c.x,-c.y,0.,1.);
  gl_PointSize=aSize*uDpr;vCol=aCol;vMisc=aMisc;}`;
  const FS_PART = `
precision mediump float;
varying vec4 vCol;varying vec2 vMisc;
void main(){
  vec2 p=gl_PointCoord*2.-1.;p.y=-p.y;
  float glow=step(10.,vMisc.x);float shape=vMisc.x-glow*10.;
  float cs=cos(vMisc.y),sn=sin(vMisc.y);
  vec2 r=mat2(cs,-sn,sn,cs)*p*mix(1.,2.,glow);
  float R=length(r),s=0.;
  if(shape<.5){s=smoothstep(.5,.4,R);}
  else if(shape<1.5){float d=sqrt(abs(r.x))+sqrt(abs(r.y));s=smoothstep(.98,.86,d);}
  else if(shape<2.5){vec2 h=r*1.25;h.y+=.3;float f=pow(h.x*h.x+h.y*h.y-.6,3.)-h.x*h.x*h.y*h.y*h.y*.9;s=smoothstep(.012,-.012,f);}
  else if(shape<3.5){float an=atan(r.y,r.x);float rs=.4+.52*pow(abs(cos(an*2.5)),5.);s=smoothstep(rs,rs-.08,R*1.05);}
  else{s=step(abs(r.x),.62)*step(abs(r.y),.3);}
  float halo=glow*exp(-R*R*2.6)*.5;
  float a=max(s,halo);
  vec3 c=mix(vCol.rgb,vec3(1.),s*glow*smoothstep(.35,0.,R)*.75);
  a*=vCol.a;
  gl_FragColor=vec4(c*a,a);
}`;

  const VS_SHEEN = `
attribute vec4 aClip;attribute vec2 aUv;varying vec2 vUv;
void main(){gl_Position=aClip;vUv=aUv;}`;
  const FS_SHEEN = `
precision mediump float;
varying vec2 vUv;
uniform vec2 uSize,uPtr,uTilt;uniform float uR,uHover,uT,uBorder;
float rbox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float hash(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}
void main(){
  vec2 px=(vUv-.5)*uSize;
  float d=rbox(px,uSize*.5,uR);
  float mask=smoothstep(1.,-1.,d);
  float border=1.-smoothstep(uBorder-1.5,uBorder+1.,-d);
  vec2 dp=vUv-uPtr;
  float ang=dot(dp,normalize(vec2(1.,.65)))*1.4+uTilt.x*.8-uTilt.y*.6+uT*.04;
  vec3 rain=.5+.5*cos(6.2831*(ang+vec3(0.,.33,.67)));
  rain=mix(rain,vec3(1.),.25);
  float st=.5+.5*sin((vUv.x*1.2+vUv.y)*16.+uTilt.x*7.+uTilt.y*5.+uT*.3);
  st=st*st*st;
  vec2 g=floor(px/22.);float sp=hash(g);
  vec2 gc=(g+.5+.3*(vec2(hash(g+3.1),hash(g+7.7))-.5))*22.;
  float tw=step(.93,sp)*smoothstep(2.2,0.,length(px-gc))*(.5+.5*sin(uT*5.+sp*80.));
  float glare=exp(-dot(dp*vec2(uSize.x/uSize.y,1.),dp*vec2(uSize.x/uSize.y,1.))*6.);
  float aB=border*(.7+.3*st);
  float aI=(.025+.07*uHover)*(.3+.7*st)+glare*.2*uHover+tw*.8*uHover;
  float a=mask*max(aB,aI);
  vec3 c=mix(rain,vec3(1.),glare*.6*uHover);
  gl_FragColor=vec4(c*a,a);
}`;

  /* ------------------------------------------------------------------ state */
  const S = {
    started: false,
    bg: null,
    ov: null,
    hero: null,
    heroOn: true,
    sections: [],
    cards: [],
    pointer: { x: -1, y: -1, moved: 0, inside: false },
    t: reduce ? 14 : 0,
    last: 0,
    dirty: true,
    pal: palRGB.hero.map((c) => c.slice()),
    phase: 0,
    phaseTarget: 0,
    contexts: 0,
    frameMs: [],
  };

  /* ------------------------------------------------------------------ bg layer */
  function initBg(canvas) {
    const gl = context(canvas, { alpha: false, premultipliedAlpha: false });
    if (!gl) return null;
    let aurora, jelly;
    try {
      aurora = program(gl, VS_QUAD, FS_AURORA);
      jelly = program(gl, VS_QUAD, fsJelly(hp(gl)));
    } catch (e) {
      console.warn("[cute-fx] bg shaders failed", e);
      return null;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const L = {
      gl,
      canvas,
      aurora,
      jelly,
      buf,
      scale: lockedQ || Math.min(devicePixelRatio || 1, 1.5),
      lost: false,
      balls: makeBalls(),
    };
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      L.lost = true;
      document.body.classList.remove("gl");
    });
    S.contexts++;
    return L;
  }

  function makeBalls() {
    const spec = [
      [-0.66, 0.4, -0.1, 0.23],
      [0.58, 0.56, 0.05, 0.17],
      [0.7, -0.4, 0.1, 0.25],
      [-0.5, -0.55, 0.0, 0.15],
      [0.04, 0.86, -0.2, 0.12],
      [0.95, 0.08, 0.25, 0.19],
    ];
    return spec.map(([ax, ay, az, r], i) => ({
      ax,
      ay,
      az,
      r,
      x: ax,
      y: ay - 1.4,
      z: az,
      vx: 0,
      vy: 0,
      ph: i * 1.7,
      cursor: i === 5,
    }));
  }

  function resizeLayer(L, scale) {
    const w = Math.max(1, Math.round(innerWidth * scale));
    const h = Math.max(1, Math.round(innerHeight * scale));
    if (L.canvas.width !== w || L.canvas.height !== h) {
      L.canvas.width = w;
      L.canvas.height = h;
      S.dirty = true;
    }
  }

  function heroGeometry() {
    const r = S.hero.getBoundingClientRect();
    const stage = S.hero.querySelector(".hero-stage");
    const sr = stage ? stage.getBoundingClientRect() : r;
    return { top: r.top, h: r.height, cx: sr.left + sr.width / 2, cy: sr.top + sr.height / 2, sh: sr.height };
  }

  function stepBalls(L, g, dt) {
    const vw = innerWidth;
    const toWorld = (x, y) => [((x - vw / 2) / g.h) * 2, (-(y - g.top - g.h / 2) / g.h) * 2];
    const [scx, scy] = toWorld(g.cx, g.cy);
    const spread = Math.max(0.6, Math.min(1.25, (g.sh / g.h) * 1.7));
    const p = S.pointer;
    const live = p.inside && performance.now() - p.moved < 2500;
    const [mx, my] = live ? toWorld(p.x, p.y) : [scx, scy];
    const t = S.t;
    for (const b of L.balls) {
      const axw = scx + b.ax * spread;
      const ayw = scy + b.ay * spread;
      let tx = axw + 0.07 * Math.sin(t * 0.9 + b.ph);
      let ty = ayw + 0.07 * Math.cos(t * 0.7 + b.ph * 1.3);
      if (b.cursor && live) {
        tx = mx;
        ty = my;
      } else if (live) {
        tx += (mx - axw) * 0.14;
        ty += (my - ayw) * 0.14;
      }
      if (reduce) {
        b.x = tx;
        b.y = ty;
        continue;
      }
      const k = b.cursor ? 70 : 34;
      b.vx += (tx - b.x) * k * dt;
      b.vy += (ty - b.y) * k * dt;
      const damp = Math.exp(-(b.cursor ? 7.5 : 5) * dt);
      b.vx *= damp;
      b.vy *= damp;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  }

  function drawBg(dt) {
    const L = S.bg;
    if (!L || L.lost) return;
    const gl = L.gl;
    resizeLayer(L, L.scale);
    const W = L.canvas.width,
      H = L.canvas.height;
    gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, L.buf);

    const A = L.aurora;
    gl.useProgram(A.p);
    gl.enableVertexAttribArray(A.a.p);
    gl.vertexAttribPointer(A.a.p, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(A.u.uRes, W, H);
    gl.uniform1f(A.u.uT, S.t);
    gl.uniform1f(A.u.uPhase, S.phase);
    ["uA", "uB", "uC", "uD", "uBase"].forEach((k, i) => gl.uniform3fv(A.u[k], S.pal[i]));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!S.hero || !S.heroOn) return;
    const g = heroGeometry();
    if (g.top + g.h < 0 || g.top > innerHeight) return;
    stepBalls(L, g, dt);
    const J = L.jelly;
    const s = L.scale;
    const vx = 0,
      vy = Math.round((innerHeight - (g.top + g.h)) * s),
      vw = W,
      vh = Math.round(g.h * s);
    gl.viewport(vx, vy, vw, vh);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(J.p);
    gl.enableVertexAttribArray(J.a.p);
    gl.vertexAttribPointer(J.a.p, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(J.u.uRes, vw, vh);
    gl.uniform2f(J.u.uOrigin, vx, vy);
    gl.uniform1f(J.u.uT, S.t);
    const bd = new Float32Array(24),
      cd = new Float32Array(18);
    L.balls.forEach((b, i) => {
      const wob = reduce ? 1 : 1 + 0.06 * Math.sin(S.t * 2.2 + b.ph);
      const sq = Math.min(0.12, Math.hypot(b.vx, b.vy) * 0.04);
      bd.set([b.x, b.y, b.z, b.r * wob * (1 - sq * 0.5) * (innerWidth < 820 ? 0.85 : 1)], i * 4);
      cd.set(BALL_COLORS[i], i * 3);
    });
    gl.uniform4fv(J.u.uB, bd);
    gl.uniform3fv(J.u.uCol, cd);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* palette blend from scroll position */
  function updatePalette(dt) {
    if (!S.sections.length) return;
    const mid = innerHeight * 0.5;
    let idx = 0,
      blend = 0;
    for (let i = 0; i < S.sections.length; i++) {
      const r = S.sections[i].getBoundingClientRect();
      if (r.top <= mid) {
        idx = i;
        const f = (mid - r.top) / Math.max(1, r.height);
        blend = Math.max(0, Math.min(1, (f - 0.65) / 0.35));
      }
    }
    const a = palRGB[S.sections[idx].dataset.palette] || palRGB.hero;
    const nx = S.sections[Math.min(idx + 1, S.sections.length - 1)];
    const b = palRGB[nx.dataset.palette] || a;
    const e = blend * blend * (3 - 2 * blend);
    const k = reduce ? 1 : 1 - Math.exp(-dt * 2.5);
    for (let i = 0; i < 5; i++)
      for (let c = 0; c < 3; c++) {
        const target = a[i][c] + (b[i][c] - a[i][c]) * e;
        S.pal[i][c] += (target - S.pal[i][c]) * k;
      }
    S.phaseTarget = idx + e;
    S.phase += (S.phaseTarget - S.phase) * k;
  }

  /* ------------------------------------------------------------------ overlay layer */
  const MAXP = 700,
    STRIDE = 9;
  const parts = [];
  const pdata = new Float32Array(MAXP * STRIDE);

  function initOverlay() {
    if (S.ov !== null || fxOff) return S.ov;
    const canvas = document.getElementById("fx-gl");
    const gl = canvas && context(canvas, { alpha: true, premultipliedAlpha: true });
    if (!gl) return (S.ov = false);
    let part, sheen;
    try {
      part = program(gl, VS_PART, FS_PART);
      sheen = program(gl, VS_SHEEN, FS_SHEEN);
    } catch (e) {
      console.warn("[cute-fx] overlay shaders failed", e);
      return (S.ov = false);
    }
    const pbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pbuf);
    gl.bufferData(gl.ARRAY_BUFFER, pdata.byteLength, gl.DYNAMIC_DRAW);
    const sbuf = gl.createBuffer();
    S.ov = {
      gl,
      canvas,
      part,
      sheen,
      pbuf,
      sbuf,
      scale: Math.min(devicePixelRatio || 1, 1.5),
      lost: false,
      clear: true,
    };
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      S.ov.lost = true;
    });
    S.contexts++;
    return S.ov;
  }

  function spawn(o) {
    if (parts.length >= MAXP) parts.shift();
    parts.push(o);
  }

  function emitTrail(x, y, dx, dy) {
    const r = Math.random();
    const shape = r < 0.5 ? 1 : r < 0.72 ? 2 : r < 0.9 ? 3 : 0;
    const life = 0.7 + Math.random() * 0.6;
    spawn({
      x,
      y,
      vx: (Math.random() - 0.5) * 60 - dx * 2,
      vy: (Math.random() - 0.5) * 60 - 30 - dy * 2,
      g: -20,
      drag: 2.2,
      size: (shape === 1 ? 44 : 34) + Math.random() * 18,
      col: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
      shape: shape + 10,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 4,
      life,
      max: life,
      tw: Math.random() * 6.28,
    });
  }

  function confetti(x, y, n = 90) {
    if (reduce || fxOff || !initOverlay()) return;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const sp = 380 + Math.random() * 620;
      const r = Math.random();
      const shape = r < 0.42 ? 4 : r < 0.64 ? 2 : r < 0.84 ? 3 : 0;
      const life = 1.6 + Math.random() * 1.1;
      spawn({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        g: 1100,
        drag: 1.6,
        size: (shape === 4 ? 16 : 18) + Math.random() * 10,
        col: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
        shape,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 14,
        life,
        max: life,
        tw: 0,
      });
    }
    wake();
  }

  /* card tilt + sheen geometry */
  const PERSP = 1000;
  function cardCorners(c, r) {
    const rx = (c.rx * Math.PI) / 180,
      ry = (c.ry * Math.PI) / 180;
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2 - c.lift;
    const hw = (r.width / 2) * c.s,
      hh = (r.height / 2) * c.s;
    const cX = Math.cos(rx),
      sX = Math.sin(rx),
      cY = Math.cos(ry),
      sY = Math.sin(ry);
    const W = innerWidth,
      H = innerHeight;
    return [
      [-1, -1, 0, 0],
      [1, -1, 1, 0],
      [-1, 1, 0, 1],
      [1, 1, 1, 1],
    ].map(([sx, sy, u, v]) => {
      const x = sx * hw,
        y = sy * hh;
      const x1 = x * cY,
        z1 = -x * sY;
      const y2 = y * cX - z1 * sX,
        z2 = y * sX + z1 * cX;
      const w = 1 - z2 / PERSP;
      const px = cx + x1 / w,
        py = cy + y2 / w;
      return [(px / W) * 2 - 1, 1 - (py / H) * 2, w, u, v];
    });
  }

  function registerCards(els) {
    for (const el of els) {
      const wrap = el.parentElement;
      const c = { el, wrap, rx: 0, ry: 0, trx: 0, try: 0, hover: 0, th: 0, s: 1, lift: 0, px: 0.5, py: 0.3, tpx: 0.5, tpy: 0.3, set: "" };
      if (!reduce) {
        wrap.addEventListener("pointermove", (e) => {
          const r = wrap.getBoundingClientRect();
          const u = (e.clientX - r.left) / r.width,
            v = (e.clientY - r.top) / r.height;
          c.tpx = u;
          c.tpy = v;
          c.try = (u - 0.5) * 14;
          c.trx = -(v - 0.5) * 12;
          c.th = 1;
          wake();
        });
        wrap.addEventListener("pointerleave", () => {
          c.trx = c.try = 0;
          c.th = 0;
          wake();
        });
      }
      S.cards.push(c);
    }
  }

  function stepCards(dt) {
    const k = 1 - Math.exp(-dt * 10);
    let moving = false;
    for (const c of S.cards) {
      c.rx += (c.trx - c.rx) * k;
      c.ry += (c.try - c.ry) * k;
      c.hover += (c.th - c.hover) * k;
      if (c.th) {
        c.px += (c.tpx - c.px) * k;
        c.py += (c.tpy - c.py) * k;
      } else {
        c.px = 0.5 + 0.35 * Math.sin(S.t * 0.35 + c.wrap.offsetTop * 0.01);
        c.py = 0.3 + 0.2 * Math.cos(S.t * 0.3);
      }
      c.lift = c.hover * 8;
      c.s = 1 + c.hover * 0.015;
      const str = `translateY(${-c.lift.toFixed(2)}px) perspective(${PERSP}px) rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg) scale(${c.s.toFixed(4)})`;
      if (Math.abs(c.trx - c.rx) + Math.abs(c.try - c.ry) + Math.abs(c.th - c.hover) > 0.002) moving = true;
      if (str !== c.set) {
        c.el.style.transform = c.hover < 0.001 && Math.abs(c.rx) + Math.abs(c.ry) < 0.001 ? "" : str;
        c.el.style.setProperty("--sheen", c.px.toFixed(3));
        c.set = str;
      }
    }
    return moving;
  }

  function drawOverlay(dt) {
    const O = S.ov;
    if (!O || O.lost) return false;
    const gl = O.gl;

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }

    const visible = [];
    if (!S.cards.length || !S.sheenOn) {
      /* nothing */
    } else {
      for (const c of S.cards) {
        const r = c.wrap.getBoundingClientRect();
        if (r.bottom > -40 && r.top < innerHeight + 40 && r.width > 0) visible.push([c, r]);
      }
    }
    if (!parts.length && !visible.length) {
      if (O.clear) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        O.clear = false;
      }
      return false;
    }
    O.clear = true;
    resizeLayer(O, O.scale);
    const W = O.canvas.width,
      H = O.canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    if (visible.length) {
      const P = O.sheen;
      gl.useProgram(P.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, O.sbuf);
      gl.enableVertexAttribArray(P.a.aClip);
      gl.enableVertexAttribArray(P.a.aUv);
      gl.vertexAttribPointer(P.a.aClip, 4, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(P.a.aUv, 2, gl.FLOAT, false, 24, 16);
      gl.uniform1f(P.u.uT, S.t);
      for (const [c, r] of visible) {
        const q = cardCorners(c, r);
        const v = new Float32Array(36);
        [0, 1, 2, 2, 1, 3].forEach((ci, i) => {
          const [nx, ny, w, u, vv] = q[ci];
          v.set([nx * w, ny * w, 0, w, u, vv], i * 6);
        });
        gl.bufferData(gl.ARRAY_BUFFER, v, gl.STREAM_DRAW);
        const radius = parseFloat(getComputedStyle(c.el).borderTopLeftRadius) || 40;
        gl.uniform2f(P.u.uSize, r.width, r.height);
        gl.uniform1f(P.u.uR, radius);
        gl.uniform1f(P.u.uBorder, parseFloat(getComputedStyle(c.el).borderTopWidth) || 6);
        gl.uniform2f(P.u.uPtr, c.px, c.py);
        gl.uniform2f(P.u.uTilt, c.ry / 14, c.rx / 12);
        gl.uniform1f(P.u.uHover, c.hover);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.disableVertexAttribArray(P.a.aClip);
      gl.disableVertexAttribArray(P.a.aUv);
    }

    if (parts.length) {
      const P = O.part;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const f = p.life / p.max;
        const glow = p.shape >= 10;
        const tw = glow ? 0.75 + 0.25 * Math.sin(S.t * 18 + p.tw) : 1;
        const size = p.size * (glow ? Math.min(1, f * 1.6) * tw : 1);
        const alpha = glow ? Math.min(1, f * 1.4) : Math.min(1, f * 2.5);
        pdata.set([p.x, p.y, size, p.col[0], p.col[1], p.col[2], alpha, p.shape, p.rot], i * STRIDE);
      }
      gl.useProgram(P.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, O.pbuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pdata.subarray(0, parts.length * STRIDE));
      const st = STRIDE * 4;
      gl.enableVertexAttribArray(P.a.aPos);
      gl.vertexAttribPointer(P.a.aPos, 2, gl.FLOAT, false, st, 0);
      gl.enableVertexAttribArray(P.a.aSize);
      gl.vertexAttribPointer(P.a.aSize, 1, gl.FLOAT, false, st, 8);
      gl.enableVertexAttribArray(P.a.aCol);
      gl.vertexAttribPointer(P.a.aCol, 4, gl.FLOAT, false, st, 12);
      gl.enableVertexAttribArray(P.a.aMisc);
      gl.vertexAttribPointer(P.a.aMisc, 2, gl.FLOAT, false, st, 28);
      gl.uniform2f(P.u.uRes, innerWidth, innerHeight);
      gl.uniform1f(P.u.uDpr, O.scale);
      gl.drawArrays(gl.POINTS, 0, parts.length);
      [P.a.aPos, P.a.aSize, P.a.aCol, P.a.aMisc].forEach((a) => gl.disableVertexAttribArray(a));
    }
    return true;
  }

  /* ------------------------------------------------------------------ loop */
  let raf = 0;
  function wake() {
    if (!raf && S.started) raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, S.last ? (now - S.last) / 1000 : 0.016);
    S.last = now;
    if (!reduce) S.t += dt;

    const cardsMoving = stepCards(dt);
    updatePalette(dt);

    const bgNeeded = S.bg && !S.bg.lost && (!reduce || S.dirty);
    if (bgNeeded) {
      const t0 = performance.now();
      drawBg(dt);
      if (!lockedQ && !reduce) adapt(performance.now() - t0, now);
    }
    S.dirty = false;
    const ovBusy = drawOverlay(dt);

    if (!reduce || cardsMoving || (ovBusy && parts.length)) raf = requestAnimationFrame(frame);
    else S.last = 0;
  }

  function adapt(ms, now) {
    const L = S.bg;
    S.frameMs.push(ms);
    if (S.frameMs.length < 24) return;
    const avg = S.frameMs.reduce((a, b) => a + b, 0) / S.frameMs.length;
    S.frameMs.length = 0;
    if (avg > 22 && L.scale > 0.5) L.scale = Math.max(0.5, L.scale * 0.8);
    else if (avg < 7 && L.scale < Math.min(devicePixelRatio || 1, 1.5)) L.scale = Math.min(1.5, L.scale * 1.1);
  }

  /* ------------------------------------------------------------------ public */
  function start({ hero, sections, cards }) {
    if (S.started) return status();
    S.started = true;
    S.hero = hero;
    S.sections = sections || [];
    registerCards(cards || []);
    S.sheenOn = !fxOff;

    if (!fxOff) S.bg = initBg(document.getElementById("bg-gl"));
    if (S.bg) document.body.classList.add("gl");

    const markDirty = () => {
      S.dirty = true;
      wake();
    };
    addEventListener("resize", markDirty, { passive: true });
    addEventListener("scroll", markDirty, { passive: true });

    if (!fxOff && !reduce) {
      let lx = -1,
        ly = -1,
        acc = 0;
      addEventListener(
        "pointermove",
        (e) => {
          const p = S.pointer;
          p.x = e.clientX;
          p.y = e.clientY;
          p.moved = performance.now();
          const hr = hero.getBoundingClientRect();
          p.inside = e.clientY >= hr.top && e.clientY <= hr.bottom;
          if (coarse && e.pointerType === "touch") return;
          if (!initOverlay()) return;
          if (lx < 0) {
            lx = e.clientX;
            ly = e.clientY;
          }
          const dx = e.clientX - lx,
            dy = e.clientY - ly;
          acc += Math.hypot(dx, dy);
          const steps = Math.min(4, Math.floor(acc / 16));
          for (let i = 0; i < steps; i++) {
            const f = (i + 1) / steps;
            emitTrail(lx + dx * f, ly + dy * f, dx / 16, dy / 16);
          }
          if (steps) {
            acc = 0;
            lx = e.clientX;
            ly = e.clientY;
          }
          wake();
        },
        { passive: true }
      );
    }

    if (S.cards.length && !fxOff) {
      const io = new IntersectionObserver(
        (en) => {
          if (en.some((x) => x.isIntersecting)) {
            initOverlay();
            wake();
            io.disconnect();
          }
        },
        { rootMargin: "200px" }
      );
      S.cards.forEach((c) => io.observe(c.wrap));
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        S.last = 0;
        wake();
      }
    });
    wake();
    return status();
  }

  function status() {
    return {
      webgl: !!S.bg,
      contexts: S.contexts,
      scale: S.bg ? +S.bg.scale.toFixed(2) : 0,
      particles: parts.length,
    };
  }

  window.CuteFX = {
    start,
    confetti,
    status,
    setHeroScene(on) {
      S.heroOn = on;
      S.dirty = true;
      wake();
    },
    pointer: S.pointer,
  };
})();
