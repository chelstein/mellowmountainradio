// The sky itself: a real CSS gradient (skyGradientCSS) plus the canvas-
// drawn sun, moon, stars, and planets, all positioned by real altitude/
// azimuth (see config.js's projectAltAz). `lounge-foreground.webp` is a
// transparent-sky cutout of the original painting (see
// living-scene/ASSET-BACKLOG-v85.md for how it was made and its known
// simplifications — the tower in particular is a solid recolored
// silhouette, not its real see-through lattice), so this sky renders
// truly *behind* the trees/tower/dish rather than tinted on top of them.
import { SKY, projectAltAz } from "./config.js";

// Real sky-gradient color stops (percent, [r,g,b]) at 0/15/40/65/100%
// down the frame. GOLDEN was sampled directly from the actual painting's
// sky (the one real moment it depicts); NIGHT/DAY are the same tuned
// tones the old CSS tint/midday overlays used, now driving an actual
// gradient instead of a translucent layer stacked on top of painted art.
const GOLDEN = [[61, 59, 111], [80, 53, 87], [133, 90, 120], [205, 95, 56], [247, 153, 59]];
const NIGHT = [[4, 6, 14], [6, 8, 18], [8, 11, 24], [10, 10, 21], [12, 10, 19]];
const DAY = [[63, 126, 194], [90, 145, 200], [127, 168, 208], [180, 205, 218], [239, 232, 216]];
const STOP_PCT = [0, 15, 40, 65, 100];

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function lerpRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

/** The foreground plate (ground/trees/tower/dish/jeep/etc.) is still one
 *  flattened cutout lit for the one real golden-hour moment the painting
 *  depicts (see ASSET-BACKLOG-v85.md — true per-object relighting needs
 *  the full Option B layer split). Until then, this is a real, if coarse,
 *  stand-in: a CSS filter driven by the same middayAmount/nightAmount the
 *  sky gradient uses, so a real bright midday sun measurably brightens
 *  and cools the ground instead of leaving it looking permanently dusk-lit
 *  no matter the actual time of day. Unchanged (identity) at golden hour,
 *  since that's the one moment the painted lighting is already correct.
 */
export function groundFilterCSS(skyState) {
  const brightness = 1 + 0.22 * skyState.middayAmount - 0.4 * skyState.nightAmount;
  const saturate = 1 - 0.2 * skyState.middayAmount - 0.25 * skyState.nightAmount;
  const contrast = 1 + 0.05 * skyState.middayAmount;
  return "brightness(" + brightness.toFixed(3) + ") saturate(" + saturate.toFixed(3) + ") contrast(" + contrast.toFixed(3) + ")";
}

/** Real CSS gradient for the sky itself, blended from real sun altitude —
 *  golden hour is the painting's own true colors; day and night blend in
 *  from there via middayAmount/nightAmount, same axes the old tint used. */
export function skyGradientCSS(skyState) {
  const stops = STOP_PCT.map((pct, i) => {
    const rgb = skyState.nightAmount > 0
      ? lerpRGB(GOLDEN[i], NIGHT[i], skyState.nightAmount)
      : lerpRGB(GOLDEN[i], DAY[i], skyState.middayAmount);
    return "rgb(" + rgb.join(",") + ") " + pct + "%";
  });
  return "linear-gradient(180deg," + stops.join(",") + ")";
}

/** The real, moving sun — the only sun now that the painted one has been
 *  cut out of the foreground plate along with the rest of the sky, so
 *  there's nothing left to crossfade against. Fades in/out only right at
 *  the horizon (rise/set), full strength any time it's actually up. */
export function drawSun(ctx, w, h, skyState) {
  if (skyState.sunAltitudeDeg <= -4) return;
  const proj = projectAltAz(skyState.sunAltitudeDeg, skyState.sunAzimuthDeg, -4);
  if (!proj.visible) return;
  const sx = proj.xFrac * w, sy = proj.yFrac * h;
  const sunA = Math.max(0, Math.min(1, (skyState.sunAltitudeDeg + 4) / 6));
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
