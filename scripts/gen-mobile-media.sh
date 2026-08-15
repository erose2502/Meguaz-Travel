#!/bin/bash
# Generates phone-sized "-m.jpg" variants next to every local JPEG under
# public/media. Small screens load these (~60-90KB) instead of the full
# ~250-350KB stills; desktop keeps the originals. Idempotent: skips variants
# that are newer than their source. Run after adding or regenerating media.
set -euo pipefail

MEDIA_DIR="$(cd "$(dirname "$0")/../public/media" && pwd)"
WIDTH=750
QUALITY=65

count=0
while IFS= read -r -d '' src; do
  case "$src" in *-m.jpg) continue ;; esac
  out="${src%.jpg}-m.jpg"
  if [ -f "$out" ] && [ "$out" -nt "$src" ]; then continue; fi
  sips --resampleWidth "$WIDTH" -s format jpeg -s formatOptions "$QUALITY" "$src" --out "$out" >/dev/null
  count=$((count + 1))
done < <(find "$MEDIA_DIR" -name '*.jpg' -print0)

echo "generated/updated $count mobile variants"
