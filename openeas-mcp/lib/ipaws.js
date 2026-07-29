// OpenEAS — FEMA IPAWS-OPEN reader.
//
// FINDING (verified live 2026-07-29): the IPAWS-OPEN read feed requires NO
// credentials. FEMA removed EAS PIN validation in IPAWS-OPEN 4.02 (vendor
// webinar, 29 Nov 2023): "Due to a change in policy, an IPAWS-issued EAS PIN
// will no longer be required to access and retrieve IPAWS messages from the
// EAS-ATOM or any other IPAWS feed."
//
// A FEMA Memorandum of Agreement and COG registration remain REQUIRED to
// ORIGINATE alerts — which this software never does (SPEC §2.3) — and FEMA's
// published policy for the All-Hazards Information Feed still asks for an MOA
// where a consumer REDISTRIBUTES alerts onward. Redistribution is therefore a
// policy question for the operator, not a technical gate. See README.
//
// This module reads. It has no origination path and no audio capability.
//
// Feed semantics that shape the design:
//   * /rest/feed is a rolling ~30-minute ACTIVE window, not a log. A missed
//     poll is an alert lost forever from IPAWS. Persist locally.
//   * The {timestamp} argument on /recent/ is a "since" filter over the
//     already-truncated active set. It does NOT return history.
//   * Query-parameter filtering does not work — ?statefips=04 returns the
//     unfiltered national feed. Filter client-side.
//   * Historical backfill comes from OpenFEMA IpawsArchivedAlerts.

import { XMLParser } from "fast-xml-parser";

const BASE = "https://apps.fema.gov/IPAWSOPEN_EAS_SERVICE/rest";
const UA = "OpenEAS/0.1.0 (+https://github.com/chelstein/mellowmountainradio)";

export const SOURCE_IPAWS = {
  id: "ipaws-open",
  name: "FEMA IPAWS-OPEN EAS feed (apps.fema.gov)",
  tier: "A",
  auth: "none for read; FEMA MOA required to originate, and per FEMA policy to redistribute",
};

// Elements that are repeatable in CAP 1.2 and MUST be modeled as arrays even
// when a single instance appears. Collapsing these is the most common CAP
// modeling error: ECIG §3.3.1 requires each <parameter> occurrence be
// processed independently, and IPAWS uses repeated <info> for language variants.
const ALWAYS_ARRAY = new Set([
  "info", "parameter", "geocode", "eventCode", "area",
  "category", "responseType", "resource", "polygon", "circle", "code",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,          // <ds:Signature> -> Signature
  trimValues: true,
  parseTagValue: false,          // keep everything as strings; no numeric coercion
  isArray: (name) => ALWAYS_ARRAY.has(name),
});

async function getText(url, timeoutMs = 12_000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { Accept: "application/xml", "User-Agent": UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Read the Atom index of currently-active EAS-eligible alerts.
 * Returns lightweight entries; call fetchAlert() for full CAP.
 */
export async function fetchFeedIndex() {
  const xml = await getText(`${BASE}/feed`);
  const doc = parser.parse(xml);
  const raw = doc?.feed?.entry;
  const entries = raw ? (Array.isArray(raw) ? raw : [raw]) : [];

  return {
    updated: doc?.feed?.updated ?? null,
    entries: entries.map(e => {
      const cats = e.category ? (Array.isArray(e.category) ? e.category : [e.category]) : [];
      const byLabel = (label) => cats.find(c => c["@label"] === label)?.["@term"] ?? null;
      const href = e.link?.["@href"] ?? e.id ?? null;
      return {
        posted_msg_id: href ? String(href).split("/").pop() : null,
        url: href,
        event_code: e.title?.["#text"] ?? e.title ?? null,
        state_fips: byLabel("statefips"),
        updated: e.updated ?? null,
      };
    }),
  };
}

/** Fetch and parse one full signed CAP alert by POSTEDMSGID. */
export async function fetchAlert(postedMsgId) {
  const xml = await getText(`${BASE}/eas/${encodeURIComponent(postedMsgId)}`);
  return parseCap(xml, { posted_msg_id: postedMsgId });
}

/**
 * Parse a CAP 1.2 document into the OpenEAS Alert shape (SPEC §4.1).
 *
 * Three correctness requirements this satisfies, each of which is easy to get
 * wrong and each of which was confirmed against live IPAWS data:
 *
 *  1. IDENTITY is the triple (sender, identifier, sent) — CAP's own
 *     "extended identifier", which is what <references> uses. `identifier`
 *     alone is NOT unique across senders; observed forms range from
 *     "2637867444630562" to "AS-UT-c4e502b5-..." to "urn:oid:2.49.0.1.840...".
 *  2. PARAMETERS are a repeatable multimap, never a flat dict. A live IPAWS
 *     evacuation carried EAS-ORG and CMAMtext twice each, across English and
 *     Spanish <info> blocks.
 *  3. `sent` carries a UTC OFFSET that encodes the originator's local zone
 *     (observed "-06:00"). Preserve it; do not normalize to Z and discard.
 */
export function parseCap(xml, extra = {}) {
  const doc = parser.parse(xml);
  const a = doc?.alert;
  if (!a) return { valid: false, error: "No <alert> element found." };

  const infos = a.info ?? [];
  // IPAWS uses repeated <info> for language variants. Prefer English for the
  // primary rendering but retain every block.
  const primary = infos.find(i => !i.language || /^en/i.test(i.language)) ?? infos[0] ?? {};

  const parameters = collectPairs(infos.flatMap(i => i.parameter ?? []));
  const areas = (primary.area ?? []);
  const geocodes = collectPairs(areas.flatMap(ar => ar.geocode ?? []));

  const sameGeocodes = geocodes["SAME"] ?? [];
  const ugc = geocodes["UGC"] ?? [];

  // §11.31(e) SAME code. NWS emits TWO eventCodes — valueName "SAME" and
  // "NationalWeatherService" — and they CAN DISAGREE (observed SAME=FFS with
  // NationalWeatherService=FFW). The SAME one is what an ENDEC acts on.
  const eventCodes = collectPairs(infos.flatMap(i => i.eventCode ?? []));
  const sameEvent = (eventCodes["SAME"] ?? [])[0] ?? null;
  const nwsEvent  = (eventCodes["NationalWeatherService"] ?? [])[0] ?? null;

  const signature = detectSignature(a);

  return {
    valid: true,
    ...extra,

    // CAP extended identifier — the real primary key.
    identity: {
      sender:     a.sender ?? null,
      identifier: a.identifier ?? null,
      sent:       a.sent ?? null,
      key: [a.sender, a.identifier, a.sent].filter(Boolean).join(","),
      note: "CAP identity is the (sender, identifier, sent) triple. `identifier` " +
            "alone is not unique across senders.",
    },
    universal_id: null,   // Reserved — FCC 26-38 ¶50–55. SPEC §9.2.
    origin: "cap",

    cap: {
      identifier: a.identifier ?? null,
      sender:     a.sender ?? null,
      sent:       a.sent ?? null,      // offset preserved verbatim
      status:     a.status ?? null,
      msgType:    a.msgType ?? null,
      scope:      a.scope ?? null,
      codes:      a.code ?? [],
      references: a.references ? String(a.references).split(/\s+/).filter(Boolean) : [],
      event:        primary.event ?? null,
      category:     primary.category ?? [],
      responseType: primary.responseType ?? [],
      urgency:      primary.urgency ?? null,
      severity:     primary.severity ?? null,
      certainty:    primary.certainty ?? null,
      effective:    primary.effective ?? null,
      onset:        primary.onset ?? null,
      expires:      primary.expires ?? null,
      senderName:   primary.senderName ?? null,
      headline:     primary.headline ?? null,
      description:  primary.description ?? null,
      instruction:  primary.instruction ?? null,
      language:     primary.language ?? "en-US",
      languages:    infos.map(i => i.language ?? "en-US"),
    },

    same: {
      org: (parameters["EAS-ORG"] ?? [])[0] ?? null,
      event_code: sameEvent,
      locations: sameGeocodes,
      valid_period: null,   // Derived by the ENDEC from expires − effective.
      origination: null,
      station_id: null,
    },

    // Repeatable multimap. ECIG §3.3.1.
    parameters,
    parameter_note:
      "Parameters are a name -> list-of-values multimap. CAP permits repeated " +
      "valueNames and ECIG §3.3.1 requires each occurrence be processed " +
      "independently. A flat dictionary would silently discard data.",

    // BLOCKCHANNEL suppresses an alert from a named dissemination channel and is
    // repeatable — once per blocked channel, and again per <info> language block.
    // The raw multimap above keeps every occurrence; this convenience field is
    // the distinct set, which is what a caller deciding EAS eligibility wants.
    blocked_channels: [...new Set(parameters["BLOCKCHANNEL"] ?? [])],
    eas_eligible: !(parameters["BLOCKCHANNEL"] ?? []).includes("EAS"),

    event_code_disagreement: sameEvent && nwsEvent && sameEvent !== nwsEvent
      ? { same: sameEvent, national_weather_service: nwsEvent,
          note: "The two eventCode values disagree. The SAME value is what EAS " +
                "equipment acts on." }
      : null,

    area: {
      descriptions: areas.map(ar => ar.areaDesc).filter(Boolean),
      same_geocodes: sameGeocodes,
      fips: sameGeocodes.map(c => (String(c).length === 6 ? String(c).slice(1) : c)),
      ugc,
      polygons: areas.flatMap(ar => ar.polygon ?? []),
      circles:  areas.flatMap(ar => ar.circle ?? []),
    },

    signature,

    sources: [{ id: SOURCE_IPAWS.id, retrieved_at: new Date().toISOString() }],
  };
}

/** Collect [{valueName, value}] into { name: [values] }. Never collapses. */
function collectPairs(list) {
  const out = {};
  for (const p of list ?? []) {
    const k = p?.valueName;
    if (k == null) continue;
    (out[k] ??= []).push(p.value ?? null);
  }
  return out;
}

/**
 * Detect the XMLDSig envelope. IPAWS signs every alert (rsa-sha256, exclusive
 * c14n) with an IdenTrust device certificate whose CN is IPAWSOPEN<COGID>.
 *
 * IMPORTANT: presence is reported, NOT cryptographic validity. Verifying an
 * enveloped signature requires exclusive canonicalization of the pre-signature
 * document, which this module does not perform. SPEC §9.1 requires
 * {present, valid} be distinguishable precisely so that "unknown" is never
 * silently rendered as "invalid" — and because proposed §11.56(c) would flip
 * the rule to REQUIRE a valid signature rather than reject an invalid one.
 */
function detectSignature(alert) {
  const sig = alert?.Signature;
  if (!sig) {
    return { present: false, valid: null, algorithm: null, signer_cn: null,
             note: "No XMLDSig envelope found on this document." };
  }
  const algorithm = sig?.SignedInfo?.SignatureMethod?.["@Algorithm"] ?? null;
  const cert = sig?.KeyInfo?.X509Data?.X509SubjectName ?? null;
  const cn = typeof cert === "string" ? (cert.match(/CN=([^,]+)/)?.[1] ?? null) : null;
  const cogId = cn?.match(/IPAWSOPEN(\d+)/)?.[1] ?? null;

  return {
    present: true,
    valid: null,
    algorithm,
    signer_cn: cn,
    cog_id: cogId,
    note: "Signature PRESENCE detected. Cryptographic validity NOT verified by " +
          "this implementation — `valid: null` means unknown, not invalid. " +
          "47 CFR §11.56(c) requires EAS equipment to reject messages with an " +
          "invalid signature; that verification happens in the certified " +
          "decoder, not here.",
  };
}
