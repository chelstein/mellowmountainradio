#!/bin/bash
# KAZM — THE LISTENERS' LOUNGE recorder, AzuraCast edition
#
# Uses the server the station already owns: records the stream in 6-hour
# blocks (statutory archived-program minimum is 5 hours) and publishes each
# block as an episode of an AzuraCast PODCAST via the API. Prunes episodes
# older than 14 days (the statutory maximum). The website reads the podcast's
# public episode API — no extra hosting, no S3, no new bills.
#
# ── SETUP (once) ───────────────────────────────────────────────────────────
# 1. In AzuraCast: Podcasts → Add Podcast → title "The Listeners' Lounge"
#    (manual episodes, not playlist-sourced). Copy its ID from the URL or
#    from /api/station/mellowmountainradio/public/podcasts
# 2. In AzuraCast: your avatar → My API Keys → new key. Paste below.
# 3. Best home for this script: the AzuraCast droplet itself
#    (systemd unit below) — it records from localhost. The Mac Studio with
#    the launchd plist works too.
# 4. Check droplet disk: 14 days × 4 blocks × ~330 MB ≈ 19 GB needed.
# 5. Tell Claude the podcast ID — the site's Lounge reveals itself once
#    rewind.json points at it.
#
# systemd (on the droplet): /etc/systemd/system/kazm-tape.service
#   [Unit]
#   Description=KAZM Listeners Lounge recorder
#   After=network-online.target
#   [Service]
#   ExecStart=/usr/local/bin/tape-recorder-azuracast.sh
#   Restart=always
#   RestartSec=30
#   [Install]
#   WantedBy=multi-user.target
# then: systemctl enable --now kazm-tape

AZURA="https://streaming.mellowmountainradio.com"
STATION="mellowmountainradio"
API_KEY="CHANGE-ME-API-KEY"
PODCAST_ID="CHANGE-ME-PODCAST-ID"
STREAM="$AZURA/listen/$STATION/radio.mp3"

WORK="${HOME}/kazm-tape"; mkdir -p "$WORK"
export TZ="America/Phoenix"

NOW_H=$(date +%H)
BLOCK_START_H=$(( (10#$NOW_H / 6) * 6 ))
BLOCK=$(printf "%02d" $BLOCK_START_H)
STAMP=$(date +%Y-%m-%d)
TITLE="kazm-${STAMP}-${BLOCK}00"
NAME="${TITLE}.mp3"
NOW_S=$(( 10#$NOW_H * 3600 + 10#$(date +%M) * 60 + 10#$(date +%S) ))
DUR=$(( (BLOCK_START_H + 6) * 3600 - NOW_S ))
[ "$DUR" -lt 60 ] && sleep "$DUR" && exit 0

echo "[tape] recording $NAME for ${DUR}s"
ffmpeg -hide_banner -loglevel error -i "$STREAM" -t "$DUR" -c copy -y "$WORK/$NAME"
[ -s "$WORK/$NAME" ] || exit 0

# create the episode, then attach the media
EP=$(curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"title\":\"$TITLE\",\"description\":\"Six broadcast hours of KAZM, ${STAMP}, starting ${BLOCK}:00 Sedona time. Auto-archived; deleted after 14 days per the statutory license.\",\"explicit\":false}" \
  "$AZURA/api/station/$STATION/podcast/$PODCAST_ID/episodes")
EP_ID=$(echo "$EP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -z "$EP_ID" ]; then echo "[tape] episode create failed: $EP" >&2; exit 1; fi

curl -s -X POST -H "X-API-Key: $API_KEY" \
  -F "media=@$WORK/$NAME;type=audio/mpeg" \
  "$AZURA/api/station/$STATION/podcast/$PODCAST_ID/episode/$EP_ID/media" > /dev/null \
  && rm -f "$WORK/$NAME" && echo "[tape] $TITLE published"
# (if the upload 4xx's on your AzuraCast version, change the form field
#  name from "media" to "file" — it changed between releases)

# prune: anything older than 14 days, deleted via the same API
CUTOFF=$(date -v-14d +%Y-%m-%d 2>/dev/null || date -d "14 days ago" +%Y-%m-%d)
curl -s "$AZURA/api/station/$STATION/public/podcast/$PODCAST_ID/episodes" | \
python3 -c "
import json, sys
for e in json.load(sys.stdin):
    t = e.get('title','')
    if t.startswith('kazm-') and t[5:15] < '$CUTOFF':
        print(e['id'])
" | while read -r old; do
  echo "[tape] pruning episode $old"
  curl -s -X DELETE -H "X-API-Key: $API_KEY" "$AZURA/api/station/$STATION/podcast/$PODCAST_ID/episode/$old" > /dev/null
done
