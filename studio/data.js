// Single source of truth for copy. Edit here; markup is generated from it.
window.STUDIO = {
  // Paste a Unicorn Studio embed ID (Project → Export → Embed) to replace the
  // built-in skull-jungle scene in the hero. Leave empty to use the local shader.
  unicornProjectId: "",

  // The three units, presented as "houses".
  brands: [
    {
      id: "slay",
      code: "House I",
      name: "Slay.LLC",
      role: "The surface · brand, design & launch",
      pitch:
        "Everything the world sees: identity, motion, launch sites and storytelling that look established on day one.",
      features: [
        "Brand system + motion identity",
        "WebGL / Unicorn Studio hero scenes",
        "Launch site, waitlist & analytics",
        "App Store + social launch kit",
      ],
      hue: "#d9b45e",
    },
    {
      id: "coexist",
      code: "House II",
      name: "Coexist.LLC",
      role: "The hull · platforms & infrastructure",
      pitch:
        "The part below the waterline: domains, edge deploys, databases, payments and auth you actually own.",
      features: [
        "DNS, TLS & email hygiene",
        "Vercel / Cloudflare edge deploys",
        "Supabase Postgres + row-level security",
        "Backups, monitoring, rollbacks",
      ],
      hue: "#5fd6cc",
    },
    {
      id: "lynx",
      code: "House III",
      name: "LynxLogix.Ai",
      role: "The night watch · AI agents & automation",
      pitch:
        "Agent teams that research, build and audit while you sleep, behind a human-gated control desk.",
      features: [
        "Multi-agent research → build → audit",
        "MCP tool integrations",
        "Overnight ops automations & reports",
        "Human-in-the-loop guardrails",
      ],
      hue: "#e8826a",
    },
  ],

  // The Opsec Iceberg, surface to abyss. Defensive and educational only.
  iceberg: [
    {
      id: "surface",
      depth: "0 m",
      kicker: "Surface · what the world sees",
      title: "Brand, sites & apps",
      body: "The tip is the only part anyone admires, and the only part most studios build. It should be beautiful and say nothing it doesn't need to.",
      points: [
        "Security headers + a strict Content-Security-Policy",
        "No stack banners, debug pages or stray source maps",
        "Dependencies pinned and updated on a schedule",
      ],
      refs: [
        ["MDN HTTP Observatory", "https://developer.mozilla.org/en-US/observatory"],
        ["OWASP Top 10", "https://owasp.org/www-project-top-ten/"],
      ],
    },
    {
      id: "dns",
      depth: "−20 m",
      kicker: "Just below the waterline",
      title: "Domains, DNS, TLS & email",
      body: "Lose the domain and you lose everything above it. This layer is boring, cheap and the one attackers check first.",
      points: [
        "Registrar lock, 2FA on the registrar, DNSSEC where supported",
        "CAA records, HSTS, modern TLS only",
        "SPF, DKIM and DMARC at p=reject",
      ],
      refs: [
        ["Mozilla SSL Config", "https://ssl-config.mozilla.org/"],
        ["SSL Labs test", "https://www.ssllabs.com/ssltest/"],
        ["Internet.nl", "https://internet.nl/"],
      ],
    },
    {
      id: "identity",
      depth: "−80 m",
      kicker: "Deeper · identity & keys",
      title: "Who can say they're you",
      body: "Every account is a door. Fewer doors, harder locks, and no keys taped to the frame.",
      points: [
        "Hardware security keys + passkeys on the accounts that matter",
        "A secrets manager, never .env files in chat or repos",
        "Secret scanning on every push; rotate anything that leaks",
      ],
      refs: [
        ["passkeys.dev", "https://passkeys.dev/"],
        ["OWASP Secrets Management", "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html"],
        ["gitleaks", "https://github.com/gitleaks/gitleaks"],
      ],
    },
    {
      id: "infra",
      depth: "−300 m",
      kicker: "Deeper · infra you control",
      title: "Self-host or edge, least privilege",
      body: "Own the machines or own the config. Either way: scoped tokens, tested restores and someone watching.",
      points: [
        "Least-privilege tokens, per service, with expiry",
        "3-2-1 backups, and restores you have actually tested",
        "Monitoring + alerts; agents can propose, humans approve",
      ],
      refs: [
        ["CIS Benchmarks", "https://www.cisecurity.org/cis-benchmarks"],
        ["OWASP GenAI / LLM Top 10", "https://genai.owasp.org/"],
        ["The Book of Secret Knowledge", "https://github.com/trimstray/the-book-of-secret-knowledge"],
      ],
    },
    {
      id: "namespace",
      depth: "−700 m",
      kicker: "Deeper · sovereign namespace",
      title: "A name no one can take",
      body: "Intent Anchor is our prototype glyph-TLD registry: commit-reveal registration, quorum resolution and post-quantum signatures. It runs as a local simulation only: no chain, no tokens, not audited.",
      glyph: { label: "💀🔥⭐", ascii: "xg--f7i8717mfoa" },
      prototype: true,
      points: [
        "ML-DSA-65 signatures, ML-KEM-768 key exchange (reference code)",
        "Commit-reveal so front-running loses",
        "Lookalike labels flagged, advisory only",
      ],
      refs: [
        ["NIST FIPS 204 (ML-DSA)", "https://csrc.nist.gov/pubs/fips/204/final"],
        ["NIST FIPS 203 (ML-KEM)", "https://csrc.nist.gov/pubs/fips/203/final"],
      ],
    },
    {
      id: "abyss",
      depth: "abyss",
      kicker: "The abyss · personal opsec",
      title: "You, the last layer",
      body: "Every layer above collapses onto one person with a phone. Know what you're protecting, from whom, and leave less to find.",
      points: [
        "Threat-model first: assets, adversaries, acceptable risk",
        "Compartmentalise: separate identities, devices, emails",
        "Minimal footprint: less data shared, less data to leak",
      ],
      refs: [
        ["EFF Surveillance Self-Defense", "https://ssd.eff.org/"],
        ["Privacy Guides", "https://www.privacyguides.org/"],
        ["Threat Modeling Manifesto", "https://www.threatmodelingmanifesto.org/"],
      ],
    },
  ],

  // Self-sustainable self-sovereignty: each pillar feeds the next.
  pillars: [
    { id: "keys", title: "Own your keys", body: "Hardware keys and passkeys. No one resets you but you." },
    { id: "namespace", title: "Own your namespace", body: "Your domain, and a glyph TLD in the lab. Names you can't be evicted from." },
    { id: "infra", title: "Own your infra", body: "Self-host or edge, with configs in your repo and exits you have tested." },
    { id: "data", title: "Own your data", body: "Your Postgres, your backups, your export button." },
    { id: "revenue", title: "Own your revenue", body: "GitHub Sponsors and direct payments. No platform holds the purse." },
    { id: "agents", title: "Own your agents", body: "Automations that run overnight, on your accounts, behind your approval." },
  ],

  projects: [
    {
      code: "PROJECT_01",
      name: "Mangasm",
      url: "https://www.mangasm.app",
      kind: "iOS app + web + backend",
      tagline: "A higher state of together.",
      summary:
        "Safety-first dating app: SwiftUI client, Supabase backend, StoreKit subscriptions and a cinematic launch world of candle-lit caverns and glass.",
      stack: ["SwiftUI", "Supabase", "StoreKit", "Vercel"],
      units: ["slay", "coexist", "lynx"],
      feature: [
        { src: "assets/mangasm-brand.webp", alt: "Mangasm brand board: gold logo on black, foldable phones and a premium glass panel in a cavern with a skull waterfall", w: 819, h: 546 },
        { src: "assets/mangasm-fold.webp", alt: "Mangasm app on foldable phones in a candle-lit cavern with a skull DJ booth and glowing water", w: 819, h: 461 },
      ],
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
      [300, "› headers      no csp · server: apache/2.4", "warn"],
      [300, "› brand        3 fonts, 7 blues, no system", "warn"],
      [600, "$ slay brand --generate system", "cmd"],
      [500, "✓ palette      onyx · gold · lagoon · ember", "ok"],
      [300, "✓ type         Cormorant / Manrope", "ok"],
      [600, "$ slay hero --scene skull-mist --webgl", "cmd"],
      [700, "✓ webgl scene  dpr 1 · lazy · static if reduced", "ok"],
      [500, "$ slay ship --preview --csp strict", "cmd"],
      [700, "✓ preview      https://client-next.vercel.app", "ok"],
    ],
    coexist: [
      [700, "$ coexist provision --stack edge", "cmd"],
      [500, "› registrar    lock on · 2fa hardware key", "dim"],
      [400, "› postgres     supabase · rls on · 14 policies", "dim"],
      [400, "› payments     stripe checkout + webhooks", "dim"],
      [600, "$ coexist dns --dnssec --caa --dmarc reject", "cmd"],
      [600, "✓ dns          dnssec · caa · spf/dkim/dmarc", "ok"],
      [300, "✓ backups      3-2-1 · restore tested", "ok"],
      [600, "$ coexist deploy --prod --domain client.com", "cmd"],
      [700, "› build        1m 12s · 0 errors", "dim"],
      [500, "✓ tls + hsts   verified", "ok"],
      [400, "✓ live         p95 84ms · 0 errors", "ok"],
    ],
    lynx: [
      [1000, "$ lynx swarm --task 'rebuild client.com'", "cmd"],
      [500, "› research     competitors · 12 sites read", "dim"],
      [400, "› build        agents ×4 in parallel", "dim"],
      [600, "› audit        secrets · a11y · perf", "dim"],
      [500, "! audit        1 token in .env.example → rotated", "warn"],
      [600, "$ lynx automate --ops leads,reports", "cmd"],
      [500, "✓ crm sync     every 5m · scoped token", "ok"],
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
