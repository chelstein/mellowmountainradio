// Real bright-star field. Positions come from actual RA/Dec (see
// stars-catalog.js for provenance) converted to the sky's real altitude/
// azimuth for right now — not a random scatter. Only visible once the sun
// is below civil twilight, and washed out by real moon brightness the
// same way it would be outdoors.
import { altAzFromRaDec } from "./astronomy.js";
import { projectAltAz } from "./config.js";
import { BRIGHT_STARS } from "./stars-catalog.js";

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Returns the subset of the catalog that's actually up and dark enough to
 * show right now, projected onto the scene, with per-star alpha already
 * baked in (magnitude + twilight + moon wash).
 */
export function getVisibleStars(date, lat, lng, sunAltitudeDeg, moonAltitudeDeg, moonFraction) {
  if (sunAltitudeDeg > -0.3) return []; // stars don't show before civil twilight even starts

  // Fades in smoothly from civil twilight through nautical/astronomical —
  // full brightness only once the sun is properly down.
  const twilightFade = clamp((-6 - sunAltitudeDeg) / 12 + 0.3, 0, 1);
  // A bright moon washes out all but the brightest stars, same as reality.
  const moonWash = moonAltitudeDeg > 0 ? moonFraction * 0.7 : 0;
  const globalFade = twilightFade * (1 - moonWash);
  if (globalFade <= 0.01) return [];

  const out = [];
  for (const [raDeg, decDeg, mag, name] of BRIGHT_STARS) {
    const pos = altAzFromRaDec(raDeg, decDeg, date, lat, lng);
    const proj = projectAltAz(pos.altitude, pos.azimuth, 0);
    if (!proj.visible) continue;
    // mag -1.44 (Sirius) -> ~1.0 alpha; mag 3.4 (catalog floor) -> ~0.2
    const baseAlpha = clamp((3.6 - mag) / 5, 0.15, 1);
    const alpha = baseAlpha * globalFade;
    if (alpha <= 0.02) continue;
    out.push({ x: proj.xFrac, y: proj.yFrac, alpha, mag, name });
  }
  return out;
}
