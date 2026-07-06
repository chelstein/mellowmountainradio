# The Living Window

The Listeners' Lounge window (`rewind.html`, `.lounge-window`) is Chuck's
painting of the KAZM transmitter site, brought to life with real data —
never simulated data presented as real. Every layer here either shows the
truth or shows nothing.

## 1. Current (v85) architecture

The sky is now real, not painted. `lounge-window.jpg` (the original
flattened painting) has been replaced as the live base with
`lounge-foreground.webp` — the same painting with its sky masked to
transparent (via OpenCV GrabCut segmentation; see
`ASSET-BACKLOG-v85.md` §"Option A" for exactly how, and its known
simplifications — the tower in particular is a solid recolored
silhouette, not its real see-through lattice). Stacking order, back to
front:

```
.lounge-gradient   real CSS sky gradient (skyGradientCSS, sky.js)
.lounge-clouds     real cloud-cover haze (Open-Meteo)
.lounge-sky        canvas: real sun/moon/stars/planets
.lounge-scene      lounge-foreground.webp (transparent sky, opaque ground/trees/tower/dish/etc.)
.lounge-precip/-air  rain/snow, aircraft (canvas, in front)
.lounge-gauge-glow/-beacon/-eq  small decorative/data overlays (in front)
```

The sun/moon/stars/planets now render **truly behind** the trees, tower,
and dish instead of composited on top of the whole flattened scene —
real depth, not just a real position projected onto a flat plane over
painted art.

| Layer | Source | Network? |
|---|---|---|
| Real sky gradient (day/twilight/night, blended from the painting's own real golden-hour colors) | `sky.js`'s `skyGradientCSS`, driven by real sun altitude | None |
| Sun/moon/planet position, star field | `astronomy.js` (Sun/Moon + Venus/Mars/Jupiter/Saturn via the vendored Astronomy Engine, `living-scene/vendor/`) with automatic fallback to hand-rolled low-precision formulas (the math behind SunCalc) if the engine script fails to load | None once loaded — pure math, computed client-side for the real transmitter-site coordinates (34.8697, -111.7610) |
| Real bright-star field (257 stars, Hipparcos-derived, mag ≤ 3.4) | `stars.js` + `stars-catalog.js`, positions from real RA/Dec converted to live altitude/azimuth | None |
| Real Venus/Mars/Jupiter/Saturn | `planets.js`, real positions + real apparent magnitude (brightness) from the engine | None (requires the engine; no engine → no planets, never a guessed position) |
| The moving sun disc, moon glow, star/planet canvas rendering | `sky.js`, positioned via `config.js`'s `projectAltAz` | None |
| Cloud veil, rain/snow, wind | `weather.js` — Open-Meteo current conditions, same endpoint/coords the rest of the site already uses | `api.open-meteo.com` |
| NOAA gauge glow | Driven by the same Open-Meteo `precipitation` field | (shares the weather fetch) |
| Aircraft dots + contrails | `aircraft.js` — adsb.lol, proxied through n8n (see below) | `n8n.mellowmountainradio.com/webhook/kazm-aircraft` |
| Tower beacon | CSS animation, FAA-style timing — decorative motion, not data | None |
| Deer breathing | CSS animation on a feather-masked sprite crop — decorative motion, not data | None |

Debug HUD: append `?skydebug=1` to `rewind.html`'s URL to overlay real
sun/moon altitude-azimuth, local time, sunrise/sunset/moonrise/moonset,
visible star count, and which planets are currently up.

### Why aircraft goes through a proxy

adsb.lol's public API doesn't send `Access-Control-Allow-Origin`, so a
browser blocks the response even though the request itself succeeds. The
fix is `studio-bridge/n8n-kazm-aircraft.json` — a three-node n8n workflow
(read the query → call adsb.lol → shape + respond with CORS headers set)
already deployed and active at
`https://n8n.mellowmountainradio.com/webhook/kazm-aircraft`. If that
workflow is ever deactivated or torn down, the aircraft layer just shows
no traffic — it never fabricates planes.

### Graceful fallback

- Astronomy needs no network for the Sun/Moon (the hand-rolled math is
  always available); the engine script only adds planets and extra
  precision, and its absence never breaks the page — see
  `initAstronomyEngine()`/`engineAvailable()` in `astronomy.js`.
- If Open-Meteo fails, `weather.js` returns `null` and `scene.js` falls
  back to `CALM_FALLBACK` (calm, clear, no precipitation) rather than
  inventing conditions.
- If the aircraft proxy fails or 404s, the layer renders nothing.
- All of the above is verified in Playwright with the aircraft endpoint
  deliberately mocked to 404, and with the engine script blocked entirely
  — zero console errors, zero page errors, sky still correct either way.

## 2. Known limitation: everything except the sky is still one flattened image

`lounge-foreground.webp` solves the sky (see §1) but it's still a single
cutout, not separate objects — the ground/trees/tower/dish/jeep/deer are
all pixels of the same flattened image, just with the sky masked out
around them. Concretely:

- No parallax, no wind-driven motion on the trees/dish, no independent
  animation per element, no real depth — the moving sun/moon/planets/
  aircraft render behind this one plate as a whole, not behind individual
  elements at their own depth, so a planet can still appear "in front of"
  the dish or trees even though it should be far behind them (see
  `planets.js`/`config.js`'s `projectAltAz` — explicitly an artistic
  projection onto one fixed vantage, not a literal planetarium).
- The ground, jeep, dish, fence, etc. all still carry the original
  painting's golden-hour lighting regardless of the real time of day —
  only the sky itself changes now. A bright noon sky over dusk-lit dirt
  is an intentional, honest first step (Option A in the backlog below),
  not a bug.
- The tower's real see-through lattice *is* preserved (recovered via
  color-filtered Canny edge detection in a tight column around the mast —
  GrabCut's region/color-statistics approach couldn't hold onto something
  this thin, but edge detection plus a darkness filter to reject the
  painted clouds' own edge noise could; see `ASSET-BACKLOG-v85.md`).
- The chain-link fence/equipment enclosure is still a solid cutout, not a
  mesh you can see real sky through — the same edge-detection approach
  wasn't attempted there yet.

Fixing the rest of this needs new art assets (or manual tracing/relighting
work), not more code — see §3 and `ASSET-BACKLOG-v85.md`.

## 3. Desired v85+ architecture: fully layered transparent PNGs

§1/§2 above is "Option A" from the backlog below — one transparent-sky
plate, real gradient behind it, shipped. The next step (the backlog's
"Option B") is to stop treating even the foreground as one image and
split it into independent element sprites, rendered in this order (back
to front):

```
Dynamic sky (gradient + real clouds + moon + stars)   <- already real, canvas-drawn, no PNG, DONE
==================================
Foreground PNGs (still one flattened plate today; split into these next):
  ground · tree-left · tree-right · tower · tower-beacon ·
  dish · jeep · deer · fence-enclosure · rain-gauge · foreground-rocks
```

Once each element is its own sprite:

- The sky becomes **actually** real — a live gradient/cloud/star/planet
  render sits directly behind the art, with nothing painted in front of
  it to fight. Morning is blue, afternoon is bright blue, golden hour is
  orange, night has real stars — no ceiling, because there's no painted
  sky left to fight.
- Each element can animate independently: wind sway on the trees, a
  subtle vibration on the dish, a heat-shimmer on the jeep, a real glow
  on the rain gauge when Open-Meteo reports precipitation — all already
  real data sources this site has, just not yet wired to independent
  sprites.
- Parallax (foreground/midground/background moving slightly differently
  under pointer movement, extending what `initLounge()`'s pointer-
  parallax already does to the whole scene today) becomes possible per
  layer instead of one flat plane.

The full per-layer spec — exact pixel/percent position, z-index,
whether/how each one should animate, and masking-difficulty notes — is
in **`ASSET-BACKLOG-v85.md`**. It also lays out a cheaper first step
(one transparent "foreground plate," everything non-sky still fused
together) versus the full per-element breakdown, so this can ship in two
passes instead of requiring the whole cutout set at once.

## 4. Future concept: a real 3D digital twin

A further step beyond even the layered-PNG architecture: since this is a
real, specific, physical site, the scene could eventually be rebuilt as
an actual small 3D reconstruction (from multiple real reference photos of
the transmitter site) rather than a 2D painting with layered cutouts. At
that point the real sun position wouldn't just move a drawn disc across
a flat plane — it would cast real, correctly-angled shadows across the
ground, the dish, the Jeep, and the tower, because the geometry (their
real relative positions, heights, and orientation) would actually exist.

This is explicitly a **separate, much larger undertaking** than the v85
layered-PNG work — it needs real multi-angle site photography, a 3D
reconstruction pipeline, and a real-time 3D renderer (e.g. Three.js)
instead of 2D canvas — and should be scoped and planned as its own
project if it's ever pursued, not folded into a routine session. Noting
it here so the direction is on record, not because it's scheduled.

## 5. What's needed before full (Option B) v85 can be implemented

Option A (§1/§2) is done — it needed real image segmentation (OpenCV
GrabCut, seeded with known object regions), which this session did have
available. Option B (full per-element sprites) needs more than that:

1. Produce the remaining PNG assets specified in `ASSET-BACKLOG-v85.md`
   — the tower's real lattice and the fence's real mesh in particular
   are too thin/fine for GrabCut to hold onto reliably (see §2 above and
   the backlog's per-row notes); those two need either manual tracing in
   real image-editing software or regenerating from scratch with native
   alpha transparency via whichever AI art tool produced the original
   painting.
2. Each PNG should be delivered at the same 1536×1024 canvas space (or a
   documented scale factor) so the percent-based positions in the
   backlog line up without re-measuring.
3. Once assets exist, wiring them in is comparatively quick: swap
   `.lounge-scene`'s single foreground image for a stack of positioned
   `<img>`/canvas layers (the pattern `wildlife.js` already uses for
   `deer-sprite.png` extends directly to the rest), and let the
   already-real astronomy/weather data drive independent per-element
   animation instead of one static plate.

## Files

- `config.js` — coordinates, elevation, timezone, endpoints, refresh
  intervals, the `SKY` camera-projection constants and `projectAltAz`
  helper, `enableLabels`/`debugMode` flags.
- `astronomy.js` — Astronomy Engine loader (`initAstronomyEngine`,
  `engineAvailable`) with hand-rolled fallback math; `getSkyState`,
  `getPlanetPositions`, `getRiseSetTimes`, `altAzFromRaDec`.
- `stars.js` / `stars-catalog.js` — real bright-star catalog + live
  altitude/azimuth filtering (`getVisibleStars`).
- `planets.js` — real Venus/Mars/Jupiter/Saturn positions + magnitude-
  driven visibility (`getVisiblePlanets`).
- `sky.js` — `skyGradientCSS` (the real day/twilight/night sky gradient)
  plus canvas rendering for the moving sun, moon, stars, planets.
- `vendor/astronomy-engine.browser.min.js` — vendored Astronomy Engine
  (github.com/cosinekitty/astronomy, MIT), loaded lazily via a plain
  `<script>` tag since this site has no build step.
- `weather.js` — Open-Meteo fetch + WMO code classification.
- `particles.js` — rain/snow canvas renderer, wind-driven drift.
- `aircraft.js` — proxy fetch + canvas renderer (dot + contrail, position
  from bearing/altitude/distance — an artistic projection onto a single
  fixed painted vantage, not a literal radar).
- `wildlife.js` — mounts the deer sprite (`deer-sprite.png`) at its exact
  source-image position.
- `scene.js` — orchestrator; `initLivingScene(root)` is dynamically
  imported from `main.js`'s `initLounge()` (that file is a classic
  script, not a module, so `import()` is used as an expression rather
  than a static import).
- `ASSET-BACKLOG-v85.md` — the full layered-PNG asset spec (§3/§5 above).
- `../lounge-foreground.webp` (repo root, alongside the original
  `lounge-window.jpg`) — the shipped Option A transparent-sky cutout.

## TODO / next real-data wiring

- Rotate the n8n API key used to deploy the aircraft workflow (it traveled through chat during setup, same as the Play Log key).
- If adsb.lol's terms or rate limits change, `CONFIG.aircraftEndpoint` and the proxy workflow are the only two places that need to move.
- Wildlife variety (coyote/javelina/rabbit/bobcat) — needs source reference art or an AI-generation attempt for each; only deer has source art today (see `wildlife.js`'s header comment).
