// OpenEAS — upstream alert sources and CAP normalization.
//
// Tier A (open, no authentication): National Weather Service CAP via
// api.weather.gov. This is the only source a conforming Implementation is
// required to support (SPEC §3).
//
// Tier B (IPAWS All-Hazards Information Feed) requires a Memorandum of
// Agreement with FEMA and COG registration. It is declared here as
// NOT_PROVISIONED rather than omitted, because SPEC §5.2 requires that an
// unavailable source be reported as unavailable and never as "no alerts".

import { describeEvent, NAME_TO_CODE } from "./codes.js";

const UA = "OpenEAS/0.1.0 (+https://github.com/chelstein/mellowmountainradio)";

export const SOURCE_NWS = {
  id: "nws-cap",
  name: "National Weather Service CAP (api.weather.gov)",
  tier: "A",
  auth: "none",
};

// IPAWS lives in ./ipaws.js — its read feed turned out to require no
// credentials, so it is a Tier A source, not Tier B.

/** Source status values. `no_data` and `unavailable` are distinct (SPEC §5.2). */
export const STATUS = {
  OK: "ok",
  NO_DATA: "no_data",
  UNAVAILABLE: "unavailable",
  NOT_PROVISIONED: "not_provisioned",
};

async function getJson(url, timeoutMs = 12_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { Accept: "application/geo+json", "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch active alerts for a set of NWS zones.
 *
 * Returns { status, source, alerts[], detail } — never throws for a source
 * failure, because a thrown error upstream tends to be rendered as "no alerts"
 * by consumers, which is the exact failure mode SPEC §5.2 forbids.
 */
export async function fetchNwsActive(zones) {
  const url = `https://api.weather.gov/alerts/active?zone=${encodeURIComponent(zones.join(","))}`;
  try {
    const data = await getJson(url);
    const features = Array.isArray(data?.features) ? data.features : [];
    const alerts = features.map(f => normalizeCap(f, SOURCE_NWS.id));
    return {
      status: alerts.length ? STATUS.OK : STATUS.NO_DATA,
      source: SOURCE_NWS,
      alerts,
      detail: alerts.length
        ? `${alerts.length} active alert(s) for zones ${zones.join(", ")}.`
        : `Source responded normally with no active alerts for zones ${zones.join(", ")}.`,
      retrieved_at: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: STATUS.UNAVAILABLE,
      source: SOURCE_NWS,
      alerts: [],
      detail: `Could not reach the National Weather Service: ${err.message}. ` +
              `This is NOT a report that no alerts exist — the source was not consulted successfully.`,
      retrieved_at: new Date().toISOString(),
    };
  }
}

/**
 * Search historical NWS alerts. The public endpoint supports start/end and
 * zone filtering; results are capped by the service.
 */
export async function fetchNwsHistory({ zones, start, end, event, limit = 50 }) {
  const params = new URLSearchParams({ zone: zones.join(","), limit: String(Math.min(limit, 500)) });
  if (start) params.set("start", start);
  if (end)   params.set("end", end);
  const url = `https://api.weather.gov/alerts?${params}`;
  try {
    const data = await getJson(url);
    let alerts = (Array.isArray(data?.features) ? data.features : [])
      .map(f => normalizeCap(f, SOURCE_NWS.id));
    if (event) {
      const want = String(event).toUpperCase();
      alerts = alerts.filter(a =>
        a.same?.event_code === want ||
        (a.cap?.event || "").toUpperCase().includes(want));
    }
    return {
      status: alerts.length ? STATUS.OK : STATUS.NO_DATA,
      source: SOURCE_NWS,
      alerts,
      detail: alerts.length
        ? `${alerts.length} matching alert(s).`
        : "Source responded normally with no matching alerts.",
      retrieved_at: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: STATUS.UNAVAILABLE,
      source: SOURCE_NWS,
      alerts: [],
      detail: `Could not reach the National Weather Service: ${err.message}. ` +
              `Not a finding of absence.`,
      retrieved_at: new Date().toISOString(),
    };
  }
}

/**
 * Normalize an NWS GeoJSON alert feature to the OpenEAS Alert shape (SPEC §4.1).
 *
 * The distinguishing behavior versus a generic weather wrapper: SAME event and
 * FIPS location codes are extracted and surfaced as first-class fields.
 */
export function normalizeCap(feature, sourceId) {
  const p = feature?.properties ?? {};
  const geo = p.geocode ?? {};
  const params = p.parameters ?? {};

  const sameGeocodes = Array.isArray(geo.SAME) ? geo.SAME : [];
  const eventCode = extractEventCode(p);

  // The Weather Service emits TWO eventCode values and they routinely DISAGREE.
  // Observed live for Yavapai/Coconino: a "Flash Flood Warning" carrying
  // {SAME: FFS, NationalWeatherService: FFW} — i.e. the SAME slot says
  // Statement while the product name and the NWS slot say Warning.
  // EAS equipment acts on the SAME value. Surfacing the conflict rather than
  // silently picking one is the whole point.
  const ec = p.eventCode ?? {};
  const nwsCode = firstOf(ec.NationalWeatherService);
  const disagreement = eventCode && nwsCode && eventCode !== nwsCode
    ? { same: eventCode, national_weather_service: nwsCode,
        product_name: p.event ?? null,
        note: "The two eventCode values disagree. EAS equipment acts on the SAME " +
              "value. Do not infer the SAME code from the product name." }
    : null;

  // CAP may carry a digital signature; the NWS JSON representation does not
  // expose one. Report absence honestly rather than defaulting to false.
  const signature = {
    present: false,
    valid: null,
    algorithm: null,
    note: "The NWS GeoJSON representation does not carry the CAP XML signature. " +
          "Signature state is unknown, not negative. See OpenEAS §9.1.",
  };

  return {
    id: p.id ?? feature?.id ?? null,
    // CAP identity is the (sender, identifier, sent) triple — the "extended
    // identifier" that CAP <references> uses. `identifier` alone is not unique
    // across senders.
    identity: {
      sender:     p.sender ?? null,
      identifier: p.id ?? null,
      sent:       p.sent ?? null,
      key: [p.sender, p.id, p.sent].filter(Boolean).join(","),
    },
    universal_id: null,          // Reserved — FCC 26-38 ¶50–55. See SPEC §9.2.
    origin: "cap",

    // Repeatable multimap: name -> [values]. CAP permits repeated valueNames
    // and ECIG §3.3.1 requires each occurrence be processed independently.
    // A flat dict silently discards data — observed live on IPAWS, where one
    // evacuation carried EAS-ORG and CMAMtext twice across language variants.
    parameters: normalizeParameters(params),
    blocked_channels: asArray(params?.BLOCKCHANNEL),
    eas_eligible: !asArray(params?.BLOCKCHANNEL).includes("EAS"),

    cap: {
      identifier:   p.id ?? null,
      sender:       p.sender ?? null,
      sent:         p.sent ?? null,
      status:       p.status ?? null,
      msgType:      p.messageType ?? null,
      scope:        "Public",
      category:     asArray(p.category),
      event:        p.event ?? null,
      responseType: asArray(p.response),
      urgency:      p.urgency ?? null,
      severity:     p.severity ?? null,
      certainty:    p.certainty ?? null,
      effective:    p.effective ?? null,
      onset:        p.onset ?? null,
      expires:      p.expires ?? null,
      ends:         p.ends ?? null,
      senderName:   p.senderName ?? null,
      headline:     p.headline ?? null,
      description:  p.description ?? null,
      instruction:  p.instruction ?? null,
    },

    same: eventCode || sameGeocodes.length
      ? {
          org: firstParam(params, "EAS-ORG") ?? "WXR",
          event_code: eventCode,
          event_meta: eventCode ? describeEvent(eventCode) : null,
          locations: sameGeocodes,
          valid_period: null,   // Not derivable from the CAP representation.
          origination: null,
          station_id: null,
        }
      : null,

    raw_header: null,            // Only populated from an observed legacy header.
    event_code_disagreement: disagreement,

    area: {
      descriptions:  p.areaDesc ? p.areaDesc.split(";").map(s => s.trim()) : [],
      same_geocodes: sameGeocodes,
      fips:          sameGeocodes.map(c => (c.length === 6 ? c.slice(1) : c)),
      ugc:           Array.isArray(geo.UGC) ? geo.UGC : [],
      polygons:      extractPolygons(feature),
      circles:       [],
    },

    signature,
    duplicate_of: null,
    format_resolution: null,     // Requires station-side observation (Tier C).

    sources: [{ id: sourceId, retrieved_at: new Date().toISOString(), url: p["@id"] ?? null }],
  };
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function firstOf(v) {
  if (Array.isArray(v) && v.length) return String(v[0]).toUpperCase();
  return typeof v === "string" && v ? v.toUpperCase() : null;
}

function firstParam(params, key) {
  const v = params?.[key];
  if (Array.isArray(v) && v.length) return String(v[0]);
  return typeof v === "string" ? v : null;
}

/** Coerce the NWS parameters object into a name -> [values] multimap. */
function normalizeParameters(params) {
  const out = {};
  for (const [k, v] of Object.entries(params ?? {})) out[k] = asArray(v).map(String);
  return out;
}

function extractEventCode(p) {
  const ec = p.eventCode ?? {};
  for (const key of ["SAME", "same", "NationalWeatherService"]) {
    const v = ec[key];
    if (Array.isArray(v) && v.length) return String(v[0]).toUpperCase();
    if (typeof v === "string" && v) return v.toUpperCase();
  }
  // Fall back to the event name. Marked as a fallback by the caller's
  // event_meta.known flag when the code is not in the table.
  const name = (p.event ?? "").toLowerCase();
  return NAME_TO_CODE[name] ?? null;
}

function extractPolygons(feature) {
  const g = feature?.geometry;
  if (!g) return [];
  if (g.type === "Polygon")      return [g.coordinates];
  if (g.type === "MultiPolygon") return g.coordinates;
  return [];
}
