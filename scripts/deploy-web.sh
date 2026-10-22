#!/usr/bin/env bash
# Deploy mangasm.app from the repo root: root vercel.json, api/, and web/ as
# the static output, filtered by .vercelignore. This is the same surface Git
# deploys ship and CI validates.
#
#   VERCEL_PROJECT=web scripts/deploy-web.sh   # default project: web
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="${VERCEL_PROJECT:-web}"
SITE="${SITE_URL:-https://www.mangasm.app}"

cd "$ROOT"
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"
node scripts/check-web-billing-config.cjs

vercel link --project "$PROJECT" --yes
vercel deploy --prod --yes

fail=0
for path in / /plus /privacy /terms /api/public-config; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE$path")"
  echo "$code $SITE$path"
  [ "$code" = "200" ] || fail=1
done
[ "$fail" -eq 0 ] || { echo "Smoke check failed" >&2; exit 1; }
echo "✓ $SITE"
