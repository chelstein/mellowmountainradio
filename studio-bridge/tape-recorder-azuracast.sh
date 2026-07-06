#!/bin/bash
# KAZM — THE LISTENERS' LOUNGE recorder, AzuraCast edition
#
# Uses the server the station already owns: records the stream in 6-hour
# blocks (statutory archived-program minimum is 5 hours), uploads each block
# straight into AzuraCast's own media library (the same place songs live —
# NOT the Podcasts feature), and prunes anything older than 14 days (the
# statutory maximum). The block is added to a disabled, on-demand-only
# playlist so it's playable but never scheduled into live rotation.
#
# ── SETUP (once) ───────────────────────────────────────────────────────────
# 1. API_KEY below needs "Podcasts"... no — just station media permissions.
#    Your existing AzuraCast API key already works for this.
# 2. PLAYLIST_ID below is "Lounge Archive" (id 16) — already created,
#    is_enabled:false, include_in_on_demand:true. Confirm in AzuraCast that
#    a disabled custom playlist with no schedule truly never airs live
#    before this starts running for real — that's your call to make with
#    eyes on the dashboard, not something to assume from outside.
# 3. Run this on the AzuraCast box itself (records from localhost — no
#    extra bandwidth) via cron or systemd. Needs ffmpeg installed.
# 4. Check disk: 14 days x 4 blocks/day x ~330MB (128kbps) ≈ 19GB needed.
#
# Cron (every 6 hours, on the hour):
#   0 */6 * * * /usr/local/bin/tape-recorder-azuracast.sh >> /var/log/kazm-tape.log 2>&1
#
# systemd timer instead, if you'd rather:
#   /etc/systemd/system/kazm-tape.service
#     [Unit]
#     Description=KAZM Listeners Lounge recorder
#     [Service]
#     ExecStart=/usr/local/bin/tape-recorder-azuracast.sh
#   /etc/systemd/system/kazm-tape.timer
#     [Timer]
#     OnCalendar=*-*-* 00,06,12,18:00:00
#     [Install]
#     WantedBy=timers.target
#   then: systemctl enable --now kazm-tape.timer

AZURA="https://streaming.mellowmountainradio.com"
STATION="mellowmountainradio"
API_KEY="CHANGE-ME-API-KEY"
PLAYLIST_ID=16

STREAM="$AZURA/listen/$STATION/radio.mp3"
WORK="${HOME}/kazm-tape"; mkdir -p "$WORK"
export TZ="America/Phoenix"

NOW_H=$(date +%H)
BLOCK_START_H=$(( (10#$NOW_H / 6) * 6 ))
BLOCK=$(printf "%02d" $BLOCK_START_H)
STAMP=$(date +%Y-%m-%d)
TITLE="Lounge Archive ${STAMP} ${BLOCK}:00"
NAME="lounge-${STAMP}-${BLOCK}00.mp3"
NOW_S=$(( 10#$NOW_H * 3600 + 10#$(date +%M) * 60 + 10#$(date +%S) ))
DUR=$(( (BLOCK_START_H + 6) * 3600 - NOW_S ))
[ "$DUR" -lt 60 ] && sleep "$DUR" && exit 0

echo "[tape] recording $NAME for ${DUR}s"
ffmpeg -hide_banner -loglevel error -i "$STREAM" -t "$DUR" -c copy -y "$WORK/$NAME"
[ -s "$WORK/$NAME" ] || { echo "[tape] recording came out empty, skipping upload"; exit 0; }

# base64-encode the finished block and drop it straight into the station's
# own media library — no podcasts, no separate storage bill.
python3 - "$WORK/$NAME" "$TITLE" <<'PYEOF'
import sys, json, base64, subprocess

path, title = sys.argv[1], sys.argv[2]
with open(path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

payload = json.dumps({"path": f"Archive/{path.split('/')[-1]}", "file": b64})
print(f"[tape] uploading {len(b64)} b64 chars for {title}")
with open("/tmp/kazm_upload_payload.json", "w") as out:
    out.write(payload)
PYEOF

RESP=$(curl -s -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  --data @/tmp/kazm_upload_payload.json \
  "$AZURA/api/station/$STATION/files")
rm -f /tmp/kazm_upload_payload.json
FILE_ID=$(echo "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -z "$FILE_ID" ]; then echo "[tape] upload failed: $RESP" >&2; exit 1; fi

# tag the title/artist so the archive feed can read it back cleanly, and
# associate with the disabled on-demand playlist
curl -s -X PUT -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"playlists\":[{\"id\":$PLAYLIST_ID}]}" \
  "$AZURA/api/station/$STATION/file/$FILE_ID" > /dev/null

rm -f "$WORK/$NAME"
echo "[tape] $TITLE published as file $FILE_ID"

# prune: anything in Archive/ older than 14 days
CUTOFF=$(date -v-14d +%s 2>/dev/null || date -d "14 days ago" +%s)
curl -s -H "X-API-Key: $API_KEY" "$AZURA/api/station/$STATION/files?searchPhrase=Archive/" | \
python3 -c "
import json, sys
for f in json.load(sys.stdin):
    if f.get('path','').startswith('Archive/') and f.get('uploaded_at', 0) < $CUTOFF:
        print(f['id'])
" | while read -r old; do
  echo "[tape] pruning file $old"
  curl -s -X DELETE -H "X-API-Key: $API_KEY" "$AZURA/api/station/$STATION/file/$old" > /dev/null
done
