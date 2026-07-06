# The Living Window

The Listeners' Lounge window (`rewind.html`, `.lounge-window`) is Chuck's
painting of the KAZM transmitter site, brought to life with real data —
never simulated data presented as real. Every layer here either shows the
truth or shows nothing.

## 1. Current (v84) architecture

The base is still one flattened painting, `lounge-window.jpg`
(1536×1024, sky baked in). Everything real is drawn *on top of* it as
DOM/canvas layers:

| Layer | Source | Network? |
|---|---|---|
| Sun/moon/planet position, star field, day/night/twilight tint | `astronomy.js` (Sun/Moon + Venus/Mars/Jupiter/Saturn via the vendored Astronomy Engine, `living-scene/vendor/`) with automatic fallback to hand-rolled low-precision formulas (the math behind SunCalc) if the engine script fails to load | None once loaded — pure math, computed client-side for the real transmitter-site coordinates (34.8697, -111.7610) |
| Real bright-star field (257 stars, Hipparcos-derived, mag ≤ 3.4) | `stars.js` + `stars-catalog.js`, positions from real RA/Dec converted to live altitude/azimuth | None |
| Real Venus/Mars/Jupiter/Saturn | `planets.js`, real positions + real apparent magnitude (brightness) from the engine | None (requires the engine; no engine → no planets, never a guessed position) |
| The moving sun + painted-sun crossfade, moon glow, star/planet canvas rendering | `sky.js` — real altitude/azimuth projected onto the fixed painted vantage via `config.js`'s `projectAltAz` | None |
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

## 2. Known limitation: the sky is still painted into the base art

`lounge-window.jpg` is one flattened image — clouds, horizon glow, and
the sun itself are painted into it, not separate elements. Every "real
sky" layer above (tint, moving sun, moon, stars, planets) is drawn *on
top of* that fixed painting, not in place of it. Concretely:

- The tint/cover system in `sky.js` can dim, cool, and partially hide the
  painted sun and clouds, but it can't remove them — a single fixed
  golden-hour composition has a hard ceiling on how much a CSS/canvas
  overlay can make it read as, say, a clear blue noon. This was tested
  exhaustively against real reference photos earlier this project (see
  git history) before landing on the current tint curve as the honest
  maximum.
- There is no real depth in the scene — the moving sun/moon/planets/
  aircraft are drawn on a single flat plane in front of the artwork, so a
  planet can appear to render "in front of" the dish or trees even though
  it should be far behind them (see `planets.js`/`config.js`'s
  `projectAltAz` — explicitly an artistic projection onto one fixed
  vantage, not a literal planetarium).
- No parallax, no wind-driven motion on the trees/dish, no independent
  animation per element, because the trees/tower/dish/jeep/deer/ground
  are all pixels of the same flattened JPEG, not separate objects.

Fixing this needs new art assets, not more code — see §3 and
`ASSET-BACKLOG-v85.md`.

## 3. Desired v85 architecture: layered transparent PNGs

The correct fix (this is how real-time scenes with a dynamic sky are
built) is to stop treating `lounge-window.jpg` as one image and instead
split it into a transparent-sky foreground plate plus independent
element sprites, rendered in this order (back to front):

```
Dynamic sky (gradient + real clouds + moon + stars)   <- already real, canvas-drawn, no PNG
==================================
Foreground PNGs (sky masked to transparent):
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

## 5. What's needed before v85 can be implemented

None of §3 can be built yet — it needs the actual cutout assets, which
require either real image-editing software or an AI image-generation
tool capable of producing alpha-transparent layers, neither of which is
available in a plain coding session. Concretely, before any v85 code
changes:

1. Produce the PNG assets specified in `ASSET-BACKLOG-v85.md` — at
   minimum `foreground-plate.png` (Option A, the cheap win), ideally the
   full per-element set (Option B). Source options: manual cutout in
   real image-editing software (Photoshop/GIMP/etc.) against the actual
   `lounge-window.jpg`, or regenerating each element from scratch with
   native alpha transparency via whichever AI art tool produced the
   original painting (more reliable than segmenting an already-flattened
   image after the fact, especially for the tree canopies and chain-link
   fence — see those rows' notes in the backlog for why).
2. Each PNG should be delivered at the same 1536×1024 canvas space (or a
   documented scale factor) so the percent-based positions in the
   backlog line up without re-measuring.
3. Once assets exist, wiring them in is comparatively quick: swap
   `.lounge-scene`'s single background image for a stack of positioned
   `<img>`/canvas layers (the pattern `wildlife.js` already uses for
   `deer-sprite.png` extends directly to the rest), delete the CSS
   tint/cover system in `sky.js` that exists only to fight the painted
   sky, and let the already-real astronomy/weather data drive full
   layers instead of overlays.

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
- `sky.js` — canvas rendering for the moving sun, painted-sun cover,
  moon, stars, planets; `tintOpacities` for the CSS day/night/cloud wash.
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

## TODO / next real-data wiring

- Rotate the n8n API key used to deploy the aircraft workflow (it traveled through chat during setup, same as the Play Log key).
- If adsb.lol's terms or rate limits change, `CONFIG.aircraftEndpoint` and the proxy workflow are the only two places that need to move.
- Wildlife variety (coyote/javelina/rabbit/bobcat) — needs source reference art or an AI-generation attempt for each; only deer has source art today (see `wildlife.js`'s header comment).
