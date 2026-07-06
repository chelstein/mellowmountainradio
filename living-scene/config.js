// KAZM Living Window — configuration.
// Real coordinates for the KAZM transmitter site / Sedona, AZ.
export const CONFIG = {
  lat: 34.8697,
  lon: -111.7610,
  // Real ASTER 30m DEM elevation at this exact lat/lon (opentopodata.org),
  // not a guess — used for atmospheric refraction/rise-set precision.
  elevationM: 1326,
  timezone: "America/Phoenix",
  stationName: "KAZM Mellow Mountain Radio",

  // Real-data providers. No stubs: if a provider fails, the layer it
  // feeds simply goes quiet (see each module's fallback behavior).
  weatherProvider: "open-meteo",
  weatherEndpoint:
    "https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610" +
    "&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,precipitation" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Phoenix",

  // TODO(real-provider): aircraft.lol has no CORS header for browser fetch,
  // so this must be proxied. Deployed as the "KAZM Aircraft Proxy" n8n
  // workflow — see studio-bridge/n8n-kazm-aircraft.json. If this endpoint
  // 404s, the aircraft layer simply shows no traffic (never fakes planes).
  aircraftProvider: "adsb.lol (proxied)",
  aircraftEndpoint: "https://n8n.mellowmountainradio.com/webhook/kazm-aircraft",
  aircraftRadiusNm: 45,
  maxAircraft: 3,

  refreshWeatherMs: 10 * 60 * 1000,
  refreshAircraftMs: 25 * 1000,

  enableLabels: false,
  debugMode: false,
};

// Camera mapping from real sky coordinates onto the scene's fixed vantage.
// One painted vantage can't show true parallax, so this is an honest
// artistic projection (like the aircraft layer's bearing mapping): compass
// azimuth sweeps left(east)-to-right(west) through the visible half of the
// sky in front of the window, altitude maps to height above the horizon
// line. Not a literal planetarium — real math driving a calm illustration.
export const SKY = {
  horizonY: 0.72,
  zenithY: 0.05,
  eastX: 0.05,
  southX: 0.5,
  westX: 0.95,
  visibleAzimuthCenter: 180,
  visibleAzimuthWidth: 180,
};

/**
 * Project real altitude/azimuth (degrees) onto the scene as fractions of
 * the canvas box (0-1). `visible` is false once a body is either below
 * minAltDeg or outside the window's field of view (i.e. behind the viewer).
 */
export function projectAltAz(altitudeDeg, azimuthDeg, minAltDeg) {
  minAltDeg = minAltDeg == null ? 0 : minAltDeg;
  const half = SKY.visibleAzimuthWidth / 2;
  let d = ((azimuthDeg - SKY.visibleAzimuthCenter + 540) % 360) - 180; // (-180,180]
  const visible = altitudeDeg >= minAltDeg && Math.abs(d) <= half;
  const xFrac = d >= 0
    ? SKY.southX + (d / half) * (SKY.westX - SKY.southX)
    : SKY.southX + (d / half) * (SKY.southX - SKY.eastX);
  const t = Math.max(0, Math.min(1, altitudeDeg / 90));
  const yFrac = SKY.horizonY - t * (SKY.horizonY - SKY.zenithY);
  return { xFrac, yFrac, visible };
}
