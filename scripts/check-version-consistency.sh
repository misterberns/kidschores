#!/usr/bin/env bash
# Version-surface consistency gate (runs in CI — see docs/RELEASE.md).
# All user-facing version surfaces must agree with the VERSION file:
#   VERSION, frontend/package.json, backend/app/main.py, README badge,
#   README bottom line, SECURITY.md supported-versions table (minor).
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(tr -d '[:space:]' < VERSION)
MINOR=${VERSION%.*}   # e.g. 0.9.0 -> 0.9
fail=0

check() { # label, expected-condition (0=ok)
  if [ "$2" -ne 0 ]; then
    echo "FAIL: $1"
    fail=1
  else
    echo "ok:   $1"
  fi
}

pkg=$(grep -oE '"version": *"[^"]+"' frontend/package.json | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
check "frontend/package.json version ($pkg) == VERSION ($VERSION)" $([ "$pkg" = "$VERSION" ]; echo $?)

main=$(grep -oE 'version="[0-9]+\.[0-9]+\.[0-9]+"' backend/app/main.py | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
check "backend/app/main.py version ($main) == VERSION ($VERSION)" $([ "$main" = "$VERSION" ]; echo $?)

grep -q "Version-v${VERSION}-" README.md; check "README.md version badge is v$VERSION" $?

grep -q "Current version: \*\*${VERSION}\*\*" README.md; check "README.md bottom 'Current version' is $VERSION" $?

grep -qE "^\| *${MINOR//./\\.}\.x" SECURITY.md; check "SECURITY.md supported-versions covers ${MINOR}.x" $?

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Version surfaces are inconsistent. See docs/RELEASE.md section 1."
  exit 1
fi
echo "All version surfaces agree at $VERSION."
