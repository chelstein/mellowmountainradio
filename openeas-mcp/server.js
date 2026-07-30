// OpenEAS reference implementation.
//
// A read-only Model Context Protocol server for observing U.S. Emergency Alert
// System activity. Conforms to OpenEAS 0.1.0-draft (see ../openeas/SPEC.md).
//
// REGULATORY POSITION — this is load-bearing, not boilerplate. See SPEC §2.
//
//   * This server does NOT perform or manage any requirement of 47 CFR §11.32
//     (encoder), §11.33 (decoder), or §11.56 (CAP processing). It is therefore
//     outside proposed §11.2(e) "EAS Software" (FCC 26-38), which would require
//     on-premises location and excludes cloud-based services.
//   * It is NOT an Intermediary Device under §11.56(b).
//   * It contains NO origination capability. No AFSK generation, no Attention
//     Signal generation, no audio synthesis, no EAS audio artifacts anywhere.
//   * The mandatory-forward path — EAN, nationwide NPT, RMT under §11.51(m) —
//     does NOT traverse this server. It cannot add latency to, gate, or hold
//     any alert, because it has no connection to any air chain.
//   * The certified decoder is authoritative for forwarding decisions
//     (§11.51(m)(1)). Anything this server derives is labeled derived.
//
// Every tool is advisory. Nothing here is a system of record.

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { EVENTS, ORIGINATORS, TABLE_VERSION, TABLE_SOURCE, describeEvent } from "./lib/codes.js";
import { parseHeader, decodeLocation, derivedMandatoryForward } from "./lib/same.js";
import { fetchNwsActive, fetchNwsHistory, SOURCE_NWS, STATUS } from "./lib/sources.js";
import { fetchFeedIndex, fetchAlert, SOURCE_IPAWS } from "./lib/ipaws.js";
import * as loc from "./lib/locations.js";
import { pointInArea, areaToGeoJson, parsePolygon, boundingBox, sameCoversAny } from "./lib/geo.js";
import { buildValidation } from "./lib/validate.js";
import * as store from "./lib/store.js";
import * as poller from "./lib/poller.js";
import * as openfema from "./lib/openfema.js";

const PROFILE_VERSION = "0.1.0-draft";
const PORT = process.env.PORT || 3100;

// ── Participant configuration ────────────────────────────────────────────────
// SPEC §4.7: monitoring assignments MUST come from the current approved State
// EAS Plan and MUST be configuration, never compiled in. The LP-1/LP-2 values
// below are intentionally unset — they are not guessable and a wrong value is
// worse than an absent one.
const STATION = {
  callsign:     process.env.EAS_CALLSIGN     || "KAZM",
  name:         process.env.EAS_STATION_NAME || "KAZM 780 AM / 106.5 FM (Mellow Mountain Radio)",
  service_area: process.env.EAS_SERVICE_AREA || "Sedona, Arizona — Yavapai and Coconino counties",
  state_fips:   process.env.EAS_STATE_FIPS   || "04",   // Arizona
  county_fips:  process.env.EAS_COUNTY_FIPS  || "025",  // Yavapai
  nws_zones:   (process.env.EAS_NWS_ZONES    || "AZC025,AZC005").split(",").map(s => s.trim()),
  // SAME location codes this station watches. 000000 = all US territory and is
  // REQUIRED to catch EAN and a nationwide NPT. 004000 = Arizona statewide,
  // 004025 = Yavapai, 004005 = Coconino — Sedona straddles the county line, so
  // the service area genuinely needs both.
  same_codes: (process.env.EAS_SAME_CODES ||
               "000000,004000,004025,004005").split(",").map(s => s.trim()),
  timezone:     process.env.EAS_TIMEZONE     || "America/Phoenix",
  // §73.1800(b) requires times be marked advanced or non-advanced. Arizona does
  // not observe daylight time, so this is MST year-round — but the designation
  // is still required.
  tz_label:     process.env.EAS_TZ_LABEL     || "MST (non-advanced; Arizona does not observe DST)",
  state_eas_plan: process.env.EAS_PLAN_REF   || null,
  monitor_sources: [],   // Unset. Populate from the approved Arizona State EAS Plan.
};

// ── Response envelope ────────────────────────────────────────────────────────
// SPEC §5.2: every response MUST distinguish "no alerts" from "unavailable"
// from "out of scope". Returning an empty list for the latter two is
// non-conforming — a consumer must never read a broken feed as "no emergency".
function envelope(payload, sources) {
  const now = new Date();
  return {
    profile: { name: "OpenEAS", version: PROFILE_VERSION },
    advisory: true,
    authoritative: false,
    disclaimer:
      "Observational data. NOT authoritative and NOT for life-safety decisions. " +
      "For official alerts consult the originating authority. The station's certified " +
      "decoder and station log remain the systems of record.",
    generated_at: now.toISOString(),
    generated_local: now.toLocaleString("en-US", { timeZone: STATION.timezone }) +
                     ` ${STATION.tz_label}`,
    sources: sources.map(s => ({
      id: s.source.id,
      name: s.source.name,
      tier: s.source.tier,
      status: s.status,
      detail: s.detail,
    })),
    ...payload,
  };
}

const text = obj => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });

// Applied to every tool. SPEC §5 requires readOnlyHint on all of them.
const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

// ── IPAWS relevance filtering ────────────────────────────────────────────────
// The IPAWS Atom index cannot be filtered server-side — ?statefips=04 returns
// the unfiltered national feed — so filtering is necessarily client-side.

/** Does a SAME geocode from an alert cover a caller's watch list? */
function sameCovers(geocode, watchList) {
  return sameCoversAny(geocode, watchList);
}

/**
 * Resolve a caller's location intent into a SAME watch list and NWS zones.
 *
 * National scope: the station config is a DEFAULT, never a constraint. Any
 * caller can ask about any state, county, SAME code, NWS zone, or lat/lon, or
 * about the whole country.
 */
async function resolveScope({ state, same_codes, zones, point, nationwide }) {
  if (nationwide) {
    return {
      kind: "nationwide", state_fips: null,
      same_codes: [], nws_zones: [], point: null,
      description: "Entire United States — no location filter applied.",
    };
  }

  if (point) {
    const [lat, lon] = point.split(",").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error(`point must be "lat,lon"; got "${point}"`);
    }
    return {
      kind: "point", state_fips: null, point: [lat, lon],
      same_codes: same_codes ? same_codes.split(",").map(s => s.trim()) : [],
      nws_zones: [], description: `Point ${lat}, ${lon}`,
    };
  }

  if (same_codes) {
    const codes = same_codes.split(",").map(s => s.trim()).filter(Boolean);
    const resolved = await loc.lookupMany(codes);
    return {
      kind: "same_codes", state_fips: codes[0]?.slice(1, 3) ?? null,
      same_codes: codes, nws_zones: [], point: null,
      resolved_places: resolved,
      description: `SAME codes ${codes.join(", ")}`,
    };
  }

  if (state) {
    const key = state.trim().toUpperCase();
    const fips = /^\d{2}$/.test(key) ? key : loc.POSTAL_TO_FIPS[key];
    if (!fips) throw new Error(`Unknown state "${state}". Use a postal code (AZ) or two-digit FIPS (04).`);
    const st = await loc.byState(fips);
    return {
      kind: "state", state_fips: fips,
      // Statewide plus every county, so both statewide and county-scoped
      // alerts match.
      same_codes: [`0${fips}000`, ...(st?.counties ?? []).map(c => c.same)],
      nws_zones: [], point: null,
      description: `State ${loc.STATE_FIPS[fips] ?? fips} (${st?.count ?? "?"} counties)`,
    };
  }

  if (zones) {
    return {
      kind: "zones", state_fips: null, same_codes: [], point: null,
      nws_zones: zones.split(",").map(s => s.trim()).filter(Boolean),
      description: `NWS zones ${zones}`,
    };
  }

  // Default: the configured station.
  return {
    kind: "station_default", state_fips: STATION.state_fips,
    same_codes: STATION.same_codes, nws_zones: STATION.nws_zones, point: null,
    description: `${STATION.callsign} default — ${STATION.service_area}`,
  };
}

/**
 * Read the IPAWS active window and return alerts relevant to this station.
 *
 * The feed is a rolling ~30-minute active window with no history, so a missed
 * poll is an alert this deployment will never see. A production deployment MUST
 * persist locally; this reference implementation reads live and says so.
 */
async function fetchIpawsRelevant(scope) {
  const NATIONAL = new Set(["EAN", "NPT", "RMT"]);
  try {
    const index = await fetchFeedIndex();

    // Nationwide and point scopes cannot be pre-filtered on the Atom index:
    // nationwide wants everything, and a point needs geometry that only the full
    // CAP carries. Both therefore fetch the whole active window — which is
    // affordable precisely because the window is small (single digits typically).
    const candidates =
      scope.kind === "nationwide" || scope.kind === "point"
        ? index.entries
        : index.entries.filter(e =>
            (scope.state_fips && e.state_fips === scope.state_fips) ||
            NATIONAL.has(String(e.event_code)) ||
            scope.kind === "zones");

    const alerts = [];
    const errors = [];
    for (const c of candidates) {
      try {
        const full = await fetchAlert(c.posted_msg_id);
        if (!full.valid) continue;

        let keep = false, how = null;
        if (scope.kind === "nationwide") {
          keep = true; how = "nationwide scope";
        } else if (scope.kind === "point") {
          const v = pointInArea(scope.point, full.area, { sameCodes: scope.same_codes });
          keep = v.matched;
          how = v.matched ? `${v.precision} match — ${v.explanation}` : null;
          if (keep) full.point_match = v;
        } else {
          const hit = (full.area?.same_geocodes ?? [])
            .find(g => sameCovers(g, scope.same_codes));
          keep = Boolean(hit);
          how = hit ? `SAME geocode ${hit} covers the requested scope` : null;
        }

        if (keep) alerts.push({ ...full, posted_msg_id: c.posted_msg_id, matched_by: how });
      } catch (err) {
        errors.push({ posted_msg_id: c.posted_msg_id, error: err.message });
      }
    }

    return {
      status: alerts.length ? STATUS.OK : STATUS.NO_DATA,
      source: SOURCE_IPAWS,
      alerts,
      detail:
        `${index.entries.length} alert(s) in the national active window; ` +
        `${candidates.length} examined; ${alerts.length} matched ${scope.description}.` +
        (errors.length ? ` ${errors.length} alert(s) could not be retrieved.` : "") +
        " The IPAWS feed is a rolling ~30-minute active window, not a log — it has" +
        " no memory of alerts that have already expired.",
      retrieved_at: new Date().toISOString(),
      errors,
    };
  } catch (err) {
    return {
      status: STATUS.UNAVAILABLE,
      source: SOURCE_IPAWS,
      alerts: [],
      detail: `Could not reach FEMA IPAWS-OPEN: ${err.message}. This is NOT a ` +
              `report that no alerts exist — the source was not consulted successfully.`,
      retrieved_at: new Date().toISOString(),
    };
  }
}

// ── Tool surface ─────────────────────────────────────────────────────────────

function registerTools(mcp) {
  // 1 ── eas_get_active_alerts (Tier A)
  mcp.tool(
    "eas_get_active_alerts",
    "Active Emergency Alert System alerts, ANYWHERE IN THE UNITED STATES. Merges " +
    "FEMA IPAWS-OPEN (civil-authority traffic: evacuations, AMBER, Missing and " +
    "Endangered Persons, civil emergency) with National Weather Service CAP, " +
    "normalized to the OpenEAS model with SAME event and FIPS location codes, " +
    "geometry, and all language variants. Scope by state, SAME code, NWS zone, " +
    "lat/lon point, or nationwide; defaults to the configured station. Read-only. " +
    "Reports source availability explicitly — an unreachable feed is reported as " +
    "unavailable, never as 'no alerts'.",
    {
      state: z.string().optional()
        .describe("State postal code (AZ) or two-digit FIPS (04). Covers statewide and every county."),
      same_codes: z.string().optional()
        .describe("Comma-separated SAME location codes (PSSCCC), e.g. 004025,004005."),
      zones: z.string().optional()
        .describe("Comma-separated NWS zones, e.g. AZC025,AZC005."),
      point: z.string().optional()
        .describe("\"lat,lon\" — returns alerts whose polygon or circle contains the point."),
      nationwide: z.boolean().optional()
        .describe("Every active alert in the country, unfiltered by location."),
      severity: z.enum(["Extreme", "Severe", "Moderate", "Minor"]).optional()
        .describe("Return only alerts at or above this CAP severity."),
      event_code: z.string().length(3).optional()
        .describe("Filter to a single SAME event code, e.g. TOR, FFW, DSW, EVI."),
      language: z.string().optional()
        .describe("Preferred language tag (e.g. es-US). All variants are always returned; this selects which is rendered primary."),
      validate: z.boolean().optional()
        .describe("Deep validation mode: adds a field-by-field audit of every alert, " +
                  "each check citing the rule or specification clause it derives from. " +
                  "Off by default."),
    },
    READ_ONLY,
    async ({ state, same_codes, zones, point, nationwide, severity, event_code, language, validate }) => {
      const RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
      const min = severity ? RANK[severity] : 0;

      let scope;
      try {
        scope = await resolveScope({ state, same_codes, zones, point, nationwide });
      } catch (err) {
        return text(envelope({ error: err.message, count: 0, alerts: [] }, []));
      }

      const [nws, ipaws] = await Promise.all([
        scope.nws_zones.length
          ? fetchNwsActive(scope.nws_zones)
          : Promise.resolve({
              status: STATUS.NOT_PROVISIONED, source: SOURCE_NWS, alerts: [],
              detail: scope.kind === "nationwide"
                ? "The National Weather Service active-alert endpoint requires a zone, area, " +
                  "point, or region filter, so it is not queried for nationwide scope. IPAWS " +
                  "covers the country. Use state or zones to include Weather Service alerts."
                : `No NWS zones resolved for ${scope.description}. Weather Service alerts are ` +
                  `not included in this result; pass zones= to add them.`,
            }),
        fetchIpawsRelevant(scope),
      ]);

      // IPAWS first: it carries the civil-authority traffic (evacuations, AMBER,
      // MEP, civil emergency) that the Weather Service feed does not.
      let alerts = [...ipaws.alerts, ...nws.alerts]
        .filter(a => (RANK[a.cap?.severity] ?? 0) >= min);

      // De-duplicate on the CAP extended identifier, not on `identifier` alone.
      const seen = new Set();
      alerts = alerts.filter(a => {
        const k = a.identity?.key || a.id;
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      if (event_code) {
        const want = event_code.toUpperCase();
        alerts = alerts.filter(a => a.same?.event_code === want);
      }

      // Enrich each alert: derived forwarding, resolved place names, geometry
      // summary, preferred language, and optionally the deep audit.
      for (const a of alerts) {
        a.mandatory_forward = a.same?.event_code
          ? derivedMandatoryForward(
              { valid: true, event: describeEvent(a.same.event_code),
                locations: (a.same.locations || []).map(decodeLocation) },
              scope.state_fips ?? STATION.state_fips,
              STATION.county_fips)
          : { mandatory: null, derived: true, basis: "No SAME event code in this representation." };

        // Resolve SAME codes to real place names, nationally.
        const places = await loc.lookupMany(a.area?.same_geocodes ?? []);
        a.area.places = places;
        a.area.place_names = places
          .filter(p => p?.known)
          .map(p => (p.county ? `${p.county}, ${p.state}` : p.state ?? p.scope));

        // Geometry summary without dumping every vertex.
        const polys = (a.area?.polygons ?? [])
          .map(p => (typeof p === "string" ? parsePolygon(p) : null))
          .filter(p => p?.valid);
        a.area.geometry_summary = {
          polygon_count: a.area?.polygons?.length ?? 0,
          circle_count: a.area?.circles?.length ?? 0,
          vertex_count: polys.reduce((n, p) => n + p.points.length, 0),
          bounding_box: polys.length ? boundingBox(polys.flatMap(p => p.points)) : null,
          resolution: (a.area?.polygons?.length || a.area?.circles?.length)
            ? "sub-county (geometry present)"
            : "county-level only (geocodes without geometry)",
        };

        if (language && Array.isArray(a.languages)) {
          const want = a.languages.find(l =>
            String(l.language).toLowerCase().startsWith(language.toLowerCase()));
          a.preferred_language = want
            ? { requested: language, matched: want.language, content: want }
            : { requested: language, matched: null,
                available: a.languages.map(l => l.language),
                note: "Requested language not present on this alert." };
        }

        if (validate) a.validation = buildValidation(a);
      }

      return text(envelope({
        scope: {
          kind: scope.kind,
          description: scope.description,
          same_codes: scope.same_codes.length > 20
            ? [...scope.same_codes.slice(0, 20), `…and ${scope.same_codes.length - 20} more`]
            : scope.same_codes,
          nws_zones: scope.nws_zones,
          point: scope.point,
        },
        validate_mode: Boolean(validate),
        count: alerts.length,
        alerts,
        location_table: loc.status(),
        coverage_note:
          "Merged from FEMA IPAWS-OPEN (civil-authority traffic: evacuations, AMBER, " +
          "MEP, civil emergency messages) and National Weather Service CAP (weather). " +
          "IPAWS results are limited to its rolling ~30-minute active window — an alert " +
          "that expired before this call will not appear, and this reference " +
          "implementation does not persist history.",
      }, [ipaws, nws]));
    }
  );

  // 2 ── eas_search_alert_history (Tier A)
  mcp.tool(
    "eas_search_alert_history",
    "Search historical Emergency Alert System alerts for this station's service area " +
    "by date range and event type. Read-only.",
    {
      start: z.string().optional().describe("ISO 8601 start, e.g. 2026-07-01T00:00:00Z."),
      end:   z.string().optional().describe("ISO 8601 end."),
      event: z.string().optional().describe("SAME event code or a substring of the event name."),
      limit: z.number().int().min(1).max(500).optional().describe("Maximum results (default 50)."),
    },
    READ_ONLY,
    async ({ start, end, event, limit }) => {
      const res = await fetchNwsHistory({ zones: STATION.nws_zones, start, end, event, limit });
      return text(envelope({
        station: { callsign: STATION.callsign, service_area: STATION.service_area },
        query: { start: start ?? null, end: end ?? null, event: event ?? null, limit: limit ?? 50 },
        count: res.alerts.length,
        alerts: res.alerts,
        history_note:
          "Historical search covers National Weather Service CAP, which the public " +
          "endpoint limits to roughly the past seven days. IPAWS-OPEN keeps no history " +
          "at all — its feed is a rolling active window. Deeper civil-authority history " +
          "requires the OpenFEMA IpawsArchivedAlerts dataset, which this reference " +
          "implementation does not yet read.",
      }, [res]));
    }
  );

  // 3 ── eas_explain_alert (Tier A)
  mcp.tool(
    "eas_explain_alert",
    "Decode a SAME header string into plain language, field by field, with rule " +
    "citations: originator, event code and its forwarding obligation, location codes " +
    "expanded to state and county, valid period, and origination time. Accepts header " +
    "TEXT only — this server has no audio capability and no encoder.",
    {
      header: z.string().describe(
        "SAME header text, e.g. ZCZC-WXR-RWT-004025+0015-2091530-KAZM/FM -"),
      year: z.number().int().min(1990).max(2100).optional().describe(
        "Calendar year for Julian-day resolution. SAME headers carry no year; " +
        "supply it when decoding a historical header."),
    },
    READ_ONLY,
    async ({ header, year }) => {
      const parsed = parseHeader(header, year);
      if (!parsed.valid) {
        return text(envelope({
          input: header,
          parsed: null,
          error: parsed.error,
          expected_form: "ZCZC-ORG-EEE-PSSCCC[-PSSCCC...]+TTTT-JJJHHMM-LLLLLLLL-",
          field_guide: {
            ORG: "Originator (§11.31(d))",
            EEE: "Event code (§11.31(e))",
            PSSCCC: "P = portion of county, SS = state FIPS, CCC = county FIPS (000 = statewide)",
            TTTT: "Valid period as a DURATION in HHMM — not a clock time",
            JJJHHMM: "Julian day of year, then UTC hour and minute",
            LLLLLLLL: "Eight-character originating station identifier",
          },
        }, []));
      }

      const forward = derivedMandatoryForward(parsed, STATION.state_fips, STATION.county_fips);
      return text(envelope({
        input: header,
        parsed,
        mandatory_forward: forward,
        plain_language: describePlainly(parsed, forward),
        code_table_version: TABLE_VERSION,
      }, []));
    }
  );

  // 4 ── eas_get_event_codes (Tier A)
  mcp.tool(
    "eas_get_event_codes",
    "The Emergency Alert System originator and event code tables as versioned data, " +
    "with each event's forwarding classification under 47 CFR §11.51(m) and §11.31(e). " +
    "Unknown codes are passed through verbatim rather than rejected.",
    {
      code: z.string().length(3).optional().describe("Look up a single code."),
      scope: z.enum(["national", "local"]).optional().describe("Filter by scope."),
      forward: z.enum(["mandatory", "originated", "optional"]).optional()
        .describe("Filter by forwarding classification."),
    },
    READ_ONLY,
    async ({ code, scope, forward }) => {
      if (code) {
        return text(envelope({
          lookup: describeEvent(code.toUpperCase()),
          table: { version: TABLE_VERSION, source: TABLE_SOURCE },
        }, []));
      }
      let entries = Object.entries(EVENTS);
      if (scope)   entries = entries.filter(([, m]) => m.scope === scope);
      if (forward) entries = entries.filter(([, m]) => m.forward === forward);

      return text(envelope({
        table: { version: TABLE_VERSION, source: TABLE_SOURCE },
        originators: ORIGINATORS,
        events: Object.fromEntries(entries),
        count: entries.length,
        notes: [
          "§11.51(m) mandatory forwarding attaches to EAN, NPT, and RMT, and only " +
          "when the accompanying location codes include the station's state or state/county.",
          "§11.31(e) marks the entire state and local list optional. Handling is " +
          "determined by station management under §11.52(d)(4).",
          "§11.51(n) forbids applying the delay feature to EAN or a nationwide NPT.",
          "Codes change. MEP was added effective 2025-09-08 by FCC 24-83. Verify " +
          "against the current text of §11.31 before relying on this table.",
        ],
      }, []));
    }
  );

  // 13 ── eas_get_ipaws_feed (Tier A)
  mcp.tool(
    "eas_get_ipaws_feed",
    "The FEMA IPAWS-OPEN active alert window, nationally — the authoritative federal " +
    "aggregator that carries civil-authority alerts (evacuations, AMBER, Missing and " +
    "Endangered Persons, civil emergency messages) alongside weather. Returns the " +
    "lightweight Atom index. Read-only.",
    {
      state_fips: z.string().length(2).optional()
        .describe("Filter to a two-digit state FIPS code, e.g. 04 for Arizona. " +
                  "Filtering is client-side; the feed cannot be filtered server-side."),
      event_code: z.string().length(3).optional().describe("Filter to a SAME event code."),
    },
    READ_ONLY,
    async ({ state_fips, event_code }) => {
      try {
        const index = await fetchFeedIndex();
        let entries = index.entries;
        if (state_fips) entries = entries.filter(e => e.state_fips === state_fips);
        if (event_code) {
          const want = event_code.toUpperCase();
          entries = entries.filter(e => String(e.event_code).toUpperCase() === want);
        }
        return text(envelope({
          feed_updated: index.updated,
          national_total: index.entries.length,
          count: entries.length,
          entries: entries.map(e => ({
            ...e,
            event_meta: e.event_code ? describeEvent(String(e.event_code)) : null,
          })),
          window_note:
            "This is a rolling active window — FEMA holds an alert on the feed for " +
            "about 30 minutes or until it expires, whichever comes first. It is NOT a " +
            "log and carries no history. Retrieve full signed CAP for any entry with " +
            "eas_get_ipaws_alert.",
        }, [{ source: SOURCE_IPAWS, status: entries.length ? STATUS.OK : STATUS.NO_DATA,
              detail: `${index.entries.length} alert(s) in the national active window.` }]));
      } catch (err) {
        return text(envelope({ count: 0, entries: [] }, [{
          source: SOURCE_IPAWS, status: STATUS.UNAVAILABLE,
          detail: `Could not reach FEMA IPAWS-OPEN: ${err.message}. Not a finding of absence.`,
        }]));
      }
    }
  );

  // 14 ── eas_get_ipaws_alert (Tier A)
  mcp.tool(
    "eas_get_ipaws_alert",
    "Retrieve one full CAP alert from FEMA IPAWS-OPEN by its posted message ID, " +
    "normalized to the OpenEAS model: CAP extended identity, the parameter multimap " +
    "with repeated values preserved, SAME event and location codes, blocked channels, " +
    "and digital signature metadata. Read-only. Returns structured data and header " +
    "text only — never audio.",
    {
      posted_msg_id: z.string().min(1)
        .describe("The 12-digit POSTEDMSGID from eas_get_ipaws_feed, e.g. 300131302379."),
      validate: z.boolean().optional()
        .describe("Deep validation mode: adds a field-by-field audit citing the rule or " +
                  "specification clause behind every check. Off by default."),
    },
    READ_ONLY,
    async ({ posted_msg_id, validate }) => {
      try {
        const alert = await fetchAlert(posted_msg_id);
        if (!alert.valid) {
          return text(envelope({ alert: null, error: alert.error }, [{
            source: SOURCE_IPAWS, status: STATUS.UNAVAILABLE,
            detail: `Alert ${posted_msg_id} could not be parsed.`,
          }]));
        }
        if (alert.same?.event_code) {
          alert.same.event_meta = describeEvent(alert.same.event_code);
        }
        const places = await loc.lookupMany(alert.area?.same_geocodes ?? []);
        alert.area.places = places;
        alert.area.place_names = places.filter(p => p?.known)
          .map(p => (p.county ? `${p.county}, ${p.state}` : p.state ?? p.scope));
        if (validate) alert.validation = buildValidation(alert);
        return text(envelope({ alert }, [{
          source: SOURCE_IPAWS, status: STATUS.OK,
          detail: `Retrieved and parsed alert ${posted_msg_id}.`,
        }]));
      } catch (err) {
        return text(envelope({ alert: null }, [{
          source: SOURCE_IPAWS, status: STATUS.UNAVAILABLE,
          detail: `Could not retrieve ${posted_msg_id}: ${err.message}.`,
        }]));
      }
    }
  );

  // 15 ── eas_lookup_location (Tier A)
  mcp.tool(
    "eas_lookup_location",
    "Resolve SAME location codes (PSSCCC) to real places, or search for a county by " +
    "name, anywhere in the United States. Covers all 3,295 counties from the National " +
    "Weather Service SAME table plus synthesized statewide and national codes. " +
    "Explains the P subdivision digit and the state/county FIPS split.",
    {
      code: z.string().optional().describe("A SAME location code, e.g. 004025."),
      codes: z.string().optional().describe("Comma-separated SAME codes to resolve at once."),
      search: z.string().optional().describe("County name substring, e.g. \"yavapai\" or \"orange\"."),
      state: z.string().optional().describe("List every county in a state — postal code or two-digit FIPS."),
    },
    READ_ONLY,
    async ({ code, codes, search, state }) => {
      const st = loc.status();
      if (!st.available) {
        return text(envelope({ result: null, location_table: st }, [{
          source: { id: "nws-same-table", name: st.source, tier: "A" },
          status: STATUS.UNAVAILABLE,
          detail: st.detail,
        }]));
      }
      const src = [{
        source: { id: "nws-same-table", name: st.source, tier: "A" },
        status: STATUS.OK,
        detail: `${st.count} location codes loaded.`,
      }];

      if (code)   return text(envelope({ lookup: await loc.lookup(code), location_table: st }, src));
      if (codes)  return text(envelope({
        lookups: await loc.lookupMany(codes.split(",").map(s => s.trim())), location_table: st,
      }, src));
      if (search) return text(envelope({ ...(await loc.search(search)), location_table: st }, src));
      if (state)  return text(envelope({ ...(await loc.byState(state)), location_table: st }, src));

      return text(envelope({
        location_table: st,
        states: loc.STATE_FIPS,
        portion_digits: loc.PORTION,
        structure: {
          format: "PSSCCC",
          P: "County subdivision — 0 = entire area, 1 = NW, 2 = N, 3 = NE, 4 = W, " +
             "5 = central, 6 = E, 7 = SW, 8 = S, 9 = SE (47 CFR §11.31(f))",
          SS: "State/territory ANSI FIPS",
          CCC: "County FIPS; 000 means the entire state",
          special: "000000 = all United States territory. Required in a station's watch " +
                   "list to receive EAN and a nationwide NPT.",
        },
        hint: "Pass code, codes, search, or state.",
      }, src));
    }
  );

  // 16 ── eas_find_alerts_for_point (Tier A)
  mcp.tool(
    "eas_find_alerts_for_point",
    "Given a latitude and longitude anywhere in the United States, return every active " +
    "alert whose CAP area contains that point — tested against polygon and circle " +
    "geometry, falling back to SAME geocode coverage when an alert carries no geometry. " +
    "Reports HOW each match was made, because polygon precision and county-level " +
    "geocode precision are not the same claim.",
    {
      lat: z.number().min(-90).max(90).describe("Latitude, decimal degrees."),
      lon: z.number().min(-180).max(180).describe("Longitude, decimal degrees (negative in the U.S.)."),
      same_codes: z.string().optional()
        .describe("Optional SAME codes for the location, enabling geocode fallback when an alert has no geometry."),
      validate: z.boolean().optional().describe("Add the deep field-by-field audit to each match."),
    },
    READ_ONLY,
    async ({ lat, lon, same_codes, validate }) => {
      const scope = await resolveScope({ point: `${lat},${lon}`, same_codes });
      const ipaws = await fetchIpawsRelevant(scope);

      for (const a of ipaws.alerts) {
        const places = await loc.lookupMany(a.area?.same_geocodes ?? []);
        a.area.place_names = places.filter(p => p?.known)
          .map(p => (p.county ? `${p.county}, ${p.state}` : p.state ?? p.scope));
        if (validate) a.validation = buildValidation(a);
      }

      return text(envelope({
        point: { lat, lon },
        supplied_same_codes: scope.same_codes,
        validate_mode: Boolean(validate),
        count: ipaws.alerts.length,
        alerts: ipaws.alerts,
        precision_note:
          "polygon and circle matches are geometric and precise. A geocode match means " +
          "only that the point's county is covered — the alert area may not include the " +
          "point itself. Alerts carrying no geometry cannot be resolved below county level.",
        coverage_note:
          "Point search covers FEMA IPAWS-OPEN only, because the National Weather " +
          "Service active-alert endpoint does not accept a point together with the other " +
          "filters used here. For Weather Service alerts at a point, call " +
          "eas_get_active_alerts with the containing zone.",
      }, [ipaws]));
    }
  );

  // 17 ── eas_get_alert_geojson (Tier A)
  mcp.tool(
    "eas_get_alert_geojson",
    "Return one IPAWS alert's area as a GeoJSON FeatureCollection, ready to render on a " +
    "map. CAP writes coordinates as lat,lon and GeoJSON as [lon,lat]; this tool performs " +
    "that conversion. Circles become 64-sided polygon approximations, since GeoJSON has " +
    "no circle primitive.",
    {
      posted_msg_id: z.string().min(1).describe("POSTEDMSGID from eas_get_ipaws_feed."),
    },
    READ_ONLY,
    async ({ posted_msg_id }) => {
      try {
        const a = await fetchAlert(posted_msg_id);
        if (!a.valid) {
          return text(envelope({ geojson: null, error: a.error }, [{
            source: SOURCE_IPAWS, status: STATUS.UNAVAILABLE,
            detail: `Alert ${posted_msg_id} could not be parsed.`,
          }]));
        }
        const places = await loc.lookupMany(a.area?.same_geocodes ?? []);
        const gj = areaToGeoJson(a.area, {
          posted_msg_id,
          event: a.cap?.event ?? null,
          same_event_code: a.same?.event_code ?? null,
          severity: a.cap?.severity ?? null,
          expires: a.cap?.expires ?? null,
        });
        const hasGeom = gj.features.length > 0;
        return text(envelope({
          posted_msg_id,
          geojson: gj,
          feature_count: gj.features.length,
          same_geocodes: a.area?.same_geocodes ?? [],
          place_names: places.filter(p => p?.known)
            .map(p => (p.county ? `${p.county}, ${p.state}` : p.state ?? p.scope)),
          note: hasGeom
            ? "Coordinates are GeoJSON [lon, lat] per RFC 7946, converted from CAP lat,lon."
            : "This alert carries NO polygon or circle — the FeatureCollection is empty. " +
              "Its area is defined only by SAME geocodes, listed above. IPAWS alerts from " +
              "civil authorities are frequently geocode-only.",
        }, [{ source: SOURCE_IPAWS, status: hasGeom ? STATUS.OK : STATUS.NO_DATA,
              detail: `Retrieved alert ${posted_msg_id}.` }]));
      } catch (err) {
        return text(envelope({ geojson: null }, [{
          source: SOURCE_IPAWS, status: STATUS.UNAVAILABLE,
          detail: `Could not retrieve ${posted_msg_id}: ${err.message}.`,
        }]));
      }
    }
  );

  // 18 ── eas_get_alert_languages (Tier A)
  mcp.tool(
    "eas_get_alert_languages",
    "Every language variant of one IPAWS alert, with full headline, description, " +
    "instruction, and WEA short/long text per language. CAP carries translations as " +
    "repeated <info> blocks, so an alert may hold complete English and Spanish copy " +
    "with different wording in each — returning only English discards half the message.",
    {
      posted_msg_id: z.string().min(1).describe("POSTEDMSGID from eas_get_ipaws_feed."),
      language: z.string().optional().describe("Return only this language tag, e.g. es-US."),
    },
    READ_ONLY,
    async ({ posted_msg_id, language }) => {
      try {
        const a = await fetchAlert(posted_msg_id);
        if (!a.valid) {
          return text(envelope({ languages: null, error: a.error }, [{
            source: SOURCE_IPAWS, status: STATUS.UNAVAILABLE,
            detail: `Alert ${posted_msg_id} could not be parsed.`,
          }]));
        }
        let langs = a.languages ?? [];
        let filtered = null;
        if (language) {
          filtered = langs.filter(l =>
            String(l.language).toLowerCase().startsWith(language.toLowerCase()));
        }
        return text(envelope({
          posted_msg_id,
          language_count: langs.length,
          available: langs.map(l => l.language),
          requested: language ?? null,
          languages: filtered ?? langs,
          not_found: language && filtered && filtered.length === 0
            ? `No "${language}" variant on this alert. Available: ${langs.map(l => l.language).join(", ")}`
            : null,
          note:
            "The IPAWS Profile requires every <info> block in one alert describe the same " +
            "incident with identical category and eventCode, so variants differ only in " +
            "language, not in substance. The FCC's pending multilingual proposal " +
            "(89 FR 16504) would add pre-scripted templates in the 13 most common " +
            "non-English U.S. languages, which would arrive as further variants here.",
        }, [{ source: SOURCE_IPAWS, status: langs.length ? STATUS.OK : STATUS.NO_DATA,
              detail: `${langs.length} language variant(s).` }]));
      } catch (err) {
        return text(envelope({ languages: null }, [{
          source: SOURCE_IPAWS, status: STATUS.UNAVAILABLE,
          detail: `Could not retrieve ${posted_msg_id}: ${err.message}.`,
        }]));
      }
    }
  );

  // 19 ── eas_search_archive (Tier A)
  mcp.tool(
    "eas_search_archive",
    "Search the permanent OpenEAS archive — every alert this deployment has ever " +
    "observed, kept append-only. The live IPAWS feed holds an alert about 30 minutes " +
    "and then forgets it; this is the record that does not. Search by text, SAME event " +
    "code, state, county code, or date range.",
    {
      query: z.string().optional().describe("Free text across event, headline, description, instruction, and place names."),
      event_code: z.string().length(3).optional().describe("SAME event code, e.g. EVI, TOR, FFW."),
      state_fips: z.string().length(2).optional().describe("Two-digit state FIPS, e.g. 04."),
      same_code: z.string().length(6).optional().describe("Exact SAME location code, e.g. 004025."),
      start: z.string().optional().describe("ISO 8601 lower bound on the alert's sent time."),
      end: z.string().optional().describe("ISO 8601 upper bound."),
      limit: z.number().int().min(1).max(200).optional().describe("Maximum results (default 50)."),
    },
    READ_ONLY,
    async (args) => {
      const r = store.search(args);
      const st = store.stats();
      return text(envelope({
        query: args,
        count: r.count,
        truncated: r.truncated,
        results: r.results,
        archive: {
          alerts_held: st.alerts,
          earliest: st.earliest_alert_sent,
          latest: st.latest_alert_sent,
          months: st.months,
        },
        completeness_caveat: st.completeness_caveat,
      }, [{ source: { id: "openeas-archive", name: "Local append-only archive", tier: "A" },
            status: r.count ? STATUS.OK : STATUS.NO_DATA,
            detail: `${st.alerts} alert(s) archived across ${st.months.length} month(s).` }]));
    }
  );

  // 20 ── eas_verify_archive (Tier A)
  mcp.tool(
    "eas_verify_archive",
    "Verify the archive's hash chain end to end. Every record's SHA-256 is recomputed " +
    "and every link checked, so any retroactive edit, deletion, or reordering is " +
    "detectable — by a third party, using only the files and a SHA-256 implementation, " +
    "without trusting this software or its operator. Reports the first break rather " +
    "than a bare pass or fail.",
    {},
    READ_ONLY,
    async () => {
      const v = store.verify();
      const st = store.stats();
      return text(envelope({
        verified: v.verified,
        record_count: v.record_count,
        tip: v.tip,
        problems: v.problems,
        method: v.method,
        caveat: v.caveat,
        legal_basis:
          "47 CFR §73.1800(d) forbids altering an automatically kept log after entries " +
          "are recorded, and §73.1800(e) forbids erasure during the retention period. " +
          "This module has no update or delete path — corrections are new records that " +
          "reference what they correct, per §73.1840(b)(3)(ii).",
        retention: st.retention,
      }, [{ source: { id: "openeas-archive", name: store.archiveDir(), tier: "A" },
            status: v.verified ? STATUS.OK : STATUS.UNAVAILABLE,
            detail: v.verified
              ? `Chain intact across ${v.record_count} record(s).`
              : `${v.problems.length} integrity problem(s) found.` }]));
    }
  );

  // 21 ── eas_get_archive_stats (Tier A)
  mcp.tool(
    "eas_get_archive_stats",
    "Archive holdings and — importantly — poll coverage. Alert counts alone cannot " +
    "distinguish a quiet period from a period when the poller was down, so every poll " +
    "including failures is recorded and reported here. Coverage, not uptime, bounds " +
    "what this archive can support.",
    {},
    READ_ONLY,
    async () => {
      const st = store.stats();
      return text(envelope({
        archive: st,
        poller: poller.status(),
        backfill: openfema.status(),
        interpretation:
          "Absence of an alert from this archive is NOT evidence the alert did not " +
          "exist. It may mean the alert was issued and expired inside a poll gap. " +
          "Check poll_marks against the period in question before drawing any " +
          "conclusion from silence.",
      }, [{ source: { id: "openeas-archive", name: store.archiveDir(), tier: "A" },
            status: st.alerts ? STATUS.OK : STATUS.NO_DATA,
            detail: `${st.total_records} record(s); chain tip seq ${st.tip.seq}.` }]));
    }
  );

  // 22 ── eas_backfill_history (Tier A)
  mcp.tool(
    "eas_backfill_history",
    "Ingest historical alerts from FEMA's OpenFEMA IpawsArchivedAlerts dataset into the " +
    "archive. Each record carries the complete signed CAP as FEMA received it, so " +
    "history is parsed through the same code path as live traffic. Fills the past; it " +
    "is not a substitute for polling, because the live window is only ~30 minutes wide " +
    "and OpenFEMA's latency relative to real time is undocumented.",
    {
      start: z.string().optional().describe("ISO 8601 lower bound on sent time, e.g. 2026-07-01."),
      end: z.string().optional().describe("ISO 8601 upper bound."),
      state_fips: z.string().length(2).optional().describe("Keep only alerts covering this state, e.g. 04."),
      max: z.number().int().min(1).max(5000).optional().describe("Maximum records to fetch (default 500)."),
      probe_only: z.boolean().optional().describe("Check reachability and return a sample without ingesting."),
    },
    READ_ONLY,
    async ({ start, end, state_fips, max, probe_only }) => {
      if (probe_only) {
        const p = await openfema.probe();
        return text(envelope({ probe: p }, [{
          source: { id: "openfema", name: "OpenFEMA IpawsArchivedAlerts", tier: "A" },
          status: p.reachable ? STATUS.OK : STATUS.UNAVAILABLE,
          detail: p.reachable ? "Reachable, no credentials required." : p.error,
        }]));
      }
      const r = await openfema.backfill({ start, end, state_fips, max });
      return text(envelope({
        backfill: r,
        archive_after: store.stats(),
      }, [{ source: { id: "openfema", name: "OpenFEMA IpawsArchivedAlerts", tier: "A" },
            status: r.added ? STATUS.OK : STATUS.NO_DATA,
            detail: `fetched ${r.fetched}, parsed ${r.parsed}, added ${r.added}, ` +
                    `already held ${r.skipped_existing}.` }]));
    }
  );

  // 11 ── eas_get_conformance (Tier A)
  mcp.tool(
    "eas_get_conformance",
    "This server's OpenEAS profile version, its declared regulatory position under " +
    "47 CFR Part 11, which data tiers are provisioned, and the implementation status " +
    "of every tool in the profile.",
    {},
    READ_ONLY,
    async () => text(envelope({
      profile: { name: "OpenEAS", version: PROFILE_VERSION, spec: "openeas/SPEC.md" },
      station: STATION,
      regulatory_position: {
        is_eas_software: false,
        basis:
          "Does not perform or manage any requirement of 47 CFR §11.32, §11.33, or " +
          "§11.56, and is therefore outside proposed §11.2(e) (FCC 26-38).",
        is_intermediary_device: false,
        intermediary_basis: "Does not function as an Intermediary Device under §11.56(b).",
        origination_capability: "none",
        origination_basis:
          "No SAME AFSK generation, no Attention Signal generation, no audio synthesis, " +
          "and no EAS audio artifacts in the distribution. §11.45(a) reaches recordings " +
          "and simulations, so the prohibition binds fixtures and samples as well.",
        mandatory_forward_path: "does not traverse this server",
        mandatory_forward_basis:
          "No connection to any air chain exists, so EAN, nationwide NPT, and RMT under " +
          "§11.51(m) cannot be delayed, gated, or held by this server.",
        authoritative_systems: [
          "the Participant's certified EAS decoder (§11.33)",
          "the Participant's certified EAS encoder (§11.32)",
          "the station log (§73.1820)",
        ],
      },
      tiers: {
        A: { name: "Open sources", provisioned: true,
             sources: [SOURCE_IPAWS, SOURCE_NWS], requirement: "none",
             note:
               "FEMA removed EAS PIN validation from the IPAWS read feed in " +
               "IPAWS-OPEN 4.02 (November 2023), so IPAWS-OPEN is a Tier A source. " +
               "A FEMA Memorandum of Agreement remains required to ORIGINATE alerts " +
               "(which this software never does) and, per FEMA's published policy for " +
               "the All-Hazards Information Feed, to REDISTRIBUTE them onward. " +
               "Redistribution is an operator policy question, not a technical gate." },
        B: { name: "Reserved", provisioned: false,
             requirement: "Unused. IPAWS turned out to be Tier A." },
        C: { name: "Station-side equipment and recordings", provisioned: false,
             requirement: "Authorized read-only access to the Participant's facility",
             blocked_on: [
               "SPEC §8 Q1 — OPEN: whether this station's EAS insertion point sits " +
               "upstream or downstream of the recording tap. If the stream is tapped " +
               "upstream of the ENDEC, which industry comment to the FCC describes as " +
               "typical, EAS never reaches the recordings and air observation is " +
               "inapplicable. Resolvable by decoding the next Required Weekly Test " +
               "out of the tape at its known timestamp.",
             ],
             resolved: [
               "SPEC §8 Q2 — ANSWERED: the SAME data burst survives lossy stream " +
               "encoding. Measured across 152 conditions with 100% header recovery, " +
               "including MP3 down to 24 kbps at 11.025 kHz, AAC, Opus, hard clipping, " +
               "20:1 compression, band-limiting, and broadband noise to 0 dB SNR. " +
               "Failure appears only below roughly -10 dB SNR, and MP3 does not move " +
               "that threshold. The realistic failure mode is a stream dropout: losing " +
               "one of the three redundant header bursts is survivable, losing two is not.",
             ] },
      },
      tools: {
        eas_get_active_alerts:      { spec_id: 1,  tier: "A", status: "implemented" },
        eas_search_alert_history:   { spec_id: 2,  tier: "A", status: "implemented" },
        eas_explain_alert:          { spec_id: 3,  tier: "A", status: "implemented" },
        eas_get_event_codes:        { spec_id: 4,  tier: "A", status: "implemented" },
        eas_get_ipaws_feed:         { spec_id: 13, tier: "A", status: "implemented" },
        eas_get_ipaws_alert:        { spec_id: 14, tier: "A", status: "implemented" },
        eas_lookup_location:        { spec_id: 15, tier: "A", status: "implemented" },
        eas_find_alerts_for_point:  { spec_id: 16, tier: "A", status: "implemented" },
        eas_get_alert_geojson:      { spec_id: 17, tier: "A", status: "implemented" },
        eas_get_alert_languages:    { spec_id: 18, tier: "A", status: "implemented" },
        eas_search_archive:         { spec_id: 19, tier: "A", status: "implemented" },
        eas_verify_archive:         { spec_id: 20, tier: "A", status: "implemented" },
        eas_get_archive_stats:      { spec_id: 21, tier: "A", status: "implemented" },
        eas_backfill_history:       { spec_id: 22, tier: "A", status: "implemented" },
        eas_get_conformance:        { spec_id: 11, tier: "A", status: "implemented" },
        eas_get_monitor_health:     { spec_id: 5,  tier: "C", status: "not_implemented" },
        eas_get_station_activity:   { spec_id: 6,  tier: "C", status: "not_implemented" },
        eas_get_test_status:        { spec_id: 7,  tier: "C", status: "not_implemented" },
        eas_verify_air:             { spec_id: 8,  tier: "C", status: "not_implemented",
                                      note: "Provisional in the profile itself — SPEC §8." },
        eas_get_compliance_log:     { spec_id: 9,  tier: "C", status: "not_implemented" },
        eas_export_log:             { spec_id: 10, tier: "C", status: "not_implemented" },
        eas_draft_false_alert_report:{ spec_id: 12, tier: "C", status: "not_implemented" },
      },
      conformance:
        "Meets the OpenEAS 0.1.0 Tier A minimum: tools 1–4 and 11, absence semantics " +
        "per §5.2, publication classes per §6.2, and no EAS audio artifact per §2.3. " +
        "Air observation (§8) is optional and provisional and is not claimed.",
    }, []))
  );
}

function describePlainly(p, forward) {
  const locs = p.locations
    .map(l => l.valid
      ? `${l.state ?? `state FIPS ${l.state_fips}`} ${l.scope === "statewide" ? "(statewide)" : `county ${l.county_fips}`}${l.portion.digit !== "0" ? `, ${l.portion.description}` : ""}`
      : `unparseable (${l.code})`)
    .join("; ");

  const ev = p.event.known ? `${p.event.name} (${p.event.code})` : `unrecognized code ${p.event.code}`;
  const org = p.originator.known ? p.originator.name : `unrecognized originator ${p.originator.code}`;

  return [
    `${org} issued a ${ev} for ${locs}.`,
    `It was originated at ${p.origination.utc ?? "an unresolved time"}` +
      (p.origination.year_assumed ? ` (year assumed to be ${p.origination.year_used} — SAME headers carry no year)` : "") + ".",
    `The valid period is ${p.valid_period.human}` +
      (p.expires_utc ? `, expiring ${p.expires_utc}` : "") + ".",
    `The originating station identified itself as "${p.station_id}".`,
    forward.mandatory === true
      ? `This station would be obligated to transmit it: ${forward.basis}`
      : forward.mandatory === false
        ? `No mandatory-forward obligation attaches: ${forward.basis}`
        : `Forwarding obligation could not be determined.`,
    `Forwarding classification here is DERIVED. Under §11.51(m)(1) the certified ` +
      `decoder performs the functions that determine which messages are transmitted.`,
  ].join(" ");
}

// ── Transport ────────────────────────────────────────────────────────────────

function buildServer() {
  const mcp = new McpServer(
    { name: "openeas", version: PROFILE_VERSION },
    {
      instructions:
        "OpenEAS — read-only observability for the U.S. Emergency Alert System. " +
        "All tools are advisory and non-authoritative. This server cannot originate, " +
        "encode, relay, delay, or transmit an alert, and has no connection to any air " +
        "chain. Never present its output as an official alert or as a compliance " +
        "conclusion about any station. For life-safety information, direct users to " +
        "the originating authority.",
    }
  );
  registerTools(mcp);
  return mcp;
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({
  ok: true, profile: "OpenEAS", version: PROFILE_VERSION,
  station: STATION.callsign, tiers_provisioned: ["A"],
}));

app.all("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => { transport.close(); });
    const mcp = buildServer();
    await mcp.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[openeas] request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal error" },
        id: null,
      });
    }
  }
});

app.listen(PORT, () => {
  loc.preload();   // warm the 3,295-row SAME table; failure is non-fatal
  // Continuous ingest. The IPAWS window is ~30 minutes wide with no history
  // endpoint, so anything not captured while it is live is gone for good.
  if (process.env.OPENEAS_POLL !== "0") {
    const p = poller.start();
    console.log(`[openeas] poller ${p.started ? "started" : "already running"} @ ${p.interval_ms}ms -> ${store.archiveDir()}`);
  } else {
    console.log("[openeas] poller disabled (OPENEAS_POLL=0) — archive will not grow");
  }
  console.log(`[openeas] ${PROFILE_VERSION} listening on :${PORT}`);
  console.log(`[openeas] station ${STATION.callsign} — zones ${STATION.nws_zones.join(", ")}`);
  console.log(`[openeas] tier A provisioned; tiers B and C not provisioned`);
});
