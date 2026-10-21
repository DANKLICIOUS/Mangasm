// Single source of truth for copy. Edit here; markup is generated from it.
window.STUDIO = {
  // Paste a Unicorn Studio embed ID (Project → Export → Embed) to replace the
  // built-in ice shader in the hero. Leave empty to use the local shader.
  unicornProjectId: "",

  brands: [
    {
      id: "slay",
      code: "UNIT_01",
      name: "Slay.LLC",
      role: "Brand, design & launch",
      pitch:
        "Identity, landing pages, and launch storytelling that look like a Series B company on day one.",
      features: [
        "Brand system + motion identity",
        "WebGL / Unicorn Studio hero scenes",
        "Launch site, waitlist & analytics",
        "App Store + social launch kit",
      ],
      hue: "#d1e3ff",
    },
    {
      id: "coexist",
      code: "UNIT_02",
      name: "Coexist.LLC",
      role: "Platforms & infrastructure",
      pitch:
        "The engine room: edge deploys, databases, payments and auth wired up so the product actually ships.",
      features: [
        "Vercel / Cloudflare edge deploys",
        "Supabase Postgres + row-level security",
        "Stripe & StoreKit billing",
        "CI/CD, monitoring, rollbacks",
      ],
      hue: "#c9d0df",
    },
    {
      id: "lynx",
      code: "UNIT_03",
      name: "LynxLogix.Ai",
      role: "AI agents & automation",
      pitch:
        "Agent teams that research, build and audit in parallel — then hand you a human-gated control desk.",
      features: [
        "Multi-agent research → build → audit",
        "MCP tool integrations",
        "Ops automations & reporting",
        "Human-in-the-loop guardrails",
      ],
      hue: "#e1e6f1",
    },
  ],

  projects: [
    {
      code: "PROJECT_01",
      name: "Mangasm",
      url: "https://www.mangasm.app",
      kind: "iOS app + web + backend",
      summary:
        "Safety-first dating app: SwiftUI client, Supabase backend, StoreKit subscriptions and a cinematic storybook launch site.",
      stack: ["SwiftUI", "Supabase", "StoreKit", "Vercel"],
      units: ["slay", "coexist", "lynx"],
      image: "assets/06-rebuild-phone.jpg",
    },
    {
      code: "PROJECT_02",
      name: "Ganesh AI",
      url: "https://ganesh.guru",
      kind: "AI product",
      summary:
        "MCP engine that turns a small business's website into a localized, brand-matched catalog with AI visuals — in up to 10 languages.",
      stack: ["MCP", "LLM pipelines", "Edge"],
      units: ["lynx", "coexist"],
    },
    {
      code: "PROJECT_03",
      name: "Nostalgia",
      url: "https://nostalgia.sh",
      kind: "Immersive web",
      summary: "“The Celestial Machine” — an atmospheric, story-driven web experience.",
      stack: ["WebGL", "Motion", "Vercel"],
      units: ["slay"],
    },
    {
      code: "PROJECT_04",
      name: "LynxLogix.NET",
      url: "https://lynxlogix.net",
      kind: "Command desk",
      summary:
        "Human-gated crypto command desk. Piano-black UI, no unattended live orders — automation with a hand on the switch.",
      stack: ["Agents", "Realtime", "Guardrails"],
      units: ["lynx", "coexist"],
    },
  ],

  // Scripted sessions for the three behind-the-scenes terminals.
  // Each line: [delayMs, text, className?]. "$ " lines are typed out.
  terminals: {
    slay: [
      [400, "$ slay audit --site client.com", "cmd"],
      [500, "› lighthouse   perf 41  a11y 63  seo 70", "dim"],
      [300, "› hero         static jpg, no motion", "dim"],
      [300, "› brand        3 fonts, 7 blues, no system", "warn"],
      [600, "$ slay brand --generate system", "cmd"],
      [500, "✓ palette      #0b0d12 · #d1e3ff · #a0a5b1", "ok"],
      [300, "✓ type         IBM Plex Mono / Inter Tight", "ok"],
      [600, "$ slay hero --engine unicorn-studio --scene ice", "cmd"],
      [700, "✓ webgl scene  60fps · 1.2MB · lazy", "ok"],
      [500, "$ slay ship --preview", "cmd"],
      [700, "✓ preview      https://client-next.vercel.app", "ok"],
    ],
    coexist: [
      [700, "$ coexist provision --stack edge", "cmd"],
      [500, "› postgres     supabase · rls on · 14 policies", "dim"],
      [400, "› auth         magic link + apple + google", "dim"],
      [400, "› payments     stripe checkout + webhooks", "dim"],
      [600, "$ coexist migrate --apply", "cmd"],
      [600, "✓ 0007_orders.sql   applied", "ok"],
      [300, "✓ 0008_rls.sql      applied", "ok"],
      [600, "$ coexist deploy --prod --domain client.com", "cmd"],
      [700, "› build        1m 12s · 0 errors", "dim"],
      [500, "✓ ssl + dns    verified", "ok"],
      [400, "✓ live         p95 84ms · 0 errors", "ok"],
    ],
    lynx: [
      [1000, "$ lynx swarm --task 'rebuild client.com'", "cmd"],
      [500, "› research     competitors · 12 sites scraped", "dim"],
      [400, "› compare      3 directions scored", "dim"],
      [400, "› build        agents ×4 in parallel", "dim"],
      [600, "› audit        security · a11y · perf", "dim"],
      [500, "! audit        2 issues → auto-fixed", "warn"],
      [600, "$ lynx automate --ops leads,reports", "cmd"],
      [500, "✓ crm sync     every 5m", "ok"],
      [400, "✓ daily brief  07:00 → owner inbox", "ok"],
      [500, "$ lynx handoff --human-gate on", "cmd"],
      [600, "✓ ready        awaiting owner approval", "ok"],
    ],
  },
};
