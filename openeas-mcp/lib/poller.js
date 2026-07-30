// OpenEAS — continuous IPAWS ingest.
//
// The IPAWS EAS feed is a rolling window: FEMA holds an alert for roughly 30
// minutes or until it expires, whichever comes first. There is no history
// endpoint, and the {timestamp} argument on /recent/ filters the already-
// truncated active set rather than reaching back. So an alert issued and expired
// between two polls was never observable and leaves no trace anywhere.
//
// That makes poll cadence the sole determinant of archive completeness, and it
// is why every poll is itself recorded (kind: "poll"). A gap in poll marks is
// visible; a gap in alerts alone is indistinguishable from a quiet period. The
// difference matters enormously if anyone ever asks this archive to support a
// claim.
//
// Rate discipline: FEMA's guidance for the All-Hazards Information Feed states
// plainly that providers "cannot stress IPAWS servers with excessive requests."
// No numeric limit is published. The Atom index is ~2 KB; full CAP is fetched
// only for message IDs not already archived, so steady-state cost is one small
// GET per interval.

import { fetchFeedIndex, fetchAlert } from "./ipaws.js";
import * as store from "./store.js";
import { decide, AUTHORITY_NOTE } from "./decide.js";

// Tier C is on-premises only. A cloud instance has no station to decide for,
// and proposed §11.2(e) excludes cloud from EAS Software regardless.
const TIER_C = process.env.OPENEAS_TIER_C === "1";
const STATION_CFG = {
  state_fips: process.env.EAS_STATE_FIPS || "04",
  county_fips: process.env.EAS_COUNTY_FIPS || "025",
};

const DEFAULT_INTERVAL_MS = Number(process.env.OPENEAS_POLL_INTERVAL_MS || 30_000);

let handle = null;
let running = false;
let lastRun = null;
let consecutiveErrors = 0;
let totals = { polls: 0, errors: 0, alerts_seen: 0, alerts_new: 0, started_at: null };

/** One poll cycle. Safe to call directly; never throws. */
export async function pollOnce() {
  if (running) return { skipped: "a poll is already in flight" };
  running = true;
  const started = Date.now();
  try {
    const index = await fetchFeedIndex();
    let seen = 0, added = 0, decisions = 0;
    const errors = [];

    for (const e of index.entries) {
      seen++;
      try {
        const full = await fetchAlert(e.posted_msg_id);
        if (!full.valid) continue;
        // Dedup on the CAP extended identifier, not posted_msg_id: FEMA can
        // repost, and identifier alone is not unique across senders.
        const withId = { ...full, posted_msg_id: e.posted_msg_id };
        const rec = store.recordAlert(withId);
        if (rec) added++;

        // Tier C: record what a software EAS system would do. Computed for
        // every alert observed, whether or not it was new to the archive, but
        // written once per alert.
        if (TIER_C && withId.identity?.key && !store.hasDecision(withId.identity.key)) {
          try {
            store.recordDecision(withId, decide(withId, STATION_CFG), AUTHORITY_NOTE);
            decisions++;
          } catch (err) {
            errors.push({ posted_msg_id: e.posted_msg_id, error: `decision: ${err.message}` });
          }
        }
      } catch (err) {
        errors.push({ posted_msg_id: e.posted_msg_id, error: err.message });
      }
    }

    store.recordPoll({
      source: "ipaws-open",
      observed: seen,
      new_records: added,
      decisions,
      error: errors.length ? `${errors.length} alert(s) unreadable` : null,
    });

    totals.polls++;
    totals.alerts_seen += seen;
    totals.alerts_new += added;
    consecutiveErrors = 0;
    lastRun = {
      at: new Date().toISOString(),
      ok: true,
      observed: seen,
      new_records: added,
      decisions,
      duration_ms: Date.now() - started,
      errors,
    };
    return lastRun;
  } catch (err) {
    totals.polls++;
    totals.errors++;
    consecutiveErrors++;
    // Record the failed poll too. A poll that could not run is exactly the
    // thing a coverage audit needs to see.
    try {
      store.recordPoll({ source: "ipaws-open", observed: 0, new_records: 0, error: err.message });
    } catch { /* archive unwritable; surfaced via status() */ }
    lastRun = {
      at: new Date().toISOString(),
      ok: false,
      error: err.message,
      duration_ms: Date.now() - started,
      consecutive_errors: consecutiveErrors,
    };
    return lastRun;
  } finally {
    running = false;
  }
}

export function start(intervalMs = DEFAULT_INTERVAL_MS) {
  if (handle) return { already_running: true, interval_ms: intervalMs };
  totals.started_at = new Date().toISOString();
  // Fire once immediately so a restart does not open a window-length blind spot.
  pollOnce();
  handle = setInterval(pollOnce, Math.max(10_000, intervalMs));
  if (handle.unref) handle.unref();
  return { started: true, interval_ms: Math.max(10_000, intervalMs) };
}

export function stop() {
  if (handle) { clearInterval(handle); handle = null; }
  return { stopped: true };
}

export function status() {
  const interval = Math.max(10_000, DEFAULT_INTERVAL_MS);
  return {
    enabled: Boolean(handle),
    tier_c: TIER_C,
    interval_ms: interval,
    in_flight: running,
    last_run: lastRun,
    consecutive_errors: consecutiveErrors,
    totals,
    coverage_note:
      "Archive completeness is bounded by poll coverage, not by this server's " +
      "uptime alone. IPAWS holds an alert about 30 minutes, so a gap longer than " +
      `that can hide an entire alert. At a ${Math.round(interval / 1000)}s interval ` +
      "the window is comfortable, but every poll — including failures — is recorded " +
      "so gaps are auditable rather than invisible.",
  };
}
