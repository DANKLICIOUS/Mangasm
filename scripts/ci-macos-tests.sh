#!/usr/bin/env bash
# GitHub Actions macOS job: run the real Apple suites that Linux cannot.
#   1. swift test --parallel  (MangasmAppTests via SPM)
#   2. xcodebuild test        (Mangasm scheme: MangasmTests + MangasmUITests)
# Does not skip or filter XCTest cases. Signing is overridden for the
# unsigned simulator; Secrets.xcconfig is materialized from the example
# placeholders so the gitignored local file is not required.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Toolchain =="
swift --version
xcodebuild -version
xcrun simctl list devices available || true

if [ ! -f App/iOS/Secrets.xcconfig ]; then
  cp App/iOS/Secrets.xcconfig.example App/iOS/Secrets.xcconfig
  echo "Wrote App/iOS/Secrets.xcconfig from example placeholders (CI simulator only)"
fi

echo "==================== swift test --parallel ===================="
swift test --parallel

pick_destination() {
  local available
  available="$(xcrun simctl list devices available)"
  local name
  for name in "iPhone 17" "iPhone 16 Pro" "iPhone 16" "iPhone 15 Pro" "iPhone 15"; do
    if printf '%s\n' "$available" | grep -q "${name} ("; then
      printf 'platform=iOS Simulator,name=%s\n' "$name"
      return 0
    fi
  done
  # First available iPhone, e.g. "    iPhone SE (3rd generation) (UUID) (Shutdown)"
  name="$(printf '%s\n' "$available" | sed -n 's/^[[:space:]]*\(iPhone [^()]*\) (.*/\1/p' | head -1 | sed 's/[[:space:]]*$//')"
  if [ -n "$name" ]; then
    printf 'platform=iOS Simulator,name=%s\n' "$name"
    return 0
  fi
  echo "error: no iPhone simulator available" >&2
  return 1
}

DEST="$(pick_destination)"
echo "==================== xcodebuild test (${DEST}) ===================="
# project.yml pins Manual / Distribution signing for App Store archives.
# Simulator CI has no those certs; disable signing without skipping tests.
xcodebuild test \
  -project MangasmiOS.xcodeproj \
  -scheme Mangasm \
  -destination "$DEST" \
  -derivedDataPath .build/dd \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY= \
  PROVISIONING_PROFILE_SPECIFIER=
