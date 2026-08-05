#!/usr/bin/env bash
# 🤡 clown — the GitLab-migration sidekick. Named because we've been clownin'
# around for hours. Two jobs:
#
#   clown keys                                → "where the heck are my keys/tokens?"
#   clown token create [expires_at]          → mint a service-account PAT
#   clown token list                         → list the service account's PATs
#   clown token revoke <token_id>            → kill one (immediate)
#   clown token rotate <token_id> [expires]  → revoke-old + issue-new in one call
#
# Secrets NEVER go on the command line. The Owner token is read from secrets.env;
# any minted token is written back into secrets.env (chmod 600) and shown masked.
set -euo pipefail

SECRETS="${SECRETS:-$HOME/mastermind-ai/secrets.env}"
MASTERLIST="${MASTERLIST:-$HOME/mastermind-ai/MASTERLIST.md}"

honk() { printf '🤡 %s\n' "$*"; }
mask() { sed -E 's/(glpat-|glrt-)[A-Za-z0-9_-]+/\1***REDACTED***/g'; }
future() { date -v+"${1}"d +%F 2>/dev/null || date -d "+${1} days" +%F; }  # macOS | GNU

load_secrets() { [ -f "$SECRETS" ] && { set -a; . "$SECRETS"; set +a; } || true; }

# ── clown keys ── inventory of where secrets live (names only, never values) ──
cmd_keys() {
  honk "Where your keys & tokens actually live:"
  printf '   • Values : %s  %s\n' "$SECRETS"   "$([ -f "$SECRETS" ]   && echo '(exists, chmod 600)' || echo '(MISSING!)')"
  printf '   • Catalog: %s  %s\n' "$MASTERLIST" "$([ -f "$MASTERLIST" ] && echo '(human-readable inventory)' || echo '(MISSING!)')"
  echo
  if [ -f "$SECRETS" ]; then
    honk "Vars currently set in secrets.env (names only — no values printed):"
    grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$SECRETS" | sed -E 's/=.*//' | sort | sed 's/^/     /'
  fi
  echo
  honk "Full details (issuer IDs, key paths, purposes) → open the masterlist:"
  printf '     open %s\n' "$MASTERLIST"
}

# ── clown token … ── GitLab service-account PAT lifecycle ────────────────────
require_gitlab_env() {
  load_secrets
  : "${GITLAB_HOST:?set GITLAB_HOST in secrets.env (e.g. gitlab.com)}"
  : "${GITLAB_OWNER_TOKEN:?set GITLAB_OWNER_TOKEN (an Owner PAT) in secrets.env}"
  : "${GITLAB_GROUP_ID:?set GITLAB_GROUP_ID in secrets.env}"
  : "${GITLAB_SA_USER_ID:?set GITLAB_SA_USER_ID (service-account user id) in secrets.env}"
  API="https://${GITLAB_HOST}/api/v4/groups/${GITLAB_GROUP_ID}/service_accounts/${GITLAB_SA_USER_ID}/personal_access_tokens"
  HDR=(--header "PRIVATE-TOKEN: ${GITLAB_OWNER_TOKEN}")
}

store_token() {  # stdin: JSON response → extract .token into secrets.env, echo masked
  local json tok; json="$(cat)"
  tok="$(printf '%s' "$json" | sed -nE 's/.*"token":"([^"]+)".*/\1/p')"
  if [ -n "$tok" ]; then
    local tmp; tmp="$(mktemp)"
    grep -v '^GITLAB_CI_TOKEN=' "$SECRETS" 2>/dev/null > "$tmp" || true
    printf 'GITLAB_CI_TOKEN=%s\n' "$tok" >> "$tmp"
    mv "$tmp" "$SECRETS"; chmod 600 "$SECRETS"
    honk "stored the new token → GITLAB_CI_TOKEN in $SECRETS (chmod 600)"
  fi
  printf '%s\n' "$json" | mask
}

cmd_token() {
  require_gitlab_env
  local sub="${1:-}"; shift || true
  case "$sub" in
    create)
      local exp="${1:-$(future 90)}"
      honk "minting service-account PAT (scopes: api, read_repository, write_repository; expires $exp)"
      curl -sS --request POST "${HDR[@]}" --url "$API" \
        --data "name=mangasm-ci" \
        --data "scopes[]=api" \
        --data "scopes[]=read_repository" \
        --data "scopes[]=write_repository" \
        --data "expires_at=${exp}" | store_token ;;
    list)
      curl -sS "${HDR[@]}" --url "$API" | mask ;;
    revoke)
      : "${1:?usage: clown token revoke <token_id>}"
      honk "revoking token $1 (immediate — anything using it breaks now)"
      curl -sS --request DELETE "${HDR[@]}" --url "${API}/${1}" -o /dev/null -w '🤡 HTTP %{http_code}\n' ;;
    rotate)
      : "${1:?usage: clown token rotate <token_id> [expires_at]}"
      local exp="${2:-$(future 90)}"
      honk "rotating token $1 (old dies now; new expires $exp — never omit expiry or you get 7 days)"
      curl -sS --request POST "${HDR[@]}" --url "${API}/${1}/rotate" \
        --data "expires_at=${exp}" | store_token ;;
    *)
      echo "usage: clown token {create [expires_at] | list | revoke <id> | rotate <id> [expires_at]}" >&2
      exit 1 ;;
  esac
}

case "${1:-}" in
  keys)  cmd_keys ;;
  token) shift; cmd_token "$@" ;;
  *)
    echo "🤡 clown — GitLab-migration sidekick"
    echo "usage:"
    echo "  clown keys                                  # where are my keys/tokens?"
    echo "  clown token create [expires_at]             # mint a service-account PAT"
    echo "  clown token list                            # list the SA's PATs"
    echo "  clown token revoke <token_id>               # kill one now"
    echo "  clown token rotate <token_id> [expires_at]  # revoke-old + issue-new"
    exit 1 ;;
esac
