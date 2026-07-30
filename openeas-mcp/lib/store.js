// OpenEAS — append-only, hash-chained alert archive.
//
// Implements SPEC §7. This is the component that turns a live viewer into a
// record, and it is the one place where getting the integrity properties wrong
// would quietly destroy the value of everything else.
//
// ── Why append-only is not a preference ─────────────────────────────────────
//
// 47 CFR §73.1800(d): "No automatically kept log shall be altered in any way
// after entries have been recorded." §73.1800(e) forbids erasure or destruction
// during the retention period. So there is no update path and no delete path in
// this module — not disabled, absent. Corrections are new records that point at
// the record they correct (§73.1840(b)(3)(ii) requires identifying where a
// correction was made, and when, and by whom).
//
// ── Why there is no retention timer ─────────────────────────────────────────
//
// §73.1840(a) sets two years, but exempts logs "involving communications
// incident to a disaster" until the Commission authorises destruction in
// writing. EAS activation records are, by definition, incident to disasters.
// Automatic expiry would therefore be the wrong default and is not implemented.
// `legal_hold` marks records under investigation or complaint.
//
// ── Why the chain matters for this project specifically ─────────────────────
//
// The premise of OpenEAS is that EAS compliance records are self-reports nobody
// can check. An archive that is itself an unverifiable self-report reproduces
// the problem. Hash chaining means a third party — the Commission, an SECC, a
// vendor across the table — can detect any retroactive edit without trusting the
// operator, using nothing but the file and a SHA-256 implementation.
//
// Storage is newline-delimited JSON, one file per UTC month. Plain text on
// purpose: readable with `cat`, greppable, and verifiable with a shell one-liner
// if this software disappears. §73.1840(b) permits "other data-storage systems"
// subject to being reproducible on request, which a text format satisfies about
// as well as anything can.

import { createHash } from "crypto";
import {
  existsSync, mkdirSync, appendFileSync, readFileSync, readdirSync, statSync,
} from "fs";
import { join } from "path";

const ROOT = process.env.OPENEAS_ARCHIVE_DIR || "/var/lib/openeas/archive";

let mem = null;      // { records: [], byKey: Map, tip: {seq, hash}, months: Set }
let loadError = null;

function ensureDir() {
  if (!existsSync(ROOT)) mkdirSync(ROOT, { recursive: true, mode: 0o755 });
}

function monthFile(iso) {
  return join(ROOT, `${String(iso).slice(0, 7)}.jsonl`);
}

/**
 * Canonical serialization for hashing. Key order is fixed explicitly rather
 * than relying on JSON.stringify's insertion order, so a hash computed today
 * and a hash recomputed by a third party years from now agree.
 */
function canonical(rec) {
  return JSON.stringify([
    rec.seq,
    rec.recorded_at,
    rec.prev_hash,
    rec.kind,
    rec.key,
    stableStringify(rec.payload),
    rec.legal_hold ? 1 : 0,
    rec.corrects_seq ?? null,
    rec.operator ?? null,
  ]);
}

/** Deterministic JSON: object keys sorted at every depth. */
function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

export function hashRecord(rec) {
  return createHash("sha256").update(canonical(rec)).digest("hex");
}

const GENESIS = "0".repeat(64);

function load() {
  if (mem) return mem;
  ensureDir();
  const records = [];
  const byKey = new Map();
  const months = new Set();
  try {
    const files = readdirSync(ROOT).filter(f => /^\d{4}-\d{2}\.jsonl$/.test(f)).sort();
    for (const f of files) {
      months.add(f.replace(".jsonl", ""));
      const text = readFileSync(join(ROOT, f), "utf8");
      for (const line of text.split("\n")) {
        const s = line.trim();
        if (!s) continue;
        let r; try { r = JSON.parse(s); } catch { continue; }
        records.push(r);
        if (r.key && !byKey.has(r.key)) byKey.set(r.key, r);
      }
    }
    loadError = null;
  } catch (err) {
    loadError = err.message;
  }
  records.sort((a, b) => a.seq - b.seq);
  const tip = records.length
    ? { seq: records[records.length - 1].seq, hash: records[records.length - 1].hash }
    : { seq: 0, hash: GENESIS };
  mem = { records, byKey, tip, months };
  return mem;
}

/**
 * Append one record. Returns the stored record.
 *
 * There is deliberately no `update` or `delete` counterpart. If you find
 * yourself wanting one, you want `appendCorrection` instead.
 */
export function append({ kind, key, payload, legal_hold = false, corrects_seq = null, operator = null }) {
  const m = load();
  const rec = {
    seq: m.tip.seq + 1,
    recorded_at: new Date().toISOString(),
    prev_hash: m.tip.hash,
    kind,
    key: key ?? null,
    payload,
    legal_hold: Boolean(legal_hold),
    corrects_seq,
    operator,
  };
  rec.hash = hashRecord(rec);

  ensureDir();
  appendFileSync(monthFile(rec.recorded_at), JSON.stringify(rec) + "\n", { mode: 0o644 });

  m.records.push(rec);
  if (rec.key && !m.byKey.has(rec.key)) m.byKey.set(rec.key, rec);
  m.tip = { seq: rec.seq, hash: rec.hash };
  m.months.add(rec.recorded_at.slice(0, 7));
  return rec;
}

/**
 * Record a correction to an earlier entry. §73.1800(c) requires corrections
 * identify what was wrong and who corrected it; §73.1840(b)(3)(ii) requires
 * they identify where, when, and by whom. The original stays exactly as
 * recorded — that is the point.
 */
export function appendCorrection({ corrects_seq, reason, operator, payload = {} }) {
  if (!Number.isInteger(corrects_seq)) throw new Error("corrects_seq must be an integer");
  if (!operator?.identity) throw new Error("a correction requires an operator identity (§73.1800(c))");
  return append({
    kind: "correction",
    key: null,
    corrects_seq,
    operator,
    payload: { reason, ...payload },
  });
}

/** Has this CAP alert already been archived? Keyed on the extended identifier. */
export function has(key) {
  return load().byKey.has(key);
}

/** Archive an alert if new. Returns the record, or null if already present. */
export function recordAlert(alert) {
  const key = alert?.identity?.key;
  if (!key) return null;
  const m = load();
  if (m.byKey.has(key)) return null;
  return append({
    kind: "alert",
    key,
    // Alerts about disasters are exactly what §73.1840(a) exempts from the
    // two-year window, so they are held by default rather than by exception.
    legal_hold: true,
    payload: alert,
  });
}

/**
 * Verify the hash chain end to end.
 *
 * This is the function that makes the archive checkable by someone who does not
 * trust us. It recomputes every hash and every link, and reports the first
 * break rather than a bare boolean, so a discrepancy can be investigated
 * instead of merely noted.
 */
export function verify() {
  const m = load();
  const problems = [];
  let prev = GENESIS;
  let expectedSeq = 1;

  for (const r of m.records) {
    if (r.seq !== expectedSeq) {
      problems.push({
        seq: r.seq, kind: "sequence_gap",
        detail: `Expected seq ${expectedSeq}, found ${r.seq}. Records are missing or reordered.`,
      });
      expectedSeq = r.seq;
    }
    if (r.prev_hash !== prev) {
      problems.push({
        seq: r.seq, kind: "broken_link",
        detail: `prev_hash does not match the preceding record's hash. Expected ` +
                `${prev.slice(0, 16)}…, found ${String(r.prev_hash).slice(0, 16)}…. ` +
                `A record before this one was altered or removed.`,
      });
    }
    const recomputed = hashRecord(r);
    if (recomputed !== r.hash) {
      problems.push({
        seq: r.seq, kind: "content_altered",
        detail: `Stored hash ${String(r.hash).slice(0, 16)}… does not match the hash ` +
                `recomputed from this record's contents (${recomputed.slice(0, 16)}…). ` +
                `This record was edited after it was written.`,
      });
    }
    prev = r.hash;
    expectedSeq++;
  }

  return {
    verified: problems.length === 0 && !loadError,
    record_count: m.records.length,
    tip: m.tip,
    problems,
    load_error: loadError,
    method:
      "Each record's hash is SHA-256 over a canonical serialization that includes " +
      "the previous record's hash. Altering any record, removing one, or reordering " +
      "them breaks every link after the change. Verification requires only the files " +
      "and a SHA-256 implementation — not this software, and not our word.",
    caveat:
      "A hash chain proves internal consistency. It does NOT prove the archive is " +
      "complete: an alert never ingested leaves no trace. Completeness depends on " +
      "poll coverage, reported separately by eas_get_archive_stats.",
  };
}

/** Search archived alerts. */
export function search({ query, event_code, state_fips, same_code, start, end, limit = 50 } = {}) {
  const m = load();
  const q = query ? String(query).toLowerCase() : null;
  const out = [];

  // Newest first — the common case is "what happened recently".
  for (let i = m.records.length - 1; i >= 0 && out.length < limit; i--) {
    const r = m.records[i];
    if (r.kind !== "alert") continue;
    const a = r.payload;

    if (event_code && a?.same?.event_code !== String(event_code).toUpperCase()) continue;
    if (same_code && !(a?.area?.same_geocodes ?? []).includes(String(same_code))) continue;
    if (state_fips) {
      const hit = (a?.area?.same_geocodes ?? []).some(g => String(g).slice(1, 3) === String(state_fips));
      if (!hit) continue;
    }
    const sent = a?.cap?.sent || r.recorded_at;
    if (start && sent < start) continue;
    if (end && sent > end) continue;
    if (q) {
      const hay = [
        a?.cap?.event, a?.cap?.headline, a?.cap?.description, a?.cap?.instruction,
        a?.cap?.senderName, (a?.area?.descriptions ?? []).join(" "),
        (a?.area?.place_names ?? []).join(" "),
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) continue;
    }
    out.push({ seq: r.seq, recorded_at: r.recorded_at, hash: r.hash, alert: a });
  }
  return { count: out.length, results: out, truncated: out.length >= limit };
}

/** Archive statistics, including the honest coverage caveat. */
export function stats() {
  const m = load();
  const alerts = m.records.filter(r => r.kind === "alert");
  const byCode = {};
  const byState = {};
  let earliest = null, latest = null;

  for (const r of alerts) {
    const a = r.payload;
    const code = a?.same?.event_code;
    if (code) byCode[code] = (byCode[code] || 0) + 1;
    for (const g of a?.area?.same_geocodes ?? []) {
      const ss = String(g).slice(1, 3);
      byState[ss] = (byState[ss] || 0) + 1;
    }
    const sent = a?.cap?.sent;
    if (sent) {
      if (!earliest || sent < earliest) earliest = sent;
      if (!latest || sent > latest) latest = sent;
    }
  }

  return {
    directory: ROOT,
    months: [...m.months].sort(),
    total_records: m.records.length,
    alerts: alerts.length,
    corrections: m.records.filter(r => r.kind === "correction").length,
    poll_marks: m.records.filter(r => r.kind === "poll").length,
    tip: m.tip,
    earliest_alert_sent: earliest,
    latest_alert_sent: latest,
    by_event_code: byCode,
    by_state_fips: byState,
    retention:
      "No automatic expiry. §73.1840(a) sets two years but exempts records incident " +
      "to a disaster until the Commission authorises destruction in writing, and EAS " +
      "activations are by definition incident to disasters.",
    completeness_caveat:
      "This archive contains what was observed. IPAWS holds an alert roughly 30 " +
      "minutes, so anything issued and expired while the poller was down was never " +
      "seen and leaves no trace here. Absence from this archive is NOT evidence that " +
      "an alert did not exist.",
  };
}

/** Record that a poll happened, so coverage gaps are visible rather than invisible. */
export function recordPoll({ source, observed, new_records, error = null }) {
  return append({
    kind: "poll",
    key: null,
    payload: { source, observed, new_records, error },
  });
}

/** Reload from disk — used after an external backfill writes files directly. */
export function reset() { mem = null; loadError = null; }

export function archiveDir() { return ROOT; }
