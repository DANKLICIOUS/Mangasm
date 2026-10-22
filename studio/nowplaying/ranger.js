// RANGER-26: an original procedural humanoid built from three.js primitives (no model files).
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/+esm";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js/+esm";
import { RoundedBoxGeometry } from "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm";

const TURQ = new THREE.Color("#3ff0dc");
const GOLD = new THREE.Color("#f2c66a");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function taper(len, r0, r1, bulge = 0, cap = 0.12, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    let r = (r1 + (r0 - r1) * u) * (1 + bulge * Math.sin(Math.PI * u));
    if (u < cap) r *= Math.sqrt(1 - ((cap - u) / cap) ** 2);
    if (u > 1 - cap) r *= Math.sqrt(1 - ((u - (1 - cap)) / cap) ** 2);
    pts.push(new THREE.Vector2(Math.max(r, 0.0004), -len + len * u));
  }
  return pts;
}

const profile = (pairs) => pairs.map(([r, y]) => new THREE.Vector2(r, y));

function glowTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.25, outer);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sprite(tex, color, size, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  s.scale.set(size, size, 1);
  return s;
}

export async function createRanger(
  container,
  { np, reducedMotion = false, onFloor, onAction } = {}
) {
  const canvas = document.createElement("canvas");
  canvas.className = "np-robot-gl";
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "RANGER-26, an interactive humanoid robot. Press W to wave, F to fly, I for intelligence mode."
  );
  container.append(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.34;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);

  const key = new THREE.DirectionalLight(0xfff4e6, 1.35);
  key.position.set(3.6, 3.6, 2.0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -1.4,
    right: 1.4,
    top: 2.4,
    bottom: -0.4,
    near: 0.5,
    far: 12,
  });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const rimGold = new THREE.DirectionalLight(GOLD, 5);
  rimGold.position.set(-3.2, 2.4, -2.2);
  const rimTurq = new THREE.DirectionalLight(TURQ, 4.5);
  rimTurq.position.set(3.2, 1.6, -2.2);
  const fill = new THREE.HemisphereLight(0x9fd8ff, 0x1a1208, 0.18);
  scene.add(key, key.target, rimGold, rimTurq, fill);

  // ---------- materials ----------
  const M = {
    shell: new THREE.MeshPhysicalMaterial({
      color: 0xd9d9dc,
      roughness: 0.36,
      metalness: 0,
      clearcoat: 0.85,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
    }),
    graphite: new THREE.MeshPhysicalMaterial({
      color: 0x2a2c31,
      roughness: 0.34,
      metalness: 0.8,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
    }),
    joint: new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.45, metalness: 0.7 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd6a84e, roughness: 0.26, metalness: 1 }),
    led: new THREE.MeshBasicMaterial({ color: TURQ, toneMapped: false }),
    ledGold: new THREE.MeshBasicMaterial({ color: GOLD, toneMapped: false }),
  };

  const face = document.createElement("canvas");
  face.width = 384;
  face.height = 224;
  const fctx = face.getContext("2d");
  const faceTex = new THREE.CanvasTexture(face);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = 4;
  M.visor = new THREE.MeshPhysicalMaterial({
    color: 0x030304,
    roughness: 0.07,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    emissive: 0xffffff,
    emissiveMap: faceTex,
    emissiveIntensity: 1.5,
  });

  const wristC = document.createElement("canvas");
  wristC.width = 128;
  wristC.height = 96;
  const wctx = wristC.getContext("2d");
  const wristTex = new THREE.CanvasTexture(wristC);
  wristTex.colorSpace = THREE.SRGBColorSpace;

  const mesh = (geo, mat, parent, pos, opts = {}) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (opts.scale) m.scale.set(...opts.scale);
    if (opts.rot) m.rotation.set(...opts.rot);
    m.castShadow = opts.shadow !== false;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const group = (parent, pos = [0, 0, 0]) => {
    const g = new THREE.Group();
    g.position.set(...pos);
    parent.add(g);
    return g;
  };
  const lathe = (pts, seg = 48, start = 0, len = Math.PI * 2) =>
    new THREE.LatheGeometry(pts, seg, start, len);
  const sphere = (r, w = 32, h = 20) => new THREE.SphereGeometry(r, w, h);
  const torus = (r, t, rs = 12, ts = 64) => new THREE.TorusGeometry(r, t, rs, ts);
  // White cover shell split open along `gapAt` (lathe angle; 0 = front) over a graphite core, like a panel seam.
  // The shell stops short of the next joint (`cover`) so the graphite core and joint read as separate parts.
  const limb = (
    parent,
    pos,
    len,
    r0,
    r1,
    bulge,
    gapAt,
    gap = 0.9,
    scale = [1, 1, 1],
    cover = 0.8
  ) => {
    mesh(lathe(taper(len, r0 * 0.74, r1 * 0.8, 0, 0.1), 32), M.graphite, parent, pos, { scale });
    const sl = len * cover;
    mesh(
      lathe(taper(sl, r0, mix(r0, r1, cover), bulge, 0.1), 56, gapAt + gap / 2, Math.PI * 2 - gap),
      M.shell,
      parent,
      pos,
      { scale }
    );
    mesh(
      torus(mix(r0, r1, cover) * 0.93, 0.0035, 8, 48),
      M.gold,
      parent,
      [pos[0], pos[1] - sl * 0.93, pos[2]],
      {
        rot: [Math.PI / 2, 0, 0],
        scale: [scale[0], scale[2], 1],
        shadow: false,
      }
    );
  };

  const glowTurq = glowTexture("rgba(220,255,250,1)", "rgba(63,240,220,0.55)");
  const glowGold = glowTexture("rgba(255,245,215,1)", "rgba(242,198,106,0.5)");

  // ---------- rig ----------
  const root = group(scene);
  const hips = group(root, [0, 0.99, 0]);
  mesh(
    lathe(
      profile([
        [0, -0.085],
        [0.06, -0.083],
        [0.105, -0.06],
        [0.128, -0.02],
        [0.132, 0.02],
        [0.12, 0.05],
        [0.095, 0.062],
        [0, 0.062],
      ])
    ),
    M.graphite,
    hips,
    null,
    { scale: [1, 1, 0.76] }
  );
  // White hip plates with a graphite centre seam.
  for (const s of [-1, 1])
    mesh(
      lathe(
        profile([
          [0.1, -0.06],
          [0.124, -0.03],
          [0.134, 0.0],
          [0.13, 0.03],
          [0.11, 0.055],
        ]),
        32,
        s > 0 ? 0.12 : Math.PI + 0.12,
        Math.PI - 0.24
      ),
      M.shell,
      hips,
      [0, 0, 0],
      { scale: [1.02, 1, 0.8] }
    );
  mesh(torus(0.128, 0.006), M.gold, hips, [0, 0.045, 0], {
    rot: [Math.PI / 2, 0, 0],
    scale: [1, 0.78, 1],
  });

  const spine = group(hips, [0, 0.065, 0]);
  mesh(new THREE.CylinderGeometry(0.092, 0.1, 0.15, 40), M.joint, spine, [0, 0.06, 0], {
    scale: [1, 1, 0.78],
  });
  for (let i = 0; i < 4; i++)
    mesh(torus(0.1 - i * 0.002, 0.008, 10, 64), M.graphite, spine, [0, 0.012 + i * 0.034, 0], {
      rot: [Math.PI / 2, 0, 0],
      scale: [1, 0.78, 1],
    });

  const chest = group(spine, [0, 0.125, 0]);
  const chestProfile = [
    [0, 0],
    [0.108, 0],
    [0.12, 0.03],
    [0.146, 0.1],
    [0.186, 0.19],
    [0.222, 0.27],
    [0.232, 0.31],
    [0.218, 0.35],
    [0.182, 0.385],
    [0.12, 0.405],
    [0.06, 0.412],
    [0, 0.413],
  ];
  mesh(lathe(profile(chestProfile), 64), M.shell, chest, null, { scale: [1, 1, 0.64] });
  mesh(torus(0.12, 0.009), M.graphite, chest, [0, 0.006, 0], {
    rot: [Math.PI / 2, 0, 0],
    scale: [1, 0.72, 1],
  });
  // Graphite sternum inlay and gold collar.
  const inlay = (start, len, mat) =>
    mesh(
      lathe(
        profile(chestProfile.slice(2, 9).map(([r, y]) => [r * 1.012 + 0.001, y])),
        12,
        start,
        len
      ),
      mat,
      chest,
      null,
      { scale: [1, 1, 0.64] }
    );
  inlay(-0.07, 0.14, M.graphite);
  inlay(Math.PI / 2 - 0.05, 0.1, M.graphite);
  inlay(-Math.PI / 2 - 0.05, 0.1, M.graphite);
  mesh(torus(0.085, 0.01), M.gold, chest, [0, 0.4, 0], {
    rot: [Math.PI / 2, 0, 0],
    scale: [1, 0.8, 1],
  });
  const core = mesh(new THREE.CircleGeometry(0.014, 6), M.led, chest, [0, 0.3, 0.1495], {
    shadow: false,
  });
  core.rotation.z = Math.PI / 6;
  const coreGlow = sprite(glowTurq, TURQ, 0.075, 0.5);
  coreGlow.position.set(0, 0.3, 0.16);
  chest.add(coreGlow);

  const neck = group(chest, [0, 0.4, 0]);
  mesh(new THREE.CylinderGeometry(0.036, 0.046, 0.1, 24), M.joint, neck, [0, 0.04, 0]);
  mesh(torus(0.041, 0.006), M.graphite, neck, [0, 0.03, 0], { rot: [Math.PI / 2, 0, 0] });
  mesh(torus(0.038, 0.006), M.graphite, neck, [0, 0.06, 0], { rot: [Math.PI / 2, 0, 0] });

  const head = group(neck, [0, 0.105, 0]);
  const headPts = [
    [0, -0.112],
    [0.045, -0.108],
    [0.078, -0.085],
    [0.098, -0.045],
    [0.106, 0],
    [0.108, 0.04],
    [0.1, 0.078],
    [0.078, 0.106],
    [0.042, 0.122],
    [0, 0.127],
  ];
  head.scale.setScalar(1.12);
  mesh(lathe(profile(headPts), 64), M.shell, head, null, { scale: [0.94, 1, 1.04] });
  const visorPts = profile([
    [0.07, -0.096],
    [0.088, -0.075],
    [0.101, -0.045],
    [0.108, -0.01],
    [0.11, 0.025],
    [0.106, 0.058],
    [0.094, 0.084],
  ]);
  mesh(lathe(visorPts, 56, -1.32, 2.64), M.visor, head, [0, -0.002, 0.004], {
    scale: [0.96, 1, 1.07],
  });
  // Ear pods.
  for (const s of [-1, 1]) {
    mesh(
      new THREE.CylinderGeometry(0.03, 0.034, 0.02, 32),
      M.graphite,
      head,
      [s * 0.1, 0.0, -0.005],
      { rot: [0, 0, Math.PI / 2] }
    );
    mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.022, 20),
      M.ledGold,
      head,
      [s * 0.103, 0.0, -0.005],
      { rot: [0, 0, Math.PI / 2], shadow: false }
    );
  }
  const eyeGlow = [sprite(glowTurq, TURQ, 0.07, 0.55), sprite(glowTurq, TURQ, 0.07, 0.55)];
  eyeGlow.forEach((g) => head.add(g));

  // Glass dome: physical layer for env reflections + additive fresnel shell for the rim sheen.
  const domeY = 0.505;
  const dome = group(chest, [0, domeY, 0]);
  const domeGeo = new THREE.SphereGeometry(0.205, 64, 40, 0, Math.PI * 2, 0, Math.PI * 0.7);
  const glass = mesh(
    domeGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0,
      clearcoat: 1,
      transparent: true,
      opacity: 0.1,
      envMapIntensity: 2.2,
      depthWrite: false,
    }),
    dome,
    null,
    { shadow: false }
  );
  glass.renderOrder = 2;
  const fresnel = new THREE.Mesh(
    domeGeo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color("#bff8ff") }, uGold: { value: GOLD.clone() } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform vec3 uGold; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0);
          float streak = smoothstep(0.035, 0.0, abs(vP.x*0.8 + vP.y*0.6 - 0.07)) * smoothstep(-0.05, 0.12, vP.y) * 0.35;
          vec3 c = mix(uColor, uGold, smoothstep(-0.1, 0.18, vP.x)) * (f * 0.55) + vec3(streak);
          gl_FragColor = vec4(c, 1.0); }`,
    })
  );
  fresnel.renderOrder = 3;
  dome.add(fresnel);
  const collarY = 0.205 * Math.cos(Math.PI * 0.7);
  const collarR = 0.205 * Math.sin(Math.PI * 0.7);
  mesh(torus(collarR, 0.016, 16, 80), M.graphite, dome, [0, collarY, 0], {
    rot: [Math.PI / 2, 0, 0],
  });
  mesh(torus(collarR + 0.012, 0.005, 10, 80), M.gold, dome, [0, collarY + 0.008, 0], {
    rot: [Math.PI / 2, 0, 0],
  });

  // ---------- arms ----------
  const arms = {};
  for (const s of [-1, 1]) {
    const shoulder = group(chest, [s * 0.248, 0.31, -0.005]);
    mesh(sphere(0.06), M.joint, shoulder);
    mesh(
      new THREE.SphereGeometry(0.07, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.55),
      M.shell,
      shoulder,
      [s * 0.008, 0.006, 0],
      { scale: [1, 0.9, 1], rot: [0, 0, -s * 0.25] }
    );
    limb(
      shoulder,
      [0, -0.035, 0],
      0.27,
      0.052,
      0.042,
      0.08,
      -s * (Math.PI / 2 - 0.55),
      0.7,
      [1, 1, 1],
      0.82
    );
    const elbow = group(shoulder, [0, -0.315, 0]);
    mesh(sphere(0.04), M.joint, elbow);
    limb(
      elbow,
      [0, -0.03, 0],
      0.24,
      0.047,
      0.032,
      0.16,
      -s * (Math.PI / 2 - 0.5),
      0.6,
      [1, 1, 1],
      0.8
    );
    const wrist = group(elbow, [0, -0.285, 0]);
    mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.03, 20), M.joint, wrist);
    const hand = group(wrist, [0, -0.02, 0]);
    hand.scale.setScalar(1.22);
    mesh(new RoundedBoxGeometry(0.032, 0.08, 0.07, 3, 0.012), M.graphite, hand, [0, -0.04, 0]);
    for (let f = 0; f < 4; f++) {
      const finger = group(hand, [0, -0.08, -0.024 + f * 0.016]);
      finger.rotation.x = 0.05 * (f - 1.5);
      finger.rotation.z = -s * 0.25;
      mesh(
        new THREE.CapsuleGeometry(0.0075, 0.042 - Math.abs(f - 1.2) * 0.006, 4, 10),
        M.graphite,
        finger,
        [0, -0.025, 0]
      );
    }
    const thumb = group(hand, [s * 0.006, -0.03, 0.036]);
    thumb.rotation.set(0.5, 0, -s * 0.5);
    mesh(new THREE.CapsuleGeometry(0.0085, 0.03, 4, 10), M.graphite, thumb, [0, -0.02, 0]);
    arms[s] = { shoulder, elbow, wrist, hand };
  }
  // Wrist comm panel on the robot's left forearm (viewer's right).
  const comm = group(arms[1].elbow, [0.004, -0.17, 0.04]);
  comm.rotation.x = -0.12;
  mesh(new RoundedBoxGeometry(0.058, 0.082, 0.026, 3, 0.008), M.graphite, comm);
  const commScreen = mesh(
    new THREE.PlaneGeometry(0.046, 0.034),
    new THREE.MeshBasicMaterial({ map: wristTex, toneMapped: false }),
    comm,
    [0, 0.012, 0.0135],
    { shadow: false }
  );
  [
    ["#ff4d5e", -0.014],
    ["#f2c66a", 0],
    ["#3ff0dc", 0.014],
  ].forEach(([c, x]) =>
    mesh(
      new THREE.SphereGeometry(0.0045, 12, 8),
      new THREE.MeshBasicMaterial({ color: c, toneMapped: false }),
      comm,
      [x, -0.024, 0.012],
      { shadow: false }
    )
  );
  const commGlow = sprite(glowTurq, TURQ, 0.09, 0.45);
  commGlow.position.set(0, 0.012, 0.03);
  comm.add(commGlow);

  // ---------- legs ----------
  const legs = {};
  const nozzles = [];
  for (const s of [-1, 1]) {
    const hip = group(hips, [s * 0.088, -0.052, 0]);
    mesh(sphere(0.058), M.joint, hip);
    limb(
      hip,
      [0, -0.03, 0],
      0.4,
      0.08,
      0.05,
      0.12,
      -s * (Math.PI / 2 - 0.6),
      0.8,
      [1, 1, 1.06],
      0.8
    );
    const knee = group(hip, [0, -0.43, 0]);
    mesh(sphere(0.044), M.joint, knee);
    mesh(new RoundedBoxGeometry(0.06, 0.06, 0.03, 3, 0.012), M.graphite, knee, [0, 0.004, 0.036]);
    limb(
      knee,
      [0, -0.05, -0.004],
      0.4,
      0.06,
      0.034,
      0.22,
      -s * (Math.PI / 2 - 0.6),
      0.75,
      [1, 1, 1.12],
      0.78
    );
    const ankle = group(knee, [0, -0.45, 0]);
    mesh(sphere(0.036), M.joint, ankle);
    mesh(new RoundedBoxGeometry(0.092, 0.05, 0.2, 3, 0.02), M.graphite, ankle, [0, -0.032, 0.035]);
    mesh(new RoundedBoxGeometry(0.088, 0.036, 0.07, 3, 0.016), M.shell, ankle, [0, -0.026, 0.115]);
    mesh(new THREE.BoxGeometry(0.094, 0.006, 0.19), M.ledGold, ankle, [0, -0.052, 0.035], {
      shadow: false,
    });
    const jet = sprite(glowTurq, new THREE.Color("#bffcf4"), 0.1, 0);
    const jetPlume = sprite(glowGold, GOLD, 0.16, 0);
    jet.position.set(0, -0.075, 0.03);
    jetPlume.position.set(0, -0.15, 0.03);
    ankle.add(jet, jetPlume);
    nozzles.push({ core: jet, plume: jetPlume, boot: true });
    legs[s] = { hip, knee, ankle };
  }

  // ---------- jetpack + wings ----------
  const pack = group(chest, [0, 0.21, -0.172]);
  mesh(new RoundedBoxGeometry(0.27, 0.3, 0.1, 4, 0.035), M.shell, pack);
  mesh(new RoundedBoxGeometry(0.08, 0.26, 0.04, 3, 0.015), M.graphite, pack, [0, 0, -0.04]);
  mesh(new THREE.BoxGeometry(0.004, 0.2, 0.012), M.led, pack, [0, 0, -0.062], { shadow: false });
  for (const s of [-1, 1]) {
    const nz = group(pack, [s * 0.075, -0.16, -0.01]);
    mesh(
      lathe(
        profile([
          [0.0, 0.03],
          [0.03, 0.03],
          [0.026, 0.0],
          [0.032, -0.03],
          [0.042, -0.055],
          [0.038, -0.058],
          [0.0, -0.035],
        ]),
        32
      ),
      M.graphite,
      nz
    );
    mesh(torus(0.04, 0.004, 8, 40), M.gold, nz, [0, -0.055, 0], { rot: [Math.PI / 2, 0, 0] });
    const core = sprite(glowTurq, new THREE.Color("#d8fffb"), 0.08, 0);
    const plume = sprite(glowGold, GOLD, 0.2, 0);
    core.position.set(0, -0.08, 0);
    plume.position.set(0, -0.16, 0);
    nz.add(core, plume);
    nozzles.push({ core, plume });
  }
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.05);
  wingShape.bezierCurveTo(0.18, 0.04, 0.34, -0.02, 0.5, -0.09);
  wingShape.lineTo(0.52, -0.125);
  wingShape.bezierCurveTo(0.38, -0.12, 0.2, -0.13, 0.04, -0.16);
  wingShape.lineTo(0, -0.15);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.01,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
    curveSegments: 24,
  });
  wingGeo.rotateX(Math.PI / 2);
  const wings = {};
  const FOLD = Math.PI / 2 - 0.16;
  for (const s of [-1, 1]) {
    const pivot = group(pack, [s * 0.12, 0.1, -0.02]);
    const w = mesh(wingGeo, M.shell, pivot, null, { scale: [s, 1, 1] });
    w.position.z = 0.04;
    const ledLen = 0.52;
    const led = mesh(
      new THREE.BoxGeometry(ledLen, 0.004, 0.006),
      M.led,
      pivot,
      [s * 0.255, 0.004, 0.06],
      { shadow: false }
    );
    led.rotation.y = s * Math.atan2(0.14, 0.5);
    mesh(new THREE.BoxGeometry(0.12, 0.016, 0.04), M.gold, pivot, [s * 0.47, 0, -0.045], {
      rot: [0, s * 0.25, 0],
    });
    pivot.rotation.z = -s * FOLD;
    wings[s] = pivot;
  }

  // ---------- ground ----------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.ShadowMaterial({ opacity: 0.42 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const floorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({
      map: glowGold,
      color: GOLD,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.002;
  scene.add(floorGlow);
  const thrustLight = new THREE.PointLight(TURQ, 0, 2.5, 2);
  thrustLight.position.set(0, 0.7, -0.3);
  root.add(thrustLight);

  root.traverse((o) => {
    if (o.isMesh && o.material === M.led) o.castShadow = false;
  });

  // ---------- intelligence HUD halo ----------
  const hud = group(chest, [0, 0.505, 0]);
  hud.rotation.x = 0.22;
  const hudC = document.createElement("canvas");
  hudC.width = 2048;
  hudC.height = 96;
  const hctx = hudC.getContext("2d");
  const hudTex = new THREE.CanvasTexture(hudC);
  hudTex.colorSpace = THREE.SRGBColorSpace;
  hudTex.wrapS = THREE.RepeatWrapping;
  const hudMat = (o = {}) =>
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      opacity: 0,
      ...o,
    });
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.085, 128, 1, true),
    hudMat({ map: hudTex, color: 0xffffff })
  );
  band.position.y = 0.0;
  const ringA = new THREE.Mesh(torus(0.32, 0.0028, 6, 160), hudMat({ color: TURQ }));
  ringA.rotation.x = Math.PI / 2;
  ringA.position.y = 0.05;
  const ringB = new THREE.Mesh(torus(0.35, 0.0022, 6, 160), hudMat({ color: GOLD }));
  ringB.rotation.set(Math.PI / 2 + 0.2, 0.1, 0);
  const pulse = new THREE.Mesh(torus(0.31, 0.005, 6, 160), hudMat({ color: TURQ }));
  pulse.rotation.x = Math.PI / 2;
  pulse.position.y = -0.05;
  const ticks = new THREE.Group();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, i % 5 ? 0.012 : 0.026, 0.004),
      hudMat({ color: i % 5 ? TURQ : GOLD })
    );
    t.position.set(Math.sin(a) * 0.32, -0.06, Math.cos(a) * 0.32);
    ticks.add(t);
  }
  const orbiter = sprite(glowTurq, TURQ, 0.07, 0);

  // Readable holographic side panel: current item + thinking pulse.
  const panelC = document.createElement("canvas");
  panelC.width = 512;
  panelC.height = 256;
  const pctx = panelC.getContext("2d");
  const panelTex = new THREE.CanvasTexture(panelC);
  panelTex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.31),
    hudMat({ map: panelTex, color: 0xffffff, side: THREE.DoubleSide })
  );
  panel.position.set(0.6, 0.0, 0.08);
  panel.rotation.set(-0.22, -0.35, 0);
  hud.add(band, ringA, ringB, pulse, ticks, orbiter, panel);
  let hudText = "";

  function drawHud(cur) {
    const it = cur?.item;
    const text = `◢ SCANNING ▸ ${it ? (it.type === "run" ? "RUN" : "NOW") + " ▸ " + it.title.toUpperCase() : "IDLE"} ▸ ${
      it?.artist ? it.artist.toUpperCase() + " ▸ " : ""
    }THINKING ◣     `;
    if (text === hudText) return;
    hudText = text;
    hctx.clearRect(0, 0, 2048, 96);
    hctx.font = "600 44px 'JetBrains Mono', 'DM Mono', ui-monospace, monospace";
    hctx.textBaseline = "middle";
    const w = hctx.measureText(text).width;
    const reps = Math.max(1, Math.floor(2048 / w));
    const gap = (2048 - w * reps) / reps;
    hctx.fillStyle = "#5ff6e6";
    for (let i = 0; i < reps; i++) hctx.fillText(text, i * (w + gap), 50);
    hctx.fillStyle = "rgba(242,198,106,0.85)";
    hctx.fillRect(0, 6, 2048, 3);
    hctx.fillRect(0, 87, 2048, 3);
    hudTex.needsUpdate = true;
  }

  function wrapLines(g, text, maxW, maxLines) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const next = line ? line + " " + w : w;
      if (g.measureText(next).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, "…");
    }
    return lines;
  }

  function drawPanel(t, cur) {
    const g = pctx;
    const W = 512;
    const H = 256;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "rgba(20,120,115,0.22)";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(95,246,230,0.9)";
    g.lineWidth = 3;
    g.strokeRect(2, 2, W - 4, H - 4);
    g.fillStyle = "rgba(242,198,106,0.95)";
    g.fillRect(2, 2, 70, 6);
    g.fillRect(W - 72, H - 8, 70, 6);
    g.font = "600 22px 'JetBrains Mono', ui-monospace, monospace";
    g.fillStyle = "#f2c66a";
    g.fillText("RANGER-26 · INTELLIGENCE", 22, 42);
    const it = cur?.item;
    g.fillStyle = "#5ff6e6";
    g.font = "600 18px 'JetBrains Mono', ui-monospace, monospace";
    g.fillText(
      it
        ? it.type === "run"
          ? "▸ ANALYSING RUN"
          : it.type === "event"
            ? "▸ TRACKING EVENT"
            : "▸ LISTENING"
        : "▸ IDLE",
      22,
      78
    );
    g.font = "700 26px 'Cinzel', serif";
    g.fillStyle = "#fff0c4";
    wrapLines(g, it ? it.title : "—", W - 44, 2).forEach((l, i) => g.fillText(l, 22, 116 + i * 32));
    g.font = "500 17px 'JetBrains Mono', ui-monospace, monospace";
    g.fillStyle = "rgba(220,240,235,0.8)";
    g.fillText(it ? [it.artist, it.source].filter(Boolean).join(" · ").slice(0, 44) : "", 22, 188);
    g.fillStyle = "#5ff6e6";
    g.fillText("THINKING", 22, 226);
    for (let i = 0; i < 3; i++) {
      const a = 0.25 + 0.75 * Math.max(0, Math.sin(t * 5 - i * 0.9));
      g.globalAlpha = a;
      g.beginPath();
      g.arc(130 + i * 20, 220, 6, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    const p = cur ? cur.progress : 0;
    g.fillStyle = "rgba(95,246,230,0.25)";
    g.fillRect(220, 216, 268, 6);
    g.fillStyle = "#f2c66a";
    g.fillRect(220, 216, 268 * p, 6);
    const sy = 20 + ((t * 120) % (H - 40));
    g.fillStyle = "rgba(95,246,230,0.18)";
    g.fillRect(4, sy, W - 8, 3);
    panelTex.needsUpdate = true;
  }

  // ---------- face ----------
  let blink = 1;
  let nextBlink = 2;
  function drawFace(t, look, mood, levels, intel) {
    const W = face.width;
    const H = face.height;
    const g = fctx;
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(63,240,220,0.035)";
    for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
    const ex = look.x * 58;
    const ey = look.y * 24;
    g.shadowColor = mood === "focus" ? "rgba(242,198,106,0.9)" : "rgba(63,240,220,0.95)";
    g.shadowBlur = 22;
    g.fillStyle = mood === "focus" ? "#ffd889" : "#7dfff0";
    g.strokeStyle = g.fillStyle;
    for (const s of [-1, 1]) {
      const cx = W / 2 + s * 66 + ex;
      const cy = 88 + ey;
      if (mood === "happy") {
        g.lineWidth = 13;
        g.lineCap = "round";
        g.beginPath();
        g.arc(cx, cy + 12, 26, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      } else {
        const h = (mood === "focus" ? 12 : 26) * blink;
        g.beginPath();
        g.roundRect(cx - 34, cy - h / 2, 68, Math.max(3, h), Math.max(1.5, h / 2));
        g.fill();
      }
    }
    // Mirrored waveform: levels fan out symmetrically from the centre, like an oscilloscope trace.
    g.shadowBlur = 8;
    g.shadowColor = "rgba(242,198,106,0.8)";
    g.fillStyle = "#f6d27e";
    const n = levels.length;
    const cols = 15;
    const bw = 4;
    const step = 10;
    const midY = 168;
    for (let c = -cols; c <= cols; c++) {
      const lv = levels[Math.min(n - 1, Math.floor((Math.abs(c) / (cols + 1)) * n))];
      const fall = 1 - Math.abs(c) / (cols + 2);
      const h = 2 + lv * 15 * fall;
      g.globalAlpha = 0.35 + 0.65 * fall;
      g.fillRect(W / 2 + c * step - bw / 2, midY - h, bw, h * 2);
    }
    g.globalAlpha = 1;
    if (intel) {
      const sy = (t * 90) % H;
      const grd = g.createLinearGradient(0, sy - 16, 0, sy + 2);
      grd.addColorStop(0, "rgba(63,240,220,0)");
      grd.addColorStop(1, "rgba(63,240,220,0.5)");
      g.shadowBlur = 0;
      g.fillStyle = grd;
      g.fillRect(0, sy - 16, W, 18);
    }
    g.shadowBlur = 0;
    faceTex.needsUpdate = true;
  }

  function drawWrist(t, levels, cur) {
    const g = wctx;
    g.fillStyle = "#04110f";
    g.fillRect(0, 0, 128, 96);
    g.fillStyle = "#3ff0dc";
    g.font = "700 18px ui-monospace, monospace";
    g.fillText("R-26", 8, 22);
    g.fillStyle = "#f2c66a";
    g.font = "600 12px ui-monospace, monospace";
    g.fillText(cur ? (cur.item.type === "run" ? "RUN" : "LIVE") : "--", 80, 20);
    for (let i = 0; i < 8; i++) {
      const h = 6 + levels[i % levels.length] * 44;
      g.fillStyle = i % 2 ? "#3ff0dc" : "#f2c66a";
      g.fillRect(10 + i * 14, 88 - h, 9, h);
    }
    g.fillStyle = "rgba(63,240,220,0.7)";
    g.fillRect(0, 30 + ((t * 40) % 60), 128, 1);
    wristTex.needsUpdate = true;
  }

  // ---------- framing ----------
  const FLOOR = 0.74;
  const TOP = 0.14;
  let width = 1;
  let height = 1;
  const headWorld = new THREE.Vector3();
  function resize() {
    width = container.clientWidth || 1;
    height = container.clientHeight || 1;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    const fovR = THREE.MathUtils.degToRad(camera.fov);
    let visH = 1.86 / (FLOOR - TOP);
    visH = Math.max(visH, 1.7 / aspect);
    const dist = visH / 2 / Math.tan(fovR / 2);
    const targetY = visH * (FLOOR - 0.5);
    camera.position.set(0, targetY + 0.12, dist);
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();
    const p = new THREE.Vector3(0, 0, 0.05).project(camera);
    onFloor?.(((1 - p.y) / 2) * height, height);
    if (reducedMotion) render(performance.now() / 1000, 0);
  }

  // ---------- state ----------
  const look = { x: 0, y: 0 };
  const lookTarget = { x: 0, y: 0 };
  let pointerAt = -10;
  let wave = -10;
  let fly = -10;
  let intel = false;
  let intelAmt = 0;
  let clock = 0;
  let last = performance.now();
  let raf = 0;
  let visible = true;
  let nextAction = "wave";

  window.addEventListener(
    "pointermove",
    (e) => {
      const r = canvas.getBoundingClientRect();
      headWorld.setFromMatrixPosition(head.matrixWorld).project(camera);
      const hx = r.left + ((headWorld.x + 1) / 2) * r.width;
      const hy = r.top + ((1 - headWorld.y) / 2) * r.height;
      lookTarget.x = clamp((e.clientX - hx) / (Math.min(r.width, 900) * 0.45), -1, 1);
      lookTarget.y = clamp((e.clientY - hy) / (r.height * 0.5), -1, 1);
      pointerAt = clock;
    },
    { passive: true }
  );
  canvas.addEventListener("click", () => {
    nextAction === "wave" ? api.wave() : api.fly();
  });

  function pose(t, dt) {
    const idleGlance = clock - pointerAt > 4;
    const tgtX = idleGlance ? Math.sin(t * 0.35) * 0.35 : lookTarget.x;
    const tgtY = idleGlance ? Math.sin(t * 0.23) * 0.12 : lookTarget.y;
    const k = Math.min(1, dt * 5);
    look.x += (tgtX - look.x) * k;
    look.y += (tgtY - look.y) * k;

    const br = Math.sin(t * 1.6);
    const tw = t - wave;
    const wv = tw < 2.8 ? smooth(0, 0.45, tw) * (1 - smooth(2.3, 2.8, tw)) : 0;
    const tf = t - fly;
    const deploy = tf < 5.6 ? smooth(0, 0.7, tf) * (1 - smooth(5.0, 5.6, tf)) : 0;
    const lift = tf < 5.6 ? smooth(0.5, 1.5, tf) * (1 - smooth(3.9, 5.0, tf)) : 0;
    const thrust = tf < 5.6 ? smooth(0.3, 0.6, tf) * (1 - smooth(4.7, 5.1, tf)) : 0;
    const lookAmt = 1 - wv * 0.6;

    root.position.y = lift * 0.3 + lift * Math.sin(t * 2.2) * 0.022;
    root.rotation.z = Math.sin(t * 0.6) * 0.012 + lift * Math.sin(t * 1.3) * 0.02;
    root.rotation.y = Math.sin(t * 0.31) * 0.04 + lift * 0.55;
    hips.position.y = 0.99 + br * 0.002;
    hips.rotation.y = look.x * 0.06 * lookAmt;
    chest.scale.set(1 + br * 0.005, 1 + br * 0.009, 1 + br * 0.008);
    chest.rotation.set(lift * 0.08 + br * 0.008, look.x * 0.12 * lookAmt, wv * -0.04);
    neck.rotation.set(look.y * 0.12 * lookAmt, look.x * 0.3 * lookAmt, 0);
    head.rotation.set(look.y * 0.34 * lookAmt - wv * 0.05, look.x * 0.68 * lookAmt, wv * 0.12);

    for (const s of [-1, 1]) {
      const a = arms[s];
      const waving = s === -1 ? wv : 0;
      const sway = br * 0.012 + Math.sin(t * 0.8 + s) * 0.01;
      a.shoulder.rotation.set(
        mix(0.05 + sway + lift * 0.25, -0.2, waving),
        0,
        mix(s * (0.1 + br * 0.008 + lift * 0.38), s * 1.78, waving)
      );
      const wag = Math.sin(tw * 11) * 0.38;
      a.elbow.rotation.set(
        mix(-0.22 - lift * 0.1, -0.05, waving),
        0,
        mix(0, s * (1.32 + wag), waving)
      );
      a.wrist.rotation.set(0, mix(0, s * Math.PI * 0.5, waving), 0);
      const l = legs[s];
      const legLift = lift * (s === 1 ? 1 : 0.7);
      l.hip.rotation.set(-legLift * 0.18, 0, s * 0.015);
      l.knee.rotation.set(legLift * 0.45, 0, 0);
      l.ankle.rotation.set(legLift * 0.35, 0, 0);
      wings[s].rotation.z = mix(-s * FOLD, s * (0.1 + Math.sin(t * 3) * 0.03 * lift), deploy);
      wings[s].rotation.y = mix(0, s * 0.18, deploy);
    }
    nozzles.forEach(({ core, plume, boot }, i) => {
      const flick = 0.85 + Math.sin(t * 40 + i * 2) * 0.1 + Math.sin(t * 23 + i) * 0.05;
      if (boot) {
        core.material.opacity = thrust * 0.9;
        core.scale.set(0.09 * flick, 0.07 * flick, 1);
        plume.material.opacity = thrust * 0.7;
        plume.scale.set(0.12 * flick, 0.34 * flick * thrust + 0.01, 1);
        plume.position.y = -0.09 - 0.12 * thrust;
        return;
      }
      core.material.opacity = thrust * 0.95;
      core.scale.set(0.07 * flick, 0.1 * flick * (0.5 + thrust), 1);
      plume.material.opacity = thrust * 0.75;
      plume.scale.set(0.15 * flick, 0.62 * flick * thrust + 0.01, 1);
      plume.position.y = -0.1 - 0.26 * thrust;
    });
    thrustLight.intensity = thrust * 2.2;
    floorGlow.material.opacity = 0.3 + thrust * 0.25 - lift * 0.1;
    floorGlow.scale.setScalar(1 + lift * 0.2);

    intelAmt += ((intel ? 1 : 0) - intelAmt) * Math.min(1, dt * 4);
    const p = (t % 1.4) / 1.4;
    band.material.opacity = intelAmt * 0.95;
    hudTex.offset.x = -t * 0.025;
    ringA.material.opacity = intelAmt * 0.8;
    ringB.material.opacity = intelAmt * 0.6;
    ringB.rotation.z = t * 0.4;
    ticks.rotation.y = -t * 0.3;
    ticks.children.forEach((c) => (c.material.opacity = intelAmt * 0.7));
    pulse.material.opacity = intelAmt * (1 - p) * 0.9;
    pulse.scale.setScalar(1 + p * 0.45);
    orbiter.material.opacity = intelAmt;
    orbiter.position.set(Math.sin(t * 1.6) * 0.32, 0.05, Math.cos(t * 1.6) * 0.32);
    panel.material.opacity = intelAmt * 0.95;
    panel.position.y = 0.02 + Math.sin(t * 1.4) * 0.008;
    hud.position.y = 0.505 + Math.sin(t * 1.2) * 0.006;
    hud.visible = intelAmt > 0.01;

    if (t > nextBlink) {
      blink = 0.1;
      nextBlink = t + 2.5 + Math.random() * 3;
    }
    blink += (1 - blink) * Math.min(1, dt * 9);

    const cur = np?.current();
    const levels = np ? np.levels(10, t, cur) : new Array(10).fill(0.2);
    const mood = wv > 0.3 ? "happy" : lift > 0.3 ? "focus" : "calm";
    drawFace(t, look, mood, levels, intelAmt > 0.5);
    drawWrist(t, levels, cur);
    if (intelAmt > 0.01) {
      drawHud(cur);
      drawPanel(t, cur);
    }
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    coreGlow.material.opacity = 0.45 + avg * 0.5;
    commGlow.material.opacity = 0.3 + avg * 0.3;
    eyeGlow.forEach((g, i) => {
      const s = i ? 1 : -1;
      g.position.set(s * 0.038 + look.x * 0.022, 0.012 - look.y * 0.012, 0.118);
      g.material.opacity = mood === "happy" ? 0.35 : 0.5 * blink;
      g.material.color.copy(mood === "focus" ? GOLD : TURQ);
    });
    return levels;
  }

  function render(t, dt) {
    const levels = pose(t, dt);
    renderer.render(scene, camera);
    return levels;
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    clock += dt;
    render(clock, dt);
  }

  function start() {
    if (raf || reducedMotion || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    visible ? start() : stop();
  });
  io.observe(container);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  np?.subscribe(() => reducedMotion && render(clock, 0));

  const api = {
    canvas,
    wave() {
      if (reducedMotion) return;
      wave = clock;
      nextAction = "fly";
      onAction?.("wave");
    },
    fly() {
      if (reducedMotion) return;
      fly = clock;
      nextAction = "wave";
      onAction?.("fly");
    },
    setIntelligence(on) {
      intel = !!on;
      if (reducedMotion) {
        intelAmt = intel ? 1 : 0;
        render(clock, 0);
      }
    },
    // Test hook: step the simulation without waiting for frames (headless renderers run at ~1 fps).
    advance(sec) {
      const step = 1 / 30;
      for (let i = 0; i < Math.round(sec / step); i++) {
        clock += step;
        pose(clock, step);
      }
      renderer.render(scene, camera);
    },
    status() {
      return {
        webgl: true,
        running: !!raf,
        intel,
        reducedMotion,
        look: { ...look },
        clock: +clock.toFixed(2),
      };
    },
    destroy() {
      stop();
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
      canvas.remove();
    },
  };

  resize();
  render(0, 0);
  start();
  return api;
}
