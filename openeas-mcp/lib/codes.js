// OpenEAS — versioned code tables.
//
// SPEC §9.4: code tables MUST be versioned data, MUST be exposed with their
// version, and unknown codes MUST pass through verbatim rather than be rejected.
// Event codes change: MEP was added effective 2025-09-08 by FCC 24-83, and
// §11.31(d)(2) was reserved in January 2026 (GN Docket 25-133).
//
// This table is a convenience for rendering, never an authority. Verify against
// the current text of 47 CFR §11.31 before relying on it.

export const TABLE_VERSION = "2026-07-01";
export const TABLE_SOURCE  = "47 CFR §11.31, eCFR snapshot 2026-07-01";

// §11.31(d) — Originator codes.
export const ORIGINATORS = {
  EAS: "EAS Participant (broadcast station or cable system)",
  CIV: "Civil authorities",
  WXR: "National Weather Service",
  PEP: "Primary Entry Point System",
};

// §11.31(e) — Event codes.
//
// `forward` values:
//   "mandatory"  — §11.51(m) requires transmission when the location codes
//                  include the Participant's state or state/county.
//   "originated" — the Participant originates this itself; it is not relayed.
//   "optional"   — §11.31(e) marks the state and local list optional; the
//                  Participant's MANAGEMENT determines handling (§11.52(d)(4)).
export const EVENTS = {
  // National
  EAN: { name: "National Emergency Message",   scope: "national", forward: "mandatory",  immediate: true },
  NPT: { name: "National Periodic Test",        scope: "national", forward: "mandatory",  immediate: true },
  RMT: { name: "Required Monthly Test",         scope: "national", forward: "mandatory",  immediate: false, maxDelayMinutes: 60 },
  RWT: { name: "Required Weekly Test",          scope: "national", forward: "originated", immediate: false },
  NIC: { name: "National Information Center",   scope: "national", forward: "optional",   immediate: false },
  NMN: { name: "Network Message Notification",  scope: "national", forward: "optional",   immediate: false },

  // ── Placeholders the National Weather Service emits that are NOT §11.31(e)
  // event codes. Documented here so callers get a meaningful answer instead of
  // "unrecognized", but flagged so nothing treats them as forwardable events.
  //
  // Both were observed live on api.weather.gov for Yavapai/Coconino County.
  OTH: { name: "Other (no assigned SAME code)", scope: "local", forward: "not_an_event_code",
         placeholder: true,
         note: "Not enumerated in 47 CFR §11.31(e). The National Weather Service " +
               "emits this for products with no assigned SAME event code — observed " +
               "on an Extreme Fire Danger product. Informational only." },
  NWS: { name: "NWS product with no assigned SAME code", scope: "local",
         forward: "not_an_event_code", placeholder: true,
         note: "Not an EAS event code. The National Weather Service uses it in the " +
               "CAP eventCode SAME slot as a placeholder meaning 'no SAME code is " +
               "assigned to this product' — observed live on Extreme Heat Warnings, " +
               "which carry eventCode {SAME: NWS, NationalWeatherService: XHW}. " +
               "Never forwardable as an EAS event." },

  // State and local — §11.31(e) marks all of these OPTIONAL.
  ADR: { name: "Administrative Message",              scope: "local", forward: "optional" },
  AVA: { name: "Avalanche Watch",                     scope: "local", forward: "optional" },
  AVW: { name: "Avalanche Warning",                   scope: "local", forward: "optional" },
  BLU: { name: "Blue Alert",                          scope: "local", forward: "optional" },
  BZW: { name: "Blizzard Warning",                    scope: "local", forward: "optional" },
  CAE: { name: "Child Abduction Emergency",           scope: "local", forward: "optional" },
  CDW: { name: "Civil Danger Warning",                scope: "local", forward: "optional" },
  CEM: { name: "Civil Emergency Message",             scope: "local", forward: "optional" },
  CFA: { name: "Coastal Flood Watch",                 scope: "local", forward: "optional" },
  CFW: { name: "Coastal Flood Warning",               scope: "local", forward: "optional" },
  DMO: { name: "Practice / Demo Warning",             scope: "local", forward: "optional" },
  DSW: { name: "Dust Storm Warning",                  scope: "local", forward: "optional" },
  EQW: { name: "Earthquake Warning",                  scope: "local", forward: "optional" },
  EVI: { name: "Evacuation Immediate",                scope: "local", forward: "optional" },
  EWW: { name: "Extreme Wind Warning",                scope: "local", forward: "optional" },
  FFA: { name: "Flash Flood Watch",                   scope: "local", forward: "optional" },
  FFS: { name: "Flash Flood Statement",               scope: "local", forward: "optional" },
  FFW: { name: "Flash Flood Warning",                 scope: "local", forward: "optional" },
  FLA: { name: "Flood Watch",                         scope: "local", forward: "optional" },
  FLS: { name: "Flood Statement",                     scope: "local", forward: "optional" },
  FLW: { name: "Flood Warning",                       scope: "local", forward: "optional" },
  FRW: { name: "Fire Warning",                        scope: "local", forward: "optional" },
  HLS: { name: "Hurricane Statement",                 scope: "local", forward: "optional" },
  HMW: { name: "Hazardous Materials Warning",         scope: "local", forward: "optional" },
  HUA: { name: "Hurricane Watch",                     scope: "local", forward: "optional" },
  HUW: { name: "Hurricane Warning",                   scope: "local", forward: "optional" },
  HWA: { name: "High Wind Watch",                     scope: "local", forward: "optional" },
  HWW: { name: "High Wind Warning",                   scope: "local", forward: "optional" },
  LAE: { name: "Local Area Emergency",                scope: "local", forward: "optional" },
  LEW: { name: "Law Enforcement Warning",             scope: "local", forward: "optional" },
  MEP: { name: "Missing and Endangered Persons",      scope: "local", forward: "optional",
         note: "Added effective 2025-09-08 by FCC 24-83 (Ashanti Alert Act)." },
  NUW: { name: "Nuclear Power Plant Warning",         scope: "local", forward: "optional" },
  RHW: { name: "Radiological Hazard Warning",         scope: "local", forward: "optional" },
  SMW: { name: "Special Marine Warning",              scope: "local", forward: "optional" },
  SPS: { name: "Special Weather Statement",           scope: "local", forward: "optional" },
  SPW: { name: "Shelter in Place Warning",            scope: "local", forward: "optional" },
  SSA: { name: "Storm Surge Watch",                   scope: "local", forward: "optional" },
  SSW: { name: "Storm Surge Warning",                 scope: "local", forward: "optional" },
  SVA: { name: "Severe Thunderstorm Watch",           scope: "local", forward: "optional" },
  SVR: { name: "Severe Thunderstorm Warning",         scope: "local", forward: "optional" },
  SVS: { name: "Severe Weather Statement",            scope: "local", forward: "optional" },
  TOA: { name: "Tornado Watch",                       scope: "local", forward: "optional" },
  TOE: { name: "911 Telephone Outage Emergency",      scope: "local", forward: "optional" },
  TOR: { name: "Tornado Warning",                     scope: "local", forward: "optional" },
  TRA: { name: "Tropical Storm Watch",                scope: "local", forward: "optional" },
  TRW: { name: "Tropical Storm Warning",              scope: "local", forward: "optional" },
  TSA: { name: "Tsunami Watch",                       scope: "local", forward: "optional" },
  TSW: { name: "Tsunami Warning",                     scope: "local", forward: "optional" },
  VOW: { name: "Volcano Warning",                     scope: "local", forward: "optional" },
  WSA: { name: "Winter Storm Watch",                  scope: "local", forward: "optional" },
  WSW: { name: "Winter Storm Warning",                scope: "local", forward: "optional" },
};

// NWS event names → SAME event code.
//
// Used ONLY as a last-resort fallback when a CAP payload omits an explicit
// SAME eventCode. Never authoritative, and deliberately conservative: an
// exact name match against the §11.31(e) table and nothing more.
//
// Guessing here is actively harmful. Two traps that cost real accuracy:
//
//   * A Red Flag Warning is NOT FRW. NWS fire-weather products historically
//     map to OTH or SPS. FRW on IPAWS generally originates from a civil
//     authority (EAS-ORG = CIV), not from the Weather Service. Mapping
//     "red flag warning" -> FRW would mislabel a routine fire-weather
//     product as a Fire Warning.
//   * Lesser blowing-dust products map to SPS, not DSW. Only a true Dust
//     Storm Warning is DSW.
//
// When no code can be established, return null and let the alert carry a null
// event_code. An honest null beats a confident wrong answer.
export const NAME_TO_CODE = Object.fromEntries(
  Object.entries(EVENTS).map(([code, meta]) => [meta.name.toLowerCase(), code])
);

/** Look up an event code. Unknown codes pass through per SPEC §9.4. */
export function describeEvent(code) {
  const known = EVENTS[code];
  if (known) return { code, known: true, ...known };
  return {
    code,
    known: false,
    name: null,
    scope: null,
    forward: "unknown",
    note: "Code is not in this table version. Passed through verbatim per OpenEAS §9.4. " +
          "Verify against the current text of 47 CFR §11.31.",
  };
}

/** Look up an originator code. Unknown codes pass through. */
export function describeOriginator(code) {
  const name = ORIGINATORS[code];
  return name
    ? { code, known: true, name }
    : { code, known: false, name: null,
        note: "Not in this table version. Passed through verbatim." };
}
