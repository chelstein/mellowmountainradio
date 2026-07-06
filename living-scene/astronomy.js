// Real solar & lunar position math for the Living Window — no network
// required, no approximation "for effect." Standard low-precision solar/
// lunar position formulas (the same math behind SunCalc), good to a few
// arcminutes, which is far tighter than anything a sky tint needs.
const PI = Math.PI, rad = PI / 180;
const dayMs = 1000 * 60 * 60 * 24, J1970 = 2440588, J2000 = 2451545;

function toDays(date) { return (date.valueOf() / dayMs - 0.5 + J1970) - J2000; }

const e = rad * 23.4397; // obliquity of the Earth
function declination(l, b) { return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }
function rightAscension(l, b) { return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)); }

function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }
function azimuth(H, phi, dec) { return Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)); }
function altitude(H, phi, dec) { return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)); }

function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }
function eclipticLongitude(M) {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = rad * 102.9372;
  return M + C + P + PI;
}
function sunCoords(d) {
  const M = solarMeanAnomaly(d), L = eclipticLongitude(M);
  return { dec: declination(L, 0), ra: rightAscension(L, 0) };
}

/** Sun azimuth/altitude (radians) for a given date + coords. */
export function getSunPosition(date, lat, lng) {
  const lw = rad * -lng, phi = rad * lat, d = toDays(date);
  const c = sunCoords(d), H = siderealTime(d, lw) - c.ra;
  return { azimuth: azimuth(H, phi, c.dec), altitude: altitude(H, phi, c.dec) };
}

function moonCoords(d) {
  const L = rad * (218.316 + 13.176396 * d);
  const M = rad * (134.963 + 13.064993 * d);
  const F = rad * (93.272 + 13.229350 * d);
  const l = L + rad * 6.289 * Math.sin(M);
  const b = rad * 5.128 * Math.sin(F);
  const dt = 385001 - 20905 * Math.cos(M);
  return { ra: rightAscension(l, b), dec: declination(l, b), dist: dt };
}

/** Moon azimuth/altitude (radians) for a given date + coords. */
export function getMoonPosition(date, lat, lng) {
  const lw = rad * -lng, phi = rad * lat, d = toDays(date);
  const c = moonCoords(d), H = siderealTime(d, lw) - c.ra;
  let h = altitude(H, phi, c.dec);
  h += rad * (0.017 / Math.tan(h + rad * 10.26 / (h + rad * 5.11))); // low-altitude refraction
  return { azimuth: azimuth(H, phi, c.dec), altitude: h, distance: c.dist };
}

/** Moon phase (0=new..0.5=full..1=new) and illuminated fraction (0-1). */
export function getMoonIllumination(date) {
  const d = toDays(date);
  const s = sunCoords(d), m = moonCoords(d);
  const sdist = 149598000;
  const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
  const angle = Math.atan2(
    Math.cos(s.dec) * Math.sin(s.ra - m.ra),
    Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra)
  );
  return {
    fraction: (1 + Math.cos(inc)) / 2,
    phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / PI,
  };
}

/**
 * Sky state derived from real sun altitude: how "night" it is (0=full
 * day, 1=full astronomical night) plus named bands for anything that
 * wants a discrete state instead of a blend.
 */
export function getSkyState(date, lat, lng) {
  const sun = getSunPosition(date, lat, lng);
  const altDeg = sun.altitude / rad;
  let band = "day";
  if (altDeg < -18) band = "night";
  else if (altDeg < -6) band = "astronomical";
  else if (altDeg < -0.3) band = "twilight";
  else if (altDeg < 6) band = "goldenHour";

  // 0 at +6deg (bright day) fading to 1 at -18deg (full dark), smooth.
  const nightAmount = Math.max(0, Math.min(1, (6 - altDeg) / 24));

  // The painting is one fixed golden-hour composition — its sun can't
  // physically move. So instead of pretending the disc tracks the real
  // sun, we track real altitude through LIGHT: the golden tone is left
  // untouched near actual sunrise/sunset (where it's literally correct),
  // and cools/brightens in proportion to how high the real sun actually
  // is the rest of the day, so noon doesn't read as frozen dusk.
  const middayAmount = Math.max(0, Math.min(1, (altDeg - 10) / 45));

  const moon = getMoonIllumination(date);
  const moonPos = getMoonPosition(date, lat, lng);
  return {
    sunAltitudeDeg: altDeg,
    sunAzimuthDeg: sun.azimuth / rad + 180,
    band,
    nightAmount,
    middayAmount,
    moonPhase: moon.phase,
    moonFraction: moon.fraction,
    moonUp: moonPos.altitude > 0,
    moonAltitudeDeg: moonPos.altitude / rad,
    moonAzimuthDeg: moonPos.azimuth / rad + 180,
  };
}
