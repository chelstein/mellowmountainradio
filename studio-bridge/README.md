# KAZM Request Line — studio bridge

The playout brain is **MegaSeg on the Mac Studio**. AzuraCast and Live365 are
relays of that feed, so a request has to reach the studio itself. This kit
carries it there:

```
listener on mellowmountainradio.com/music.html
        │  POST {title, artist, name}
        ▼
n8n.mellowmountainradio.com  (workflow in this folder — queues it, no DB needed)
        ▲
        │  GET drain (poller, every 60s, secret key)
Mac Studio → notification + spoken alert + "KAZM Requests.txt" on the Desktop
        → DJ drags the song into MegaSeg
```

## Setup (once, ~10 minutes)

1. **n8n** — In n8n: Workflows → Import from File → `n8n-kazm-request-line.json`.
   Open the "Check key + drain" node and replace `CHANGE-ME-BEFORE-ACTIVATING`
   with a secret of your own. Activate the workflow.
2. **Mac Studio** — Copy `macstudio-poller.sh` to `/Users/Shared/kazm/`, put the
   same secret in its `KEY=` line, then `chmod +x` it. Copy
   `com.kazm.requestline.plist` to `~/Library/LaunchAgents/` and run
   `launchctl load ~/Library/LaunchAgents/com.kazm.requestline.plist`.
   Test: `bash /Users/Shared/kazm/macstudio-poller.sh` should exit quietly.
3. **The site** — tell Claude the workflow is live. The Request Line section on
   music.html (already built, currently hidden) gets rewired from the AzuraCast
   API to `https://n8n.mellowmountainradio.com/webhook/kazm-request-line` and
   goes visible. Optional but great: export the MegaSeg library
   (File → Export) and drop the file in the repo so listeners browse the real
   library instead of typing free-text.

## Notes

- The queue lives in n8n workflow static data — zero credentials, zero
  database. It holds up to 50 pending requests and is drained every minute.
- The poller keeps a human in the loop by design: a notification the DJ acts
  on is honest; auto-inserting into a live broadcast is opt-in later (see the
  MegaSeg AppleScript notes at the bottom of the poller script).
- Nothing in this folder contains a secret — you set your own key in two
  places during setup.
