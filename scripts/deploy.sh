#!/usr/bin/env bash
# Mangasm backend deploy — terminal only, no Xcode.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

set -a
[ -f supabase/.env.local ] && . supabase/.env.local
set +a

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN in supabase/.env.local}"
: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF in supabase/.env.local}"
: "${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD in supabase/.env.local}"

SUPABASE_GO="${SUPABASE_GO:-$HOME/.local/share/supabase/supabase-go}"
if [ ! -x "$SUPABASE_GO" ]; then
  echo "Install Supabase CLI: see https://supabase.com/docs/guides/cli"
  exit 1
fi

export SUPABASE_ACCESS_TOKEN

echo "── link project ${SUPABASE_PROJECT_REF} ──"
"$SUPABASE_GO" link --project-ref "$SUPABASE_PROJECT_REF" -p "$SUPABASE_DB_PASSWORD" --yes

echo "── db push (migrations) ──"
if ! "$SUPABASE_GO" db push -p "$SUPABASE_DB_PASSWORD" --linked; then
  echo ""
  echo "Migration history mismatch. If remote has versions missing locally, restore from remote:"
  echo "  see scripts/sync-migrations-from-remote.sh"
  exit 1
fi

echo "── deploy edge functions ──"
"$SUPABASE_GO" functions deploy verify-purchase --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"
"$SUPABASE_GO" functions deploy delete-account --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"
"$SUPABASE_GO" functions deploy stripe-checkout --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"
"$SUPABASE_GO" functions deploy stripe-webhook --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"
"$SUPABASE_GO" functions deploy revenue-metrics --no-verify-jwt --project-ref "$SUPABASE_PROJECT_REF"

echo ""
echo "Done."
echo "Dashboard: https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/functions"
echo "Set Apple secrets: ./scripts/set-apple-secrets.sh"
echo "  (needs Issuer ID UUID + IAP key 5WWBWC52Q5; optional APPLE_SHARED_SECRET)"