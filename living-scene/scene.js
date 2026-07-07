// KAZM Living Window — orchestrator. Wires real astronomy (sun, moon,
// planets, a real bright-star field — see astronomy.js/stars.js/planets.js/
// sky.js), real weather (Open-Meteo), and real aircraft (adsb.lol via
// proxy) onto the painted transmitter-site scene. Every layer degrades to
// "quiet" on failure — never fakes data it doesn't have.
import { CONFIG } from "./config.js";
import { getSkyState, getRiseSetTimes, initAstronomyEngine, engineAvailable } from "./astronomy.js";
import { getVisibleStars } from "./stars.js";
import { getVisiblePlanets } from "./planets.js";
import { drawSun, drawMoon, drawStars, drawPlanets, skyGradientCSS, horizonHazeCSS, sunGlintCSS } from "./sky.js";
import { crossfadeFor, imageUrl } from "./timeofday.js";
import { fetchWeather, CALM_FALLBACK } from "./weather.js";
import { createParticleSystem } from "./particles.js";
import { fetchAircraft, createAircraftLayer } from "./aircraft.js";
import { createSkyLifeLayer } from "./skylife.js";

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

// 8-phase names from real moon phase (0=new, 0.5=full, 1=new again — same
// value getSkyState already returns). Boundaries follow the usual
// almanac convention: a narrow band right at each exact phase (new/
// first quarter/full/last quarter), wider bands for the crescent/gibbous
// stretches between them.
function moonPhaseName(phase) {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p > 0.97) return "New Moon";
  if (p < 0.22) return "Waxing Crescent";
  if (p < 0.28) return "First Quarter";
  if (p < 0.47) return "Waxing Gibbous";
  if (p < 0.53) return "Full Moon";
  if (p < 0.72) return "Waning Gibbous";
  if (p < 0.78) return "Last Quarter";
  return "Waning Crescent";
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

  const sceneA = root.querySelector("[data-lounge-scene-a]");
  const sceneB = root.querySelector("[data-lounge-scene-b]");
  const gradientEl = root.querySelector("[data-ls-gradient]");
  const cloudVeil = root.querySelector("[data-ls-clouds]");
  const skyCanvas = root.querySelector("[data-ls-sky]");
  const hazeEl = root.querySelector("[data-ls-haze]");
  const jeepGlintEl = root.querySelector("[data-ls-jeep-glint]");
  const gaugeGlintEl = root.querySelector("[data-ls-gauge-glint]");
  const precipCanvas = root.querySelector("[data-ls-precip]");
  const airCanvas = root.querySelector("[data-ls-air]");
  const skylifeCanvas = root.querySelector("[data-ls-skylife]");
  const gauge = root.querySelector("[data-ls-gauge]");
  const conditionsEl = root.querySelector("[data-ls-conditions]");

  // Appended to root, not `scene` — `.lounge-scene` has its own CSS
  // transform (the pointer-parallax scale), which creates a stacking
  // context that sits *beneath* the sky layers appended later in the DOM,
  // so a panel nested in there would vanish under a dark night sky.
  const debugEl = createDebugPanel(root);

  const particles = precipCanvas ? createParticleSystem(precipCanvas) : null;
  const aircraftLayer = airCanvas ? createAircraftLayer(airCanvas) : null;
  const skylife = skylifeCanvas ? createSkyLifeLayer(skylifeCanvas) : null;
  if (!reduce) { if (particles) particles.start(); if (aircraftLayer) aircraftLayer.start(); if (skylife) skylife.start(); }

  // NOTE: the separate animated deer sprite (wildlife.js) matched a
  // transparent hole in the old single lounge-foreground.webp. Each of
  // the new per-time-of-day paintings already has its own deer baked in
  // (at a slightly different spot per painting), so the sprite overlay
  // is skipped here rather than showing two mismatched deer. Re-adding
  // an animated deer against these new backgrounds is a follow-up.

  // Real planet positions need the Astronomy Engine; kicked off here and
  // never awaited — getSkyState/getPlanetPositions fall back gracefully
  // until it resolves, so the scene never blocks or breaks on a slow or
  // failed script load. Once it lands, force one extra refresh right away
  // rather than leaving the scene on fallback math for up to 30s.
  initAstronomyEngine().then((ok) => { if (ok && root.isConnected) refreshSky(); });

  const drawSky = skyCanvas ? createSkyCanvas(skyCanvas) : null;
  let lastSkyState = null, lastStars = [], lastPlanets = [];
  let lastGradient = null, lastHaze = null, lastGlint = null;
  let lastCrossfadeA = null, lastCrossfadeB = null;

  // Astronomy changes over seconds, not milliseconds — recomputing it,
  // and writing to element style, 60 times a second was real, measurable
  // jank for zero visual benefit. Refresh it on its own slow timer; the
  // rAF loop below only redraws the star twinkle and glow pulses.
  function refreshSky() {
    const now = new Date();
    lastSkyState = getSkyState(now, CONFIG.lat, CONFIG.lon, CONFIG.elevationM);
    lastStars = getVisibleStars(now, CONFIG.lat, CONFIG.lon, lastSkyState.sunAltitudeDeg, lastSkyState.moonAltitudeDeg, lastSkyState.moonFraction);
    lastPlanets = getVisiblePlanets(now, CONFIG.lat, CONFIG.lon, CONFIG.elevationM, lastSkyState.sunAltitudeDeg);

    const gradient = skyGradientCSS(lastSkyState);
    if (gradientEl && gradient !== lastGradient) { gradientEl.style.background = gradient; lastGradient = gradient; }

    if (sceneA && sceneB) {
      const cf = crossfadeFor(now, CONFIG.timezone);
      if (cf.a.key !== lastCrossfadeA) { sceneA.style.backgroundImage = "url('" + imageUrl(cf.a.key) + "')"; lastCrossfadeA = cf.a.key; }
      if (cf.b.key !== lastCrossfadeB) { sceneB.style.backgroundImage = "url('" + imageUrl(cf.b.key) + "')"; lastCrossfadeB = cf.b.key; }
      sceneA.style.opacity = (1 - cf.weight).toFixed(3);
      sceneB.style.opacity = cf.weight.toFixed(3);
    }

    const haze = horizonHazeCSS(lastSkyState);
    if (hazeEl && haze !== lastHaze) { hazeEl.style.background = haze; lastHaze = haze; }

    const glint = sunGlintCSS(lastSkyState);
    if (glint !== lastGlint) {
      if (jeepGlintEl) jeepGlintEl.style.background = glint;
      if (gaugeGlintEl) gaugeGlintEl.style.background = glint;
      lastGlint = glint;
    }

    if (skylife) skylife.setConditions(lastSkyState.sunAltitudeDeg > 3, lastSkyState.nightAmount > 0.5);

    const rs = getRiseSetTimes(now, CONFIG.lat, CONFIG.lon, CONFIG.elevationM);
    if (conditionsEl) {
      const phaseName = moonPhaseName(lastSkyState.moonPhase);
      const litPct = Math.round(lastSkyState.moonFraction * 100);
      conditionsEl.innerHTML =
        '<div class="lc-row"><span class="lc-label">Rise</span> ' + (rs ? fmtTime(rs.sunrise) : "—") +
        '  <span class="lc-label">Set</span> ' + (rs ? fmtTime(rs.sunset) : "—") + '</div>' +
        '<div class="lc-row">' + phaseName + ' &middot; ' + litPct + '% lit</div>';
    }

    if (debugEl) {
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
