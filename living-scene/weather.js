// Real current conditions at the transmitter site, via the same
// Open-Meteo endpoint the rest of the site already uses for Sedona.
// WMO weather codes: https://open-meteo.com/en/docs (current=weather_code)
import { CONFIG } from "./config.js";

function classify(code) {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "storm";
  return "clear";
}

/**
 * Fetch current weather. Resolves to null on any failure — callers must
 * fall back to a calm default rather than invent conditions.
 */
export function fetchWeather() {
  return fetch(CONFIG.weatherEndpoint, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.current) return null;
      const c = d.current;
      return {
        tempF: c.temperature_2m,
        code: c.weather_code,
        kind: classify(c.weather_code),
        cloudCoverPct: c.cloud_cover != null ? c.cloud_cover : null,
        windMph: c.wind_speed_10m || 0,
        windDirDeg: c.wind_direction_10m || 0,
        precipIn: c.precipitation || 0,
      };
    })
    .catch(() => null);
}

/** A calm, honest placeholder used ONLY while the real fetch is in flight or has failed. */
export const CALM_FALLBACK = {
  tempF: null, code: 1, kind: "clear", cloudCoverPct: 15, windMph: 3, windDirDeg: 270, precipIn: 0,
};
