// KAZM Living Window — orchestrator. Wires real astronomy (always on,
// no network needed), real weather (Open-Meteo), and real aircraft
// (adsb.lol via proxy) onto the painted transmitter-site scene. Every
// layer degrades to "quiet" on failure — never fakes data it doesn't have.
import { CONFIG } from "./config.js";
import { getSkyState } from "./astronomy.js";
import { fetchWeather, CALM_FALLBACK } from "./weather.js";
import { createParticleSystem } from "./particles.js";
import { fetchAircraft, createAircraftLayer } from "./aircraft.js";
import { mountDeer } from "./wildlife.js";

function drawSky(canvas, skyState, stars) {
  const ctx = canvas.getContext("2d");
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round((r.width || 600) * dpr));
  const h = Math.max(1, Math.round((r.height || 400) * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  const starAlpha = Math.max(0, (skyState.nightAmount - 0.45) / 0.55); // only once truly dark
  if (starAlpha > 0.01) {
    ctx.fillStyle = "rgba(255,255,255,1)";
    for (const s of stars) {
      ctx.globalAlpha = s.a * starAlpha * (0.7 + 0.3 * Math.sin(performance.now() / 1400 + s.tw));
      ctx.beginPath(); ctx.arc(s.x * w, s.y * h * 0.55, s.r * dpr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Moon: a soft glowing orb, brightness tied to real illuminated fraction.
  if (skyState.moonUp && starAlpha > 0.05) {
    const mx = w * 0.82, my = h * 0.16, mr = 13 * dpr;
    const glowA = starAlpha * (0.35 + 0.5 * skyState.moonFraction);
    const grad = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.4);
    grad.addColorStop(0, "rgba(235,240,250," + glowA.toFixed(3) + ")");
    grad.addColorStop(1, "rgba(235,240,250,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(mx, my, mr * 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(245,248,255," + (0.5 + 0.45 * skyState.moonFraction).toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  }
}

export function initLivingScene(root) {
  if (!root) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tint = root.querySelector("[data-ls-tint]");
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

  mountDeer(root);

  let skyRaf = null;
  function renderSkyFrame() {
    const skyState = getSkyState(new Date(), CONFIG.lat, CONFIG.lon);
    if (tint) tint.style.opacity = skyState.nightAmount.toFixed(3);
    if (skyCanvas) drawSky(skyCanvas, skyState, stars);
    return skyState;
  }
  if (reduce) {
    renderSkyFrame(); // one correct static frame, no twinkle loop
  } else {
    (function loop() {
      if (!root.isConnected) return; // page navigated away — stop, don't leak
      renderSkyFrame();
      skyRaf = window.requestAnimationFrame(loop);
    })();
  }

  function applyWeather(wx) {
    const w = wx || CALM_FALLBACK;
    if (cloudVeil) {
      const cc = w.cloudCoverPct != null ? w.cloudCoverPct : 15;
      cloudVeil.style.opacity = Math.max(0, Math.min(0.55, (cc / 100) * 0.55)).toFixed(3);
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
