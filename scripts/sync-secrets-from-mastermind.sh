#!/usr/bin/env bash
# Write App/iOS/Secrets.xcconfig + supabase/.env.local from mastermind secrets.env.
# Usage: ./scripts/sync-secrets-from-mastermind.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS="${MASTERMIND_SECRETS:-$HOME/mastermind-ai/secrets.env}"

if [[ ! -f "$SECRETS" ]]; then
  echo "Missing $SECRETS" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$SECRETS"
set +a

URL="${MANGASM_SUPABASE_URL:-${SUPABASE_URL:-https://dvomzrvslwdabwcwtvrg.supabase.co}}"
KEY="${MANGASM_SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_ANON_KEY:-}}}"

if [[ -z "$KEY" || "$KEY" == PLACEHOLDER* ]]; then
  echo "WARN: no real publishable key in secrets.env yet."
  echo "  Set MANGASM_SUPABASE_PUBLISHABLE_KEY=… then re-run."
  KEY="PLACEHOLDER_PASTE_ANON_KEY"
fi

XCCONFIG="$ROOT/App/iOS/Secrets.xcconfig"
ENVLOCAL="$ROOT/supabase/.env.local"
REF="$(echo "$URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')"

# xcconfig treats // as a comment — a raw https:// URL silently truncates to
# "https:" (shipped broken in build 23). $() breaks up the slashes safely.
# Result must be: https:/$()/host  (NO backslashes — those embed as literal \/).
XCCONFIG_URL="$(printf '%s' "$URL" | sed 's|https://|https:/$()/|')"

YELP_KEY="${YELP_API_KEY:-${MANGASM_YELP_API_KEY:-}}"
TM_KEY="${TICKETMASTER_API_KEY:-${MANGASM_TICKETMASTER_API_KEY:-}}"

cat >"$XCCONFIG" <<EOF
// Auto-synced from mastermind secrets.env — DO NOT COMMIT
SUPABASE_URL = $XCCONFIG_URL
SUPABASE_PUBLISHABLE_KEY = $KEY
YELP_API_KEY = $YELP_KEY
TICKETMASTER_API_KEY = $TM_KEY
EOF
chmod 600 "$XCCONFIG"

cat >"$ENVLOCAL" <<EOF
# Auto-synced from mastermind secrets.env — DO NOT COMMIT
SUPABASE_URL=$URL
SUPABASE_PROJECT_REF=$REF
SUPABASE_PUBLISHABLE_KEY=$KEY
EOF
chmod 600 "$ENVLOCAL"

echo "Wrote $XCCONFIG"
echo "Wrote $ENVLOCAL"
if [[ "$KEY" == PLACEHOLDER* ]]; then
  echo "App will stay on mocks until a real key is set."
  exit 0
fi
echo "Live key present — Xcode build will inject SUPABASE_* into Info.plist."
