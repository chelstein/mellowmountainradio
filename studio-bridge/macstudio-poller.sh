#!/bin/bash
# KAZM Request Line — Mac Studio poller
# Runs every minute (via the launchd plist in this folder), asks n8n for any
# new listener requests, and for each one:
#   1. pops a macOS notification on the Mac Studio screen
#   2. speaks it aloud once (optional — comment out the `say` line if the
#      studio mic is hot near the machine)
#   3. appends it to ~/Desktop/KAZM Requests.txt so nothing is missed
# The DJ drags the song into MegaSeg — the human stays in the loop.
#
# SETUP: set the same secret you put in the n8n workflow's drain node.
KEY="CHANGE-ME-BEFORE-ACTIVATING"
URL="https://n8n.mellowmountainradio.com/webhook/kazm-request-drain?key=${KEY}"
LOG="$HOME/Desktop/KAZM Requests.txt"

BODY=$(curl -s --max-time 20 "$URL") || exit 0
[ -z "$BODY" ] && exit 0

echo "$BODY" | /usr/bin/python3 -c '
import json, sys, subprocess, datetime
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
reqs = d.get("requests") or []
log = sys.argv[1]
for r in reqs:
    title  = (r.get("title") or "").replace("\"", "")
    artist = (r.get("artist") or "").replace("\"", "")
    name   = (r.get("name") or "a listener").replace("\"", "")
    line   = f"{datetime.datetime.now():%Y-%m-%d %H:%M}  REQUEST: {title} — {artist}  (from {name})"
    with open(log, "a") as f:
        f.write(line + "\n")
    label = f"{title} — {artist}" if artist else title
    subprocess.run(["osascript", "-e",
        f"display notification \"{label} (from {name})\" with title \"🎶 KAZM Song Request\" sound name \"Glass\""])
    subprocess.run(["say", "-v", "Samantha", f"Song request: {title}, by {artist}"])
' "$LOG"

# ── THE NUDGE SHEET ──────────────────────────────────────────────────────
# Aggregate listener signal (pulse votes + request tallies) plus current
# Sedona weather, refreshed to the Desktop every run. Read it, lean the
# playlist however you like — it is advice from the audience, nothing more.
SHEET="$HOME/Desktop/KAZM Nudge Sheet.txt"
NB=$(curl -s --max-time 20 "https://n8n.mellowmountainradio.com/webhook/kazm-nudge?key=${KEY}") || true
WX=$(curl -s --max-time 20 "https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FPhoenix") || true
if [ -n "$NB" ]; then
  printf '%s\n---SPLIT---\n%s\n' "$NB" "$WX" | /usr/bin/python3 -c '
import json, sys, datetime
raw = sys.stdin.read().split("---SPLIT---")
try:
    d = json.loads(raw[0])
except Exception:
    sys.exit(0)
if "error" in d: sys.exit(0)
wx = {}
try: wx = json.loads(raw[1]).get("current", {})
except Exception: pass
L = ["KAZM NUDGE SHEET — " + f"{datetime.datetime.now():%A %Y-%m-%d %H:%M}", ""]
t, c = wx.get("temperature_2m"), wx.get("weather_code")
if t is not None:
    line = f"Right now in Sedona: {round(t)}°"
    if c is not None and c >= 51: line += " and WET — the library has rain songs, lean in"
    elif t >= 95: line += " and hot — heat/summer titles land well"
    L += [line, ""]
lean = d.get("leanInto") or []
if lean:
    L.append("The mountain leans into (listener pulse):")
    L += [f"  +{e['love']-e['nah']:<3} {e['title']} — {e['artist']}" for e in lean]
    L.append("")
ease = d.get("easeOff") or []
if ease:
    L.append("Ease off (flatlined by listeners):")
    L += [f"  -{e['nah']-e['love']:<3} {e['title']} — {e['artist']}" for e in ease]
    L.append("")
req = d.get("mostRequested") or []
if req:
    L.append("Most requested lately:")
    L += [f"  ×{e['n']:<3} {e['title']} — {e['artist']}" for e in req]
    L.append("")
L.append(f"{d.get('votes', 0)} pulse votes total. Every line is real listener signal — the playlist stays yours.")
open(sys.argv[1], "w").write("\n".join(L) + "\n")
' "$SHEET"
fi

# Requests are a log for the studio, by design — this script never touches
# MegaSeg or the playout system.
