#!/usr/bin/env bash
# Regenerates the PWA maskable icon from the source logo mark.
#
#   bash scripts/generate-pwa-icons.sh   (from frontend/; requires ImageMagick 7)
#
# Maskable icons must be OPAQUE and keep the mark inside the ~80% safe zone —
# the OS mask (circle/squircle) crops the outer edges. We derive from the
# CURRENT app icon (public/icon-512.png, the cyan spark on #0B0E14) — NOT
# src/assets/logo/kc-icon.svg, which is the stale pre-redesign mascot mark.
# The icon's rounded-square tile is exactly #0B0E14 with transparent corners,
# so scaling to ~76% and extending on the same color blends seamlessly.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=public/icon-512.png
OUT=public/icon-512-maskable.png

magick "$SRC" -resize 390x390 \
  -gravity center -background "#0B0E14" -extent 512x512 \
  -alpha remove -alpha off "$OUT"

magick identify -format "%f %wx%h opaque=%[opaque]\n" "$OUT"
