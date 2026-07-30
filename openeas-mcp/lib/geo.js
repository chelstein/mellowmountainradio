// OpenEAS — geospatial helpers for CAP area segments.
//
// Pure functions, no I/O.
//
// ── Coordinate order is the trap ────────────────────────────────────────────
// CAP 1.2 writes coordinates as "lat,lon" (§3.3.4 of the OASIS spec).
// GeoJSON writes them as [lon, lat] (RFC 7946 §3.1.1).
// Getting this backwards silently places Arizona alerts in the Indian Ocean, and
// the bug is invisible until someone looks at a map. Every conversion in this
// module is explicit about which convention it is in, and CAP order is preserved
// internally so that a round trip through OpenEAS never reorders a coordinate.
//
// Relevance: proposed §11.55(d) (FCC 26-38) would key EAS relay decisions off
// "an event code and CAP area segment (using SAME geocodes or polygon/circle
// coordinates)". Current §11.55(d) speaks only of header codes. Geometry is
// therefore forward-looking rule surface, not decoration.

/**
 * Parse a CAP <polygon> value: space-separated "lat,lon" pairs, first == last.
 * Returns { points: [[lat, lon], ...], closed, valid, error }.
 */
export function parsePolygon(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { valid: false, error: "Empty polygon.", points: [] };
  }
  const points = [];
  for (const tok of raw.trim().split(/\s+/)) {
    const [a, b] = tok.split(",");
    const lat = Number(a), lon = Number(b);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return { valid: false, error: `Bad coordinate pair: ${tok}`, points: [] };
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { valid: false, error: `Coordinate out of range: ${tok}`, points: [] };
    }
    points.push([lat, lon]);
  }
  if (points.length < 4) {
    return { valid: false, error: "A CAP polygon needs at least 4 points (first repeated as last).", points };
  }
  const [f, l] = [points[0], points[points.length - 1]];
  const closed = f[0] === l[0] && f[1] === l[1];
  return {
    valid: true,
    points,
    closed,
    note: closed ? undefined
      : "Polygon is not explicitly closed; CAP requires the first point be repeated as the last. Treated as closed for containment tests.",
  };
}

/** Parse a CAP <circle> value: "lat,lon radius_km". */
export function parseCircle(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { valid: false, error: "Empty circle." };
  }
  const [center, radius] = raw.trim().split(/\s+/);
  const [a, b] = (center ?? "").split(",");
  const lat = Number(a), lon = Number(b), km = Number(radius);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(km)) {
    return { valid: false, error: `Bad circle: ${raw}` };
  }
  return { valid: true, center: [lat, lon], radius_km: km };
}

/**
 * Ray-casting point-in-polygon. `point` and `polygon` are both in CAP [lat, lon]
 * order. Treats the boundary as inside — for a public-warning area, excluding an
 * edge case would under-report coverage, and under-reporting is the worse error.
 */
export function pointInPolygon([lat, lon], points) {
  if (!Array.isArray(points) || points.length < 3) return false;

  // On-boundary check first, so edges count as inside.
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    if (onSegment([lat, lon], points[j], points[i])) return true;
  }

  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [yi, xi] = points[i];
    const [yj, xj] = points[j];
    const crosses = (yi > lat) !== (yj > lat);
    if (crosses && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function onSegment([py, px], [ay, ax], [by, bx]) {
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  if (Math.abs(cross) > 1e-9) return false;
  return (
    px >= Math.min(ax, bx) - 1e-9 && px <= Math.max(ax, bx) + 1e-9 &&
    py >= Math.min(ay, by) - 1e-9 && py <= Math.max(ay, by) + 1e-9
  );
}

const EARTH_KM = 6371.0088;

/** Great-circle distance in km between two CAP [lat, lon] points. */
export function haversineKm([lat1, lon1], [lat2, lon2]) {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pointInCircle(point, center, radiusKm) {
  return haversineKm(point, center) <= radiusKm;
}

/** Bounding box of CAP [lat, lon] points: { min_lat, min_lon, max_lat, max_lon }. */
export function boundingBox(points) {
  if (!points?.length) return null;
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const [lat, lon] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return { min_lat: minLat, min_lon: minLon, max_lat: maxLat, max_lon: maxLon };
}

/**
 * Does a point fall inside an alert's area?
 *
 * Returns a structured verdict rather than a boolean, because HOW a point
 * matched is operationally meaningful: geometry is precise, a SAME geocode match
 * means "somewhere in this county", and no geometry at all means the alert simply
 * cannot be resolved more finely than its geocodes.
 */
export function pointInArea([lat, lon], area, opts = {}) {
  const sameCodes = opts.sameCodes ?? [];   // caller's county/state codes
  const reasons = [];
  let matched = false, precision = null;

  for (const raw of area?.polygons ?? []) {
    const poly = typeof raw === "string" ? parsePolygon(raw) : { valid: false };
    if (!poly.valid) continue;
    if (pointInPolygon([lat, lon], poly.points)) {
      matched = true; precision = "polygon";
      reasons.push("Point falls inside a CAP polygon.");
      break;
    }
  }

  if (!matched) {
    for (const raw of area?.circles ?? []) {
      const c = typeof raw === "string" ? parseCircle(raw) : { valid: false };
      if (!c.valid) continue;
      const d = haversineKm([lat, lon], c.center);
      if (d <= c.radius_km) {
        matched = true; precision = "circle";
        reasons.push(`Point is ${d.toFixed(1)} km from the circle centre, within its ${c.radius_km} km radius.`);
        break;
      }
    }
  }

  if (!matched && sameCodes.length) {
    const hit = (area?.same_geocodes ?? []).find(g => sameCoversAny(String(g), sameCodes));
    if (hit) {
      matched = true; precision = "geocode";
      reasons.push(`No geometry matched, but SAME geocode ${hit} covers the supplied location codes. ` +
                   `County-level precision only — the point may be anywhere in that county.`);
    }
  }

  const hasGeometry = (area?.polygons?.length ?? 0) + (area?.circles?.length ?? 0) > 0;
  if (!matched && !hasGeometry) {
    reasons.push("Alert carries no polygon or circle, so it cannot be resolved below county level. " +
                 "Supply location codes to test geocode coverage.");
  }

  return {
    matched,
    precision,
    has_geometry: hasGeometry,
    explanation: reasons.join(" ") || "Point is outside every area segment on this alert.",
  };
}

/** Does a SAME geocode from an alert cover any of the caller's codes? */
export function sameCoversAny(geocode, codes) {
  const g = String(geocode);
  if (g === "000000") return true;                       // all US territory
  if (codes.includes(g)) return true;
  if (g.length !== 6) return false;
  const ss = g.slice(1, 3), ccc = g.slice(3, 6);
  // CCC=000 means the entire state.
  if (ccc === "000") return codes.some(c => c.length === 6 && c.slice(1, 3) === ss);
  return codes.some(c => c.length === 6 && c.slice(1) === ss + ccc);
}

/**
 * Convert a CAP area to a GeoJSON FeatureCollection.
 * Coordinates are flipped to [lon, lat] per RFC 7946.
 * Circles become 64-gon approximations, since GeoJSON has no circle primitive.
 */
export function areaToGeoJson(area, properties = {}) {
  const features = [];

  for (const raw of area?.polygons ?? []) {
    const p = typeof raw === "string" ? parsePolygon(raw) : { valid: false };
    if (!p.valid) continue;
    const ring = p.points.map(([lat, lon]) => [lon, lat]);
    if (!p.closed) ring.push(ring[0]);
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: { ...properties, cap_shape: "polygon" },
    });
  }

  for (const raw of area?.circles ?? []) {
    const c = typeof raw === "string" ? parseCircle(raw) : { valid: false };
    if (!c.valid) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [circleRing(c.center, c.radius_km)] },
      properties: {
        ...properties, cap_shape: "circle",
        cap_circle_center: c.center, cap_circle_radius_km: c.radius_km,
        approximation: "GeoJSON has no circle primitive; rendered as a 64-sided polygon.",
      },
    });
  }

  return { type: "FeatureCollection", features };
}

function circleRing([lat, lon], radiusKm, segments = 64) {
  const ring = [];
  const latR = radiusKm / 111.32;
  const lonR = radiusKm / (111.32 * Math.max(0.01, Math.cos(lat * Math.PI / 180)));
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * 2 * Math.PI;
    ring.push([lon + lonR * Math.cos(t), lat + latR * Math.sin(t)]);   // [lon, lat]
  }
  return ring;
}
