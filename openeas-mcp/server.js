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

/** Does a SAME geocode from an alert cover this station's watch list? */
function sameCovers(geocode, watchList, stateFips) {
  const g = String(geocode);
  if (g === "000000") return true;                    // all US territory
  if (watchList.includes(g)) return true;
  if (g.length !== 6) return false;
  const ss = g.slice(1, 3), ccc = g.slice(3, 6);
  if (ss !== stateFips) return false;
  return ccc === "000" || watchList.some(w => w.slice(1) === ss + ccc);
}

/**
 * Read the IPAWS active window and return alerts relevant to this station.
 *
 * The feed is a rolling ~30-minute active window with no history, so a missed
 * poll is an alert this deployment will never see. A production deployment MUST
 * persist locally; this reference implementation reads live and says so.
 */
async function fetchIpawsRelevant(stateFips, watchList) {
  const NATIONAL = new Set(["EAN", "NPT", "RMT"]);
  try {
    const index = await fetchFeedIndex();
    const candidates = index.entries.filter(e =>
      e.state_fips === stateFips || NATIONAL.has(String(e.event_code)));

    const alerts = [];
    const errors = [];
    for (const c of candidates) {
      try {
        const full = await fetchAlert(c.posted_msg_id);
        if (!full.valid) continue;
        const covered = (full.area?.same_geocodes ?? [])
          .some(g => sameCovers(g, watchList, stateFips));
        if (covered) alerts.push({ ...full, posted_msg_id: c.posted_msg_id });
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
        `${candidates.length} matched state FIPS ${stateFips} or a national event code; ` +
        `${alerts.length} cover this station's SAME watch list.` +
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
    "Active Emergency Alert System alerts for this station's service area, normalized " +
    "to the OpenEAS model with SAME event and FIPS location codes surfaced as " +
    "first-class fields. Read-only. Reports source availability explicitly: an " +
    "unreachable feed is reported as unavailable, never as 'no alerts'.",
    {
      severity: z.enum(["Extreme", "Severe", "Moderate", "Minor"]).optional()
        .describe("Return only alerts at or above this CAP severity."),
      event_code: z.string().length(3).optional()
        .describe("Filter to a single SAME event code, e.g. TOR, FFW, DSW, EVI."),
    },
    READ_ONLY,
    async ({ severity, event_code }) => {
      const RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
      const min = severity ? RANK[severity] : 0;

      const [nws, ipaws] = await Promise.all([
        fetchNwsActive(STATION.nws_zones),
        fetchIpawsRelevant(STATION.state_fips, STATION.same_codes),
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

      // Attach the derived §11.51(m) view. Labeled derived per SPEC §2.5.
      for (const a of alerts) {
        a.mandatory_forward = a.same?.event_code
          ? derivedMandatoryForward(
              { valid: true, event: describeEvent(a.same.event_code),
                locations: (a.same.locations || []).map(decodeLocation) },
              STATION.state_fips, STATION.county_fips)
          : { mandatory: null, derived: true, basis: "No SAME event code in this representation." };
      }

      return text(envelope({
        station: { callsign: STATION.callsign, service_area: STATION.service_area },
        count: alerts.length,
        alerts,
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
    },
    READ_ONLY,
    async ({ posted_msg_id }) => {
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
  console.log(`[openeas] ${PROFILE_VERSION} listening on :${PORT}`);
  console.log(`[openeas] station ${STATION.callsign} — zones ${STATION.nws_zones.join(", ")}`);
  console.log(`[openeas] tier A provisioned; tiers B and C not provisioned`);
});
