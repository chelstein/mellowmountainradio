// KAZM Living Window — real per-time-of-day foreground paintings.
// Each of these is a distinct painting (see living-scene/tod/*.webp) with
// its own real sun position, shadow direction, and sky color for that
// named clock time — not one fixed image with a CSS filter pretending to
// be a different time of day. Crossfades between the two nearest
// keyframes by real local clock time (America/Phoenix, matching CONFIG).
//
// Keyframe hours are decimal 24h clock time, taken from the source art's
// own labeled captions (e.g. "12:30 PM" -> 12.5). The run is NOT evenly
// spaced and does not cover the full 24h (biggest gap: ~11:45pm-5:15am
// overnight, where the scene just holds on the last/first keyframe) —
// more keyframes can be added here as more real source art arrives.
export const KEYFRAMES = [
  { hour: 5.25, key: "predawn" },     // 5:15 AM
  { hour: 6.083, key: "dawn" },       // 6:05 AM
  { hour: 9.0, key: "morning" },      // 9:00 AM
  { hour: 12.5, key: "midday" },      // 12:30 PM
  { hour: 15.75, key: "afternoon" },  // 3:45 PM
  { hour: 18.333, key: "goldenhour" },// 6:20 PM
  { hour: 19.25, key: "sunset" },     // 7:15 PM
  { hour: 20.083, key: "bluehour" },  // 8:05 PM
  { hour: 22.25, key: "night" },      // 10:15 PM
  { hour: 23.75, key: "fullmoon" },   // 11:45 PM
];

export function imageUrl(key) {
  return "living-scene/tod/" + key + ".webp";
}

function decimalHour(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour: "numeric", minute: "numeric", second: "numeric", hour12: false,
  }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return (get("hour") % 24) + get("minute") / 60 + get("second") / 3600;
}

/** Returns { a: {key}, b: {key}, weight } — weight is how far (0-1) from
 *  a's keyframe toward b's keyframe the real current time sits. Wraps
 *  around midnight; outside the run's span it just holds on the nearest
 *  end (weight 0 or 1) rather than wrapping through the long overnight
 *  gap as if it were a normal short interval. */
export function crossfadeFor(date, timezone) {
  const h = decimalHour(date, timezone);
  const n = KEYFRAMES.length;
  for (let i = 0; i < n - 1; i++) {
    const cur = KEYFRAMES[i], next = KEYFRAMES[i + 1];
    if (h >= cur.hour && h <= next.hour) {
      const span = next.hour - cur.hour;
      const weight = span > 0 ? (h - cur.hour) / span : 0;
      return { a: cur, b: next, weight };
    }
  }
  // outside every pair: before the first keyframe or after the last —
  // both cases fall in the overnight gap, so just hold steady rather
  // than blend across the ~5.5h gap as if it were continuous.
  if (h < KEYFRAMES[0].hour) return { a: KEYFRAMES[0], b: KEYFRAMES[0], weight: 0 };
  return { a: KEYFRAMES[n - 1], b: KEYFRAMES[n - 1], weight: 0 };
}
