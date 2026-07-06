# The Living Window

The Listeners' Lounge window (`rewind.html`, `.lounge-window`) is Chuck's
painting of the KAZM transmitter site, brought to life with real data —
never simulated data presented as real. Every layer here either shows the
truth or shows nothing.

## What's real, and where it comes from

| Layer | Source | Network? |
|---|---|---|
| Day/night/twilight tint, star visibility, moon glow | `astronomy.js` — vendored low-precision solar/lunar position formulas (the math behind SunCalc), computed client-side for Sedona (34.8697, -111.7610) | None — pure math, always correct, never fails |
| Cloud veil, rain/snow, wind | `weather.js` — Open-Meteo current conditions, same endpoint/coords the rest of the site already uses | `api.open-meteo.com` |
| NOAA gauge glow | Driven by the same Open-Meteo `precipitation` field | (shares the weather fetch) |
| Aircraft dots + contrails | `aircraft.js` — adsb.lol, proxied through n8n (see below) | `n8n.mellowmountainradio.com/webhook/kazm-aircraft` |
| Tower beacon | CSS animation, FAA-style timing — decorative motion, not data | None |
| Deer breathing | CSS animation on a feather-masked sprite crop — decorative motion, not data | None |

## Why aircraft goes through a proxy

adsb.lol's public API doesn't send `Access-Control-Allow-Origin`, so a
browser blocks the response even though the request itself succeeds. The
fix is `studio-bridge/n8n-kazm-aircraft.json` — a three-node n8n workflow
(read the query → call adsb.lol → shape + respond with CORS headers set)
already deployed and active at
`https://n8n.mellowmountainradio.com/webhook/kazm-aircraft`. If that
workflow is ever deactivated or torn down, the aircraft layer just shows
no traffic — it never fabricates planes.

## Graceful fallback

- Astronomy needs no network, so the sky is always correct even if
  everything else is offline.
- If Open-Meteo fails, `weather.js` returns `null` and `scene.js` falls
  back to `CALM_FALLBACK` (calm, clear, no precipitation) rather than
  inventing conditions.
- If the aircraft proxy fails or 404s, the layer renders nothing.
- All of the above is verified in Playwright with the aircraft endpoint
  deliberately mocked to 404 — zero console errors, zero page errors.

## Files

- `config.js` — coordinates, endpoints, refresh intervals, `enableLabels`/`debugMode` flags.
- `astronomy.js` — sun/moon position + phase, sky-state blend (`getSkyState`).
- `weather.js` — Open-Meteo fetch + WMO code classification.
- `particles.js` — rain/snow canvas renderer, wind-driven drift.
- `aircraft.js` — proxy fetch + canvas renderer (dot + contrail, position from bearing/altitude/distance — an artistic projection onto a single fixed painted vantage, not a literal radar).
- `wildlife.js` — mounts the deer sprite (`deer-sprite.png`) at its exact source-image position.
- `scene.js` — orchestrator; `initLivingScene(root)` is dynamically imported from `main.js`'s `initLounge()` (that file is a classic script, not a module, so `import()` is used as an expression rather than a static import).

## TODO / next real-data wiring

- Rotate the n8n API key used to deploy the aircraft workflow (it traveled through chat during setup, same as the Play Log key).
- If adsb.lol's terms or rate limits change, `CONFIG.aircraftEndpoint` and the proxy workflow are the only two places that need to move.
