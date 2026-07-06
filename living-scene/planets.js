// Real Venus/Mars/Jupiter/Saturn, positioned and faded by their actual
// computed apparent magnitude. Only ever present when the Astronomy
// Engine loaded (see astronomy.js) — no engine, no planets, rather than
// guessing where they are.
import { getPlanetPositions } from "./astronomy.js";
import { projectAltAz } from "./config.js";

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Real, plain color science: Venus is a blazing pale white, Mars a rusty
// ember, Jupiter a warm cream, Saturn a pale gold.
const PLANET_COLOR = {
  Venus: "245,248,250",
  Mars: "235,150,110",
  Jupiter: "245,235,210",
  Saturn: "230,215,170",
};

export function getVisiblePlanets(date, lat, lng, elevationM, sunAltitudeDeg) {
  const planets = getPlanetPositions(date, lat, lng, elevationM);
  if (!planets.length) return [];
  // Venus in particular is visible before full dark; start the fade right
  // at sunset rather than waiting for the star-field's civil-twilight gate.
  const twilightFade = clamp((-1 - sunAltitudeDeg) / 8 + 0.25, 0, 1);
  if (twilightFade <= 0.01) return [];

  const out = [];
  for (const p of planets) {
    const proj = projectAltAz(p.altDeg, p.azDeg, 0);
    if (!proj.visible) continue;
    // Brighter (more negative) magnitude -> higher alpha. Venus can reach
    // -4.9, Jupiter about -2.9, Mars swings widely, Saturn hovers near 0.5.
    const baseAlpha = clamp((1.2 - p.magnitude) / 6, 0.25, 1);
    const alpha = baseAlpha * twilightFade;
    if (alpha <= 0.02) continue;
    out.push({ x: proj.xFrac, y: proj.yFrac, alpha, name: p.name, color: PLANET_COLOR[p.name] || "255,255,255" });
  }
  return out;
}
