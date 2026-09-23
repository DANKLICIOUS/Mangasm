/** Assemble duo panorama JPEG from chunked base64 parts */
export async function applyPanoramaArt(layer) {
  if (!layer) return;
  const n = 4;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const res = await fetch(`./assets/panorama-parts/part${i}.txt`);
    if (!res.ok) throw new Error("missing panorama part " + i);
    parts.push(await res.text());
  }
  const uri = "data:image/jpeg;base64," + parts.join("");
  layer.style.backgroundImage = `url("${uri}")`;
  layer.style.backgroundSize = "cover";
  layer.style.backgroundPosition = "center 42%";
  const img = layer.querySelector("img");
  if (img) img.style.opacity = "0";
}
