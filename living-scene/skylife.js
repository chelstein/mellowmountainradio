// Ambient sky life beyond the real astronomy (sky.js), weather, and ADS-B
// aircraft (aircraft.js) layers already tracking real data. This file is
// the honest-fakery line: shooting stars and satellites are real, common
// sights in a night sky, rendered here as generic atmospheric phenomena
// (not a claim to be tracking any specific real meteor or satellite,
// the same "artistic, not literal radar" honesty the aircraft layer's own
// comments already spell out). Soaring birds/raptors are real too — red-
// tailed hawks and golden eagles are genuinely common over this canyon —
// drawn as simple procedural silhouettes since there's no source painting
// crop for them (same reasoning as wildlife.js's deer-only roster).
//
// The one thing in here that ISN'T trying to be real: a UFO, on purpose,
// rare enough it's a wink rather than a feature — silent, erratic, and
// nothing like the steady/blinking motion everything else in this file
// uses, so it never gets mistaken for a real sighting.

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp01(t) { return Math.max(0, Math.min(1, t)); }
function lerp(a, b, t) { return a + (b - a) * t; }

function makeMeteor() {
  const x0 = rand(0.1, 0.9), y0 = rand(0.03, 0.3);
  const ang = rand(0.5, 1.05);
  const len = rand(0.14, 0.27);
  return { kind: "meteor", t0: performance.now(), dur: rand(500, 900), x0, y0, dx: Math.cos(ang) * len, dy: Math.sin(ang) * len };
}

function makeSatellite() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const y0 = rand(0.05, 0.32);
  return { kind: "satellite", t0: performance.now(), dur: rand(24000, 42000), x0: dir > 0 ? -0.06 : 1.06, xEnd: dir > 0 ? 1.06 : -0.06, y0, y1: y0 + rand(-0.05, 0.05), seed: Math.random() * 10 };
}

function makeBirdFlock() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const y0 = rand(0.14, 0.36);
  const count = 3 + Math.floor(Math.random() * 4);
  const members = Array.from({ length: count }, function (_v, i) {
    return { lag: i * 0.016, offY: rand(-0.014, 0.014), phase: Math.random() * 6.283 };
  });
  return { kind: "birds", t0: performance.now(), dur: rand(24000, 40000), dir, x0: dir > 0 ? -0.08 : 1.08, xEnd: dir > 0 ? 1.08 : -0.08, y0, y1: y0 + rand(-0.05, 0.05), members };
}

function makeEagle() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const y0 = rand(0.08, 0.22);
  return { kind: "eagle", t0: performance.now(), dur: rand(38000, 62000), dir, x0: dir > 0 ? -0.08 : 1.08, xEnd: dir > 0 ? 1.12 : -0.12, y0, midY: y0 + rand(-0.05, 0.07), phase: Math.random() * 6.283 };
}

function makeUfo() {
  return { kind: "ufo", t0: performance.now(), dur: rand(7000, 12000), cx: rand(0.25, 0.75), cy: rand(0.07, 0.28), seed: Math.random() * 1000 };
}

function drawWingMark(ctx, x, y, size, flap, lineWidth) {
  const drop = size * 0.4 * flap;
  ctx.beginPath();
  ctx.moveTo(x - size, y + drop);
  ctx.quadraticCurveTo(x - size * 0.42, y - drop * 1.3, x, y);
  ctx.quadraticCurveTo(x + size * 0.42, y - drop * 1.3, x + size, y + drop);
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function createSkyLifeLayer(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1;
  let running = false, raf = null;
  let isDay = false, isDark = false;
  let objects = [];
  const timers = {};

  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round((r.width || 600) * dpr));
    h = Math.max(1, Math.round((r.height || 400) * dpr));
    canvas.width = w; canvas.height = h;
  }
  window.addEventListener("resize", size, { passive: true });
  size();

  function wake() { if (running && !raf) tick(); }

  // Each phenomenon reschedules itself on its own randomized timer so
  // none of them ever fall into a predictable cadence, and a condition
  // that isn't currently true (e.g. birds scheduled to check mid-storm-
  // of-night) just skips that turn rather than stopping the cycle.
  function scheduleMeteor() {
    timers.meteor = window.setTimeout(function () {
      if (canvas.isConnected) { if (isDark) { objects.push(makeMeteor()); wake(); } scheduleMeteor(); }
    }, rand(35000, 150000));
  }
  function scheduleSatellite() {
    timers.sat = window.setTimeout(function () {
      if (canvas.isConnected) { if (isDark) { objects.push(makeSatellite()); wake(); } scheduleSatellite(); }
    }, rand(150000, 420000));
  }
  function scheduleBirds() {
    timers.birds = window.setTimeout(function () {
      if (canvas.isConnected) { if (isDay) { objects.push(makeBirdFlock()); wake(); } scheduleBirds(); }
    }, rand(80000, 260000));
  }
  function scheduleEagle() {
    timers.eagle = window.setTimeout(function () {
      if (canvas.isConnected) { if (isDay) { objects.push(makeEagle()); wake(); } scheduleEagle(); }
    }, rand(600000, 1500000));
  }
  function scheduleUfo() {
    // Deliberately rare — a once-in-a-long-while easter egg, not a feature
    // anyone should expect to see on a given visit.
    timers.ufo = window.setTimeout(function () {
      if (canvas.isConnected) { if (isDark) { objects.push(makeUfo()); wake(); } scheduleUfo(); }
    }, rand(2700000, 7200000));
  }

  function drawMeteor(o, now) {
    const p = clamp01((now - o.t0) / o.dur);
    const alpha = p < 0.1 ? p / 0.1 : p > 0.7 ? Math.max(0, (1 - p) / 0.3) : 1;
    const hx = (o.x0 + o.dx * p) * w, hy = (o.y0 + o.dy * p) * h;
    const tp = Math.max(0, p - 0.4);
    const tx = (o.x0 + o.dx * tp) * w, ty = (o.y0 + o.dy * tp) * h;
    const grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255," + alpha.toFixed(3) + ")");
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(1, 1.6 * dpr);
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(hx, hy, 1.4 * dpr, 0, Math.PI * 2); ctx.fill();
    return p < 1;
  }

  function drawSatellite(o, now) {
    const p = clamp01((now - o.t0) / o.dur);
    const edge = Math.min(p, 1 - p) / 0.06;
    const alpha = Math.max(0, Math.min(1, edge)) * (0.55 + 0.2 * Math.sin(now / 900 + o.seed));
    const x = lerp(o.x0, o.xEnd, p) * w, y = lerp(o.y0, o.y1, p) * h;
    ctx.fillStyle = "rgba(225,235,250," + alpha.toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(x, y, 1.15 * dpr, 0, Math.PI * 2); ctx.fill();
    return p < 1;
  }

  function drawBirds(o, now) {
    const p = clamp01((now - o.t0) / o.dur);
    const baseX = lerp(o.x0, o.xEnd, p), baseY = lerp(o.y0, o.y1, p);
    const edge = Math.min(p, 1 - p) / 0.05;
    const alpha = Math.max(0, Math.min(1, edge)) * 0.55;
    ctx.strokeStyle = "rgba(30,26,24," + alpha.toFixed(3) + ")";
    for (const m of o.members) {
      const mp = clamp01(p - m.lag);
      const x = lerp(o.x0, o.xEnd, mp) * w;
      const y = (baseY + m.offY) * h;
      const flap = 0.35 + 0.65 * Math.max(0, Math.sin(now / 160 + m.phase));
      drawWingMark(ctx, x, y, 3.4 * dpr, flap, Math.max(1, 1 * dpr));
    }
    return p < 1;
  }

  function drawEagle(o, now) {
    const p = clamp01((now - o.t0) / o.dur);
    const edge = Math.min(p, 1 - p) / 0.04;
    const alpha = Math.max(0, Math.min(1, edge)) * 0.6;
    const u = 1 - p;
    const x = (u * u * o.x0 + 2 * u * p * ((o.x0 + o.xEnd) / 2) + p * p * o.xEnd) * w;
    const y = (u * u * o.y0 + 2 * u * p * o.midY + p * p * o.y0) * h;
    const flap = 0.16 + 0.14 * Math.max(0, Math.sin(now / 2600 + o.phase));
    ctx.strokeStyle = "rgba(24,20,18," + alpha.toFixed(3) + ")";
    drawWingMark(ctx, x, y, 8.5 * dpr, flap, Math.max(1.2, 1.3 * dpr));
    return p < 1;
  }

  function drawUfo(o, now) {
    const p = clamp01((now - o.t0) / o.dur);
    const alpha = p < 0.12 ? p / 0.12 : p > 0.85 ? Math.max(0, (1 - p) / 0.15) : 1;
    const jx = Math.sin(p * 11 + o.seed) * 0.05 + Math.sin(p * 23 + o.seed * 2) * 0.014;
    const jy = Math.cos(p * 9 + o.seed) * 0.03;
    const dash = p > 0.8 ? Math.pow((p - 0.8) / 0.2, 2) * 0.4 * (o.seed % 2 ? 1 : -1) : 0;
    const x = (o.cx + jx + dash) * w, y = (o.cy + jy) * h;
    const r = 3 * dpr;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    glow.addColorStop(0, "rgba(205,255,225," + (alpha * 0.5).toFixed(3) + ")");
    glow.addColorStop(1, "rgba(205,255,225,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = now / 260 + o.seed + (i * Math.PI * 2) / 3;
      const lx = x + Math.cos(a) * r * 1.9, ly = y + Math.sin(a) * r * 0.6;
      ctx.fillStyle = "rgba(215,255,230," + alpha.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(lx, ly, 1.1 * dpr, 0, Math.PI * 2); ctx.fill();
    }
    return p < 1;
  }

  const DRAW = { meteor: drawMeteor, satellite: drawSatellite, birds: drawBirds, eagle: drawEagle, ufo: drawUfo };

  function tick() {
    if (!running || !canvas.isConnected) { running = false; return; }
    if (!objects.length) { ctx.clearRect(0, 0, w, h); raf = null; return; }
    raf = window.requestAnimationFrame(tick);
    ctx.clearRect(0, 0, w, h);
    const now = performance.now();
    objects = objects.filter(function (o) { return DRAW[o.kind](o, now); });
  }

  return {
    setConditions(day, dark) { isDay = !!day; isDark = !!dark; },
    start() {
      if (running) return;
      running = true;
      scheduleMeteor(); scheduleSatellite(); scheduleBirds(); scheduleEagle(); scheduleUfo();
      tick();
    },
    stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
      Object.keys(timers).forEach(function (k) { window.clearTimeout(timers[k]); });
      objects = [];
      ctx.clearRect(0, 0, w, h);
    },
  };
}
