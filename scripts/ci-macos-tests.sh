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
  # Prefer iOS 18. Pinning OS avoids Xcode picking an iOS 26 twin of the
  # same device name; iOS 26 XCUITest often omits SwiftUI identifiers.
  python3 - <<'PY'
import re, subprocess, sys

out = subprocess.check_output(
    ["xcrun", "simctl", "list", "devices", "available"], text=True
)
runtime = None
devices = []
for line in out.splitlines():
    header = re.match(r"-- iOS ([0-9.]+) --", line.strip())
    if header:
        runtime = header.group(1)
        continue
    if line.strip().startswith("--"):
        runtime = None
        continue
    match = re.match(r"\s+(iPhone [^()]+?) \(", line)
    if match and runtime:
        devices.append((runtime, match.group(1).rstrip()))

def ver_key(os: str):
    return tuple(int(part) for part in os.split("."))

preferred = [
    "iPhone 16 Pro",
    "iPhone 16",
    "iPhone 16e",
    "iPhone 16 Plus",
    "iPhone 15 Pro",
    "iPhone 15",
    "iPhone SE (3rd generation)",
]
ios18 = [(os, name) for os, name in devices if os.startswith("18.")]
ios18.sort(key=lambda item: ver_key(item[0]), reverse=True)
if ios18:
    for want in preferred:
        for os, name in ios18:
            if name == want:
                print(f"platform=iOS Simulator,name={name},OS={os}")
                sys.exit(0)
    os, name = ios18[0]
    print(f"platform=iOS Simulator,name={name},OS={os}")
    sys.exit(0)

for os, name in devices:
    print(f"platform=iOS Simulator,name={name},OS={os}")
    sys.exit(0)

sys.exit(1)
PY
  if [ $? -ne 0 ]; then
    echo "error: no iPhone simulator available" >&2
    return 1
  fi
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
