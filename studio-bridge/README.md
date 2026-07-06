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

## The Tape (broadcast archive: tape-recorder-azuracast.sh)

Records the stream in 6-hour blocks, keeps exactly 14 days (both numbers are
the statutory-license rules for archived programs). Uses infrastructure the
station already owns — no new storage bill:

- Each finished block uploads straight into AzuraCast's own media library
  (the same place songs live), NOT the Podcasts feature.
- The file is added to a disabled, on-demand-only playlist ("Lounge Archive",
  id 16 — `is_enabled:false`, `include_in_on_demand:true`) so it's publicly
  playable via AzuraCast's on-demand download URL but never scheduled into
  live rotation.
- The `KAZM Lounge Archive Feed` n8n workflow (`n8n-kazm-rewind.json`) lists
  those files, shapes them into blocks, prunes anything past 14 days, and
  serves it all at `/webhook/kazm-rewind`. The site's `rewind.json` already
  points at it — the Lounge reveals itself the moment real blocks exist.

**Before this runs for real:** confirm in the AzuraCast dashboard that a
disabled custom playlist with no schedule truly never bleeds into live
rotation. That's a call to make with eyes on your own setup, not something
to assume from outside — a wrong guess here means real airtime.

Setup is in the header of `tape-recorder-azuracast.sh` — needs ffmpeg,
your AzuraCast API key, runs via cron or systemd on whatever box is already
on 24/7 (the AzuraCast box itself is the natural choice — it records from
localhost). Confirm your webcast/SoundExchange licensing covers the direct
AzuraCast stream — the archive rides the same license as the stream itself.

(`tape-recorder.sh` is the older DigitalOcean Space-based version, kept
around only in case you ever want the archive on separate storage instead.)

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

The workflow reads the station's OWN records: AzuraCast has kept full
song history the whole time it's relayed MegaSeg (verified back over a
year, ~600 spins/day). The day view and the weekly charts query that
history live; the sweep lane builds the lifetime index (spin counts +
true first-ever-play dates) that powers the Station Debut badges.

Setup (3 minutes):
1. Import `n8n-kazm-playlog.json` into n8n (Import from URL:
   https://raw.githubusercontent.com/chelstein/mellowmountainradio/main/studio-bridge/n8n-kazm-playlog.json)
2. Replace PASTE-YOUR-AZURACAST-API-KEY with your AzuraCast API key in
   all THREE HTTP nodes: "Pull that day from AzuraCast", "Pull the week
   from AzuraCast", and "Pull AzuraCast history". (The key lives only in
   n8n — never in the site or the repo.)
3. Activate, then click "Test workflow" once — the sweep lane walks 400
   days of history in 10-day chunks and builds the lifetime index. It's
   idempotent; a done-flag stops double counting.
The Time Machine page reveals itself the moment /webhook/kazm-charts
answers, with the full year browsable from day one. For history older
than AzuraCast keeps, MegaSeg's own play logs on the Mac Studio can be
exported and merged — say the word and that lane gets built.

## The Aircraft Proxy (n8n-kazm-aircraft.json) — the Living Window's sky traffic

adsb.lol's public API has no CORS headers, so the browser can't call it
directly. This three-node workflow (read the query → call adsb.lol →
shape + respond with `https://mellowmountainradio.com` allowed as an
origin) sits in between. Deployed and active at
`https://n8n.mellowmountainradio.com/webhook/kazm-aircraft`. Full detail
on how it feeds the Lounge window's sky in `living-scene/README.md`.

Setup (2 minutes):
1. Import `n8n-kazm-aircraft.json` into n8n (Import from URL:
   https://raw.githubusercontent.com/chelstein/mellowmountainradio/main/studio-bridge/n8n-kazm-aircraft.json)
2. Activate. No API key needed — adsb.lol is a free public feed.
If this workflow is ever deactivated, the aircraft layer on the Lounge
window simply shows no traffic; it never invents planes.
