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

    // ── Multilingual ────────────────────────────────────────────────────────
    // CAP uses repeated <info> for language variants, and the IPAWS Profile
    // requires every block in one alert describe the same incident with
    // identical category and eventCode. Rendering only the English block throws
    // away the rest: a live Utah evacuation carried full English and Spanish
    // copy with distinct CMAMtext for each.
    //
    // §11.31(e) has no per-language event codes, so translation lives entirely
    // in <info>. The FCC's pending multilingual proposal (89 FR 16504) would add
    // pre-scripted templates in the 13 most common non-English U.S. languages,
    // which would arrive as further variants here — so this shape is
    // forward-compatible with it.
    languages: infos.map(i => ({
      language: i.language ?? "en-US",
      event:       i.event ?? null,
      headline:    i.headline ?? null,
      description: i.description ?? null,
      instruction: i.instruction ?? null,
      senderName:  i.senderName ?? null,
      responseType: i.responseType ?? [],
      // WEA short/long text is per-language too.
      wea_short: firstParam(i.parameter, "CMAMtext"),
      wea_long:  firstParam(i.parameter, "CMAMlongtext"),
      resources: (i.resource ?? []).map(describeResource),
    })),
    language_count: infos.length,

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
    disposition: disposition(a, infos, areas, sameEvent, sameGeocodes),

    sources: [{ id: SOURCE_IPAWS.id, retrieved_at: new Date().toISOString() }],
  };
}

/**
 * ECIG §6.4–6.6 disposition. Adopted rather than invented, because §11.56(a)(2)
 * requires CAP-to-EAS conversion "following procedures set forth in the EAS-CAP
 * Industry Group's (ECIG) Implementation Guide" — making that guide operative
 * law, not advice.
 *
 *   Accepted  — validated and processable
 *   Ignored   — a required element is MISSING (carries a reason)
 *   Rejected  — a required element is PRESENT BUT INVALID
 *
 * ECIG §6.7 fixes the minimum set: alert, identifier, sender, sent, status,
 * msgType, scope, info, eventCode, area, geocode.
 *
 * This is what answers "why didn't this air?" in the vocabulary the equipment
 * itself uses. It describes processability only — Accepted does NOT mean aired.
 */
function disposition(a, infos, areas, sameEvent, sameGeocodes) {
  const missing = [];
  const invalid = [];

  if (!a.identifier) missing.push("identifier");
  if (!a.sender)     missing.push("sender");
  if (!a.sent)       missing.push("sent");
  if (!a.status)     missing.push("status");
  if (!a.msgType)    missing.push("msgType");
  if (!a.scope)      missing.push("scope");
  if (!infos.length) missing.push("info");
  if (!sameEvent)    missing.push("eventCode[valueName=SAME]");
  if (!areas.length) missing.push("area");
  if (!sameGeocodes.length) missing.push("area/geocode[valueName=SAME]");

  const STATUS  = ["Actual", "Exercise", "System", "Test", "Draft"];
  const MSGTYPE = ["Alert", "Update", "Cancel", "Ack", "Error"];
  const SCOPE   = ["Public", "Restricted", "Private"];

  if (a.status  && !STATUS.includes(a.status))   invalid.push(`status="${a.status}"`);
  if (a.msgType && !MSGTYPE.includes(a.msgType)) invalid.push(`msgType="${a.msgType}"`);
  if (a.scope   && !SCOPE.includes(a.scope))     invalid.push(`scope="${a.scope}"`);
  if (a.sent && Number.isNaN(Date.parse(a.sent))) invalid.push(`sent="${a.sent}" is not parseable`);
  if (sameEvent && !/^[A-Z]{3}$/.test(sameEvent)) invalid.push(`SAME eventCode="${sameEvent}"`);
  for (const g of sameGeocodes) {
    if (!/^\d{6}$/.test(String(g))) invalid.push(`SAME geocode="${g}" is not six digits`);
  }
  // IPAWS Profile requires a <code> of IPAWSv1.0 on profile-conformant messages.
  const codes = a.code ?? [];
  const profileOk = codes.some(c => String(c).trim() === "IPAWSv1.0");

  // Per ECIG §3.9 a Test-status message must not be broadcast. That is a
  // broadcast decision, not a parse failure, so it is surfaced separately.
  const notForBroadcast = a.status && a.status !== "Actual";

  let state = "Accepted";
  if (invalid.length) state = "Rejected";
  else if (missing.length) state = "Ignored";

  return {
    state,
    missing,
    invalid,
    ipaws_profile_code_present: profileOk,
    not_for_broadcast: Boolean(notForBroadcast),
    reason:
      state === "Rejected"
        ? `Required element(s) present but invalid: ${invalid.join(", ")}.`
        : state === "Ignored"
          ? `Required element(s) missing: ${missing.join(", ")}.`
          : notForBroadcast
            ? `Processable, but status="${a.status}" is not "Actual"; ECIG §3.9 provides ` +
              `that such a message must not be broadcast.`
            : "All ECIG §6.7 required elements present and valid.",
    basis: "ECIG Recommendations for a CAP EAS Implementation Guide v1.0 §6.4–6.7, " +
           "incorporated by reference at 47 CFR §11.56(a)(2).",
    caveat: "Describes processability only. 'Accepted' does NOT mean the alert aired.",
  };
}

/** First value of a named parameter within a single <info> block, or null. */
function firstParam(params, name) {
  for (const p of params ?? []) {
    if (p?.valueName === name) return p.value ?? null;
  }
  return null;
}

// MIME types that carry audio. A CAP <resource> is where pre-recorded alert
// audio lives, and that audio contains real Attention Signals and SAME bursts.
const AUDIO_MIME = /^audio\/|^application\/(ogg|x-mpegurl)|\.(wav|mp3|aac|m4a|ogg|opus|flac)$/i;

/**
 * Describe a CAP <resource> without ever fetching it.
 *
 * Metadata only, deliberately. Two reasons, and the second is the serious one:
 *
 *  1. derefUri can carry a base64 payload inline, so echoing a resource
 *     wholesale can balloon a response by megabytes.
 *  2. Audio resources contain genuine EAS Attention Signals and SAME headers.
 *     Re-transmitting those outside a real alert is what drew a $1,000,000 civil
 *     penalty against iHeartCommunications in 2015, when a syndicated programme
 *     aired tones from a recording and cascaded false activations across 70+
 *     affiliates. This server therefore surfaces the URI and refuses to proxy,
 *     inline, or play it. A consumer that wants the audio must fetch it itself
 *     and own that decision.
 */
function describeResource(r) {
  const mime = r?.mimeType ?? null;
  const isAudio = mime ? AUDIO_MIME.test(mime) : false;
  return {
    description: r?.resourceDesc ?? null,
    mime_type: mime,
    size_bytes: r?.size ? Number(r.size) : null,
    uri: r?.uri ?? null,
    digest: r?.digest ?? null,
    has_inline_payload: Boolean(r?.derefUri),
    is_audio: isAudio,
    // Never the payload itself.
    payload_withheld: Boolean(r?.derefUri) || isAudio,
    withheld_reason: isAudio
      ? "Audio resource. This server does not proxy, inline, or play EAS alert " +
        "audio — it contains real Attention Signals and SAME bursts, and " +
        "re-transmitting those outside an actual alert violates 47 CFR §11.45(a). " +
        "The URI is provided; fetching it is the consumer's decision."
      : r?.derefUri
        ? "Inline derefUri payload withheld to bound response size. Use the URI."
        : null,
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
