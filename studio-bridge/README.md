# KAZM Song Requests — studio bridge

The playout brain is **MegaSeg on the Mac Studio**. AzuraCast and Live365 are
relays of that feed, so a request has to reach the studio itself. This kit
carries it there:

```
listener on mellowmountainradio.com/music.html
        │  POST {title, artist, name}
        ▼
n8n.mellowmountainradio.com  (workflow in this folder — queues it, no DB needed;
        also serves the public "jukebox wall" of recent requests at
        GET /webhook/kazm-request-board)
        ▲
        │  GET drain (poller, every 60s, secret key)
Mac Studio → notification + spoken alert + "KAZM Requests.txt" on the Desktop
        → plus "KAZM Nudge Sheet.txt": aggregate pulse votes, request
          tallies, and current weather — advice from the audience
        → studio reads it (playing it stays the station's call)
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
3. **The site** — nothing to do. The Request Line on music.html probes the
   webhook on every page load and reveals itself the moment the workflow is
   active. The browsable library is the real MegaSeg export
   (`request-library.json`, 457 songs, source of record in
   `studio-bridge/megaseg-library.csv`) — re-export and hand the CSV to
   Claude whenever the library changes.

## Notes

- The queue lives in n8n workflow static data — zero credentials, zero
  database. It holds up to 50 pending requests and is drained every minute.
- Requests are a log for the studio, by design. Nothing here touches MegaSeg
  or the playout system — the broadcast is never overridden.
- Nothing in this folder contains a secret — you set your own key in two
  places during setup.

## The Pulse (workflow v3)

Listeners tap a pulse (more like this) or flatline (not my vibe) on the site
player as songs air. Votes aggregate per song — nobody's identity, just
tallies — and surface on the Nudge Sheet next to request counts. The same
votes tune that listener's own suggestions in their browser. The playlist
never changes by itself; the sheet is advice, the studio is the DJ.

## Upgrading from workflow v1

The v2 workflow in this folder adds dedications and the public jukebox-wall
endpoint. To upgrade a running v1: deactivate + delete the old workflow in
n8n, import this file again (Import from URL works:
https://raw.githubusercontent.com/chelstein/mellowmountainradio/main/studio-bridge/n8n-kazm-request-line.json),
set your drain secret again, activate. The site detects the wall endpoint on
its own — v1 keeps working meanwhile, just without the wall and dedications.

## Roads relay (separate workflow: n8n-kazm-roads.json)

Feeds the live incident board on roads.html. Setup:
1. Get a free AZ511 developer key: az511.com → create an account → request
   an API key (their developer/API page). It's ADOT's official data feed.
2. Import `n8n-kazm-roads.json` into n8n (Import from URL works:
   https://raw.githubusercontent.com/chelstein/mellowmountainradio/main/studio-bridge/n8n-kazm-roads.json)
3. Open the "Fetch AZ511 events" node and replace PASTE-YOUR-AZ511-KEY-HERE
   in the URL with your key. Activate.
The site probes the relay on page load — the incident board and corridor
status lines appear on their own once it answers. Cameras and the flow map
never depend on it (they're direct from ADOT).

## The Tape (broadcast archive: tape-recorder.sh)

Records the stream in 6-hour blocks, keeps exactly 14 days (both numbers are
the statutory-license rules for archived programs), uploads to a
DigitalOcean Space, maintains manifest.json. Setup is in the header of
`tape-recorder.sh` — Space + s3cmd + CORS + launchd (Mac) or systemd. When
it's rolling, give Claude the Space's CDN URL; the site's Listeners' Lounge (rewind.html)
reveals itself the moment rewind.json points at a live manifest. Confirm
your webcast/SoundExchange licensing covers the direct AzuraCast stream —
the archive rides the same license as the stream itself.

## Window sources (window-sources/)

Chuck's real photographs of the back-door yard — the tower, the dish, the
fence line — at midday (IMG_6128–6131), dusk (IMG_6092/6093, and
IMG_6138 above), and true night (IMG_6099: moon glare, sparse stars,
blue-charcoal sky), plus ground detail (IMG_6134/6137). These are the
calibration references for the Station Window on rewind.html: the canvas
grades the base photo (backdoor.jpg) to match whichever of these skies the
real sun and weather currently call for. Not served by any page — kept in
the repo as the source of truth for how the yard actually looks.

## The Play Log (n8n-kazm-playlog.json) — the Song Time Machine

Logs every song the moment it airs (polls the AzuraCast now-playing API
every 30 seconds), keeps 90 days of minute-by-minute day logs plus
lifetime spin counts with each song's FIRST-EVER play date. Powers
timemachine.html: "what was playing when?", the weekly spin chart, and
the Station Debuts board.

Setup (2 minutes, same as the request line):
1. Import `n8n-kazm-playlog.json` into n8n (Import from URL:
   https://raw.githubusercontent.com/chelstein/mellowmountainradio/main/studio-bridge/n8n-kazm-playlog.json)
2. Activate. That's it — the live logger needs no keys.

BACKFILL — start weeks deep instead of empty (optional, recommended):
AzuraCast has been keeping its own song history the whole time it's been
relaying MegaSeg. The workflow's bottom lane pulls it in:
1. In AzuraCast: Administration → API Keys → create a key (any account
   with station-reports access).
2. In the workflow, open "Pull AzuraCast history" and replace
   PASTE-YOUR-AZURACAST-API-KEY with it.
3. Click "Test workflow" once (the manual-trigger lane sweeps the last
   90 days in 5-day chunks, dedupes against anything the poller already
   logged, and sets true first-play dates from the earliest record).
The Time Machine's "log since" date jumps back automatically. For history
older than AzuraCast keeps, MegaSeg's own play logs on the Mac Studio can
be exported and merged the same way — say the word and that lane gets
built.
