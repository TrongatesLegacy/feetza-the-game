#!/bin/bash
# Download the Kevin MacLeod tracks (CC-BY 4.0, incompetech.com) and cut the Act 10 music loops.
#   bash music.sh WORKDIR            # writes WORKDIR/music/*.mp3 and a .log per track
# Each line: source title, output name, loop length range (s), and the range of the source to search.
set -e
W=${1:?workdir}
HERE=$(cd "$(dirname "$0")" && pwd)
B='https://incompetech.com/music/royalty-free/mp3-royaltyfree/'
mkdir -p "$W/dl" "$W/music"
c() {
  local src="$W/dl/$1.mp3"
  [ -s "$src" ] || curl -sf -o "$src" "$B$(echo "$1" | sed 's/ /%20/g').mp3"
  python3 -I "$HERE/musicloop.py" cut "$src" "$W/music/$2.mp3" "$3" "$4" "$5" "$6" > "$W/music/$2.log" 2>&1
}
c "Echoes of Time" music_oven 75 100 100 222 &
c "Ancient Rite" music_firstpizzeria 60 95 2 111 &
c "Darkling" music_boss_mirrorpeel 60 100 2 140 &
c "Investigations" music_boss_soleprop 45 80 2 92 &  # (Hitman went to Act 7's Lex Lugtoe)
c "Future Gladiator" music_boss_ghostfuture 55 100 63 192 &
c "Volatile Reaction" music_boss_soleunbound 90 100 35 150 &
c "Pixel Peeker Polka - faster" music_ending 60 90 2 195 &
wait
cat "$W"/music/*.log
