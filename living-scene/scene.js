// KAZM Living Window — orchestrator. Wires real astronomy (sun, moon,
// planets, a real bright-star field — see astronomy.js/stars.js/planets.js/
// sky.js), real weather (Open-Meteo), and real aircraft (adsb.lol via
// proxy) onto the painted transmitter-site scene. Every layer degrades to
// "quiet" on failure — never fakes data it doesn't have.
import { CONFIG } from "./config.js";
import { getSkyState, getRiseSetTimes, initAstronomyEngine, engineAvailable } from "./astronomy.js";
import { getVisibleStars } from "./stars.js";
import { getVisiblePlanets } from "./planets.js";
import { drawSun, drawMoon, drawStars, drawPlanets, drawPaintedSunCover } from "./sky.js";
import { fetchWeather, CALM_FALLBACK } from "./weather.js";
import { createParticleSystem } from "./particles.js";
import { fetchAircraft, createAircraftLayer } from "./aircraft.js";
import { mountWildlife } from "./wildlife.js";

function createSkyCanvas(canvas) {
  let w = 0, h = 0, dpr = 1;
  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round((r.width || 600) * dpr));
    h = Math.max(1, Math.round((r.height || 400) * dpr));
    canvas.width = w; canvas.height = h;
  }
  window.addEventListener("resize", size, { passive: true });
  size();
  const ctx = canvas.getContext("2d");

  // Star twinkle needs smooth per-frame motion; the astronomy behind it
  // (sun/moon/planet/star position) changes over seconds not milliseconds,
  // so it's computed on its own slow timer (see refreshSky) rather than
  // recomputed — along with a forced layout read — 60 times a second.
  return function draw(skyState, stars, planets) {
    ctx.clearRect(0, 0, w, h);
    drawPaintedSunCover(ctx, w, h, skyState);
    drawSun(ctx, w, h, skyState);
    drawStars(ctx, stars);
    drawPlanets(ctx, planets);
    const starAlpha = Math.max(0, (skyState.nightAmount - 0.45) / 0.55); // only once truly dark
    drawMoon(ctx, w, h, skyState, starAlpha);
  };
}

function fmtTime(date) {
  if (!date) return "—";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: CONFIG.timezone });
}

function createDebugPanel(root) {
  if (!/[?&]skydebug\b/.test(window.location.search)) return null;
  const el = document.createElement("div");
  el.style.cssText = "position:absolute;left:8px;top:8px;z-index:9;padding:8px 10px;" +
    "background:rgba(8,10,20,.72);color:#c9e4ff;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace;" +
    "border-radius:6px;white-space:pre;pointer-events:none;backdrop-filter:blur(2px);";
  root.appendChild(el);
  return el;
}

export function initLivingScene(root) {
  if (!root) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = root.querySelector("[data-lounge-scene]");
  const tint = root.querySelector("[data-ls-tint]");
  const midday = root.querySelector("[data-ls-midday]");
  const cloudVeil = root.querySelector("[data-ls-clouds]");
  const skyCanvas = root.querySelector("[data-ls-sky]");
  const precipCanvas = root.querySelector("[data-ls-precip]");
  const airCanvas = root.querySelector("[data-ls-air]");
  const gauge = root.querySelector("[data-ls-gauge]");

  // Appended to root, not `scene` — `.lounge-scene` has its own CSS
  // transform (the pointer-parallax scale), which creates a stacking
  // context that sits *beneath* the tint/sky layers appended later in the
  // DOM, so a panel nested in there would vanish under the night tint.
  const debugEl = createDebugPanel(root);

  const particles = precipCanvas ? createParticleSystem(precipCanvas) : null;
  const aircraftLayer = airCanvas ? createAircraftLayer(airCanvas) : null;
  if (!reduce) { if (particles) particles.start(); if (aircraftLayer) aircraftLayer.start(); }

  mountWildlife(scene || root);

  // Real planet positions need the Astronomy Engine; kicked off here and
  // never awaited — getSkyState/getPlanetPositions fall back gracefully
  // until it resolves, so the scene never blocks or breaks on a slow or
  // failed script load. Once it lands, force one extra refresh right away
  // rather than leaving the scene on fallback math for up to 30s.
  initAstronomyEngine().then((ok) => { if (ok && root.isConnected) refreshSky(); });

  const drawSky = skyCanvas ? createSkyCanvas(skyCanvas) : null;
  let lastSkyState = null, lastStars = [], lastPlanets = [];
  let lastTintOpacity = null, lastMiddayOpacity = null;

  // Astronomy changes over seconds, not milliseconds — recomputing it,
  // and writing to element style, 60 times a second was real, measurable
  // jank for zero visual benefit. Refresh it on its own slow timer; the
  // rAF loop below only redraws the star twinkle and glow pulses.
  function refreshSky() {
    const now = new Date();
    lastSkyState = getSkyState(now, CONFIG.lat, CONFIG.lon, CONFIG.elevationM);
    lastStars = getVisibleStars(now, CONFIG.lat, CONFIG.lon, lastSkyState.sunAltitudeDeg, lastSkyState.moonAltitudeDeg, lastSkyState.moonFraction);
    lastPlanets = getVisiblePlanets(now, CONFIG.lat, CONFIG.lon, CONFIG.elevationM, lastSkyState.sunAltitudeDeg);

    const nightOp = lastSkyState.nightAmount.toFixed(3);
    // Plain alpha (no mix-blend-mode — see the compositing-cost note in
    // living-scene/README.md) doesn't preserve underlying detail the way
    // soft-light did, so the same 0-1 range would wash the painting out
    // solid at high middayAmount.
    const middayOp = (lastSkyState.middayAmount * 0.42).toFixed(3);
    if (tint && nightOp !== lastTintOpacity) { tint.style.opacity = nightOp; lastTintOpacity = nightOp; }
    if (midday && middayOp !== lastMiddayOpacity) { midday.style.opacity = middayOp; lastMiddayOpacity = middayOp; }

    if (debugEl) {
      const rs = getRiseSetTimes(now, CONFIG.lat, CONFIG.lon, CONFIG.elevationM);
      debugEl.textContent =
        "local time   " + now.toLocaleTimeString("en-US", { timeZone: CONFIG.timezone }) + "\n" +
        "engine       " + (engineAvailable() ? "astronomy-engine" : "fallback (low-precision)") + "\n" +
        "sun alt/az   " + lastSkyState.sunAltitudeDeg.toFixed(1) + "° / " + lastSkyState.sunAzimuthDeg.toFixed(1) + "°\n" +
        "moon alt/az  " + lastSkyState.moonAltitudeDeg.toFixed(1) + "° / " + lastSkyState.moonAzimuthDeg.toFixed(1) + "°\n" +
        "moon frac    " + (lastSkyState.moonFraction * 100).toFixed(0) + "%\n" +
        "band         " + lastSkyState.band + "\n" +
        "sunrise/set  " + (rs ? fmtTime(rs.sunrise) + " / " + fmtTime(rs.sunset) : "n/a") + "\n" +
        "moonrise/set " + (rs ? fmtTime(rs.moonrise) + " / " + fmtTime(rs.moonset) : "n/a") + "\n" +
        "stars shown  " + lastStars.length + "\n" +
        "planets up   " + (lastPlanets.map((p) => p.name).join(", ") || "none");
    }
  }
  refreshSky();
  var skyTimer = window.setInterval(function () {
    if (!root.isConnected) { window.clearInterval(skyTimer); return; }
    refreshSky();
  }, 30000);

  let skyRaf = null;
  if (reduce) {
    if (drawSky) drawSky(lastSkyState, lastStars, lastPlanets); // one correct static frame, no twinkle loop
  } else {
    (function loop() {
      if (!root.isConnected) return; // page navigated away — stop, don't leak
      if (drawSky) drawSky(lastSkyState, lastStars, lastPlanets);
      skyRaf = window.requestAnimationFrame(loop);
    })();
  }

  function applyWeather(wx) {
    const w = wx || CALM_FALLBACK;
    if (cloudVeil) {
      const cc = w.cloudCoverPct != null ? w.cloudCoverPct : 15;
      cloudVeil.style.opacity = Math.max(0, Math.min(0.28, (cc / 100) * 0.28)).toFixed(3);
    }
    if (particles) particles.setWeather(w.kind, w.windMph, w.windDirDeg);
    if (gauge) {
      const wet = Math.max(0, Math.min(1, w.precipIn * 6));
      gauge.style.opacity = wet.toFixed(3);
    }
  }
  applyWeather(CALM_FALLBACK);
  function pollWeather() {
    if (!root.isConnected) { window.clearInterval(weatherTimer); return; }
    fetchWeather().then(applyWeather);
  }
  pollWeather();
  var weatherTimer = window.setInterval(pollWeather, CONFIG.refreshWeatherMs);

  function pollAircraft() {
    if (!root.isConnected) { window.clearInterval(aircraftTimer); return; }
    fetchAircraft().then((list) => { if (aircraftLayer) aircraftLayer.setAircraft(list); });
  }
  pollAircraft();
  var aircraftTimer = window.setInterval(pollAircraft, CONFIG.refreshAircraftMs);
}
