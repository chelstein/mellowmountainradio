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
// Real dusk/dawn doesn't fade evenly from golden hour straight to black —
// the horizon glow shifts hue as it dims (warm gold -> pink -> violet-grey
// -> gone) while the zenith deepens on its own track. These three give
// civil/nautical/astronomical twilight (real definitions: sun 0 to -6deg,
// -6 to -12deg, -12 to -18deg) their own distinct character instead of one
// flat lerp collapsing all 24 degrees of dusk into a single blend.
const CIVIL = [[20, 28, 58], [35, 38, 72], [70, 50, 90], [140, 70, 85], [225, 120, 70]];
const NAUTICAL = [[6, 9, 20], [8, 11, 26], [14, 16, 36], [22, 22, 48], [45, 38, 58]];
const ASTRONOMICAL = [[3, 4, 11], [4, 5, 14], [6, 7, 18], [8, 8, 20], [16, 13, 24]];
const STOP_PCT = [0, 15, 40, 65, 100];

// Ladder from bright day down to full night, ordered by real sun altitude.
// GOLDEN sits at 5.35deg — the reference photo's own real sun altitude —
// so the painting's true moment is hit exactly, not approximated. Between
// anchors, color blends linearly by where the real sun altitude actually
// falls, so the sky always reflects a real, continuous moment rather than
// jumping between named bands.
const LADDER = [
  { alt: 45, stops: DAY },
  { alt: 5.35, stops: GOLDEN },
  { alt: -3, stops: CIVIL },
  { alt: -9, stops: NAUTICAL },
  { alt: -15, stops: ASTRONOMICAL },
  { alt: -21, stops: NIGHT },
];

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function lerpRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

function skyStopsForAltitude(sunAltDeg) {
  if (sunAltDeg >= LADDER[0].alt) return LADDER[0].stops;
  const last = LADDER[LADDER.length - 1];
  if (sunAltDeg <= last.alt) return last.stops;
  for (let i = 0; i < LADDER.length - 1; i++) {
    const hi = LADDER[i], lo = LADDER[i + 1];
    if (sunAltDeg <= hi.alt && sunAltDeg >= lo.alt) {
      const t = (hi.alt - sunAltDeg) / (hi.alt - lo.alt);
      return STOP_PCT.map((_pct, idx) => lerpRGB(hi.stops[idx], lo.stops[idx], t));
    }
  }
  return GOLDEN; // unreachable — LADDER is exhaustive and monotonic
}

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
  // Real report against the live site: 4:30pm (sun at 37 deg, well short
  // of solar noon) still read as too dark/dusky against a correctly
  // bright sky. The first pass (0.22/0.2/0.05 coefficients) was too
  // timid to sell "mid-afternoon" against ground painted for near-
  // sunset shadows — retuned and checked visually up to full midday
  // intensity (brightness 1.7) before landing here.
  const brightness = 1 + 0.7 * skyState.middayAmount - 0.4 * skyState.nightAmount;
  const saturate = 1 - 0.33 * skyState.middayAmount - 0.25 * skyState.nightAmount;
  const contrast = 1 + 0.13 * skyState.middayAmount;
  return "brightness(" + brightness.toFixed(3) + ") saturate(" + saturate.toFixed(3) + ") contrast(" + contrast.toFixed(3) + ")";
}

/** Real CSS gradient for the sky itself, blended from real sun altitude
 *  through the full day -> golden hour -> civil -> nautical ->
 *  astronomical -> night ladder above, so dusk/dawn passes through the
 *  same rich color sequence a real sky actually does. */
export function skyGradientCSS(skyState) {
  const rgbStops = skyStopsForAltitude(skyState.sunAltitudeDeg);
  const stops = STOP_PCT.map((pct, i) => "rgb(" + rgbStops[i].join(",") + ") " + pct + "%");
  return "linear-gradient(180deg," + stops.join(",") + ")";
}

/** A soft, warm band hugging the real horizon line (config.js's SKY.horizonY)
 *  — the atmospheric haze/dust a real distant treeline always sits behind,
 *  distinct from the vertical sky gradient above: this is horizontal
 *  atmospheric depth, not sky color. Peaks in intensity and warmth when the
 *  real sun is near the horizon (more atmosphere for light to scatter
 *  through), stays pale and present through full day, and fades to a faint
 *  cool residue at full night — never fully absent, since real haze isn't. */
export function horizonHazeCSS(skyState) {
  const altDeg = skyState.sunAltitudeDeg;
  const lowSun = Math.max(0, Math.min(1, 1 - Math.abs(altDeg) / 20)); // peaks with the sun near the horizon, either side
  const warmth = lowSun * (1 - skyState.nightAmount * 0.6);
  const r = 255;
  const g = Math.round(210 + 30 * (1 - warmth));
  const b = Math.round(150 + 90 * (1 - warmth) - 40 * skyState.nightAmount);
  const alpha = Math.max(0.04, Math.min(0.42, 0.14 + 0.24 * lowSun + 0.05 * skyState.middayAmount - 0.09 * skyState.nightAmount));
  const hy = SKY.horizonY * 100;
  const c = function (a) { return "rgba(" + r + "," + g + "," + b + "," + a.toFixed(3) + ")"; };
  return "linear-gradient(180deg," +
    "rgba(0,0,0,0) 0%," +
    "rgba(0,0,0,0) " + (hy - 9).toFixed(2) + "%," +
    c(alpha * 0.45) + " " + (hy - 2).toFixed(2) + "%," +
    c(alpha) + " " + hy.toFixed(2) + "%," +
    c(alpha * 0.35) + " " + (hy + 3).toFixed(2) + "%," +
    "rgba(0,0,0,0) " + (hy + 11).toFixed(2) + "%," +
    "rgba(0,0,0,0) 100%)";
}

/** The real, moving sun — the only sun now that the painted one has been
 *  cut out of the foreground plate along with the rest of the sky, so
 *  there's nothing left to crossfade against. Fades in/out only right at
 *  the horizon (rise/set), full strength any time it's actually up.
 *
 *  Deliberately soft-edged everywhere — three concentric layers (wide
 *  atmospheric haze, a bloom ring, a bright core) whose alpha always
 *  fades to zero before its own drawn radius, so no layer ever shows a
 *  hard circular boundary. No starburst, no rays: those read as a
 *  graphic/sticker rather than a real light source (real feedback
 *  against the live site) — a real sun's edge is soft, not spiked.
 *  Real astronomy still drives the position/timing/color; this is only
 *  how it's rendered. */
export function drawSun(ctx, w, h, skyState) {
  if (skyState.sunAltitudeDeg <= -4) return;
  const proj = projectAltAz(skyState.sunAltitudeDeg, skyState.sunAzimuthDeg, -4);
  if (!proj.visible) return;
  const sx = proj.xFrac * w, sy = proj.yFrac * h;
  const sunA = Math.max(0, Math.min(1, (skyState.sunAltitudeDeg + 4) / 6));
  const altDeg = skyState.sunAltitudeDeg;

  // 0 at the horizon, 1 by ~20 degrees up — real atmospheric scattering:
  // near the horizon, sunlight crosses far more atmosphere, so the disc
  // reads bigger, hazier, and more golden; overhead it's smaller, crisper,
  // and only slightly desaturated (never pure white — a real sun still
  // reads warm even at zenith).
  const horizon = Math.max(0, Math.min(1, 1 - altDeg / 20));
  const sr = w * (0.021 + 0.013 * horizon);
  const coreR = 255, coreG = Math.round(215 + 25 * (1 - horizon)), coreB = Math.round(140 + 70 * (1 - horizon));

  ctx.save();
  // Wide atmospheric haze — flattened horizontally near the horizon (real
  // horizon glow spreads along the skyline, not in a perfect circle).
  ctx.translate(sx, sy);
  ctx.scale(1 + horizon * 0.6, 1);
  const hazeR = sr * (5.5 + 3.5 * horizon);
  const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, hazeR);
  haze.addColorStop(0, "rgba(" + coreR + "," + coreG + "," + coreB + "," + (sunA * 0.18).toFixed(3) + ")");
  haze.addColorStop(0.5, "rgba(" + coreR + "," + coreG + "," + coreB + "," + (sunA * 0.06).toFixed(3) + ")");
  haze.addColorStop(1, "rgba(" + coreR + "," + coreG + "," + coreB + ",0)");
  ctx.fillStyle = haze;
  ctx.beginPath(); ctx.arc(0, 0, hazeR, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Bloom — brighter, tighter, still fully soft-edged (alpha hits 0 well
  // inside the drawn radius).
  const bloomR = sr * 3.2;
  const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, bloomR);
  bloom.addColorStop(0, "rgba(255,246,225," + (sunA * 0.55).toFixed(3) + ")");
  bloom.addColorStop(0.45, "rgba(" + coreR + "," + coreG + "," + coreB + "," + (sunA * 0.24).toFixed(3) + ")");
  bloom.addColorStop(1, "rgba(" + coreR + "," + coreG + "," + coreB + ",0)");
  ctx.fillStyle = bloom;
  ctx.beginPath(); ctx.arc(sx, sy, bloomR, 0, Math.PI * 2); ctx.fill();

  // The bright core — a warm yellow-gold center, softening to the rim
  // color, alpha reaching 0 before the arc's own edge so nothing ever
  // reads as a flat cutout disc.
  const coreOuterR = sr * 1.55;
  const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, coreOuterR);
  core.addColorStop(0, "rgba(255,250,230," + sunA.toFixed(3) + ")");
  core.addColorStop(0.55, "rgba(" + coreR + "," + coreG + "," + coreB + "," + (sunA * 0.9).toFixed(3) + ")");
  core.addColorStop(1, "rgba(" + coreR + "," + coreG + "," + coreB + ",0)");
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(sx, sy, coreOuterR, 0, Math.PI * 2); ctx.fill();
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
