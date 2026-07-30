// OpenEAS — SAME location code table, national coverage.
//
// Source: https://www.weather.gov/source/nwr/SameCode.txt
//   3,295 rows, "PSSCCC,County, ST" — e.g. "004025,Yavapai, AZ"
//
// Note the path. The historical https://www.nws.noaa.gov/nwr/data/SameCode.txt
// now returns 403, and https://www.weather.gov/nwr/data/SameCode.txt serves an
// HTML page rather than the data. Only /source/nwr/ returns the plain table.
//
// Statewide codes (CCC=000) do NOT appear in the file — they are implicit, and
// synthesized here from the state list.
//
// Fetched once and cached in memory. On failure the table reports itself
// unavailable rather than returning wrong answers, per SPEC §5.2: a lookup that
// could not be performed must never be presented as a lookup that found nothing.

const SOURCE_URL = "https://www.weather.gov/source/nwr/SameCode.txt";
const UA = "OpenEAS/0.1.0 (+https://github.com/chelstein/mellowmountainradio)";
const TTL_MS = 24 * 60 * 60 * 1000;   // codes change rarely; a day is generous

let cache = null;          // { byCode: Map, byState: Map, states: Set, loadedAt, count }
let inflight = null;
let lastError = null;

// ANSI state/territory FIPS -> postal code. §11.31(f) location codes are based
// on ANSI INCITS 31-2009.
export const STATE_FIPS = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY", "60": "AS", "64": "FM", "66": "GU",
  "68": "MH", "69": "MP", "70": "PW", "72": "PR", "74": "UM", "78": "VI",
};

export const POSTAL_TO_FIPS = Object.fromEntries(
  Object.entries(STATE_FIPS).map(([f, p]) => [p, f])
);

// P digit of PSSCCC — county subdivision (§11.31(f)).
export const PORTION = {
  "0": "entire area", "1": "northwest", "2": "north", "3": "northeast",
  "4": "west", "5": "central", "6": "east", "7": "southwest",
  "8": "south", "9": "southeast",
};

async function load() {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20_000);
    try {
      const res = await fetch(SOURCE_URL, {
        signal: ctl.signal,
        headers: { "User-Agent": UA, Accept: "text/plain" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      const byCode = new Map();
      const byState = new Map();

      for (const line of text.split("\n")) {
        const row = line.trim();
        if (!row) continue;
        // "004025,Yavapai, AZ" — county names may contain commas in principle,
        // so split on the FIRST comma only and take the state from the tail.
        const i = row.indexOf(",");
        if (i < 0) continue;
        const code = row.slice(0, i).trim();
        if (!/^\d{6}$/.test(code)) continue;
        const rest = row.slice(i + 1).trim();
        const j = rest.lastIndexOf(",");
        const county = (j >= 0 ? rest.slice(0, j) : rest).trim();
        const state = (j >= 0 ? rest.slice(j + 1) : "").trim();

        const entry = {
          same: code,
          county,
          state,
          state_fips: code.slice(1, 3),
          county_fips: code.slice(3, 6),
          fips: code.slice(1),
        };
        byCode.set(code, entry);
        if (!byState.has(state)) byState.set(state, []);
        byState.get(state).push(entry);
      }

      if (byCode.size < 3000) {
        throw new Error(`Table looks truncated: ${byCode.size} rows parsed, expected ~3295`);
      }

      // Synthesize the statewide codes, which the file omits.
      for (const [fips, postal] of Object.entries(STATE_FIPS)) {
        const code = `0${fips}000`;
        if (byCode.has(code)) continue;
        byCode.set(code, {
          same: code, county: null, state: postal,
          state_fips: fips, county_fips: "000", fips: `${fips}000`,
          scope: "statewide", synthesized: true,
        });
      }
      byCode.set("000000", {
        same: "000000", county: null, state: null,
        state_fips: "00", county_fips: "000", fips: "00000",
        scope: "national", synthesized: true,
        note: "All United States territory. Required in a station's watch list to " +
              "receive EAN and a nationwide NPT.",
      });

      lastError = null;
      cache = { byCode, byState, loadedAt: Date.now(), count: byCode.size };
      return cache;
    } catch (err) {
      lastError = err.message;
      throw err;
    } finally {
      clearTimeout(t);
      inflight = null;
    }
  })();

  return inflight;
}

/** Warm the cache without blocking startup. Failure is non-fatal. */
export function preload() {
  load().catch(() => { /* reported on demand via status() */ });
}

export function status() {
  if (cache) {
    return {
      available: true,
      count: cache.count,
      loaded_at: new Date(cache.loadedAt).toISOString(),
      source: SOURCE_URL,
    };
  }
  return {
    available: false,
    source: SOURCE_URL,
    error: lastError,
    detail: "The SAME location table could not be loaded. Code lookups are " +
            "UNAVAILABLE — this is not a report that a code does not exist.",
  };
}

/** Resolve one PSSCCC code to a place. Returns null when unavailable. */
export async function lookup(code) {
  const c = String(code).trim();
  if (!/^\d{6}$/.test(c)) {
    return { same: c, valid: false, error: "SAME location codes are six digits (PSSCCC)." };
  }
  let table;
  try { table = await load(); } catch { return null; }

  const p = c[0];
  // The P digit selects part of a county; the table is keyed on the 0-prefixed
  // whole-county code, so normalize before lookup and report the portion.
  const whole = "0" + c.slice(1);
  const hit = table.byCode.get(c) ?? table.byCode.get(whole);

  if (!hit) {
    return {
      same: c, valid: true, known: false,
      state: STATE_FIPS[c.slice(1, 3)] ?? null,
      portion: { digit: p, description: PORTION[p] ?? "unknown" },
      note: "Not present in the NWS SAME table. The code is structurally valid; " +
            "it may be retired, newly assigned, or a marine zone.",
    };
  }

  return {
    ...hit,
    valid: true,
    known: true,
    portion: { digit: p, description: PORTION[p] ?? "unknown" },
    scope: hit.scope ?? (hit.county_fips === "000" ? "statewide" : "county"),
  };
}

/** Resolve many codes at once, preserving order. */
export async function lookupMany(codes) {
  return Promise.all((codes ?? []).map(c => lookup(c)));
}

/** All counties in a state, by postal code or two-digit FIPS. */
export async function byState(stateOrFips) {
  let table;
  try { table = await load(); } catch { return null; }
  const key = String(stateOrFips).trim().toUpperCase();
  const postal = /^\d{2}$/.test(key) ? STATE_FIPS[key] : key;
  const rows = table.byState.get(postal) ?? [];
  return { state: postal, state_fips: POSTAL_TO_FIPS[postal] ?? null, count: rows.length, counties: rows };
}

/** Free-text search across county names. */
export async function search(query, limit = 50) {
  let table;
  try { table = await load(); } catch { return null; }
  const q = String(query).trim().toLowerCase();
  if (!q) return { query, count: 0, matches: [] };
  const out = [];
  for (const e of table.byCode.values()) {
    if (!e.county) continue;
    if (e.county.toLowerCase().includes(q) || `${e.county}, ${e.state}`.toLowerCase().includes(q)) {
      out.push(e);
      if (out.length >= limit) break;
    }
  }
  return { query, count: out.length, matches: out, truncated: out.length >= limit };
}
