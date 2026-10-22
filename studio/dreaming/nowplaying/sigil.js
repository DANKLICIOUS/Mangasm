// Rotating gold sigil on a 2D canvas. Static layers are pre-rendered once per size (glow is expensive),
// then composited each frame at different rotation speeds.

const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function gold(ctx, r) {
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, "#8a6526");
  g.addColorStop(0.3, "#f6dc93");
  g.addColorStop(0.55, "#b88a35");
  g.addColorStop(0.8, "#ffe9b0");
  g.addColorStop(1, "#7a5820");
  return g;
}

function layer(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.translate(size / 2, size / 2);
  draw(ctx, size / 2);
  return c;
}

function circle(ctx, r, w) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
}

function rune(ctx, rand, h) {
  const w = h * 0.55;
  const pts = [
    [0, -h / 2],
    [0, h / 2],
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [-w / 2, 0],
    [w / 2, 0],
    [-w / 2, h / 2],
    [w / 2, h / 2],
  ];
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(0, h / 2);
  const strokes = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < strokes; i++) {
    const a = pts[Math.floor(rand() * pts.length)];
    const b = pts[Math.floor(rand() * pts.length)];
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
}

function outerLayer(ctx, R) {
  ctx.strokeStyle = gold(ctx, R);
  ctx.shadowColor = "rgba(240, 190, 90, 0.55)";
  ctx.shadowBlur = R * 0.02;
  circle(ctx, R * 0.97, R * 0.006);
  circle(ctx, R * 0.94, R * 0.003);
  circle(ctx, R * 0.79, R * 0.004);
  for (let i = 0; i < 144; i++) {
    const a = (i / 144) * TAU;
    const long = i % 6 === 0;
    ctx.lineWidth = long ? R * 0.005 : R * 0.0025;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94);
    ctx.lineTo(Math.cos(a) * R * (long ? 0.895 : 0.915), Math.sin(a) * R * (long ? 0.895 : 0.915));
    ctx.stroke();
  }
  const rand = rng(26);
  ctx.lineWidth = R * 0.0045;
  ctx.lineCap = "round";
  const n = 36;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -R * 0.845);
    rune(ctx, rand, R * 0.05);
    ctx.restore();
  }
}

function midLayer(ctx, R) {
  ctx.strokeStyle = gold(ctx, R);
  ctx.shadowColor = "rgba(240, 190, 90, 0.5)";
  ctx.shadowBlur = R * 0.018;
  ctx.lineJoin = "round";
  for (const rot of [0, Math.PI]) {
    ctx.lineWidth = R * 0.005;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = rot - Math.PI / 2 + (i / 3) * TAU;
      ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * R * 0.76, Math.sin(a) * R * 0.76);
    }
    ctx.closePath();
    ctx.stroke();
  }
  circle(ctx, R * 0.38, R * 0.004);
  ctx.setLineDash([R * 0.012, R * 0.02]);
  circle(ctx, R * 0.6, R * 0.003);
  ctx.setLineDash([]);
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * TAU;
    const x = Math.cos(a) * R * 0.76;
    const y = Math.sin(a) * R * 0.76;
    ctx.fillStyle = "#07070a";
    ctx.beginPath();
    ctx.arc(x, y, R * 0.04, 0, TAU);
    ctx.fill();
    circle2(ctx, x, y, R * 0.04, R * 0.004);
    circle2(ctx, x, y, R * 0.018, R * 0.003);
  }
}

function circle2(ctx, x, y, r, w) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
}

function innerLayer(ctx, R) {
  ctx.strokeStyle = gold(ctx, R);
  ctx.shadowColor = "rgba(90, 230, 220, 0.45)";
  ctx.shadowBlur = R * 0.02;
  ctx.lineWidth = R * 0.004;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const r = i % 2 ? R * 0.2 : R * 0.36;
    ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42);
    ctx.lineTo(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56);
    ctx.stroke();
  }
}

export function createSigil(canvas, { reducedMotion = false } = {}) {
  const ctx = canvas.getContext("2d");
  let layers = null;
  let size = 0;
  let pulse = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const css = canvas.clientWidth || 600;
    const next = Math.round(css * dpr);
    if (next === size) return;
    size = canvas.width = canvas.height = next;
    layers = [layer(size, outerLayer), layer(size, midLayer), layer(size, innerLayer)];
  }

  function draw(t = 0) {
    if (!layers) resize();
    const s = size;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, s, s);
    const glow = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    glow.addColorStop(0, `rgba(40, 200, 190, ${0.1 + pulse * 0.08})`);
    glow.addColorStop(0.45, "rgba(200, 150, 60, 0.06)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, s, s);
    const speeds = reducedMotion ? [0, 0, 0] : [0.02, -0.035, 0.06];
    layers.forEach((l, i) => {
      ctx.setTransform(1, 0, 0, 1, s / 2, s / 2);
      ctx.rotate(t * speeds[i]);
      ctx.globalAlpha = i === 2 ? 0.8 + pulse * 0.2 : 1;
      ctx.drawImage(l, -s / 2, -s / 2);
    });
    ctx.globalAlpha = 1;
  }

  return {
    resize,
    draw,
    setPulse(v) {
      pulse = v;
    },
  };
}
