/**
 * Stylized dark marina chart. Pan, pinch, and wheel zoom.
 * Pins sit in world pixels and counter-scale so they stay thumb-sized.
 * This is not a slippy tile map and does not call the Geolocation API.
 */

import { MAP_H, MAP_W, YOU, escapeHTML } from "./cruise-data.js";

const MIN_Z = 0.7;
const MAX_Z = 2.85;

function basemap() {
  const blocks = [];
  for (let x = 1330; x <= 1680; x += 58) {
    for (let y = 470; y <= 900; y += 50) {
      if ((x + y) % 100 < 40) continue;
      blocks.push(
        `<rect x="${x}" y="${y}" width="34" height="24" rx="2" fill="#141a24" stroke="#1c2433" stroke-width="1"/>`
      );
    }
  }
  for (let i = 0; i < 8; i += 1) {
    const x = 980 + (i % 4) * 48;
    const y = 990 + Math.floor(i / 4) * 36;
    blocks.push(
      `<rect x="${x}" y="${y}" width="28" height="16" rx="1" fill="#101820" opacity="0.9"/>`
    );
  }

  return `
    <svg class="basemap" viewBox="0 0 ${MAP_W} ${MAP_H}" width="${MAP_W}" height="${MAP_H}" aria-hidden="true">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0c1826"/>
          <stop offset="1" stop-color="#081018"/>
        </linearGradient>
        <radialGradient id="glow" cx="1080" cy="760" r="340" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#e83a7a" stop-opacity="0.18"/>
          <stop offset="0.4" stop-color="#c9a84c" stop-opacity="0.06"/>
          <stop offset="1" stop-color="#c9a84c" stop-opacity="0"/>
        </radialGradient>
        <pattern id="watergrain" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 12 Q4 8 9 12 T18 12" fill="none" stroke="#143044" stroke-width="0.6" opacity="0.45"/>
        </pattern>
      </defs>
      <rect width="${MAP_W}" height="${MAP_H}" fill="#0c1016"/>
      <path fill="url(#sea)" d="M0 0 H980 L940 180 L900 360 L860 520 L820 640 L760 720 L748 830 L800 930 L860 1040 L820 1200 H0 Z"/>
      <path fill="url(#watergrain)" d="M0 0 H980 L940 180 L900 360 L860 520 L820 640 L760 720 L748 830 L800 930 L860 1040 L820 1200 H0 Z"/>
      <path fill="#0d1a22" d="M1040 1000 C1140 960 1280 980 1340 1060 C1380 1120 1280 1180 1140 1170 C1060 1164 1000 1100 1020 1050 C1030 1024 1034 1012 1040 1000 Z"/>
      <path fill="#0d1a22" d="M760 990 C860 1040 980 1100 1040 1088 C980 1040 900 1004 800 980 Z" opacity="0.95"/>
      <path fill="#101814" stroke="#1a3a32" stroke-width="2" d="M620 690 C660 640 760 640 800 690 C820 760 760 800 700 790 C640 780 600 740 620 690 Z"/>
      <path fill="none" stroke="#2a4038" stroke-width="3" d="M700 700 C760 690 790 730 760 750"/>
      <ellipse cx="1040" cy="430" rx="120" ry="70" fill="#101a14"/>
      <ellipse cx="1420" cy="360" rx="90" ry="48" fill="#101a14"/>
      <circle cx="1080" cy="760" r="340" fill="url(#glow)"/>
      <g fill="none" stroke="#2c3648" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M860 40 C900 200 880 400 840 560 C810 680 860 760 980 760 L1680 748"/>
        <path d="M1188 180 L1210 1040"/>
        <path d="M800 860 C900 900 980 980 1100 1040"/>
        <path d="M760 730 L900 760"/>
      </g>
      <g fill="none" stroke="#232b3a" stroke-width="3" stroke-linecap="round">
        <path d="M900 520 L1500 500"/>
        <path d="M960 640 L1600 620"/>
        <path d="M1000 880 L1500 900"/>
        <path d="M1320 420 L1360 980"/>
        <path d="M1480 440 L1500 960"/>
        <path d="M900 980 L980 1120"/>
        <path d="M640 700 C700 660 760 700 740 760 C720 800 660 780 640 740"/>
        <path d="M1100 300 L1280 220"/>
        <path d="M1240 260 L1560 240"/>
      </g>
      <g fill="none" stroke="#1b2433" stroke-width="1.5">
        <path d="M1000 1040 H1280 M1040 1080 H1300 M1080 1120 H1260"/>
        <path d="M1080 1020 V1140 M1160 1000 V1160 M1240 1020 V1140"/>
      </g>
      ${blocks.join("")}
      <g fill="#8b95a8" font-family="DM Sans, system-ui, sans-serif" font-size="13" letter-spacing="3.5" font-weight="600">
        <text x="1230" y="830">DUBAI MARINA</text>
        <text x="690" y="660">PALM</text>
        <text x="760" y="990">JBR</text>
        <text x="1420" y="540">BUSINESS BAY</text>
        <text x="1260" y="170">JUMEIRAH</text>
        <text x="80" y="640" fill="#3d5166" letter-spacing="4">GULF</text>
      </g>
    </svg>`;
}

export function mountMap(viewport, { onSelect, onClear, onView } = {}) {
  viewport.innerHTML = `
    <div class="world" id="cruise-world">
      ${basemap()}
      <div class="you" style="left:${YOU.x}px;top:${YOU.y}px" aria-hidden="true">
        <span class="you-ring"></span>
        <span class="you-core" id="you-core"><span class="you-label">You</span></span>
      </div>
      <div class="markers" id="cruise-markers"></div>
    </div>`;

  const world = viewport.querySelector(".world");
  const markersEl = viewport.querySelector(".markers");
  const youCore = viewport.querySelector("#you-core");

  let z = 1;
  let tx = 0;
  let ty = 0;
  let markers = [];
  let selectedId = null;
  let ready = false;
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let suppressClick = false;

  function clamp(value) {
    return Math.min(MAX_Z, Math.max(MIN_Z, value));
  }

  function apply(animate) {
    world.style.transition = animate ? "transform 420ms cubic-bezier(.2,.75,.2,1)" : "none";
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
    world.style.setProperty("--z", String(z));
    if (!ready) {
      ready = true;
      world.classList.add("is-ready");
    }
    onView?.(z);
  }

  function paint() {
    markersEl.innerHTML = markers
      .map((marker) => {
        if (marker.type === "cluster") {
          const live = marker.pins.some((pin) => pin.rightNow);
          const count = marker.pins.length;
          return `<button type="button" class="cluster${live ? " is-live" : ""}" data-cluster="${escapeHTML(marker.id)}" style="left:${marker.x}px;top:${marker.y}px" aria-label="${count} nearby, zoom in"><span>${count}</span></button>`;
        }
        const pin = marker.pin;
        const classes = [
          "pin",
          `pin-${pin.kind}`,
          pin.rightNow ? "is-live" : "",
          pin.hosting ? "is-host" : "",
          pin.traveling ? "is-travel" : "",
          pin.id === selectedId ? "is-selected" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const label = escapeHTML(pin.name);
        const color = pin.kind === "person" && pin.accent ? `--pin:${pin.accent};` : "";
        const badge = pin.hosting
          ? `<i class="pin-badge pin-badge-host" aria-hidden="true"></i>`
          : pin.traveling
            ? `<i class="pin-badge pin-badge-travel" aria-hidden="true"></i>`
            : "";
        return `<button type="button" class="${classes}" data-pin="${escapeHTML(pin.id)}" style="left:${pin.x}px;top:${pin.y}px;${color}" aria-label="${label}, ${escapeHTML(pin.distanceLabel || "")}"><span class="pin-face">${escapeHTML(pin.mark || "")}</span>${badge}<span class="pin-label">${label}</span></button>`;
      })
      .join("");
  }

  function zoomAt(clientX, clientY, nextZ, animate) {
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const wx = (px - tx) / z;
    const wy = (py - ty) / z;
    z = clamp(nextZ);
    tx = px - wx * z;
    ty = py - wy * z;
    apply(animate);
  }

  function centerOn(x, y, nextZoom, animate, bias) {
    const rect = viewport.getBoundingClientRect();
    z = clamp(nextZoom ?? z);
    const cx = rect.width / 2 + (bias?.x || 0);
    const cy = rect.height / 2 + (bias?.y || 0);
    tx = cx - x * z;
    ty = cy - y * z;
    apply(Boolean(animate));
  }

  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      zoomAt(event.clientX, event.clientY, z * factor, false);
    },
    { passive: false }
  );

  viewport.addEventListener("dblclick", (event) => {
    const hit = event.target.closest("[data-pin], [data-cluster]");
    if (hit) return;
    zoomAt(event.clientX, event.clientY, z * 1.35, true);
  });

  function selectFromTarget(target) {
    const pin = target?.closest?.("[data-pin]");
    const cluster = target?.closest?.("[data-cluster]");
    if (pin) onSelect?.({ type: "pin", id: pin.dataset.pin });
    else if (cluster) {
      const marker = markers.find(
        (item) => item.type === "cluster" && item.id === cluster.dataset.cluster
      );
      onSelect?.({ type: "cluster", id: cluster.dataset.cluster, marker });
    } else onClear?.();
  }

  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressClick = false;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        tx,
        ty,
        moved: false,
        target: event.target,
      };
      pinch = null;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        z,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      drag = null;
    }
  });

  window.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      zoomAt(midX, midY, pinch.z * (dist / pinch.dist), false);
      tx += midX - pinch.midX;
      ty += midY - pinch.midY;
      pinch.midX = midX;
      pinch.midY = midY;
      pinch.dist = dist;
      pinch.z = z;
      apply(false);
      suppressClick = true;
      return;
    }
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    tx = drag.tx + dx;
    ty = drag.ty + dy;
    apply(false);
  });

  window.addEventListener("pointerup", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const ended = drag?.id === event.pointerId ? drag : null;
    pointers.delete(event.pointerId);
    if (drag?.id === event.pointerId) drag = null;
    if (pointers.size < 2) pinch = null;
    if (!ended) return;
    if (ended.moved || suppressClick) {
      suppressClick = false;
      return;
    }
    selectFromTarget(ended.target);
  });

  window.addEventListener("pointercancel", (event) => {
    pointers.delete(event.pointerId);
    if (drag?.id === event.pointerId) drag = null;
    if (pointers.size < 2) pinch = null;
  });

  return {
    setMarkers(next) {
      markers = next;
      paint();
    },
    setSelected(id, paintNow = true) {
      selectedId = id;
      if (paintNow) paint();
    },
    setYouFlags({ rightNow = false, hosting = false } = {}) {
      youCore.classList.toggle("is-live", rightNow);
      youCore.classList.toggle("is-host", hosting);
    },
    centerOn,
    zoomBy(factor, client) {
      const rect = viewport.getBoundingClientRect();
      const x = client?.x ?? rect.left + rect.width / 2;
      const y = client?.y ?? rect.top + rect.height / 2;
      zoomAt(x, y, z * factor, true);
    },
    getZoom() {
      return z;
    },
    resize() {
      apply(false);
    },
  };
}
