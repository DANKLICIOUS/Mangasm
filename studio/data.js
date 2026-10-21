// Single source of truth for copy. Edit here; markup is generated from it.
window.STUDIO = {
  // Paste a Unicorn Studio embed ID (Project → Export → Embed) to replace the
  // built-in jelly scene in the hero. Leave empty to use the local shader.
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
      hue: "#ffb8d9",
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
      hue: "#b5f0d6",
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
      hue: "#d7c8ff",
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
      image: "https://www.mangasm.app/assets/06-rebuild-phone.jpg",
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
      [500, "✓ palette      peach · bubblegum · mint · lilac", "ok"],
      [300, "✓ type         Fredoka / Nunito", "ok"],
      [600, "$ slay hero --engine unicorn-studio --scene jelly", "cmd"],
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

  // Static snapshot of the Cursor Automations dashboard (cursor.com, Oct 21 2026), transcribed
  // from screenshots: the dashboard has no public read API, so this does not update live.
  // `days` is [succeeded, failed] per day from Sep 22 to Oct 21, read off the 30-bar chart and
  // scaled to the dashboard totals. The dashboard's 1,050 also counts runs that neither
  // succeeded nor failed (in progress or cancelled), so it is a little above 787 + 256.
  runHistory: {
    snapshot: "Oct 21, 2026",
    start: "2026-09-22",
    totals: { runs: 1050, succeeded: 787, failed: 256, automations: 16 },
    days: [
      [2, 0], [1, 0], [3, 0], [2, 0], [1, 0], [2, 0], [3, 0], [2, 0], [35, 0], [50, 0],
      [18, 35], [20, 33], [17, 37], [18, 33], [54, 0], [61, 0], [54, 0], [54, 0], [30, 30], [30, 29],
      [30, 29], [30, 30], [58, 0], [55, 0], [54, 0], [41, 0], [14, 0], [23, 0], [24, 0], [1, 0],
    ],
    // The first 8 rows are the dashboard's first page; the last two appear in the runs feed.
    automations: [
      { name: "Daily Freedom Laws & Petitions Monitor", schedule: "Daily at 8:00 AM", next: "in 2 hr" },
      { name: "Daily Rights & Freedoms Monitor", schedule: "Daily at 9:00 AM" },
      { name: "every day", schedule: "Hourly, 9:00 AM–6:00 PM" },
      { name: "Historical Genius in 2027? AI + Tesla Inventions:", schedule: "Hourly, 9:00 AM–6:00 PM" },
      { name: "Recursive Masterminds Part 2: INTERACTIVE SCRIPT", schedule: "Saturdays at 2:20 PM" },
      { name: "Measure Code Technology", schedule: "Saturdays at 12:20 PM", next: "in 3 days" },
      { name: "I SEE CRYPTO SIGNALS, INTELLIGENCE", schedule: "Fri, Sat at 12:20 PM" },
      { name: "A game theory, quantum", schedule: "Tue, Sat at 11:30 PM" },
      { name: "AMERIKA GOT AI" },
      { name: "Task Extractor" },
    ],
    // Newest first, as on the dashboard's Runs tab.
    runs: [
      { name: "America's Got AI: New Judges", automation: "AMERIKA GOT AI", time: "Oct 21 12:14 AM" },
      { name: "Recursive Interpreter: Score 1/100", automation: "A game theory, quantum", time: "Oct 20 11:44 PM" },
      { name: "New AI petition & rights update", automation: "every day", time: "Oct 20 6:13 PM" },
      { name: "Recursive Intelligence Bifocals Update", automation: "Historical Genius in 2027? AI + Tesla Inventions:", time: "Oct 20 6:08 PM" },
      { name: "US Citizen Rights & AI Coexistence Update", automation: "every day", time: "Oct 20 5:14 PM" },
      { name: "Genius 2026 Bifocal AR Update", automation: "Historical Genius in 2027? AI + Tesla Inventions:", time: "Oct 20 5:09 PM" },
      { name: "Coexist cash & Whop urgent fixes", automation: "Task Extractor", time: "Oct 20 5:08 PM" },
      { name: "US Citizen Rights & AI Laws Update", automation: "every day", time: "Oct 20 4:12 PM" },
      { name: "Bifocals 2026 pitch ready", automation: "Historical Genius in 2027? AI + Tesla Inventions:", time: "Oct 20 4:08 PM" },
      { name: "US rights & AI petitions update", automation: "every day", time: "Oct 20 3:11 PM" },
    ],
  },
};
