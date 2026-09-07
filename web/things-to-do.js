(() => {
  const $ = (id) => document.getElementById(id);
  let catalog = { facets: [], items: [] };
  let activeFacet = "all";

  function matches(item, q, facet) {
    if (facet && facet !== "all" && !(item.facets || []).includes(facet)) return false;
    if (!q) return true;
    const hay = [
      item.title,
      item.promise,
      item.cap,
      ...(item.tags || []),
      ...(item.facets || []),
      ...(item.inScope || []),
    ]
      .join(" ")
      .toLowerCase();
    return q
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((tok) => hay.includes(tok));
  }

  function renderFacets() {
    const root = $("facets");
    root.innerHTML = "";
    for (const f of catalog.facets || []) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.role = "tab";
      btn.dataset.facet = f.id;
      btn.textContent = f.label;
      const on = f.id === activeFacet;
      btn.className = on
        ? "rounded-full bg-amber-300 text-slate-900 text-xs font-semibold px-3 py-1.5"
        : "rounded-full border border-slate-600 text-slate-300 text-xs font-semibold px-3 py-1.5 hover:border-amber-300";
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.addEventListener("click", () => {
        activeFacet = f.id;
        renderFacets();
        render();
      });
      root.appendChild(btn);
    }
  }

  function card(item) {
    const el = document.createElement("article");
    el.className = "rounded-xl border border-slate-700 bg-slate-800/60 p-5";
    const tags = (item.tags || [])
      .slice(0, 6)
      .map((t) => `<span class="rounded bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">${escapeHtml(t)}</span>`)
      .join(" ");
    const scope = (item.inScope || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join("");
    const out = (item.outOfScope || [])
      .slice(0, 5)
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join("");
    const cta =
      item.ctaUrl && String(item.ctaUrl).trim()
        ? `<a class="inline-flex mt-4 rounded-lg bg-amber-300 text-slate-900 text-sm font-semibold px-4 py-2 hover:bg-amber-200" href="${escapeAttr(item.ctaUrl)}" rel="noopener noreferrer" target="_blank">${escapeHtml(item.ctaLabel || "Get started")}</a>`
        : `<p class="mt-4 text-xs text-amber-200/90">Listing draft — Fiverr CTA URL not wired yet (Miracle Money). Intake: ${(item.intake || []).map(escapeHtml).join(" · ")}</p>`;
    el.innerHTML = `
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold text-white">${escapeHtml(item.title)}</h2>
        <p class="text-amber-300 font-semibold">$${Number(item.priceUsd)}</p>
      </div>
      <p class="text-sm text-slate-400 mt-2">${escapeHtml(item.promise)}</p>
      <p class="text-xs text-slate-500 mt-2">${escapeHtml(item.turnaround || "")} · ${escapeHtml(item.cap || "")}</p>
      <div class="flex flex-wrap gap-1.5 mt-3">${tags}</div>
      <div class="grid md:grid-cols-2 gap-3 mt-4 text-xs text-slate-400">
        <div><p class="text-slate-300 font-semibold mb-1">In scope</p><ul class="list-disc pl-4 space-y-1">${scope}</ul></div>
        <div><p class="text-slate-300 font-semibold mb-1">Out of scope</p><ul class="list-disc pl-4 space-y-1">${out}</ul></div>
      </div>
      ${cta}
      <p class="text-[10px] text-slate-600 mt-3">status: ${escapeHtml(item.status || "unknown")} · operator: ${escapeHtml(item.operator || "")}</p>
    `;
    return el;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function render() {
    const q = $("q").value.trim();
    const items = (catalog.items || []).filter((it) => matches(it, q, activeFacet));
    const root = $("results");
    root.innerHTML = "";
    items.forEach((it) => root.appendChild(card(it)));
    $("count").textContent = `${items.length} thing${items.length === 1 ? "" : "s"}`;
    $("empty").classList.toggle("hidden", items.length > 0);
  }

  async function boot() {
    const res = await fetch("/things-to-do.json", { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("catalog missing");
    catalog = await res.json();
    renderFacets();
    $("q").addEventListener("input", render);
    render();
  }

  boot().catch((e) => {
    $("empty").classList.remove("hidden");
    $("empty").textContent = "Could not load things-to-do catalog.";
    console.error(e);
  });
})();
