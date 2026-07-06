// Real aircraft near the transmitter site, drawn as faint moving dots
// with a short fading contrail. adsb.lol has no browser CORS headers,
// so this goes through a tiny n8n proxy (studio-bridge/n8n-kazm-aircraft.json).
// If that proxy isn't deployed or the fetch fails, this layer renders
// nothing — it never invents traffic.
import { CONFIG } from "./config.js";

export function fetchAircraft() {
  const url = CONFIG.aircraftEndpoint + "?lat=" + CONFIG.lat + "&lon=" + CONFIG.lon + "&radius=" + CONFIG.aircraftRadiusNm;
  return fetch(url, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !Array.isArray(d.aircraft)) return [];
      return d.aircraft
        .filter((a) => a && a.dir != null && a.alt_baro != null && a.alt_baro !== "ground")
        .slice(0, CONFIG.maxAircraft)
        .map((a) => ({
          flight: (a.flight || "").trim(),
          bearingDeg: a.dir,
          distNm: a.dst || 0,
          altFt: a.alt_baro,
          trackDeg: a.track != null ? a.track : a.dir,
        }));
    })
    .catch(() => []);
}

export function createAircraftLayer(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1;
  let planes = [];
  let raf = null, running = false;

  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round((r.width || 600) * dpr));
    h = Math.max(1, Math.round((r.height || 400) * dpr));
    canvas.width = w; canvas.height = h;
  }
  window.addEventListener("resize", size, { passive: true });
  size();

  function project(p) {
    // Artistic projection, not a literal sky map: bearing sets horizontal
    // position, altitude sets height (higher = closer to the top), and
    // distance fades/shrinks the dot. The painting has one fixed vantage,
    // so this reads as "traffic is out there," not a real-time radar.
    const x = ((p.bearingDeg % 360) / 360) * w;
    const y = h * (0.06 + 0.3 * (1 - Math.min(p.altFt, 38000) / 38000));
    const fade = Math.max(0.25, 1 - p.distNm / CONFIG.aircraftRadiusNm);
    return { x, y, fade };
  }

  function tick() {
    if (!running || !canvas.isConnected) { running = false; return; }
    raf = window.requestAnimationFrame(tick);
    ctx.clearRect(0, 0, w, h);
    const now = performance.now();
    for (const p of planes) {
      const { x, y, fade } = project(p);
      const drift = ((now - p._t0) / 1000) * 1.2 * dpr; // slow rightward creep, sells motion
      const px = x + drift;
      const trail = 26 * dpr * fade;
      const ang = (p.trackDeg * Math.PI) / 180;
      ctx.globalAlpha = 0.35 * fade;
      ctx.strokeStyle = "rgba(230,236,245,1)";
      ctx.lineWidth = Math.max(1, 1 * dpr);
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px - Math.sin(ang) * trail, y - Math.cos(ang) * trail * 0.3);
      ctx.stroke();
      ctx.globalAlpha = 0.75 * fade;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath(); ctx.arc(px, y, 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
      if (CONFIG.enableLabels && p.flight) {
        ctx.globalAlpha = 0.6 * fade;
        ctx.font = (10 * dpr) + "px sans-serif";
        ctx.fillText(p.flight, px + 6 * dpr, y - 4 * dpr);
      }
    }
    ctx.globalAlpha = 1;
  }

  return {
    setAircraft(list) {
      const now = performance.now();
      planes = (list || []).map((p) => Object.assign({ _t0: now }, p));
    },
    start() { if (running) return; running = true; tick(); },
    stop() { running = false; if (raf) window.cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, w, h); },
  };
}
