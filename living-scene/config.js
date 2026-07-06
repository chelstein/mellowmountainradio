// KAZM Living Window — configuration.
// Real coordinates for the KAZM transmitter site / Sedona, AZ.
export const CONFIG = {
  lat: 34.8697,
  lon: -111.7610,
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
