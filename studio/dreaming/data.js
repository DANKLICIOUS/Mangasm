// Recursive Dreaming: built-in data. `loadData()` in dreaming.js returns this object unless
// `?data=<url>` points at a JSON document of the same shape (see README.md, "Data contract").
//
// `automations` is a static snapshot of the Cursor Automations dashboard (cursor.com, Oct 21 2026),
// copied from studio/data.js `runHistory`, which was transcribed from screenshots. The dashboard has
// no public read API, so nothing here updates live. `history.days` is [succeeded, failed] per day from
// Sep 22 to Oct 21, read off the 30-bar chart and scaled to the dashboard totals. The dashboard's 1,050
// also counts runs that neither succeeded nor failed (in progress or cancelled), so it is a little
// above 787 + 256.
//
// `tracks` holds the starting values of the dream simulation. They are game design, not telemetry,
// and the Crypto Carnival token is a game mechanic, not financial information.
window.DREAMING_DATA = {
  version: 1,
  source: "snapshot",
  generatedAt: "2026-10-21T00:14:00Z",

  automations: {
    label: "Oct 21, 2026",
    totals: { runs: 1050, succeeded: 787, failed: 256, automations: 16 },
    history: {
      start: "2026-09-22",
      days: [
        [2, 0], [1, 0], [3, 0], [2, 0], [1, 0], [2, 0], [3, 0], [2, 0], [35, 0], [50, 0],
        [18, 35], [20, 33], [17, 37], [18, 33], [54, 0], [61, 0], [54, 0], [54, 0], [30, 30], [30, 29],
        [30, 29], [30, 30], [58, 0], [55, 0], [54, 0], [41, 0], [14, 0], [23, 0], [24, 0], [1, 0],
      ],
    },
    // The first 8 rows are the dashboard's first page (all "Active"); the last two appear in the runs feed.
    list: [
      { name: "Daily Freedom Laws & Petitions Monitor", schedule: "Daily at 8:00 AM", next: "in 2 hr", status: "active" },
      { name: "Daily Rights & Freedoms Monitor", schedule: "Daily at 9:00 AM", status: "active" },
      { name: "every day", schedule: "Hourly, 9:00 AM–6:00 PM", status: "active" },
      { name: "Historical Genius in 2027? AI + Tesla Inventions:", schedule: "Hourly, 9:00 AM–6:00 PM", status: "active" },
      { name: "Recursive Masterminds Part 2: INTERACTIVE SCRIPT", schedule: "Saturdays at 2:20 PM", status: "active" },
      { name: "Measure Code Technology", schedule: "Saturdays at 12:20 PM", next: "in 3 days", status: "active" },
      { name: "I SEE CRYPTO SIGNALS, INTELLIGENCE", schedule: "Fri, Sat at 12:20 PM", status: "active" },
      { name: "A game theory, quantum", schedule: "Tue, Sat at 11:30 PM", status: "active" },
      { name: "AMERIKA GOT AI" },
      { name: "Task Extractor" },
    ],
    // Newest first, as on the dashboard's Runs tab. Every row there shows a success check.
    runs: [
      { name: "America's Got AI: New Judges", automation: "AMERIKA GOT AI", time: "Oct 21 12:14 AM", status: "succeeded" },
      { name: "Recursive Interpreter: Score 1/100", automation: "A game theory, quantum", time: "Oct 20 11:44 PM", status: "succeeded" },
      { name: "New AI petition & rights update", automation: "every day", time: "Oct 20 6:13 PM", status: "succeeded" },
      { name: "Recursive Intelligence Bifocals Update", automation: "Historical Genius in 2027? AI + Tesla Inventions:", time: "Oct 20 6:08 PM", status: "succeeded" },
      { name: "US Citizen Rights & AI Coexistence Update", automation: "every day", time: "Oct 20 5:14 PM", status: "succeeded" },
      { name: "Genius 2026 Bifocal AR Update", automation: "Historical Genius in 2027? AI + Tesla Inventions:", time: "Oct 20 5:09 PM", status: "succeeded" },
      { name: "Coexist cash & Whop urgent fixes", automation: "Task Extractor", time: "Oct 20 5:08 PM", status: "succeeded" },
      { name: "US Citizen Rights & AI Laws Update", automation: "every day", time: "Oct 20 4:12 PM", status: "succeeded" },
      { name: "Bifocals 2026 pitch ready", automation: "Historical Genius in 2027? AI + Tesla Inventions:", time: "Oct 20 4:08 PM", status: "succeeded" },
      { name: "US rights & AI petitions update", automation: "every day", time: "Oct 20 3:11 PM", status: "succeeded" },
    ],
  },

  tracks: {
    arpg: { xp: 12480, xpPerLevel: 2000 },
    diabolic: { vectors: { soulLattice: 64, bloodScript: 52, echoChamber: 71 } },
    carnival: { value: 100, decayLog: [-7.13, -21.37, -21.01] },
  },

  unreal: { assets: 1204, blueprints: 86, logic: 312, ai: 18 },
};
