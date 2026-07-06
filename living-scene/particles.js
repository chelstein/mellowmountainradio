// Rain/snow particle layer, driven entirely by real weather + wind.
// Cloud cover is handled as a tint (see scene.js) rather than drawn
// shapes — the painting already has a sky; we don't paint a second one
// on top of it.
export function createParticleSystem(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1;
  let particles = [];
  let kind = "clear";   // "rain" | "snow" | anything else = none
  let windMph = 0, windDirDeg = 270;
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

  function targetCount() {
    if (kind === "rain") return 140;
    if (kind === "snow") return 90;
    return 0;
  }

  function spawn(p) {
    p.x = Math.random() * w;
    p.y = -10 - Math.random() * h * 0.4;
    if (kind === "rain") {
      p.len = (14 + Math.random() * 16) * dpr;
      p.vy = (9 + Math.random() * 5) * dpr;
      p.alpha = 0.18 + Math.random() * 0.22;
    } else {
      p.r = (1.2 + Math.random() * 2.2) * dpr;
      p.vy = (0.7 + Math.random() * 1.1) * dpr;
      p.wob = Math.random() * Math.PI * 2;
      p.alpha = 0.35 + Math.random() * 0.4;
    }
    return p;
  }

  function rebuild() {
    const n = targetCount();
    particles = [];
    for (let i = 0; i < n; i++) {
      const p = spawn({});
      p.y = Math.random() * h; // seed at random heights so it doesn't start empty
      particles.push(p);
    }
  }

  function tick() {
    if (!running || !canvas.isConnected) { running = false; return; }
    raf = window.requestAnimationFrame(tick);
    ctx.clearRect(0, 0, w, h);
    // wind: a tailwind component pushes drift left/right (dirDeg is "from" direction)
    const windDrift = Math.sin((windDirDeg * Math.PI) / 180) * Math.min(windMph, 30) * 0.06 * dpr;
    if (kind === "rain") {
      ctx.strokeStyle = "rgba(200,215,235,1)";
      ctx.lineWidth = Math.max(1, 1 * dpr);
      for (const p of particles) {
        p.y += p.vy; p.x += windDrift * 0.8;
        if (p.y > h + 20) spawn(p);
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - windDrift * 1.4, p.y + p.len);
        ctx.stroke();
      }
    } else if (kind === "snow") {
      ctx.fillStyle = "rgba(255,255,255,1)";
      for (const p of particles) {
        p.wob += 0.02;
        p.y += p.vy; p.x += windDrift * 0.4 + Math.sin(p.wob) * 0.5 * dpr;
        if (p.y > h + 10) spawn(p);
        ctx.globalAlpha = p.alpha;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  return {
    setWeather(newKind, newWindMph, newWindDirDeg) {
      const kindChanged = newKind !== kind;
      kind = newKind; windMph = newWindMph || 0; windDirDeg = newWindDirDeg || 270;
      if (kindChanged) rebuild();
    },
    start() { if (running) return; running = true; if (!particles.length) rebuild(); tick(); },
    stop() { running = false; if (raf) window.cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, w, h); },
  };
}
