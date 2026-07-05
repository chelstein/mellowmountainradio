#!/bin/bash
# KAZM — THE TAPE: two-week broadcast archive recorder
#
# Records the station stream in 6-hour blocks (the statutory-license minimum
# for archived programs is 5 hours), uploads each finished block to a
# DigitalOcean Space (S3-compatible), prunes anything older than 14 days
# (the statutory maximum), and maintains manifest.json for the website.
#
# Runs anywhere with ffmpeg + s3cmd: the Mac Studio, the AzuraCast droplet,
# any always-on Linux box. Start it under launchd/systemd with KeepAlive —
# it records one block per invocation and exits, so the supervisor restarts
# it into the next block forever.
#
# ── SETUP ──────────────────────────────────────────────────────────────────
# 1. Create a DigitalOcean Space (e.g. "kazm-tape", any region), enable its
#    CDN, and create a Spaces access key.
# 2. Configure s3cmd once:  s3cmd --configure
#    (host: <region>.digitaloceanspaces.com, bucket host: %(bucket)s.<region>.digitaloceanspaces.com)
# 3. Set the Space's CORS to allow GET from https://mellowmountainradio.com
#    (Spaces settings → CORS → Origin: https://mellowmountainradio.com, GET, 3600)
# 4. Fill in the two variables below, install ffmpeg + s3cmd, load the
#    launchd plist (Mac) or systemd unit (Linux).
# 5. Tell Claude the Space's CDN base URL — the site's Tape page reveals
#    itself once rewind.json points at a live manifest.

STREAM="https://streaming.mellowmountainradio.com/listen/mellowmountainradio/radio.mp3"
SPACE="s3://CHANGE-ME-SPACE-NAME"          # e.g. s3://kazm-tape
BASE_URL="https://CHANGE-ME.cdn.digitaloceanspaces.com"   # the Space's CDN endpoint

WORK="$HOME/kazm-tape"
mkdir -p "$WORK"

# Phoenix time, always — block boundaries at 00/06/12/18 local
export TZ="America/Phoenix"
NOW_H=$(date +%H)
BLOCK_START_H=$(( (10#$NOW_H / 6) * 6 ))
BLOCK=$(printf "%02d" $BLOCK_START_H)
STAMP=$(date +%Y-%m-%d)
NAME="kazm-${STAMP}-${BLOCK}00.mp3"
# seconds remaining in this 6-hour block (so a restart mid-block records the rest)
NOW_S=$(( 10#$NOW_H * 3600 + 10#$(date +%M) * 60 + 10#$(date +%S) ))
BLOCK_END_S=$(( (BLOCK_START_H + 6) * 3600 ))
DUR=$(( BLOCK_END_S - NOW_S ))
[ "$DUR" -lt 60 ] && sleep "$DUR" && exit 0

echo "[tape] recording $NAME for ${DUR}s"
ffmpeg -hide_banner -loglevel error -i "$STREAM" -t "$DUR" -c copy -y "$WORK/$NAME"

# upload (public-read), then clean local
if [ -s "$WORK/$NAME" ]; then
  s3cmd put --acl-public --no-progress "$WORK/$NAME" "$SPACE/$NAME" && rm -f "$WORK/$NAME"
fi

# prune anything older than 14 days — the statutory ceiling, enforced in code
CUTOFF=$(date -v-14d +%Y-%m-%d 2>/dev/null || date -d "14 days ago" +%Y-%m-%d)
s3cmd ls "$SPACE/" | awk '{print $4}' | grep -o 'kazm-[0-9-]*-[0-9]*\.mp3' | while read -r f; do
  fdate=$(echo "$f" | sed 's/kazm-\([0-9-]*\)-[0-9]*\.mp3/\1/')
  [ "$fdate" \< "$CUTOFF" ] && echo "[tape] pruning $f" && s3cmd del "$SPACE/$f"
done

# rebuild manifest.json — the site reads this
s3cmd ls "$SPACE/" | awk '{print $4}' | grep -o 'kazm-[0-9-]*-[0-9]*\.mp3' | sort | \
python3 -c '
import sys, json
blocks = []
for line in sys.stdin:
    f = line.strip()
    if not f: continue
    parts = f.replace("kazm-", "").replace(".mp3", "")
    date, hh = parts.rsplit("-", 1)
    blocks.append({"file": f, "date": date, "start": int(hh[:2])})
print(json.dumps({"updated": __import__("datetime").datetime.utcnow().isoformat() + "Z", "blocks": blocks}))
' > "$WORK/manifest.json"
s3cmd put --acl-public --no-progress --mime-type=application/json "$WORK/manifest.json" "$SPACE/manifest.json"
echo "[tape] block done, manifest updated"
