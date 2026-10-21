# Overnight — Slay.LLC × Coexist.LLC × LynxLogix.Ai

Standalone static landing page (no build step), separate from the Mangasm site in `../web`.

Sections: ice-shader hero → the three units → behind-the-scenes dashboard (three live terminals) →
before/after slider → completed projects → contact.

## Run locally

```bash
cd studio && python3 -m http.server 4173
# open http://localhost:4173
```

## Edit content

All copy lives in `data.js`: brands, completed projects, and the scripted terminal sessions.

## Unicorn Studio hero

The hero runs a built-in WebGL ice shader. To use a Unicorn Studio scene instead, set
`unicornProjectId` in `data.js` (or preview with `?us=<PROJECT_ID>`). If the ID is missing or
invalid, or the browser lacks WebGL2, the page falls back to the built-in shader automatically.

## Deploy

- Vercel: create a project with Root Directory `studio`, framework "Other", no build command.
- Appwrite Sites: fill `projectId` / `endpoint` in `appwrite.config.json`, then
  `appwrite login && appwrite push sites --all --force` from this folder.
