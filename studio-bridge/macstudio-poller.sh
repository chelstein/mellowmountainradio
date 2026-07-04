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

# ── OPTIONAL: fully automatic MegaSeg insert ─────────────────────────────
# MegaSeg (Pro) exposes an AppleScript dictionary, but the exact commands
# vary by version. To wire auto-insert:
#   1. On the Mac Studio open Script Editor → File → Open Dictionary → MegaSeg
#   2. Find the command that adds/queues a track (and how it matches by
#      title/artist in your library)
#   3. Replace the notification block above with an `osascript` call using
#      that command
# Until you have verified the dictionary on YOUR MegaSeg version, leave this
# off — a notification the DJ acts on is honest; a script that silently
# fails is not.
