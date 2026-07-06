// The sky itself: the slow CSS wash (day/twilight/night/cloud tint — see
// tintOpacities) plus the canvas-drawn sun and moon discs, both positioned
// by real altitude/azimuth (see config.js's projectAltAz). The painted
// horizon sun in lounge-window.jpg is only ever "correct" right at real
// golden hour; drawSun crossfades a real moving sun in for the rest of
// the day and softly covers the painted one so there's never a double sun.
//
// TODO(art): the base image still has the sky painted into it (clouds,
// horizon glow) because cutting the foreground (trees/tower/dish/car/deer)
// into a transparent PNG needs real image segmentation — soft branch
// edges and gaps in the tree canopy make a naive brightness-threshold mask
// look worse than this overlay approach, and no such tool is available in
// this environment. Once a proper foreground cutout exists, sky.js's wash
// can become the *only* sky (real gradient, no painted clouds underneath)
// instead of a cover layer over painted art.
import { SKY, projectAltAz } from "./config.js";

/** Opacity for the three CSS wash layers, derived from real sun altitude. */
export function tintOpacities(skyState) {
  return {
    night: skyState.nightAmount,
    midday: skyState.middayAmount * 0.42,
    cloudCap: 0.28,
  };
}

// The painted horizon sun's fixed spot in the source art (measured in the
// 1536x1024 painting; .lounge-scene shares that exact aspect ratio via
// background-size:cover, so the fraction maps straight onto the canvas).
const PAINTED_SUN_X = 0.4232, PAINTED_SUN_Y = 0.5811;

/** Soft cover over the painted horizon sun once the real sun has climbed
 *  well clear of it — otherwise the moving sun and the painted one would
 *  both be visible at once. */
export function drawPaintedSunCover(ctx, w, h, skyState) {
  const coverA = Math.min(1, skyState.middayAmount * 1.4) * 0.85;
  if (coverA <= 0.01) return;
  const cx = w * PAINTED_SUN_X, cy = h * PAINTED_SUN_Y, cr = w * 0.3;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.6, 1); // wider than tall — the painted glow spans a horizon band, not a circle
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, cr);
  grad.addColorStop(0, "rgba(150,168,196," + coverA.toFixed(3) + ")");
  grad.addColorStop(1, "rgba(150,168,196,0)");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The real, moving sun. Fades in once middayAmount lifts it clear of the
 *  painted horizon sun, fades back into the painting at the other end of
 *  the day — see drawPaintedSunCover, which uses the same middayAmount
 *  axis so the crossfade is always in sync. */
export function drawSun(ctx, w, h, skyState) {
  if (skyState.sunAltitudeDeg <= -4 || skyState.middayAmount <= 0.01) return;
  const proj = projectAltAz(skyState.sunAltitudeDeg, skyState.sunAzimuthDeg, -4);
  if (!proj.visible) return;
  const sx = proj.xFrac * w, sy = proj.yFrac * h;
  const horizonFade = Math.max(0, Math.min(1, (skyState.sunAltitudeDeg + 4) / 6));
  const sunA = horizonFade * skyState.middayAmount;
  // Capped well short of 1 and kept out of the green/blue channels near
  // white — this needs to read as unmistakably the sun, never a second
  // moon, at any altitude from horizon glow to high noon.
  const warm = Math.max(0, Math.min(1, skyState.sunAltitudeDeg / 90));
  const r = 255, g = Math.round(175 + 40 * warm), b = Math.round(70 + 70 * warm);
  const sr = w * (0.022 + 0.01 * (1 - warm));
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 5);
  grad.addColorStop(0, "rgba(" + r + "," + g + "," + b + "," + (sunA * 0.6).toFixed(3) + ")");
  grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(sx, sy, sr * 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255," + Math.round(205 + 30 * warm) + "," + Math.round(110 + 70 * warm) + "," + sunA.toFixed(3) + ")";
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
}

/** The real moon: real altitude/azimuth, brightness tied to real
 *  illuminated fraction. `starAlpha` (already computed by the star field's
 *  twilight fade) gates it the same way stars are gated, so it only
 *  appears once it's actually dark enough to see it glow. */
export function drawMoon(ctx, w, h, skyState, starAlpha) {
  if (!skyState.moonUp || starAlpha <= 0.05) return;
  const proj = projectAltAz(skyState.moonAltitudeDeg, skyState.moonAzimuthDeg, 0);
  if (!proj.visible) return;
  const mx = proj.xFrac * w, my = proj.yFrac * h;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

export function drawStars(ctx, stars) {
  if (!stars.length) return;
  const now = performance.now();
  ctx.fillStyle = "rgba(255,255,255,1)";
  for (const s of stars) {
    ctx.globalAlpha = s.alpha * (0.8 + 0.2 * Math.sin(now / 1500 + s.mag * 10));
    ctx.beginPath(); ctx.arc(s.x * ctx.canvas.width, s.y * ctx.canvas.height, 1 + Math.max(0, (3.6 - s.mag) * 0.35), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawPlanets(ctx, planets) {
  if (!planets.length) return;
  for (const p of planets) {
    const x = p.x * ctx.canvas.width, y = p.y * ctx.canvas.height;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
    grad.addColorStop(0, "rgba(" + p.color + "," + p.alpha.toFixed(3) + ")");
    grad.addColorStop(1, "rgba(" + p.color + ",0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255," + p.alpha.toFixed(3) + ")";
    ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
  }
}
