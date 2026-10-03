#!/usr/bin/env bash
# Run a command inside the Sovereign Realm macOS seatbelt profile.
#
# Blocks file access to sibling accounts (/Users/babe, /Users/shared) while
# explicitly allowing the assigned workspace and home.
#
# Usage:
#   scripts/sandbox/run-in-realm.sh -- swift test
#   WORKSPACE_DIR=/path/to/enclave scripts/sandbox/run-in-realm.sh -- ls "$HOME"
#
# sandbox-exec is macOS-only. On other hosts the command runs unsandboxed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROFILE="$ROOT/scripts/sandbox/sovereign_realm.sb"
WORKSPACE_DIR="${WORKSPACE_DIR:-$ROOT}"
HOME_DIR="${HOME_DIR:-${HOME:-/tmp}}"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

if [[ "$#" -eq 0 ]]; then
  echo "usage: $0 [--] <command> [args...]" >&2
  exit 2
fi

if ! command -v sandbox-exec >/dev/null 2>&1; then
  echo "run-in-realm: sandbox-exec not found (macOS only); running unsandboxed" >&2
  exec "$@"
fi

exec sandbox-exec \
  -D "WORKSPACE_DIR=${WORKSPACE_DIR}" \
  -D "HOME_DIR=${HOME_DIR}" \
  -f "$PROFILE" \
  "$@"
