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

# Notification BADGE (Android status-bar glyph): monochrome WHITE-on-TRANSPARENT.
# Android renders it as a silhouette — color/opaque images become a gray blob.
# Recipe: drop the #0B0E14 tile, binarize alpha at full res (kills the rounded-
# corner AA ghost), paint the spark white, then resize (restores smooth edges).
BADGE=public/badge-72.png

magick "$SRC" -fuzz 20% -transparent "#0B0E14" \
  -channel A -threshold 55% +channel \
  -channel RGB -fill white -colorize 100 +channel \
  -resize 72x72 -channel A -level 20%,100% +channel "$BADGE"

magick identify -format "%f %wx%h opaque=%[opaque]\n" "$BADGE"   # opaque MUST be False
