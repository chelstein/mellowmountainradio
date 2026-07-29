// OpenEAS — SAME header PARSER.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │  THIS MODULE DECODES ONLY. IT MUST NEVER GAIN AN ENCODER.                 │
// │                                                                           │
// │  47 CFR §11.45(a) prohibits transmitting the EAS codes or Attention       │
// │  Signal "or a recording or simulation thereof" outside an actual          │
// │  emergency or authorized test. That reaches simulations and recordings,    │
// │  so it binds test fixtures and sample data, not just production paths.    │
// │                                                                           │
// │  Do not add: AFSK generation (§11.31(a)(1): 520.83 bps, mark 2083.3 Hz,   │
// │  space 1562.5 Hz), Attention Signal generation (§11.31(a)(2): 853 Hz +    │
// │  960 Hz), or any audio synthesis. See OpenEAS SPEC §2.3.                  │
// │                                                                           │
// │  Header TEXT is the intended interchange format and is safe.              │
// └───────────────────────────────────────────────────────────────────────────┘

import { describeEvent, describeOriginator } from "./codes.js";

// PSSCCC location: P = portion of county (0 = entire), SS = state FIPS,
// CCC = county FIPS. Up to 31 locations per header.
const HEADER_RE =
  /^ZCZC-([A-Z]{3})-([A-Z]{3})((?:-\d{6})+)\+(\d{4})-(\d{7})-(.{8})-?$/;

const STATE_FIPS = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
  "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
  "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
  "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY", "60": "AS", "66": "GU", "69": "MP",
  "72": "PR", "78": "VI",
};

const PORTION = {
  "0": "entire area",
  "1": "northwest", "2": "north",   "3": "northeast",
  "4": "west",      "5": "central", "6": "east",
  "7": "southwest", "8": "south",   "9": "southeast",
};

/**
 * Parse a SAME header string into structured fields.
 *
 * @param {string} header  e.g. "ZCZC-WXR-RWT-004025+0015-2091530-KAZM/FM -"
 * @param {number} [year]  Calendar year for Julian-day resolution. The header
 *                         carries no year; the caller must supply context.
 *                         Defaults to the current UTC year.
 * @returns {object} { valid, error?, ...fields }
 */
export function parseHeader(header, year) {
  if (typeof header !== "string") {
    return { valid: false, error: "Header must be a string." };
  }
  const raw = header.trim();
  const m = raw.match(HEADER_RE);
  if (!m) {
    return {
      valid: false,
      error: "Does not match the SAME header form " +
             "ZCZC-ORG-EEE-PSSCCC[-PSSCCC...]+TTTT-JJJHHMM-LLLLLLLL-",
      raw,
    };
  }

  const [, org, event, locBlock, tttt, jjjhhmm, station] = m;
  const locations = locBlock.split("-").filter(Boolean);

  const notes = [];
  if (locations.length > 31) {
    notes.push("Header carries more than 31 location codes, which exceeds the " +
               "SAME maximum. Parsed anyway; treat as suspect.");
  }

  // +TTTT is a duration in HHMM, not a clock time.
  const durH = parseInt(tttt.slice(0, 2), 10);
  const durM = parseInt(tttt.slice(2, 4), 10);
  const durationMinutes = durH * 60 + durM;
  if (durM > 59) {
    notes.push(`Valid-period minutes field (${durM}) exceeds 59; header is malformed.`);
  }

  // JJJHHMM — Julian day of year, then UTC hour and minute.
  const jjj = parseInt(jjjhhmm.slice(0, 3), 10);
  const hh  = parseInt(jjjhhmm.slice(3, 5), 10);
  const mm  = parseInt(jjjhhmm.slice(5, 7), 10);
  const yr  = Number.isInteger(year) ? year : new Date().getUTCFullYear();

  let originationUtc = null;
  if (jjj >= 1 && jjj <= 366 && hh <= 23 && mm <= 59) {
    const d = new Date(Date.UTC(yr, 0, 1, hh, mm, 0));
    d.setUTCDate(d.getUTCDate() + (jjj - 1));
    originationUtc = d.toISOString();
  } else {
    notes.push("Origination field is out of range; timestamp not resolved.");
  }

  const expiresUtc = originationUtc && durationMinutes > 0
    ? new Date(Date.parse(originationUtc) + durationMinutes * 60_000).toISOString()
    : null;

  return {
    valid: true,
    raw,
    originator: describeOriginator(org),
    event: describeEvent(event),
    locations: locations.map(decodeLocation),
    valid_period: {
      raw: tttt,
      duration_minutes: durationMinutes,
      human: formatDuration(durationMinutes),
    },
    origination: {
      raw: jjjhhmm,
      julian_day: jjj,
      utc: originationUtc,
      year_assumed: !Number.isInteger(year),
      year_used: yr,
    },
    expires_utc: expiresUtc,
    station_id: station.trim(),
    notes,
  };
}

/** Decode one PSSCCC location code. */
export function decodeLocation(code) {
  if (!/^\d{6}$/.test(code)) {
    return { code, valid: false, error: "Location must be six digits (PSSCCC)." };
  }
  const p  = code[0];
  const ss = code.slice(1, 3);
  const ccc = code.slice(3, 6);
  return {
    code,
    valid: true,
    portion: { digit: p, description: PORTION[p] ?? "unknown portion" },
    state_fips: ss,
    state: STATE_FIPS[ss] ?? null,
    county_fips: ccc,
    // CCC = 000 means the whole state.
    scope: ccc === "000" ? "statewide" : "county",
    fips: ss + ccc,
  };
}

function formatDuration(min) {
  if (!min) return "no duration specified";
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} minutes`;
  if (!m) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h}h ${m}m`;
}

/**
 * Does this header obligate transmission under §11.51(m)?
 *
 * Mandatory-forward is EAN, nationwide NPT, and RMT — and only "when the
 * accompanying location codes include their State or State/county."
 *
 * This is a DERIVED convenience. §11.51(m)(1) provides that the decoder
 * performs the functions necessary to determine which messages are
 * transmitted. Per SPEC §2.5 the decoder is authoritative and this result
 * MUST be labeled derived wherever it is surfaced.
 */
export function derivedMandatoryForward(parsed, stationStateFips, stationCountyFips) {
  if (!parsed?.valid) return { mandatory: null, derived: true, basis: "unparseable header" };

  const code = parsed.event.code;
  if (!["EAN", "NPT", "RMT"].includes(code)) {
    return {
      mandatory: false,
      derived: true,
      basis: `Event ${code} is not in the §11.51(m) mandatory set (EAN, NPT, RMT). ` +
             `State and local codes are optional under §11.31(e); handling is ` +
             `determined by station management under §11.52(d)(4).`,
    };
  }

  const covered = parsed.locations.some(l =>
    l.valid && l.state_fips === stationStateFips &&
    (l.county_fips === "000" || l.county_fips === stationCountyFips));

  return {
    mandatory: covered,
    derived: true,
    immediate: code === "EAN" || code === "NPT",
    max_delay_minutes: code === "RMT" ? 60 : 0,
    basis: covered
      ? `Event ${code} with location codes covering this station's area. ` +
        `§11.51(m) requires transmission; §11.51(n) forbids applying the delay ` +
        `feature to EAN or a nationwide NPT.`
      : `Event ${code} but location codes do not include this station's state ` +
        `or state/county, so the §11.51(m) obligation does not attach.`,
  };
}
