#!/bin/bash
# Download Kenney CC0 audio packs into $1 (a fresh folder), extracting only audio.
set -u
DEST="$1"
mkdir -p "$DEST"
JAR="$DEST/../cookies.txt"
for p in impact-sounds sci-fi-sounds rpg-audio digital-audio interface-sounds ui-audio casino-audio; do
  id=$(printf "assets/%s" "$p" | xxd -p | tr -d '\n')
  curl -s -c "$JAR" -b "$JAR" -A "Mozilla/5.0" "https://kenney.nl/assets/$p" -o /dev/null
  url=$(curl -s -c "$JAR" -b "$JAR" -A "Mozilla/5.0" -H "Referer: https://kenney.nl/assets/$p" "https://kenney.nl/download-link/$id" | python3 -I -c 'import sys,json; print(json.load(sys.stdin).get("url",""))')
  echo "$p -> $url"
  [ -z "$url" ] && continue
  curl -sL -A "Mozilla/5.0" "$url" -o "$DEST/$p.zip"
  mkdir -p "$DEST/$p"
  unzip -q -o "$DEST/$p.zip" '*.ogg' '*.wav' '*.mp3' '*.txt' -d "$DEST/$p" 2>/dev/null
  rm -f "$DEST/$p.zip"
done
