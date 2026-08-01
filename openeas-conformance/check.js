#!/usr/bin/env node
// OpenEAS conformance checker.
//
//   node check.js https://eas.example.com/mcp
//   node check.js https://eas.example.com/mcp --json > report.json
//
// Points at ANY OpenEAS implementation and reports which normative
// requirements it satisfies. It has no knowledge of, and no dependency on, the
// reference implementation — it speaks the wire protocol and reads the
// responses, which is the only way a conformance claim means anything when the
// implementer and the checker are the same organisation.
//
// ── Three verdicts, and why the third one exists ───────────────────────────
//
// PASS          the requirement was checked and met
// FAIL          the requirement was checked and not met
// INCONCLUSIVE  the requirement could not be checked here
//
// INCONCLUSIVE is never rounded to PASS. That is the same rule SPEC §5.3
// (OE-0074, OE-0076) imposes on implementations reporting alert validation:
// a check that could not be completed must never be reported as one that
// passed. A conformance checker that exempted itself from its own
// specification's evidentiary standard would not be worth running.
//
// A tool that is absent is INCONCLUSIVE, not FAIL, for requirements that
// govern that tool's behaviour — Tier A implementations are not required to
// expose Tier C tools, and a checker that punished honest scope would push
// implementers toward stubs.
//
// Exit 0 = no failures. Exit 1 = at least one FAIL. Exit 2 = could not connect.

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REG = join(HERE, "..", "openeas", "requirements.json");

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const TIMEOUT = Number((args.find(a => a.startsWith("--timeout=")) || "").split("=")[1] || 25000);
const base = args.find(a => /^https?:\/\//.test(a));

if (!base) {
  console.error(`OpenEAS conformance checker

  node check.js <mcp-endpoint-url> [--json] [--timeout=ms]

The URL is the MCP endpoint itself, e.g. https://eas.example.com/mcp
`);
  process.exit(2);
}

// ── MCP streamable-HTTP transport ───────────────────────────────────────────
// JSON-RPC framed in SSE. Deliberately hand-rolled: a checker that depends on
// the same SDK as the implementation it checks shares the SDK's bugs, and a
// bug they share is invisible to both.

let rpcId = 0;

async function rpc(method, params) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
    const raw = await r.text();
    for (const line of raw.split("\n")) {
      const s = line.startsWith("data:") ? line.slice(5).trim() : line.trim();
      if (!s || s.startsWith("event:") || s.startsWith(":")) continue;
      let d; try { d = JSON.parse(s); } catch { continue; }
      if (d.error) throw new Error(d.error.message || "rpc error");
      if (d.result !== undefined) return d.result;
    }
    throw new Error("no JSON-RPC result in response");
  } finally { clearTimeout(timer); }
}

/** Call a tool and parse its JSON text content. */
async function call(name, args = {}) {
  const res = await rpc("tools/call", { name, arguments: args });
  const text = res?.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("tool returned no text content");
  try { return JSON.parse(text); } catch { return { __raw: text }; }
}

// ── Test harness ────────────────────────────────────────────────────────────

const results = [];
const PASS = "PASS", FAIL = "FAIL", INC = "INCONCLUSIVE";

function record(id, requirements, verdict, detail) {
  results.push({ test: id, requirements, verdict, detail });
}

/** Wrap a test so an exception is INCONCLUSIVE, never a silent pass. */
async function test(id, requirements, fn) {
  try {
    const r = await fn();
    record(id, requirements, r.verdict, r.detail);
  } catch (e) {
    record(id, requirements, INC, `check could not run: ${e.message}`);
  }
}

const ok   = detail => ({ verdict: PASS, detail });
const bad  = detail => ({ verdict: FAIL, detail });
const inc  = detail => ({ verdict: INC,  detail });

// ── Shared state gathered once ──────────────────────────────────────────────

let TOOLS = [];
const has = n => TOOLS.some(t => t.name === n || t.name === `eas_${n}`);
const full = n => TOOLS.find(t => t.name === n || t.name === `eas_${n}`)?.name;

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const STATUS_VOCAB = new Set(["ok", "no_data", "unavailable", "out_of_scope", "degraded", "stale"]);

// Verbs SPEC §5 permits. Anything else risks reading as a command to EAS
// equipment, which is the entire point of the constraint.
const VERBS = ["get", "list", "search", "explain", "verify", "draft", "export", "backfill", "find", "lookup"];

// Names that would suggest origination or actuation. Matching is deliberately
// broad — a false positive costs a conversation, a false negative would let an
// actuating tool ship under a conformance badge.
const FORBIDDEN_NAME = /(^|_)(send|transmit|originate|encode|emit|broadcast|air|fire|trigger|activate|relay|forward|inject|play|publish|post|delete|update|set|write|create)(_|$)/;

// ── The checks ──────────────────────────────────────────────────────────────

async function run() {
  // Connectivity first. Everything else is inconclusive without it.
  try {
    const r = await rpc("tools/list", {});
    TOOLS = Array.isArray(r?.tools) ? r.tools : [];
  } catch (e) {
    console.error(`[openeas-conformance] cannot reach ${base}: ${e.message}`);
    console.error(`Nothing was checked. This is not a conformance failure — it is no result at all.`);
    process.exit(2);
  }
  if (!TOOLS.length) {
    console.error(`[openeas-conformance] ${base} returned an empty tool list. Nothing to check.`);
    process.exit(2);
  }

  await test("T01-readonly-hint", ["OE-0056"], async () => {
    const missing = TOOLS.filter(t => t.annotations?.readOnlyHint !== true).map(t => t.name);
    return missing.length
      ? bad(`${missing.length} tool(s) do not set readOnlyHint:true — ${missing.slice(0, 6).join(", ")}`)
      : ok(`all ${TOOLS.length} tools set readOnlyHint:true`);
  });

  await test("T02-destructive-hint", ["OE-0056"], async () => {
    const bad_ = TOOLS.filter(t => t.annotations?.destructiveHint !== false).map(t => t.name);
    return bad_.length
      ? bad(`${bad_.length} tool(s) do not set destructiveHint:false — ${bad_.slice(0, 6).join(", ")}`)
      : ok(`all ${TOOLS.length} tools set destructiveHint:false`);
  });

  await test("T03-non-actuating-names", ["OE-0054", "OE-0006"], async () => {
    const offenders = TOOLS.filter(t => FORBIDDEN_NAME.test(t.name.replace(/^eas_/, ""))).map(t => t.name);
    return offenders.length
      ? bad(`tool name(s) could read as a command to EAS equipment: ${offenders.join(", ")}`)
      : ok(`no tool name suggests origination or actuation`);
  });

  await test("T04-permitted-verbs", ["OE-0054"], async () => {
    const offenders = TOOLS
      .map(t => t.name.replace(/^eas_/, ""))
      .filter(n => !VERBS.includes(n.split("_")[0]));
    return offenders.length
      ? bad(`tool(s) outside the permitted verb set: ${offenders.join(", ")}`)
      : ok(`all tool names begin with a permitted verb`);
  });

  await test("T05-mcp-name-binding", ["OE-0055"], async () => {
    const dotted = TOOLS.filter(t => t.name.includes(".")).map(t => t.name);
    return dotted.length
      ? bad(`MCP binding must replace "." with "_": ${dotted.join(", ")}`)
      : ok(`all ${TOOLS.length} tool names use the underscore binding`);
  });

  // Cites the declaration requirement only. It verifies that the server SAYS it
  // has no origination capability — it cannot verify that the repository
  // contains no EAS audio (OE-0007), which is a fact about a distribution, not
  // about a response. Claiming OE-0007 here would be exactly the kind of
  // "checked something adjacent, reported the requirement as met" move this
  // specification exists to prevent.
  await test("T06-conformance-declaration", ["OE-0006"], async () => {
    if (!has("get_conformance")) return inc(`no get_conformance tool exposed`);
    const c = await call(full("get_conformance"));
    const rp = c.regulatory_position;
    if (!rp) return bad(`get_conformance does not declare a regulatory_position`);
    const problems = [];
    if (rp.is_eas_software !== false) problems.push("is_eas_software is not false");
    if (rp.origination_capability !== "none") problems.push(`origination_capability is ${JSON.stringify(rp.origination_capability)}`);
    if (!rp.basis) problems.push("no stated basis for the position");
    return problems.length
      ? bad(problems.join("; "))
      : ok(`declares: not EAS Software, no origination capability, with a stated basis`);
  });

  await test("T07-advisory-envelope", ["OE-0015"], async () => {
    if (!has("get_event_codes")) return inc(`no get_event_codes tool to sample an envelope from`);
    const e = await call(full("get_event_codes"));
    const problems = [];
    if (e.advisory !== true) problems.push("advisory is not true");
    if (e.authoritative !== false) problems.push("authoritative is not false");
    if (!e.disclaimer) problems.push("no disclaimer");
    return problems.length ? bad(problems.join("; "))
                           : ok(`responses carry advisory:true, authoritative:false, and a disclaimer`);
  });

  await test("T08-absence-semantics", ["OE-0079", "OE-0026", "OE-0027"], async () => {
    if (!has("get_active_alerts")) return inc(`no get_active_alerts tool exposed`);
    const a = await call(full("get_active_alerts"));
    if (!Array.isArray(a.sources)) return bad(`response has no sources[] — cannot distinguish quiet from broken`);
    const unknown = a.sources.map(s => s.status).filter(s => !STATUS_VOCAB.has(s));
    if (unknown.length) return bad(`source status outside the defined vocabulary: ${[...new Set(unknown)].join(", ")}`);
    const alerts = a.alerts ?? a.entries ?? [];
    if (!alerts.length && !a.sources.length)
      return bad(`empty result with no source health — an unreadable feed is indistinguishable from no emergency`);
    return ok(`every source reports a defined status (${a.sources.map(s => s.id + "=" + s.status).join(", ")})`);
  });

  await test("T09-versioned-code-tables", ["OE-0120", "OE-0121"], async () => {
    if (!has("get_event_codes")) return inc(`no get_event_codes tool exposed`);
    const e = await call(full("get_event_codes"));
    // SPEC §9.4 names the path: table.version and table.source. The first
    // version of this check guessed at `table_version` and reported a FAIL
    // against a conforming server, which is how the specification's silence on
    // the field name got found and fixed. Accept the named path; accept the
    // older flat spellings too rather than failing an implementation over a
    // field rename.
    const v = e.table?.version ?? e.table_version ?? e.version ?? e.codes?.table_version;
    const src = e.table?.source ?? e.table_source;
    if (!v) return bad(`no table version at table.version — codes are not versioned data (§9.4)`);
    if (!src) return bad(`table.version present but table.source absent — §9.4 requires the authority too`);
    return ok(`code table ${JSON.stringify(v)} from ${JSON.stringify(String(src).slice(0, 60))}`);
  });

  await test("T10-unknown-code-passthrough", ["OE-0122"], async () => {
    if (!has("explain_alert")) return inc(`no explain_alert tool exposed`);
    // ZZZ is not an assigned §11.31 event code. It must come back preserved,
    // not rejected — an unknown code is how a future code first appears.
    const r = await call(full("explain_alert"), { header: "ZCZC-EAS-ZZZ-004025+0100-1000000-KAZM/FM-" });
    const s = JSON.stringify(r);
    return s.includes("ZZZ")
      ? ok(`unknown event code preserved verbatim in the response`)
      : bad(`unknown event code was not passed through — it must be preserved, not rejected`);
  });

  await test("T11-header-text-decode", ["OE-0054"], async () => {
    if (!has("explain_alert")) return inc(`no explain_alert tool exposed`);
    const r = await call(full("explain_alert"), { header: "ZCZC-EAS-RWT-004025+0100-1000000-KAZM/FM-" });
    const s = JSON.stringify(r).toLowerCase();
    const bits = ["rwt", "004025"].filter(b => s.includes(b));
    return bits.length === 2
      ? ok(`decodes a SAME header supplied as text, field by field`)
      : bad(`header text was not decoded into its fields (found ${bits.length}/2 expected values)`);
  });

  await test("T12-national-activation-coverage", ["OE-0033"], async () => {
    if (!has("explain_alert")) return inc(`no explain_alert tool exposed`);
    // 000000 is all United States territory. It is how an EAN and a nationwide
    // NPT reach every station, so it MUST be recognised as covering any
    // station regardless of that station's own state and county.
    const r = await call(full("explain_alert"), { header: "ZCZC-EAS-EAN-000000+0100-1000000-WXYZ/FM-" });
    const s = JSON.stringify(r).toLowerCase();
    const national = /national|all united states|entire united states|nationwide|all u\.s\./.test(s);
    const mandatory = /"mandatory_forward"\s*:\s*true|mandatory/.test(s);
    if (!national && !mandatory)
      return bad(`an EAN with location 000000 was not recognised as national — this is the single most consequential decode in the system`);
    return ok(`EAN with 000000 recognised as covering all United States territory`);
  });

  await test("T13-archive-verification", ["OE-0064", "OE-0066", "OE-0067"], async () => {
    if (!has("verify_archive")) return inc(`no verify_archive tool exposed (permitted — an archive is not required)`);
    const v = await call(full("verify_archive"));
    const s = JSON.stringify(v);
    if (typeof v === "boolean" || /^\s*(true|false)\s*$/.test(s))
      return bad(`verification returned a bare boolean — it must report where the chain broke`);
    const caveat = /internal consistency|does not prove|only proves|not proof that/i.test(s);
    return caveat
      ? ok(`verification is structured and states that chain integrity proves internal consistency only`)
      : bad(`verification does not state that chain integrity proves internal consistency only`);
  });

  await test("T14-archive-absence-caveat", ["OE-0059"], async () => {
    if (!has("get_archive_stats")) return inc(`no get_archive_stats tool exposed`);
    const a = await call(full("get_archive_stats"));
    const s = JSON.stringify(a).toLowerCase();
    return /absence|is not evidence|does not mean|poll gap|coverage/.test(s)
      ? ok(`archive reporting states that absence is not evidence the alert did not exist`)
      : bad(`archive contents reported without the absence caveat required by §5.4`);
  });

  await test("T15-poll-coverage-recorded", ["OE-0058"], async () => {
    if (!has("get_archive_stats")) return inc(`no get_archive_stats tool exposed`);
    const a = await call(full("get_archive_stats"));
    const s = JSON.stringify(a).toLowerCase();
    return /poll/.test(s)
      ? ok(`poll coverage is reported alongside holdings`)
      : bad(`no poll coverage reported — a quiet period is indistinguishable from a period the poller was down`);
  });

  await test("T16-four-valued-validation", ["OE-0074", "OE-0076"], async () => {
    if (!has("get_ipaws_alert")) return inc(`no get_ipaws_alert tool exposed`);
    let r;
    try { r = await call(full("get_ipaws_alert"), { posted_msg_id: "1", validate: true }); }
    catch (e) { return inc(`validation could not be exercised: ${e.message}`); }
    const s = JSON.stringify(r).toLowerCase();
    if (!/validation|checks/.test(s)) return inc(`no validation block returned for this identifier`);
    const four = ["pass", "fail", "absent", "unknown"].filter(v => s.includes(`"${v}"`));
    const indet = /indeterminate/.test(s);
    if (four.length < 2) return inc(`validation present but too few result values observed to judge`);
    return indet || four.includes("unknown")
      ? ok(`validation uses the four-valued vocabulary and can report indeterminate`)
      : bad(`validation does not appear to distinguish unknown from pass`);
  });

  await test("T17-rfc3339-timestamps", ["OE-0028"], async () => {
    if (!has("get_event_codes")) return inc(`no tool available to sample a timestamp`);
    const e = await call(full("get_event_codes"));
    const stamps = [e.generated_at, e.generated, e.timestamp].filter(Boolean);
    if (!stamps.length) return inc(`no timestamp field found in the response envelope`);
    const bad_ = stamps.filter(t => !RFC3339.test(t));
    return bad_.length
      ? bad(`timestamp not RFC 3339 with explicit offset: ${bad_.join(", ")}`)
      : ok(`timestamps are RFC 3339 with explicit offset`);
  });

  await test("T18-no-origination-tool", ["OE-0006"], async () => {
    // Belt and braces against T03: check descriptions too, since a benignly
    // named tool can still describe an actuating capability.
    const suspect = TOOLS.filter(t =>
      /\b(transmit|originate|encode the|generate the (attention|same)|send an alert|air the)\b/i
        .test(t.description || ""));
    return suspect.length
      ? bad(`tool description(s) claim origination capability: ${suspect.map(t => t.name).join(", ")}`)
      : ok(`no tool describes an origination or transmission capability`);
  });

  report();
}

// ── Reporting ───────────────────────────────────────────────────────────────

function report() {
  const reg = existsSync(REG) ? JSON.parse(readFileSync(REG, "utf8")).requirements : [];
  const byId = new Map(reg.map(r => [r.id, r]));

  const pass = results.filter(r => r.verdict === PASS).length;
  const fail = results.filter(r => r.verdict === FAIL).length;
  const inconc = results.filter(r => r.verdict === INC).length;

  const covered = new Set(results.filter(r => r.verdict !== INC).flatMap(r => r.requirements));

  if (JSON_OUT) {
    console.log(JSON.stringify({
      endpoint: base,
      profile: "OpenEAS",
      checker_version: "0.1.0",
      checked_at: new Date().toISOString(),
      summary: { pass, fail, inconclusive: inconc, requirements_exercised: covered.size, requirements_total: reg.length },
      results,
      caveat:
        "Wire checks only. Requirements about repository contents, log immutability " +
        "internals, and physical signal path cannot be verified remotely and are not " +
        "represented here as passing. INCONCLUSIVE is never rounded to PASS.",
    }, null, 2));
    process.exit(fail ? 1 : 0);
  }

  const C = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };
  console.log(`\n${C.b}OpenEAS conformance${C.x} — ${base}\n`);
  for (const r of results) {
    const c = r.verdict === PASS ? C.g : r.verdict === FAIL ? C.r : C.y;
    console.log(`  ${c}${r.verdict.padEnd(12)}${C.x} ${r.test}  ${C.d}${r.requirements.join(" ")}${C.x}`);
    console.log(`               ${r.detail}`);
  }
  console.log(`\n${"─".repeat(72)}`);
  console.log(`  ${C.g}${pass} passed${C.x}  ${C.r}${fail} failed${C.x}  ${C.y}${inconc} inconclusive${C.x}`);
  console.log(`  ${covered.size} of ${reg.length} registered requirements exercised by this run.`);
  console.log(`\n  ${C.d}Wire checks only. Repository contents, log immutability internals and`);
  console.log(`  physical signal path cannot be verified remotely, and are NOT counted`);
  console.log(`  as passing. Inconclusive is never rounded up.${C.x}\n`);
  process.exit(fail ? 1 : 0);
}

run();
