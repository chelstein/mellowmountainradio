// OpenEAS — playout system as-run log reader. Tier C, on-premises only.
//
// PURPOSE
//
// Half of a parity report is what a software EAS system decided. The other half
// is what actually went to air. Every broadcast automation system on earth keeps
// that second half: an as-run log, a play log, a history table. This module
// reads it — from any of them.
//
// ── Why this is vendor-neutral by construction ──────────────────────────────
//
// There is no standard for as-run logs. There are roughly forty playout systems
// in serious use worldwide, and no two agree on delimiter, column order, time
// format, or where the file lives. A parser written against one vendor is a
// parser that works at one station.
//
// So the design inverts the usual approach. The DETECTOR is the engine and the
// vendor adapters are hints that narrow it, never assumptions that replace it:
//
//   * Adapters propose candidate log directories. Probing a candidate is
//     self-verifying — the directory either exists or it does not, so a wrong
//     guess costs nothing and makes no claim.
//   * Adapters contribute header-name synonyms and EAS marker patterns. They do
//     NOT hard-code column indices unless the layout is both documented and
//     verified against a real log, and each adapter says which it is.
//   * Anything the adapters miss falls through to generic delimited-text
//     detection, which works on any system that can export CSV or TSV. That is
//     all of them.
//
// The consequence worth stating plainly: a station running automation nobody
// here has ever heard of can point PLAYOUT_LOG_DIR at its as-run export and
// this works on day one. Vendor adapters only save that station the config.
//
// ── Why detection reports itself ────────────────────────────────────────────
//
// A parser that silently mis-maps a column produces a parity report that looks
// authoritative and is wrong. This file is upstream of evidence, so every
// return value carries how the format was determined and how confident that
// determination is. Low confidence is reported, never hidden. If detection
// cannot proceed it says so and stops rather than guessing.

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, basename } from "path";
import { homedir, platform } from "os";

// ── Configuration ───────────────────────────────────────────────────────────
//
// PLAYOUT_SYSTEM   adapter id, or "auto" (default), or "generic"
// PLAYOUT_LOG_DIR  explicit directory; skips path probing entirely
// PLAYOUT_COLUMNS  explicit mapping, e.g. "time,title,artist,-,duration"
//                  ("-" skips a column). Overrides all detection.
// PLAYOUT_API_URL  base URL for HTTP-native systems (AzuraCast, LibreTime)
// PLAYOUT_API_KEY  credential for the above, when the endpoint requires one
//
// MEGASEG_LOG_DIR / MEGASEG_COLUMNS remain honored as aliases so the first
// station running this does not need a config change.

const ENV_DIR = process.env.PLAYOUT_LOG_DIR || process.env.MEGASEG_LOG_DIR || null;
const ENV_SYSTEM = (process.env.PLAYOUT_SYSTEM || "auto").trim().toLowerCase();
const ENV_COLUMNS = (process.env.PLAYOUT_COLUMNS || process.env.MEGASEG_COLUMNS || "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const API_URL = process.env.PLAYOUT_API_URL || null;
const API_KEY = process.env.PLAYOUT_API_KEY || null;

const HOME = homedir();
const PLAT = platform();               // "darwin" | "win32" | "linux"

// ── Header vocabulary ───────────────────────────────────────────────────────
//
// Shared across every adapter. Vendors add synonyms rather than replacing this,
// because most of them converge on the same handful of English words and the
// overlap is what makes generic detection work at all.

const BASE_HEADERS = {
  time:     [/^(time|start|start ?time|played|air ?time|aired|timestamp|hour|when|played ?at|actual)$/i],
  date:     [/^(date|air ?date|day|log ?date)$/i],
  title:    [/^(title|song|track|name|item|description|desc|content|spot)$/i],
  artist:   [/^(artist|performer|by|composer|author)$/i],
  duration: [/^(dur|duration|length|len|runtime|seg ?time|actual ?length)$/i],
  category: [/^(cat|category|type|class|kind|event ?type|group)$/i],
  id:       [/^(id|unique ?id|uid|cart|cart ?no|cart ?number|external ?id|media ?id|cut)$/i],
  status:   [/^(status|result|state|disposition|outcome)$/i],
};

// ── EAS marker patterns ─────────────────────────────────────────────────────
//
// Deliberately broad, and matched against the RAW line rather than parsed
// columns, because an EAS insertion frequently does not sit in the same columns
// as a music track — automation systems log break content, macros and hardware
// events through different code paths than songs.
//
// The asymmetry is intentional. A false positive costs a glance. A false
// negative means a parity report silently claims the station did nothing.

const BASE_EAS_HINTS = [
  /\bEAS\b/i, /\bEOM\b/i, /\bZCZC\b/i, /\bNNNN\b/, /\bSAME\b/i,
  /\bE?AN\b(?=[^A-Za-z]|$)/, /\bRWT\b/i, /\bRMT\b/i, /\bNPT\b/i, /\bDMO\b/i,
  /\bemergency alert\b/i, /\battention signal\b/i,
  /\bweekly test\b/i, /\bmonthly test\b/i, /\brequired (weekly|monthly) test\b/i,
  /\bendec\b/i, /\bdasdec\b/i, /\bsage\b/i, /\bdigital alert systems\b/i,
  /\bgorman[- ]?redlich\b/i, /\btrilithic\b/i, /\bviavi\b/i,
];

// ── Adapter registry ────────────────────────────────────────────────────────
//
// `paths`      candidate directories, probed in order. Self-verifying.
// `files`      filename patterns that identify this system's logs.
// `headers`    vendor-specific header synonyms merged over BASE_HEADERS.
// `eas`        vendor-specific EAS markers merged over BASE_EAS_HINTS.
// `layout`     fixed column mapping. ONLY when documented AND verified.
// `evidence`   how the above was established. This is the honesty field and
//              every adapter must carry it.
// `kind`       "file" or "http".

export const ADAPTERS = [
  {
    id: "megaseg",
    name: "MegaSeg",
    vendor: "Fantastic Technologies",
    platforms: ["darwin"],
    kind: "file",
    paths: [join(HOME, "Music", "MegaSeg", "Logs"),
            join(HOME, "Music", "MegaSeg", "Logs", "Archived Logs")],
    files: [/\.txt$/i, /\.tsv$/i, /\.csv$/i],
    headers: {},
    eas: [/\bbreak track\b/i, /\binsert\b/i],
    evidence:
      "Log location documented in the MegaSeg User's Guide ('View Logs and Recently " +
      "Played'): one text log per day under ~/Music/MegaSeg/Logs, archived to " +
      "'Archived Logs' after six months, exportable as CSV or TSV. The guide does " +
      "not publish the line format, so columns are detected, not assumed.",
  },
  {
    id: "rivendell",
    name: "Rivendell",
    vendor: "Paravel Systems (open source)",
    platforms: ["linux"],
    kind: "file",
    paths: ["/var/snd/reports", "/var/log/rivendell",
            join(HOME, "rivendell", "reports")],
    files: [/\.txt$/i, /\.csv$/i, /\.log$/i],
    headers: { id: [/^(cart|cut)$/i] },
    eas: [/\bmacro\b/i, /\bRML\b/],
    evidence:
      "Rivendell's authoritative as-run record is the ELR_ table set in its " +
      "MariaDB instance; RDLogManager writes text and CSV reports to a " +
      "site-configured directory. This server does not open databases, so it " +
      "reads the report files. Directory candidates are conventional, not " +
      "documented defaults — set PLAYOUT_LOG_DIR if reports live elsewhere.",
  },
  {
    id: "azuracast",
    name: "AzuraCast",
    vendor: "AzuraCast (open source)",
    platforms: ["linux", "darwin", "win32"],
    kind: "http",
    // /api/nowplaying/{id} is public and embeds song_history. /api/station/
    // {id}/history is richer and needs an API key. Both are documented.
    endpoints: {
      public:  "/api/nowplaying/{station}",
      history: "/api/station/{station}/history",
    },
    evidence:
      "AzuraCast documents a public /api/nowplaying/{id} endpoint carrying " +
      "song_history, and an authenticated /api/station/{id}/history endpoint. " +
      "Song history is held in AzuraCast's database rather than a flat log, so " +
      "this adapter reads the API. Set PLAYOUT_API_URL, and PLAYOUT_API_KEY for " +
      "the authenticated endpoint.",
  },
  {
    id: "libretime",
    name: "LibreTime",
    vendor: "LibreTime (open source, Airtime fork)",
    platforms: ["linux"],
    kind: "http",
    endpoints: { public: "/api/live-info-v2" },
    fallback_paths: ["/var/log/libretime", "/var/log/airtime"],
    evidence:
      "LibreTime exposes /api/live-info-v2 with recent and upcoming items and " +
      "keeps playout logs under /var/log/libretime. Playout history lives in " +
      "PostgreSQL; this adapter reads the API and, failing that, the log files.",
  },
  {
    id: "stationplaylist",
    name: "StationPlaylist Studio",
    vendor: "StationPlaylist",
    platforms: ["win32"],
    kind: "file",
    paths: ["C:\\Program Files (x86)\\StationPlaylist\\Logs",
            "C:\\StationPlaylist\\Logs",
            join(HOME, "Documents", "StationPlaylist", "Logs")],
    files: [/\.log$/i, /\.txt$/i, /\.csv$/i],
    headers: {},
    eas: [],
    evidence:
      "Log directory is user-configurable in Studio's options and these " +
      "candidates are conventional install locations, NOT documented defaults. " +
      "They are probed because probing is free and self-verifying. Set " +
      "PLAYOUT_LOG_DIR to be certain.",
  },
  {
    id: "radiodj",
    name: "RadioDJ",
    vendor: "RadioDJ",
    platforms: ["win32"],
    kind: "file",
    paths: [join(HOME, "Documents", "RadioDJ", "Logs"),
            "C:\\RadioDJ\\Logs"],
    files: [/\.log$/i, /\.txt$/i, /\.csv$/i],
    headers: {},
    eas: [],
    evidence:
      "RadioDJ's play history is a MySQL `history` table; it also writes text " +
      "logs to a configurable directory. Candidates are conventional, not " +
      "documented. Database reading is out of scope for this server.",
  },
  {
    id: "mairlist",
    name: "mAirList",
    vendor: "mAirList",
    platforms: ["win32", "linux"],
    kind: "file",
    paths: [join(HOME, "Documents", "mAirList", "Logs"),
            "C:\\ProgramData\\mAirList\\Logs"],
    files: [/\.log$/i, /\.txt$/i, /\.csv$/i],
    headers: {},
    eas: [],
    evidence:
      "mAirList logs to file or database depending on configuration. Candidates " +
      "are conventional, not documented defaults.",
  },
  {
    id: "sam",
    name: "SAM Broadcaster",
    vendor: "Spacial Audio",
    platforms: ["win32"],
    kind: "file",
    paths: [join(HOME, "Documents", "SAM Broadcaster", "Logs")],
    files: [/\.log$/i, /\.txt$/i, /\.csv$/i],
    headers: {},
    eas: [],
    evidence:
      "SAM keeps play history in its `historylist` database table and can export " +
      "reports to file. This adapter reads exports only.",
  },
  {
    id: "liquidsoap",
    name: "Liquidsoap",
    vendor: "Savonet (open source)",
    platforms: ["linux", "darwin"],
    kind: "file",
    paths: ["/var/log/liquidsoap", join(HOME, ".liquidsoap", "log")],
    files: [/\.log$/i],
    headers: {},
    eas: [],
    evidence:
      "Liquidsoap writes a free-form text log whose content depends entirely on " +
      "the station's script. Structured column detection will usually fail here " +
      "and the reader will say so rather than inventing columns.",
  },
  {
    // Every proprietary as-run exporter — Zetta, WideOrbit, NexGen, Simian,
    // Myriad, ENCO, OpX, Wide Orbit Traffic, Marketron reconciliation files —
    // reaches this adapter. They all export delimited text, which is the only
    // thing the detector needs.
    id: "generic",
    name: "Generic delimited as-run log",
    vendor: "any",
    platforms: ["darwin", "win32", "linux"],
    kind: "file",
    paths: [],
    files: [/\.(txt|log|csv|tsv|asc|dat)$/i],
    headers: {},
    eas: [],
    evidence:
      "No vendor assumptions. Delimiter, header row and column roles are all " +
      "detected from the file. Any automation system that can export a CSV or " +
      "TSV as-run log is readable through this adapter, including systems this " +
      "registry has never heard of.",
  },
];

export function listAdapters() {
  return ADAPTERS.map(a => ({
    id: a.id, name: a.name, vendor: a.vendor, kind: a.kind,
    platforms: a.platforms,
    path_candidates: a.paths ?? [],
    endpoints: a.endpoints ?? undefined,
    evidence: a.evidence,
    applies_to_this_host: a.platforms.includes(PLAT),
  }));
}

function adapterById(id) {
  return ADAPTERS.find(a => a.id === id) || null;
}

// ── Resolution ──────────────────────────────────────────────────────────────

function dirExists(p) {
  try { return existsSync(p) && statSync(p).isDirectory(); } catch { return false; }
}

/**
 * Work out which system this host runs and where its logs are.
 *
 * Explicit configuration always wins. Probing only ever confirms; it never
 * asserts a system is present on the strength of a guess.
 */
export function resolve() {
  const probed = [];

  // 1. Explicit directory. Adapter is then a hint for markers only.
  if (ENV_DIR) {
    const forced = ENV_SYSTEM !== "auto" ? adapterById(ENV_SYSTEM) : null;
    return {
      ok: dirExists(ENV_DIR),
      adapter: forced || adapterById("generic"),
      log_dir: ENV_DIR,
      source: "PLAYOUT_LOG_DIR",
      confidence: "explicit",
      probed,
      error: dirExists(ENV_DIR) ? undefined
        : `PLAYOUT_LOG_DIR is set to ${ENV_DIR} but that directory does not exist.`,
    };
  }

  // 2. Explicitly named system, path probed from its candidates.
  if (ENV_SYSTEM !== "auto" && ENV_SYSTEM !== "generic") {
    const a = adapterById(ENV_SYSTEM);
    if (!a) {
      return {
        ok: false, adapter: null, log_dir: null, source: "PLAYOUT_SYSTEM",
        error: `Unknown playout system "${ENV_SYSTEM}". Known ids: ` +
               ADAPTERS.map(x => x.id).join(", ") +
               `. Any other system works via PLAYOUT_LOG_DIR with the generic adapter.`,
        probed,
      };
    }
    if (a.kind === "http") {
      return {
        ok: Boolean(API_URL), adapter: a, log_dir: null, api_url: API_URL,
        source: "PLAYOUT_SYSTEM", confidence: "explicit", probed,
        error: API_URL ? undefined : `${a.name} is an HTTP-native system; set PLAYOUT_API_URL.`,
      };
    }
    for (const p of a.paths) { probed.push({ path: p, exists: dirExists(p) }); }
    const hit = probed.find(p => p.exists);
    return {
      ok: Boolean(hit), adapter: a, log_dir: hit?.path ?? null,
      source: "PLAYOUT_SYSTEM + path probe",
      confidence: hit ? "high" : "none", probed,
      error: hit ? undefined
        : `${a.name} selected but none of its candidate log directories exist on ` +
          `this host. Set PLAYOUT_LOG_DIR. Candidate paths for this adapter are ` +
          `conventional rather than guaranteed — see its evidence field.`,
    };
  }

  // 3. Auto. Probe every file adapter that applies to this platform.
  for (const a of ADAPTERS) {
    if (a.kind !== "file" || !a.platforms.includes(PLAT) || a.id === "generic") continue;
    for (const p of a.paths) {
      const exists = dirExists(p);
      probed.push({ adapter: a.id, path: p, exists });
      if (exists) {
        return {
          ok: true, adapter: a, log_dir: p, source: "auto-probe",
          confidence: "high (directory exists)", probed,
        };
      }
    }
  }

  if (API_URL) {
    const a = adapterById("azuracast");
    return { ok: true, adapter: a, log_dir: null, api_url: API_URL,
             source: "PLAYOUT_API_URL", confidence: "explicit", probed };
  }

  return {
    ok: false, adapter: null, log_dir: null, source: "auto-probe",
    confidence: "none", probed,
    error:
      "No playout system detected on this host. This is expected on a cloud " +
      "instance — Tier C requires the server to run on the studio machine where " +
      "the automation and its logs live. On a studio machine, set PLAYOUT_LOG_DIR " +
      "to the as-run log directory (any delimited format works) or PLAYOUT_SYSTEM " +
      "to one of: " + ADAPTERS.map(x => x.id).join(", ") + ".",
  };
}

export function available() { return resolve().ok; }

export function status() {
  const r = resolve();
  const base = {
    available: r.ok,
    system: r.adapter ? { id: r.adapter.id, name: r.adapter.name, kind: r.adapter.kind } : null,
    log_dir: r.log_dir,
    api_url: r.api_url ?? null,
    detection_source: r.source,
    confidence: r.confidence ?? null,
    paths_probed: r.probed,
    host_platform: PLAT,
    adapters_known: ADAPTERS.length,
  };
  if (!r.ok) return { ...base, detail: r.error };
  if (r.adapter?.kind === "http") {
    return { ...base, note: r.adapter.evidence };
  }
  const files = listLogs(r);
  return {
    ...base,
    log_count: files.length,
    newest: files[0]?.name ?? null,
    oldest: files[files.length - 1]?.name ?? null,
    evidence: r.adapter.evidence,
  };
}

/** As-run log files, newest first. */
export function listLogs(res = resolve()) {
  if (!res.ok || !res.log_dir) return [];
  const pats = res.adapter?.files ?? [/\.(txt|log|csv|tsv)$/i];
  try {
    return readdirSync(res.log_dir)
      .filter(f => !f.startsWith(".") && pats.some(re => re.test(f)))
      .map(f => {
        const p = join(res.log_dir, f);
        const st = statSync(p);
        return { name: f, path: p, size: st.size, modified: st.mtime.toISOString() };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));
  } catch { return []; }
}

// ── Format detection ────────────────────────────────────────────────────────

const DELIMS = { "\t": "tab", ",": "comma", "|": "pipe", ";": "semicolon" };

function headerTable(adapter) {
  const t = {};
  for (const [field, res] of Object.entries(BASE_HEADERS)) t[field] = [...res];
  for (const [field, res] of Object.entries(adapter?.headers ?? {})) {
    t[field] = [...(t[field] ?? []), ...res];
  }
  return t;
}

/**
 * Determine how a log is structured.
 *
 * Returns delimiter, header presence, column mapping and a confidence. When no
 * header row is present the mapping is inferred from the shape of the data and
 * the return says so in `caveat`, because an inferred mapping upstream of
 * evidence needs to be checked by a human once.
 */
export function detectFormat(text, adapter = null) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { ok: false, error: "empty log" };

  const sample = lines.slice(0, 50);
  const counts = { "\t": 0, ",": 0, "|": 0, ";": 0 };
  for (const l of sample) for (const d of Object.keys(counts)) {
    counts[d] += l.split(d).length - 1;
  }
  const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const perLine = counts[delimiter] / sample.length;

  if (perLine < 1) {
    return {
      ok: false,
      error:
        "No consistent delimiter found — this log is free-form text rather than " +
        "columnar. Some systems (notably Liquidsoap, and any script-driven " +
        "playout) log this way. Export a delimited as-run log from the automation " +
        "and point PLAYOUT_LOG_DIR at it, or set PLAYOUT_COLUMNS if the layout is " +
        "fixed-width and known.",
      sample_lines: sample.slice(0, 3),
      free_form: true,
    };
  }

  const table = headerTable(adapter);
  const first = lines[0].split(delimiter).map(s => s.trim().replace(/^["']|["']$/g, ""));
  const mapping = {};
  let headerHits = 0;
  first.forEach((cell, i) => {
    for (const [field, res] of Object.entries(table)) {
      if (mapping[field] !== undefined) continue;
      if (res.some(re => re.test(cell))) { mapping[field] = i; headerHits++; break; }
    }
  });
  const hasHeader = headerHits >= 2;

  // Explicit mapping wins outright.
  if (ENV_COLUMNS.length) {
    const m = {};
    ENV_COLUMNS.forEach((f, i) => { if (f && f !== "-") m[f] = i; });
    return {
      ok: true, delimiter, delimiter_name: DELIMS[delimiter],
      has_header: hasHeader, columns: m,
      column_count: first.length,
      source: "PLAYOUT_COLUMNS override",
      confidence: "explicit",
      sample_lines: lines.slice(0, 3),
    };
  }

  if (!hasHeader) {
    // Infer from shape: a time-like token, a date-like token, then the widest
    // non-numeric fields as title and artist.
    const row = lines[0].split(delimiter).map(s => s.trim());
    const timeIdx = row.findIndex(c => /^\d{1,2}:\d{2}(:\d{2})?/.test(c));
    if (timeIdx >= 0) mapping.time = timeIdx;
    const dateIdx = row.findIndex((c, i) =>
      i !== timeIdx && /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(c));
    if (dateIdx >= 0) mapping.date = dateIdx;
    const wide = row
      .map((c, i) => ({ i, len: c.length, numeric: /^[\d.:\-/]+$/.test(c) }))
      .filter(x => !x.numeric && x.i !== timeIdx && x.i !== dateIdx)
      .sort((a, b) => b.len - a.len);
    if (wide[0]) mapping.title = wide[0].i;
    if (wide[1]) mapping.artist = wide[1].i;
  }

  const known = Object.keys(mapping).length;
  return {
    ok: known > 0,
    delimiter,
    delimiter_name: DELIMS[delimiter],
    has_header: hasHeader,
    columns: mapping,
    column_count: first.length,
    adapter: adapter?.id ?? "generic",
    confidence: hasHeader
      ? "high (header row matched)"
      : known >= 2
        ? "low (inferred from data shape — verify before relying on it)"
        : "none",
    caveat: hasHeader ? undefined
      : "No header row was found, so column roles were inferred from the shape of " +
        "the data. Verify against a known log before this feeds a parity report, " +
        "and set PLAYOUT_COLUMNS to correct it.",
    error: known > 0 ? undefined
      : "A delimiter was found but no column could be identified as a time, title " +
        "or artist. Set PLAYOUT_COLUMNS to map this format explicitly.",
    sample_lines: lines.slice(0, 3),
  };
}

// ── Time normalisation ──────────────────────────────────────────────────────
//
// As-run logs almost always record a local time of day and put the date in the
// filename. Parity matching needs a real instant, so the two are combined —
// and where they cannot be, the entry says so instead of carrying a fabricated
// timestamp.

const FILENAME_DATES = [
  { re: /(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/, order: [1, 2, 3] },   // 2026-07-30
  { re: /(\d{2})[-_](\d{2})[-_](20\d{2})/,   order: [3, 1, 2] },   // 07-30-2026
  { re: /(\d{2})[-_](\d{2})[-_](\d{2})(?!\d)/, order: [3, 1, 2], twoDigitYear: true },
];

function dateFromFilename(name) {
  for (const { re, order, twoDigitYear } of FILENAME_DATES) {
    const m = name.match(re);
    if (!m) continue;
    let y = Number(m[order[0]]);
    if (twoDigitYear) y += 2000;
    const mo = Number(m[order[1]]), d = Number(m[order[2]]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return { y, mo, d, source: "filename" };
  }
  return null;
}

function dateFromMtime(path) {
  try {
    const t = statSync(path).mtime;
    return { y: t.getFullYear(), mo: t.getMonth() + 1, d: t.getDate(), source: "file mtime" };
  } catch { return null; }
}

/**
 * Combine a log's date with a row's time of day.
 *
 * Constructed in LOCAL time deliberately: an as-run log records the wall clock
 * of the machine that wrote it, and Tier C runs on that machine. If this server
 * is ever run in a different zone than the automation, this is the assumption
 * that breaks, which is why it is reported rather than buried.
 */
function toInstant(dayCtx, timeStr, dateCell) {
  if (!timeStr) return null;
  const tm = String(timeStr).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!tm) return null;
  let hh = Number(tm[1]);
  const mm = Number(tm[2]), ss = Number(tm[3] || 0);
  const ampm = (tm[4] || "").toLowerCase().replace(/\./g, "");
  if (ampm === "pm" && hh < 12) hh += 12;
  if (ampm === "am" && hh === 12) hh = 0;

  let ctx = dayCtx;
  if (dateCell) {
    const dm = String(dateCell).match(/(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})/);
    if (dm) {
      const a = Number(dm[1]), b = Number(dm[2]), c = Number(dm[3]);
      ctx = a > 31 ? { y: a, mo: b, d: c, source: "date column" }
                   : { y: c < 100 ? c + 2000 : c, mo: a, d: b, source: "date column" };
    }
  }
  if (!ctx) return null;
  const dt = new Date(ctx.y, ctx.mo - 1, ctx.d, hh, mm, ss);
  return Number.isNaN(dt.getTime()) ? null : { iso: dt.toISOString(), date_source: ctx.source };
}

// ── Reading ─────────────────────────────────────────────────────────────────

/** Parse one as-run log file, reporting the detected format alongside. */
export function readLog(path, res = resolve()) {
  const adapter = res.adapter ?? null;
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) { return { path, error: `unreadable: ${e.message}`, entries: [] }; }

  const fmt = detectFormat(text, adapter);
  if (!fmt.ok) return { path, format: fmt, entries: [], error: fmt.error };

  const dayCtx = dateFromFilename(basename(path)) || dateFromMtime(path);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const rows = fmt.has_header ? lines.slice(1) : lines;
  const c = fmt.columns;
  const cell = (f, i) => (c[i] !== undefined ? (f[c[i]] ?? null) : null);

  let unresolvedTimes = 0;
  const entries = rows.map((line, i) => {
    const f = line.split(fmt.delimiter).map(s => s.trim().replace(/^["']|["']$/g, ""));
    const time = cell(f, "time");
    const inst = toInstant(dayCtx, time, cell(f, "date"));
    if (!inst) unresolvedTimes++;
    return {
      line: i + (fmt.has_header ? 2 : 1),
      at: inst?.iso ?? null,
      at_source: inst?.date_source ?? null,
      time,
      title:    cell(f, "title"),
      artist:   cell(f, "artist"),
      duration: cell(f, "duration"),
      category: cell(f, "category"),
      id:       cell(f, "id"),
      status:   cell(f, "status"),
      raw: line,
    };
  });

  return {
    path,
    file: basename(path),
    system: adapter ? { id: adapter.id, name: adapter.name } : null,
    format: fmt,
    log_date: dayCtx ? `${dayCtx.y}-${String(dayCtx.mo).padStart(2, "0")}-` +
                       `${String(dayCtx.d).padStart(2, "0")} (from ${dayCtx.source})` : null,
    count: entries.length,
    unresolved_timestamps: unresolvedTimes,
    timezone_assumption:
      "Row times are interpreted in this host's local timezone, because an as-run " +
      "log records the wall clock of the machine that wrote it. Valid when the " +
      "server runs on the automation machine, which is what Tier C requires.",
    entries,
  };
}

/** Read the most recent N log files as one merged, time-ordered list. */
export function readRecent({ days = 1, max_files = 7 } = {}) {
  const res = resolve();
  if (!res.ok) return { ok: false, error: res.error, status: status() };
  if (res.adapter?.kind === "http") {
    return { ok: false, error: `${res.adapter.name} is HTTP-native; use fetchHistory().` };
  }
  const files = listLogs(res).slice(0, Math.min(max_files, Math.max(1, days)));
  const logs = files.map(f => readLog(f.path, res));
  const entries = logs.flatMap(l => (l.entries ?? []).map(e => ({ ...e, file: l.file })));
  entries.sort((a, b) => String(a.at ?? "").localeCompare(String(b.at ?? "")));
  return {
    ok: true,
    system: res.adapter ? { id: res.adapter.id, name: res.adapter.name } : null,
    files_read: logs.map(l => ({
      file: l.file, count: l.count ?? 0, error: l.error ?? null,
      confidence: l.format?.confidence ?? null,
    })),
    count: entries.length,
    entries,
  };
}

/**
 * Read play history from an HTTP-native system.
 *
 * AzuraCast and LibreTime keep history in a database rather than a flat file,
 * so the API is the log. Nothing here writes; both endpoints are reads.
 */
export async function fetchHistory({ station = "1", limit = 200 } = {}) {
  const res = resolve();
  const a = res.adapter;
  if (!a || a.kind !== "http") {
    return { ok: false, error: "Configured playout system is not HTTP-native." };
  }
  if (!API_URL) return { ok: false, error: "PLAYOUT_API_URL is not set." };

  const base = API_URL.replace(/\/+$/, "");
  const authed = Boolean(API_KEY) && a.endpoints.history;
  const path = (authed ? a.endpoints.history : a.endpoints.public)
    .replace("{station}", encodeURIComponent(station));
  const url = `${base}${path}`;

  const headers = { Accept: "application/json" };
  if (authed) headers["X-API-Key"] = API_KEY;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12_000);
  try {
    const r = await fetch(url, { headers, signal: ctl.signal });
    if (!r.ok) return { ok: false, url, error: `HTTP ${r.status} ${r.statusText}` };
    const body = await r.json();
    const rows = Array.isArray(body) ? body
      : Array.isArray(body?.song_history) ? body.song_history
      : Array.isArray(body?.rows) ? body.rows
      : [];
    const entries = rows.slice(0, limit).map((row, i) => {
      const song = row.song ?? row.media ?? {};
      const ts = row.played_at ?? row.timestamp ?? row.playedAt ?? null;
      return {
        line: i + 1,
        at: ts ? new Date(Number(ts) * (String(ts).length <= 10 ? 1000 : 1)).toISOString() : null,
        at_source: "API",
        title: song.title ?? row.title ?? null,
        artist: song.artist ?? row.artist ?? null,
        duration: row.duration ?? null,
        raw: JSON.stringify(row),
      };
    });
    return {
      ok: true, url, endpoint: authed ? "authenticated history" : "public now-playing",
      system: { id: a.id, name: a.name },
      count: entries.length, entries,
      caveat: authed ? undefined
        : "The public now-playing endpoint returns only a short recent history " +
          "(typically the last few items). Set PLAYOUT_API_KEY to reach the full " +
          "history endpoint.",
    };
  } catch (e) {
    return { ok: false, url, error: e.name === "AbortError" ? "timeout after 12s" : e.message };
  } finally { clearTimeout(timer); }
}

// ── EAS detection in the as-run log ─────────────────────────────────────────

export function easPatterns(adapter = null) {
  return [...BASE_EAS_HINTS, ...(adapter?.eas ?? [])];
}

export function findEasEntries(entries, adapter = null) {
  const pats = easPatterns(adapter);
  return entries
    .map(e => {
      const hit = pats.find(re => re.test(e.raw ?? ""));
      return hit ? { ...e, matched: String(hit) } : null;
    })
    .filter(Boolean);
}

// ── Parity ──────────────────────────────────────────────────────────────────

const MIN = 60_000;

/**
 * Parity: what the software decided against what actually aired.
 *
 * The operating model this implements is the user's, not an autopilot: the
 * certified hardware does its job, the software does its job independently, and
 * this shows where the two agree and where they diverge. Agreement accumulated
 * over time is the certification argument. Divergence is the finding. Neither
 * is a control signal, and nothing here touches an air chain.
 *
 * Three buckets, never collapsed into a score, because they mean different
 * things and a single number would hide which one moved.
 */
export function parity(decisions, logEntries, { windowMinutes = 15, adapter = null } = {}) {
  const win = Math.max(1, windowMinutes) * MIN;
  const easLines = findEasEntries(logEntries, adapter);
  const wouldTransmit = decisions.filter(
    d => d.payload?.decision?.action === "would_transmit");

  const usedLogs = new Set();
  const matched = [];
  const decisionOnly = [];

  for (const d of wouldTransmit) {
    const t = Date.parse(d.recorded_at);
    const near = easLines
      .map((e, i) => ({ e, i, dt: e.at ? Math.abs(Date.parse(e.at) - t) : null }))
      .filter(x => x.dt !== null && x.dt <= win && !usedLogs.has(x.i))
      .sort((a, b) => a.dt - b.dt);

    const side = {
      recorded_at: d.recorded_at,
      seq: d.seq,
      event_code: d.payload?.alert?.event_code,
      places: d.payload?.alert?.places,
      rule: d.payload?.decision?.rule,
    };
    if (near[0]) {
      usedLogs.add(near[0].i);
      matched.push({
        software: side,
        aired: { at: near[0].e.at, time: near[0].e.time, title: near[0].e.title,
                 file: near[0].e.file, raw: near[0].e.raw.slice(0, 200) },
        delta_seconds: Math.round(near[0].dt / 1000),
      });
    } else {
      decisionOnly.push(side);
    }
  }

  const logOnly = easLines
    .filter((_, i) => !usedLogs.has(i))
    .map(e => ({ at: e.at, time: e.time, title: e.title, file: e.file,
                 matched_pattern: e.matched, raw: e.raw.slice(0, 200) }));

  const unresolved = easLines.filter(e => !e.at).length;

  return {
    window_minutes: windowMinutes,
    system: adapter ? { id: adapter.id, name: adapter.name } : null,

    counts: {
      software_would_transmit: wouldTransmit.length,
      log_eas_entries: easLines.length,
      agreed: matched.length,
      decision_without_air_record: decisionOnly.length,
      air_record_without_decision: logOnly.length,
      log_entries_examined: logEntries.length,
      decisions_examined: decisions.length,
      eas_lines_without_usable_timestamp: unresolved,
    },

    agreed: matched,
    decision_without_air_record: decisionOnly,
    air_record_without_decision: logOnly,

    interpretation:
      "Whether EAS appears in the as-run log at all depends on this station's " +
      "signal topology. If the certified ENDEC inserts DOWNSTREAM of the playout " +
      "system — the common arrangement — the automation never sees the alert and " +
      "an empty air-record side is the expected result, not a finding. If the " +
      "ENDEC is upstream or EAS is played out as an automation item, entries " +
      "should appear. Establish which arrangement is in use before reading any " +
      "number here.",
    caveat:
      "Absence on either side is a question, not a conclusion. A decision with no " +
      "air record may mean the ENDEC handled it outside the automation, or that " +
      "the automation logs EAS under wording these patterns do not match. An air " +
      "record with no decision may mean the alert was issued and expired inside a " +
      "poll gap — check poll coverage before drawing an inference from silence. " +
      "Neither side of this comparison is a system of record: the certified " +
      "decoder and the station log under §73.1820 are.",
    non_authoritative:
      "This comparison is derived and advisory. It does not gate, delay or " +
      "influence any forwarding decision under §11.51(m).",
  };
}

export function logDir() { return resolve().log_dir; }
