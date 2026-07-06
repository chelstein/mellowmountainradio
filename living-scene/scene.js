// KAZM Living Window — orchestrator. Wires real astronomy (always on,
// no network needed), real weather (Open-Meteo), and real aircraft
// (adsb.lol via proxy) onto the painted transmitter-site scene. Every
// layer degrades to "quiet" on failure — never fakes data it doesn't have.
import { CONFIG } from "./config.js";
import { getSkyState } from "./astronomy.js";
import { fetchWeather, CALM_FALLBACK } from "./weather.js";
import { createParticleSystem } from "./particles.js";
import { fetchAircraft, createAircraftLayer } from "./aircraft.js";
import { mountWildlife } from "./wildlife.js";

// The painting is one fixed golden-hour composition with its own sun
// baked into the horizon at roughly this spot (measured in the 1536x1024
// source; the scene box shares that exact aspect ratio via background-size:
// cover, so these fractions map straight onto the canvas with no crop).
const PAINTED_SUN_X = 0.4232, PAINTED_SUN_Y = 0.5811;

// Compass azimuth -> horizontal position: rises on the left (east), crosses
// center (south) at midday, sets on the right (west) — same convention as
// the aircraft layer's bearing mapping. Altitude -> vertical position: near
// the horizon line low, near the top of the window at the sun/moon's local
// peak height. Artistic projection, not a literal planetarium — one fixed
// vantage can't show true parallax, so this just needs to read as "the sun
// (or moon) is over there, and higher now than it was."
function projectBody(altDeg, azDeg, w, h, horizonFrac, topFrac, maxAltDeg) {
  const x = ((((azDeg % 360) + 360) % 360) / 360) * w;
  const t = Math.max(0, Math.min(1, altDeg / maxAltDeg));
  const y = h * (horizonFrac - t * (horizonFrac - topFrac));
  return { x, y };
}

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
  // (sun/moon position) changes over minutes, not milliseconds, so it's
  // computed on its own slow timer (see refreshSky) rather than recomputed
  // — along with a forced layout read — 60 times a second.
  return function draw(skyState, stars) {
    ctx.clearRect(0, 0, w, h);

    // Soft cover over the painted horizon sun, once the real sun has
    // climbed well clear of where the artwork drew it — otherwise the
    // moving sun below and the fixed painted one would both be visible
    // at once. Fades in with middayAmount, so right at golden hour (where
    // the painted sun is actually correct) there's nothing covering it.
    const coverA = skyState.middayAmount * 0.6;
    if (coverA > 0.01) {
      const cx = w * PAINTED_SUN_X, cy = h * PAINTED_SUN_Y, cr = w * 0.22;
      const cover = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      cover.addColorStop(0, "rgba(150,168,196," + coverA.toFixed(3) + ")");
      cover.addColorStop(1, "rgba(150,168,196,0)");
      ctx.fillStyle = cover;
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    }

    // Sun: real altitude/azimuth. It only draws once middayAmount has
    // started climbing — right at golden hour (middayAmount 0) the painted
    // horizon sun IS the real sun, so nothing else should be on screen;
    // this one fades in as the real sun climbs clear of that painted
    // position, and fades back out into the painted sun at the other
    // end of the day. Color runs from a low, warm ember near the horizon
    // to a brighter (but still golden, never white) high-noon glow.
    if (skyState.sunAltitudeDeg > -4 && skyState.middayAmount > 0.01) {
      const { x: sx, y: sy } = projectBody(skyState.sunAltitudeDeg, skyState.sunAzimuthDeg, w, h, 0.62, 0.05, 80);
      const horizonFade = Math.max(0, Math.min(1, (skyState.sunAltitudeDeg + 4) / 6));
      const sunA = horizonFade * skyState.middayAmount;
      const warm = Math.max(0, Math.min(1, skyState.sunAltitudeDeg / 60));
      const r = 255, g = Math.round(160 + 65 * warm), b = Math.round(60 + 110 * warm);
      const sr = w * (0.02 + 0.012 * (1 - warm));
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 5);
      grad.addColorStop(0, "rgba(" + r + "," + g + "," + b + "," + (sunA * 0.55).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sx, sy, sr * 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255," + Math.round(220 + 20 * warm) + "," + Math.round(150 + 60 * warm) + "," + sunA.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }

    const starAlpha = Math.max(0, (skyState.nightAmount - 0.45) / 0.55); // only once truly dark
    if (starAlpha > 0.01) {
      ctx.fillStyle = "rgba(255,255,255,1)";
      for (const s of stars) {
        ctx.globalAlpha = s.a * starAlpha * (0.7 + 0.3 * Math.sin(performance.now() / 1400 + s.tw));
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h * 0.55, s.r * dpr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Moon: real altitude/azimuth, brightness tied to real illuminated fraction.
    if (skyState.moonUp && starAlpha > 0.05) {
      const { x: mx, y: my } = projectBody(skyState.moonAltitudeDeg, skyState.moonAzimuthDeg, w, h, 0.55, 0.04, 80);
      const mr = 13 * dpr;
      const glowA = starAlpha * (0.35 + 0.5 * skyState.moonFraction);
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.4);
      grad.addColorStop(0, "rgba(235,240,250," + glowA.toFixed(3) + ")");
      grad.addColorStop(1, "rgba(235,240,250,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(mx, my, mr * 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(245,248,255," + (0.5 + 0.45 * skyState.moonFraction).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    }
  };
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

  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.1,
    a: 0.35 + Math.random() * 0.65, tw: Math.random() * 10,
  }));

  const particles = precipCanvas ? createParticleSystem(precipCanvas) : null;
  const aircraftLayer = airCanvas ? createAircraftLayer(airCanvas) : null;
  if (!reduce) { if (particles) particles.start(); if (aircraftLayer) aircraftLayer.start(); }

  mountWildlife(scene || root);

  const drawSky = skyCanvas ? createSkyCanvas(skyCanvas) : null;
  let lastSkyState = null;
  let lastTintOpacity = null, lastMiddayOpacity = null;

  // Astronomy (sun/moon position) changes over minutes, not milliseconds —
  // recomputing it, and writing to element style, 60 times a second was
  // real, measurable jank for zero visual benefit. Refresh it on its own
  // slow timer; the rAF loop below only redraws the star twinkle.
  function refreshSky() {
    lastSkyState = getSkyState(new Date(), CONFIG.lat, CONFIG.lon);
    const nightOp = lastSkyState.nightAmount.toFixed(3);
    // Plain alpha (no mix-blend-mode — see the compositing-cost note above)
    // doesn't preserve underlying detail the way soft-light did, so the
    // same 0-1 range would wash the painting out solid at high middayAmount.
    const middayOp = (lastSkyState.middayAmount * 0.42).toFixed(3);
    if (tint && nightOp !== lastTintOpacity) { tint.style.opacity = nightOp; lastTintOpacity = nightOp; }
    if (midday && middayOp !== lastMiddayOpacity) { midday.style.opacity = middayOp; lastMiddayOpacity = middayOp; }
  }
  refreshSky();
  var skyTimer = window.setInterval(function () {
    if (!root.isConnected) { window.clearInterval(skyTimer); return; }
    refreshSky();
  }, 2000);

  let skyRaf = null;
  if (reduce) {
    if (drawSky) drawSky(lastSkyState, stars); // one correct static frame, no twinkle loop
  } else {
    (function loop() {
      if (!root.isConnected) return; // page navigated away — stop, don't leak
      if (drawSky) drawSky(lastSkyState, stars);
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
