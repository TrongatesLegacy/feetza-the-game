#!/bin/bash
# Fetch a Freesound sound's HQ preview into $1 and print its licence line. usage: fsfetch.sh DEST user/id ...
set -u
DEST="$1"; shift
mkdir -p "$DEST"
for ref in "$@"; do
  user="${ref%/*}"; id="${ref#*/}"
  page=$(curl -s -A "Mozilla/5.0" "https://freesound.org/people/$user/sounds/$id/")
  lic=$(printf '%s' "$page" | grep -oE 'creativecommons.org/(publicdomain/zero|licenses/[a-z-]+)/[0-9.]+' | head -1)
  title=$(printf '%s' "$page" | grep -oE '<meta property="og:title" content="[^"]*"' | head -1 | sed 's/.*content="//;s/"$//')
  url=$(printf '%s' "$page" | grep -oE 'https://cdn.freesound.org/previews/[^"]*-lq.mp3' | head -1 | sed 's/-lq.mp3/-hq.mp3/')
  # the first ~2.4 MB (about 100 s of the 192k preview) is plenty for a 45 s loop, and long previews are slow
  curl -s -A "Mozilla/5.0" -r 0-2400000 --max-time 90 "$url" -o "$DEST/$id.mp3"
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$DEST/$id.mp3" 2>/dev/null)
  echo "$id | $user | $title | $lic | ${d}s"
done
