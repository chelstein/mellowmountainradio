// OpenEAS — historical backfill from OpenFEMA.
//
// The live IPAWS feed has no memory (see poller.js). OpenFEMA's
// IpawsArchivedAlerts dataset does: unauthenticated, OData-style, and — the part
// that makes it usable rather than merely interesting — each record carries an
// `originalMessage` field holding the complete signed CAP XML as FEMA received
// it. So history can be parsed with exactly the same code path as live traffic,
// rather than a second, subtly different one.
//
//   https://www.fema.gov/api/open/v1/IpawsArchivedAlerts
//   https://www.fema.gov/openfema-data-page/ipaws-archived-alerts-v1
//
// Verified live: HTTP 200 with no credentials, records back to at least 2017,
// 18 fields per record including searchGeometry and cogId.
//
// Two cautions worth stating plainly, because both could mislead:
//
//  1. Update latency versus real time is not documented. Treat this as a
//     historical source, never as a substitute for polling. Backfill fills the
//     past; it does not cover the present.
//  2. This dataset is FEMA's record of what IPAWS distributed. It is not a
//     record of what any station aired. Alert existed, station was obligated,
//     station aired it remain three separate facts (SPEC §4.5).

import { parseCap } from "./ipaws.js";
import * as store from "./store.js";

const BASE = "https://www.fema.gov/api/open/v1/IpawsArchivedAlerts";
const UA = "OpenEAS/0.1.0 (+https://github.com/chelstein/mellowmountainradio)";

let job = null;   // { running, started_at, ... } — one backfill at a time

async function page({ top = 100, skip = 0, filter = null, orderby = "sent desc" }) {
  const p = new URLSearchParams();
  p.set("$top", String(Math.min(1000, top)));
  p.set("$skip", String(skip));
  if (orderby) p.set("$orderby", orderby);
  if (filter) p.set("$filter", filter);

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 45_000);
  try {
    const r = await fetch(`${BASE}?${p}`, {
      signal: ctl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`OpenFEMA HTTP ${r.status}`);
    const d = await r.json();
    return { records: d.IpawsArchivedAlerts ?? [], metadata: d.metadata ?? {} };
  } finally {
    clearTimeout(t);
  }
}

/** Build an OData $filter for a state's SAME codes and/or a date range. */
export function buildFilter({ start, end, state_fips } = {}) {
  const parts = [];
  if (start) parts.push(`sent ge '${start}'`);
  if (end)   parts.push(`sent le '${end}'`);
  // searchGeometry / geocode filtering is not reliably queryable server-side on
  // this dataset, so state narrowing happens client-side after parsing the CAP.
  // Doing it wrong server-side would silently drop records, which is worse than
  // transferring a few extra.
  return { filter: parts.length ? parts.join(" and ") : null, client_state_fips: state_fips ?? null };
}

/**
 * Run a backfill. Parses each record's originalMessage through the same CAP
 * parser used for live traffic and appends anything new to the archive.
 *
 * Deliberately sequential and paged. This is someone else's free public API and
 * a parallel fan-out over it would be rude at best.
 */
export async function backfill({ start, end, state_fips, max = 500, pageSize = 100 } = {}) {
  if (job?.running) return { rejected: "a backfill is already running", job: publicJob() };

  const { filter, client_state_fips } = buildFilter({ start, end, state_fips });
  job = {
    running: true,
    started_at: new Date().toISOString(),
    finished_at: null,
    params: { start: start ?? null, end: end ?? null, state_fips: state_fips ?? null, max },
    fetched: 0, parsed: 0, added: 0, skipped_existing: 0, unparseable: 0,
    filtered_out: 0, errors: [],
  };

  try {
    let skip = 0;
    while (job.fetched < max) {
      const want = Math.min(pageSize, max - job.fetched);
      const { records } = await page({ top: want, skip, filter });
      if (!records.length) break;

      for (const row of records) {
        job.fetched++;
        const xml = row.originalMessage;
        if (!xml) { job.unparseable++; continue; }

        let alert;
        try {
          alert = parseCap(String(xml), { openfema_id: row.id });
        } catch (err) {
          job.unparseable++;
          if (job.errors.length < 20) job.errors.push({ id: row.id, error: err.message });
          continue;
        }
        if (!alert?.valid) { job.unparseable++; continue; }
        job.parsed++;

        if (client_state_fips) {
          const hit = (alert.area?.same_geocodes ?? [])
            .some(g => String(g).slice(1, 3) === String(client_state_fips));
          if (!hit) { job.filtered_out++; continue; }
        }

        const rec = store.recordAlert(alert);
        if (rec) job.added++; else job.skipped_existing++;
      }

      skip += records.length;
      if (records.length < want) break;   // ran out of data
    }
  } catch (err) {
    job.errors.push({ fatal: err.message });
  } finally {
    job.running = false;
    job.finished_at = new Date().toISOString();
  }

  return publicJob();
}

function publicJob() {
  if (!job) return { never_run: true };
  return {
    ...job,
    note:
      "Backfill fills the PAST. It is not a substitute for polling: OpenFEMA's " +
      "update latency relative to real time is undocumented, and the live IPAWS " +
      "window is only about 30 minutes wide. Both are needed.",
    scope_caveat:
      "This is FEMA's record of what IPAWS distributed, not a record of what any " +
      "station aired.",
  };
}

export function status() { return publicJob(); }

/** Probe reachability without ingesting anything. */
export async function probe() {
  try {
    const { records, metadata } = await page({ top: 1 });
    const r = records[0];
    return {
      reachable: true,
      auth: "none required",
      sample: r ? {
        identifier: r.identifier, sender: r.sender, sent: r.sent,
        has_original_message: Boolean(r.originalMessage),
        field_count: Object.keys(r).length,
      } : null,
      metadata,
    };
  } catch (err) {
    return { reachable: false, error: err.message };
  }
}
