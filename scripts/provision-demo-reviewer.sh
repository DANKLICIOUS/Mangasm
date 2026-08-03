#!/usr/bin/env bash
# Provision / reset the App Review demo user in Supabase Auth (confirmed).
# Requires service role key (never commit it).
#
# Usage:
#   export SUPABASE_SERVICE_ROLE_KEY='eyJ…'   # Dashboard → Settings → API → service_role
#   ./scripts/provision-demo-reviewer.sh
#
# Optional:
#   DEMO_EMAIL=privacy@mangasm.app
#   DEMO_PASSWORD='…strong…'   # else generated
#
# Then paste the printed email + password into ASC → App Review Information
# (Username field = EMAIL, not "Opal"). Update secrets.env MANGASM_DEMO_*.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
set -a
[[ -f "$HOME/mastermind-ai/secrets.env" ]] && source "$HOME/mastermind-ai/secrets.env"
[[ -f "$ROOT/supabase/.env.local" ]] && source "$ROOT/supabase/.env.local"
set +a

URL="${MANGASM_SUPABASE_URL:-${SUPABASE_URL:-https://dvomzrvslwdabwcwtvrg.supabase.co}}"
URL="${URL%/}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_KEY:-${SERVICE_ROLE_KEY:-}}}"
: "${SERVICE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API → service_role)}"

EMAIL="${DEMO_EMAIL:-privacy@mangasm.app}"

if [[ -z "${DEMO_PASSWORD:-}" ]]; then
  DEMO_PASSWORD="$(
    python3 - <<'PY'
import secrets, string
a = string.ascii_letters + string.digits + "!@#$%^&*-_"
while True:
    pw = "".join(secrets.choice(a) for _ in range(22))
    if (any(c.islower() for c in pw) and any(c.isupper() for c in pw)
        and any(c.isdigit() for c in pw) and any(c in "!@#$%^&*-_" for c in pw)):
        print(pw); break
PY
  )"
fi

echo "→ Creating/updating confirmed Auth user: $EMAIL"
# Admin create user (email_confirm true) — idempotent via list+update if exists
RESP="$(curl -sS -X POST "$URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json, os
print(json.dumps({
  "email": os.environ["EMAIL"],
  "password": os.environ["DEMO_PASSWORD"],
  "email_confirm": True,
  "user_metadata": {"demo": True, "label": "App Store Review"},
}))
PY
)" 2>&1)" || true

# Export for python snippet
export EMAIL DEMO_PASSWORD RESP
python3 - <<'PY'
import json, os, urllib.request, urllib.error

url = os.environ.get("URL") or ""
# re-read from parent via env passed below
PY

# Simpler pure-curl flow with python helper
URL="$URL" SERVICE_KEY="$SERVICE_KEY" EMAIL="$EMAIL" DEMO_PASSWORD="$DEMO_PASSWORD" python3 - <<'PY'
import json, os, urllib.request, urllib.error, sys

url = os.environ["URL"].rstrip("/")
key = os.environ["SERVICE_KEY"]
email = os.environ["EMAIL"]
password = os.environ["DEMO_PASSWORD"]

def req(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(
        f"{url}{path}", data=data,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            j = json.loads(raw)
        except Exception:
            j = {"raw": raw[:400]}
        return e.code, j

# Create
code, res = req("POST", "/auth/v1/admin/users", {
    "email": email,
    "password": password,
    "email_confirm": True,
    "user_metadata": {"demo": True, "label": "App Store Review"},
})
if code in (200, 201):
    uid = res.get("id")
    print(f"✓ created user id={uid}")
elif code == 422 and "already" in json.dumps(res).lower():
    # list and update password + confirm
    code2, listed = req("GET", f"/auth/v1/admin/users?page=1&per_page=200")
    users = (listed.get("users") or listed) if isinstance(listed, dict) else []
    if isinstance(users, dict):
        users = users.get("users") or []
    match = next((u for u in users if (u.get("email") or "").lower() == email.lower()), None)
    if not match:
        print("user exists but not found in first page — set DEMO_EMAIL or fix manually", file=sys.stderr)
        print(res, file=sys.stderr)
        sys.exit(1)
    uid = match["id"]
    code3, upd = req("PUT", f"/auth/v1/admin/users/{uid}", {
        "password": password,
        "email_confirm": True,
    })
    print(f"✓ updated existing user id={uid} status={code3}")
else:
    # try update path via list
    print(f"create returned {code}: {res}")
    code2, listed = req("GET", "/auth/v1/admin/users?page=1&per_page=200")
    users = listed.get("users") or []
    match = next((u for u in users if (u.get("email") or "").lower() == email.lower()), None)
    if not match:
        print("FATAL: could not create or find user", file=sys.stderr)
        sys.exit(1)
    uid = match["id"]
    code3, upd = req("PUT", f"/auth/v1/admin/users/{uid}", {
        "password": password,
        "email_confirm": True,
    })
    if code3 not in (200, 201):
        print("FATAL update", code3, upd, file=sys.stderr)
        sys.exit(1)
    print(f"✓ updated user id={uid}")

# Verify password grant with anon/publishable
pub = os.environ.get("MANGASM_SUPABASE_PUBLISHABLE_KEY") or os.environ.get("SUPABASE_PUBLISHABLE_KEY")
if pub:
    body = json.dumps({"email": email, "password": password}).encode()
    r = urllib.request.Request(
        f"{url}/auth/v1/token?grant_type=password",
        data=body,
        headers={"apikey": pub, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            data = json.loads(resp.read().decode())
            ok = bool(data.get("access_token"))
            print("✓ password login verification:", "PASS" if ok else "FAIL")
    except urllib.error.HTTPError as e:
        print("✗ password login verification FAIL", e.code, e.read().decode()[:200], file=sys.stderr)
        sys.exit(1)

print()
print("=== Paste into App Store Connect → App Review Information ===")
print(f"Sign-in required: YES")
print(f"Username (EMAIL): {email}")
print(f"Password:          {password}")
print()
print("Also update ~/mastermind-ai/secrets.env:")
print(f"  MANGASM_DEMO_USERNAME={email}")
print(f"  MANGASM_DEMO_PASSWORD=<same password>")
print("Never commit the service role or this password.")
PY
