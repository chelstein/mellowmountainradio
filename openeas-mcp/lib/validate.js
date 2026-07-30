// OpenEAS — deep validation mode.
//
// Off by default: tools return the normalized alert. With validate=true they
// additionally return a field-by-field audit, each check naming the rule or
// specification clause it derives from.
//
// The purpose is evidentiary. A proof of concept offered into a rulemaking record
// has to be inspectable — a reviewer at the Commission, at the SECC, or at a
// competing vendor should be able to take one alert, read every element, see
// which authority governs it, and check the verdict without trusting the
// implementation. Compact mode is for operating; this mode is for proving.
//
// Every check reports one of:
//   pass    — requirement satisfied
//   fail    — requirement violated
//   absent  — optional element not present (NOT a failure)
//   unknown — could not be determined (NOT a pass, and NOT a failure)
//
// The unknown/absent distinction is deliberate and matches SPEC §5.2: a check
// that could not run must never be reported as a check that succeeded.

import { parsePolygon, parseCircle, boundingBox } from "./geo.js";
import { describeEvent } from "./codes.js";

const PASS = "pass", FAIL = "fail", ABSENT = "absent", UNKNOWN = "unknown";

function check(id, result, authority, detail) {
  return { id, result, authority, detail };
}

/**
 * Build the audit for a normalized alert (the shape produced by
 * ipaws.parseCap or sources.normalizeCap).
 */
export function buildValidation(alert) {
  const checks = [];
  const cap = alert?.cap ?? {};
  const same = alert?.same ?? {};
  const area = alert?.area ?? {};

  // ── CAP 1.2 required elements ─────────────────────────────────────────────
  const required = [
    ["identifier", cap.identifier],
    ["sender",     cap.sender],
    ["sent",       cap.sent],
    ["status",     cap.status],
    ["msgType",    cap.msgType],
    ["scope",      cap.scope],
  ];
  for (const [name, v] of required) {
    checks.push(check(
      `cap.${name}`,
      v ? PASS : FAIL,
      "OASIS CAP v1.2 §3.2.1 (required element)",
      v ? `Present: ${String(v).slice(0, 120)}` : "Required by CAP 1.2 and absent."
    ));
  }

  // Identity must be the triple, not identifier alone.
  checks.push(check(
    "identity.extended",
    alert?.identity?.key ? PASS : UNKNOWN,
    "OASIS CAP v1.2 §3.2.1 — <references> keys on sender,identifier,sent",
    alert?.identity?.key
      ? `Extended identifier: ${alert.identity.key}`
      : "Could not construct the (sender, identifier, sent) triple. `identifier` " +
        "alone is not unique across senders and must not be used as a key."
  ));

  // sent must carry an offset — it encodes the originator's local zone.
  const offset = typeof cap.sent === "string" && /[+-]\d{2}:\d{2}$|Z$/.test(cap.sent);
  checks.push(check(
    "cap.sent.offset",
    cap.sent ? (offset ? PASS : FAIL) : ABSENT,
    "OASIS CAP v1.2 §3.3.2 — dateTime requires a timezone offset",
    cap.sent
      ? (offset
          ? `Offset preserved: ${cap.sent}`
          : `No offset on "${cap.sent}". The offset is semantically meaningful and must not be discarded.`)
      : "No sent value to check."
  ));

  // ── IPAWS Profile ─────────────────────────────────────────────────────────
  const codes = cap.codes ?? [];
  const profileOk = codes.some(c => String(c).trim() === "IPAWSv1.0");
  checks.push(check(
    "ipaws.profile_code",
    codes.length ? (profileOk ? PASS : FAIL) : ABSENT,
    "CAP v1.2 IPAWS Profile v1.0 §2 — requires <code>IPAWSv1.0</code>",
    codes.length
      ? (profileOk ? "IPAWSv1.0 present." : `No IPAWSv1.0 among: ${codes.join(", ")}`)
      : "No <code> elements. Expected on IPAWS-sourced alerts; absent on the NWS " +
        "GeoJSON representation, which does not expose them."
  ));

  checks.push(check(
    "ipaws.status_actual",
    cap.status ? (cap.status === "Actual" ? PASS : FAIL) : ABSENT,
    "IPAWS Profile — public dissemination requires status=Actual; ECIG §3.9 bars broadcast otherwise",
    cap.status
      ? (cap.status === "Actual"
          ? "status=Actual; eligible for public dissemination."
          : `status="${cap.status}". ECIG §3.9 provides that such a message must NOT be broadcast.`)
      : "No status value."
  ));

  // ── SAME layer ────────────────────────────────────────────────────────────
  const ev = same.event_code;
  const meta = ev ? describeEvent(ev) : null;
  checks.push(check(
    "same.event_code",
    ev ? (/^[A-Z]{3}$/.test(ev) ? PASS : FAIL) : FAIL,
    "47 CFR §11.31(e); IPAWS Profile requires exactly one eventCode[valueName=SAME]",
    ev
      ? (meta?.placeholder
          ? `"${ev}" is a National Weather Service PLACEHOLDER, not an EAS event code — ` +
            `it signals that no SAME code is assigned to this product. Not forwardable.`
          : meta?.known
            ? `${ev} = ${meta.name} (${meta.scope}, forward: ${meta.forward})`
            : `"${ev}" is structurally valid but absent from the §11.31(e) table for this ` +
              `table version. Passed through verbatim per OpenEAS §9.4.`)
      : "No SAME event code. Without it an ENDEC cannot act on the message."
  ));

  if (alert?.event_code_disagreement) {
    const d = alert.event_code_disagreement;
    checks.push(check(
      "same.event_code.disagreement",
      FAIL,
      "47 CFR §11.31(e) — EAS equipment acts on the SAME value",
      `The two eventCode values disagree: SAME=${d.same}, ` +
      `NationalWeatherService=${d.national_weather_service}` +
      (d.product_name ? `, product name "${d.product_name}"` : "") +
      `. EAS acts on SAME. Inferring the code from the product name would be wrong here.`
    ));
  }

  const geos = area.same_geocodes ?? [];
  const badGeo = geos.filter(g => !/^\d{6}$/.test(String(g)));
  checks.push(check(
    "same.geocodes",
    geos.length ? (badGeo.length ? FAIL : PASS) : FAIL,
    "47 CFR §11.31(f) — PSSCCC, ANSI INCITS 31-2009; max 31 per header",
    geos.length
      ? (badGeo.length
          ? `Malformed: ${badGeo.join(", ")}`
          : `${geos.length} code(s): ${geos.join(", ")}` +
            (geos.length > 31 ? " — EXCEEDS the 31-location SAME maximum." : ""))
      : "No SAME geocodes. ECIG §6.7 lists geocode among the minimum required set."
  ));

  checks.push(check(
    "same.originator",
    same.org ? (/^(EAS|CIV|WXR|PEP)$/.test(same.org) ? PASS : FAIL) : ABSENT,
    "47 CFR §11.31(d)(1) — EAS, CIV, WXR, PEP are the only legal values",
    same.org
      ? (/^(EAS|CIV|WXR|PEP)$/.test(same.org)
          ? `EAS-ORG = ${same.org}`
          : `"${same.org}" is not one of the four legal originator codes.`)
      : "No EAS-ORG parameter. ECIG §3.4 states it MUST be provided for EAS."
  ));

  // ── Signature ─────────────────────────────────────────────────────────────
  const sig = alert?.signature ?? {};
  checks.push(check(
    "signature",
    sig.present ? (sig.valid === true ? PASS : UNKNOWN) : ABSENT,
    "47 CFR §11.56(c); proposed §11.56(c) (FCC 26-38 ¶41–48) would REQUIRE a valid signature",
    sig.present
      ? (sig.valid === true
          ? `Verified. Signer ${sig.signer_cn ?? "unknown"}.`
          : `Present but NOT cryptographically verified by this implementation — ` +
            `valid=null means unknown, not invalid. Algorithm ${sig.algorithm ?? "?"}, ` +
            `signer ${sig.signer_cn ?? "?"}${sig.cog_id ? `, COG ${sig.cog_id}` : ""}. ` +
            `Verification belongs in the certified decoder.`)
      : "No XMLDSig envelope. Note the NWS GeoJSON representation strips signatures " +
        "that IPAWS-OPEN provides, so absence here may be a property of the source, " +
        "not of the alert."
  ));

  // ── Geometry ──────────────────────────────────────────────────────────────
  const polys = area.polygons ?? [], circles = area.circles ?? [];
  const parsedPolys = polys.map(p => (typeof p === "string" ? parsePolygon(p) : { valid: false }));
  const badPolys = parsedPolys.filter(p => !p.valid);
  checks.push(check(
    "area.geometry",
    (polys.length || circles.length)
      ? (badPolys.length ? FAIL : PASS)
      : ABSENT,
    "OASIS CAP v1.2 §3.3.4; proposed §11.55(d) (FCC 26-38 ¶70–75) would key relay off polygon/circle",
    (polys.length || circles.length)
      ? (badPolys.length
          ? `${badPolys.length} polygon(s) failed to parse: ${badPolys.map(p => p.error).join("; ")}`
          : `${polys.length} polygon(s), ${circles.length} circle(s). ` +
            `Precision below county level is available.`)
      : "No polygon or circle. IPAWS alerts are frequently geocode-only, so this " +
        "alert cannot be resolved below county level. Not a defect."
  ));

  // ── Multilingual ──────────────────────────────────────────────────────────
  const langs = alert?.languages;
  checks.push(check(
    "info.multilingual",
    Array.isArray(langs) ? (langs.length > 1 ? PASS : ABSENT) : UNKNOWN,
    "OASIS CAP v1.2 §3.2.2 — repeated <info> carries language variants; " +
    "89 FR 16504 (pending) would add 13-language templates",
    Array.isArray(langs)
      ? (langs.length > 1
          ? `${langs.length} language variants: ${langs.map(l => l.language).join(", ")}`
          : `Single variant (${langs[0]?.language ?? "unknown"}). Not a defect — most ` +
            `alerts are monolingual today.`)
      : "Language variants were not extracted from this source representation."
  ));

  // ── Channel eligibility ───────────────────────────────────────────────────
  const blocked = alert?.blocked_channels ?? [];
  checks.push(check(
    "eas.eligibility",
    blocked.includes("EAS") ? FAIL : PASS,
    "FEMA IPAWS BLOCKCHANNEL parameter (repeatable)",
    blocked.length
      ? (blocked.includes("EAS")
          ? `BLOCKCHANNEL includes EAS — this alert is SUPPRESSED from EAS and must ` +
            `not be presented as EAS-eligible. Blocked: ${blocked.join(", ")}`
          : `Blocked from ${blocked.join(", ")}, but not from EAS.`)
      : "No BLOCKCHANNEL restrictions."
  ));

  // ── Forwarding, derived ───────────────────────────────────────────────────
  const mf = alert?.mandatory_forward;
  if (mf) {
    checks.push(check(
      "forwarding.derived",
      mf.mandatory === null ? UNKNOWN : PASS,
      "47 CFR §11.51(m) mandatory set (EAN, NPT, RMT); §11.51(m)(1) makes the DECODER authoritative",
      `mandatory=${mf.mandatory} (DERIVED, advisory only). ${mf.basis ?? ""} ` +
      `Under §11.51(m)(1) the certified decoder performs the functions that ` +
      `determine which messages are transmitted; this value must never override it.`
    ));
  }

  const tally = { pass: 0, fail: 0, absent: 0, unknown: 0 };
  for (const c of checks) tally[c.result]++;

  return {
    summary: {
      ...tally,
      total: checks.length,
      verdict: tally.fail ? "deficiencies_found" : tally.unknown ? "indeterminate" : "clean",
    },
    ecig_disposition: alert?.disposition ?? {
      state: "unknown",
      reason: "Disposition is computed for IPAWS-sourced CAP only.",
    },
    checks,
    reading_guide: {
      pass: "Requirement satisfied.",
      fail: "Requirement violated, or two authorities disagree.",
      absent: "Optional element not present. NOT a failure.",
      unknown: "Could not be determined. NOT a pass and NOT a failure.",
    },
    caveat:
      "This audit describes the MESSAGE. It says nothing about what any station " +
      "aired. Alert existed, station was obligated, station aired it are three " +
      "separate facts from three separate sources (SPEC §4.5).",
  };
}
