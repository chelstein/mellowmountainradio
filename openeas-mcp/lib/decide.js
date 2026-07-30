// OpenEAS — Tier C decision engine.
//
// For every alert reaching this station, compute what a software EAS system
// WOULD do, with the reasoning and the rule it derives from, and record it in
// the same hash-chained archive as the alerts themselves. One ledger, one
// verifier, one chain.
//
// ── Why this exists, and why it records rather than acts ────────────────────
//
// The goal is a station that needs no EAS box. The obstacle is not engineering:
// 47 CFR §11.34 requires encoders and decoders certified under Part 2 Subpart J,
// and no certification path exists for software today. FCC 26-38 proposes
// creating one. Digital Alert Systems opposed it, arguing no framework and no
// cybersecurity standard exists for EAS software.
//
// That argument loses to evidence, and evidence is what this produces. Every
// alert, a recorded decision. The certified ENDEC keeps working in parallel.
// Compare the two over months and you have something no filing has ever
// carried: a tamper-evident record of software decisions matching a certified
// device's decisions, alert for alert, across real national traffic.
//
// It accumulates only in real time. There is no way to backfill it later, which
// is the argument for switching it on today rather than when a rule changes.
//
// ── What this module cannot do ──────────────────────────────────────────────
//
// It computes and records. It has no connection to an air chain, no audio
// capability, and no tone generation — §11.45(a) reaches recordings and
// simulations, so that prohibition binds this file permanently. It is not a
// decoder and does not satisfy §11.52 monitoring. The certified decoder remains
// authoritative under §11.51(m)(1), and every record says so.

// §11.51(m): the only event codes carrying a transmission obligation.
const MANDATORY = new Set(["EAN", "NPT", "RMT"]);
// §11.51(n): the delay feature may never be applied to these.
const IMMEDIATE = new Set(["EAN", "NPT"]);

/** Does any SAME geocode on this alert reach the configured station? */
export function coversStation(geocodes, stateFips, countyFips) {
  for (const raw of geocodes ?? []) {
    const g = String(raw);
    // 000000 is all United States territory — how EAN and a nationwide NPT
    // reach every station. Must match regardless of state or county.
    if (g === "000000") return { covered: true, via: g, scope: "national" };
    if (g.length !== 6) continue;
    const ss = g.slice(1, 3), ccc = g.slice(3, 6);
    if (ss !== stateFips) continue;
    if (ccc === "000") return { covered: true, via: g, scope: "statewide" };
    if (ccc === countyFips) return { covered: true, via: g, scope: "county" };
  }
  return { covered: false, via: null, scope: null };
}

/**
 * The decision, in the order a real ENDEC would evaluate it.
 *
 * Order matters and is not arbitrary: channel suppression and message status
 * are dispositive before location is even considered, because an alert the
 * originator withheld from EAS never becomes forwardable no matter whose county
 * it names.
 */
export function decide(alert, station) {
  const same = alert?.same ?? {};
  const cap = alert?.cap ?? {};
  const area = alert?.area ?? {};
  const code = same.event_code ?? null;
  const geocodes = area.same_geocodes ?? [];

  // 1. Did the originator suppress this from EAS?
  const blocked = alert?.blocked_channels ?? [];
  if (blocked.includes("EAS")) {
    return {
      action: "no_action",
      mandatory: false,
      reason: "BLOCKCHANNEL includes EAS — the originator suppressed this alert " +
              "from the Emergency Alert System.",
      rule: "FEMA IPAWS BLOCKCHANNEL parameter (repeatable)",
    };
  }

  // 2. Is it for broadcast at all?
  if (cap.status && cap.status !== "Actual") {
    return {
      action: "no_action",
      mandatory: false,
      reason: `status="${cap.status}" is not "Actual"; ECIG §3.9 provides that such ` +
              `a message must not be broadcast.`,
      rule: "ECIG Implementation Guide §3.9, incorporated at 47 CFR §11.56(a)(2)",
    };
  }

  // 3. Is it processable? ECIG's minimum element set.
  const disp = alert?.disposition;
  if (disp && disp.state !== "Accepted") {
    return {
      action: "no_action",
      mandatory: false,
      reason: `ECIG disposition is ${disp.state}: ${disp.reason}`,
      rule: "ECIG Implementation Guide §6.4–6.7",
    };
  }

  // 4. Does it reach us?
  const cov = coversStation(geocodes, station.state_fips, station.county_fips);
  if (!cov.covered) {
    return {
      action: "no_action",
      mandatory: false,
      reason: `Location codes [${geocodes.join(", ")}] do not include this station's ` +
              `state (${station.state_fips}) or county (${station.county_fips}).`,
      rule: "47 CFR §11.51(m)",
    };
  }

  // 5. Mandatory forward?
  if (code && MANDATORY.has(code)) {
    const immediate = IMMEDIATE.has(code);
    return {
      action: "would_transmit",
      mandatory: true,
      immediate,
      max_delay_minutes: immediate ? 0 : 60,
      coverage: cov,
      reason: `Event ${code} with location code ${cov.via} (${cov.scope}) covering ` +
              `this station. ` +
              (immediate
                ? "Must be transmitted immediately; §11.51(n) forbids applying the delay feature."
                : "Must be transmitted within 60 minutes."),
      rule: "47 CFR §11.51(m)(2)" + (immediate ? ", §11.51(n)" : ""),
    };
  }

  // 6. Everything else is management's call, not software's.
  return {
    action: "would_defer_to_management",
    mandatory: false,
    coverage: cov,
    reason: `Event ${code ?? "(none)"} is a state or local code, marked optional by ` +
            `§11.31(e). Whether it interrupts programming is determined by station ` +
            `management, not by software.`,
    rule: "47 CFR §11.52(d)(4), §11.31(e)",
  };
}

/** The disclaimer that must travel with every decision record. */
export const AUTHORITY_NOTE =
  "DERIVED and ADVISORY. Under 47 CFR §11.51(m)(1) the certified decoder performs " +
  "the functions that determine which messages are transmitted. This record states " +
  "what a software system would have decided. It did not act, and it has no " +
  "connection to any air chain.";

/**
 * Summarise recorded decisions — the certification exhibit.
 *
 * Pair with the ENDEC's own log for the same period. Every would_transmit here
 * should correspond to an ENDEC forward, and every ENDEC forward to a decision
 * here. Divergence in either direction is the finding; sustained agreement is
 * the argument.
 */
export function summarise(records) {
  const decisions = records.filter(r => r.kind === "decision");
  const polls = records.filter(r => r.kind === "poll");

  const byAction = {}, byCode = {}, byRule = {};
  for (const r of decisions) {
    const d = r.payload?.decision ?? {};
    byAction[d.action] = (byAction[d.action] ?? 0) + 1;
    const c = r.payload?.alert?.event_code ?? "---";
    byCode[c] = (byCode[c] ?? 0) + 1;
    if (d.rule) byRule[d.rule] = (byRule[d.rule] ?? 0) + 1;
  }

  const failed = polls.filter(p => p.payload?.error).length;

  return {
    decisions: decisions.length,
    by_action: byAction,
    by_event_code: byCode,
    by_rule_applied: byRule,
    would_transmit: byAction.would_transmit ?? 0,
    polls: polls.length,
    failed_polls: failed,
    period: decisions.length
      ? { first: decisions[0].recorded_at, last: decisions[decisions.length - 1].recorded_at }
      : null,
    how_to_use:
      "Pair with the ENDEC log for the same period. Every would_transmit should " +
      "correspond to an ENDEC forward, and every ENDEC forward to a decision here. " +
      "Divergence in either direction is the finding. Sustained agreement across " +
      "real national traffic is the certification argument.",
    coverage_caveat:
      "Completeness is bounded by poll coverage, not uptime. Failed polls are counted " +
      "above; a gap wider than the ~30-minute IPAWS window can hide an entire alert, " +
      "and an alert never observed leaves no trace.",
    authority: AUTHORITY_NOTE,
  };
}
