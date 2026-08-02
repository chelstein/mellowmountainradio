#!/usr/bin/env node
// KAZM MCP server test lab.
//
//   node test/run.js            all suites
//   node test/run.js surface    one suite
//
// Design rules, all deliberate:
//
//  1. NO DEPENDENCIES. Same as the OpenEAS lab. A test suite that stops working
//     when a framework's major version moves is a test suite nobody runs.
//
//  2. NO WRITE TOOLS ARE EVER INVOKED. The server's data files are hardcoded to
//     join(__dirname, ...) — listeners.json, requests.json, push-subs.json all
//     live beside the code. A test that called register_listener would append a
//     junk record to real production data. So write tools are checked by
//     DECLARATION — their annotations and their schemas — never by calling them.
//
//  3. NO NETWORK ASSERTIONS. Most tools fetch live upstreams. Asserting on their
//     contents would make this suite fail when the Forest Service has a bad
//     morning, which trains people to ignore red. This tests the surface: what
//     is registered, how it is annotated, and what it will accept.
//
// ── Known issues, and why they cannot rot ──────────────────────────────────
//
// A test may be listed in KNOWN_ISSUES. Then:
//
//   it fails  → reported loudly, build still passes
//   it passes → BUILD FAILS, because the issue is fixed and the entry is stale
//
// That second rule is the point. A quarantine that only ever suppresses
// failures becomes a graveyard nobody revisits. This one forces its own
// cleanup: fix the bug and CI tells you to delete the exemption.

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PORT = 3900 + (process.pid % 90);
const BASE = `http://127.0.0.1:${PORT}/mcp`;

// ── Known issues ────────────────────────────────────────────────────────────
// Each entry needs a reason. "Known" without a reason is just "ignored".
const KNOWN_ISSUES = {
  "privacy: get_or_create_listener does not accept email as a lookup key":
    "Live issue. On a public unauthenticated endpoint, accepting an email as a " +
    "lookup key means anyone who knows a listener's address can retrieve their " +
    "profile — name, location, listening history. Awaiting the stateless " +
    "redesign (server stores nothing; the AI holds the profile). Delete this " +
    "entry when the schema no longer takes an email.",
};

let pass = 0, fail = 0, known = 0, stale = 0;
const failures = [], staleEntries = [];

function ok(name, cond, detail) {
  const exempt = Object.prototype.hasOwnProperty.call(KNOWN_ISSUES, name);
  if (cond && exempt) {
    stale++; staleEntries.push(name);
    console.log(`  \x1b[35mSTALE\x1b[0m ${name}`);
    console.log(`        This now PASSES. Remove it from KNOWN_ISSUES.`);
    return;
  }
  if (cond) { pass++; console.log(`  \x1b[32mPASS\x1b[0m ${name}`); return; }
  if (exempt) {
    known++;
    console.log(`  \x1b[33mKNOWN\x1b[0m ${name}`);
    console.log(`        ${KNOWN_ISSUES[name]}`);
    return;
  }
  fail++; failures.push({ name, detail });
  console.log(`  \x1b[31mFAIL\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
}
const eq = (name, a, b) => ok(name, Object.is(a, b), `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const suite = n => console.log(`\n\x1b[1m── ${n} ${"─".repeat(Math.max(0, 60 - n.length))}\x1b[0m`);

// ── Transport ───────────────────────────────────────────────────────────────

let rpcId = 0;
async function rpc(method, params = {}) {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  for (const line of (await r.text()).split("\n")) {
    const s = line.startsWith("data:") ? line.slice(5).trim() : line.trim();
    if (!s || s.startsWith("event:")) continue;
    let d; try { d = JSON.parse(s); } catch { continue; }
    if (d.error) throw new Error(d.error.message);
    if (d.result !== undefined) return d.result;
  }
  throw new Error("no result in response");
}

// ── Server lifecycle ────────────────────────────────────────────────────────

let child = null;
async function boot() {
  child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const errs = [];
  child.stderr.on("data", d => errs.push(String(d)));
  for (let i = 0; i < 40; i++) {
    try { await rpc("tools/list"); return; } catch { await new Promise(r => setTimeout(r, 400)); }
  }
  throw new Error(`server did not start on :${PORT}\n${errs.join("").slice(0, 600)}`);
}
function shutdown() { if (child) { try { child.kill("SIGKILL"); } catch {} child = null; } }

// ── Suites ──────────────────────────────────────────────────────────────────

let TOOLS = [];

async function suiteBoot() {
  suite("Boot");
  const r = await rpc("tools/list");
  TOOLS = r.tools || [];
  ok("server starts with no environment configured at all", TOOLS.length > 0,
     "a server that needs secrets to boot cannot be tested, and fails closed in odd ways");
  ok(`registers a substantial tool surface (${TOOLS.length})`, TOOLS.length >= 40);
  for (const m of ["resources/list", "prompts/list"]) {
    try { await rpc(m); ok(`responds to ${m}`, true); }
    catch (e) { ok(`responds to ${m}`, false, e.message); }
  }
}

async function suiteSurface() {
  suite("Tool surface");

  const names = TOOLS.map(t => t.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  ok("no duplicate tool names", dupes.length === 0, dupes.join(", "));

  const badName = names.filter(n => !/^[a-z][a-z0-9_]*$/.test(n));
  ok("all tool names are lower snake_case", badName.length === 0, badName.join(", "));

  // A one-line description is how an AI picks the wrong tool.
  const thin = TOOLS.filter(t => !t.description || t.description.length < 40).map(t => t.name);
  ok("every tool has a description an assistant could choose on", thin.length === 0, thin.join(", "));

  const noAnn = TOOLS.filter(t => !t.annotations).map(t => t.name);
  ok("every tool carries annotations", noAnn.length === 0, noAnn.join(", "));

  // Absent is not the same as false. An unstated hint is a hint nobody decided.
  const unstated = TOOLS.filter(t => typeof t.annotations?.readOnlyHint !== "boolean").map(t => t.name);
  ok("every tool states readOnlyHint explicitly, true or false", unstated.length === 0, unstated.join(", "));

  const noSchema = TOOLS.filter(t => !t.inputSchema).map(t => t.name);
  ok("every tool publishes an input schema", noSchema.length === 0, noSchema.join(", "));
}

// The guard that matters most. This server is public and unauthenticated, so
// every write-capable tool is an anonymous write. Adding one must be a decision
// somebody made on purpose, not a line that slid through review.
// Five, verified against the running server. request_a_song looks like a sixth
// but is an mcp.prompt(), not a tool — the first run of this suite caught that,
// which is the whole argument for testing the surface rather than reading it.
const EXPECTED_WRITE_TOOLS = [
  "get_or_create_listener",
  "log_listener_history",
  "register_listener",
  "submit_song_request",
  "update_listener_preference",
];

async function suiteWrites() {
  suite("Write-capable tools on a public endpoint");
  const actual = TOOLS.filter(t => t.annotations?.readOnlyHint !== true).map(t => t.name).sort();
  const expected = [...EXPECTED_WRITE_TOOLS].sort();

  const added = actual.filter(n => !expected.includes(n));
  const removed = expected.filter(n => !actual.includes(n));

  ok("no undeclared write-capable tool has appeared", added.length === 0,
     `${added.join(", ")} — if this is intended, add it to EXPECTED_WRITE_TOOLS and say why in the PR. ` +
     `This endpoint has no authentication, so a new write tool is a new anonymous write.`);
  ok("every declared write-capable tool is still present", removed.length === 0,
     `${removed.join(", ")} — remove from EXPECTED_WRITE_TOOLS`);
  ok(`the write surface is ${expected.length} tools and no larger`, actual.length <= expected.length);
}

async function suitePrivacy() {
  suite("Listener privacy");

  const profile = TOOLS.find(t => t.name === "get_listener_profile");
  if (profile) {
    // Read-only, creates nothing: an id that cannot exist.
    const res = await rpc("tools/call", {
      name: "get_listener_profile",
      arguments: { listener_id: "lsr_test_nonexistent_000000" },
    });
    const text = res?.content?.[0]?.text ?? "";
    ok("an unknown listener_id returns an error, not a profile", /error/i.test(text),
       text.slice(0, 120));
  }

  // Checked by SCHEMA, never by calling — calling it with any email would
  // create a real listener record in production data.
  const goc = TOOLS.find(t => t.name === "get_or_create_listener");
  if (goc) {
    const props = goc.inputSchema?.properties ?? {};
    ok("privacy: get_or_create_listener does not accept email as a lookup key",
       !("email" in props),
       "accepts email — anyone knowing a listener's address can retrieve their profile");
  }

  // Whatever the lookup key is, it must not be echoed into a profile response.
  const out = JSON.stringify(TOOLS.find(t => t.name === "get_listener_profile")?.outputSchema ?? {});
  ok("a listener profile response does not include the email address", !/\bemail\b/.test(out));
}

// ── Run ─────────────────────────────────────────────────────────────────────

const only = process.argv[2];
const want = s => !only || only === s;
const suites = [
  ["boot", suiteBoot], ["surface", suiteSurface],
  ["writes", suiteWrites], ["privacy", suitePrivacy],
];

console.log("\x1b[1mKAZM MCP server test lab\x1b[0m — no deps, no network assertions, no write calls");

try {
  await boot();
  if (!TOOLS.length) await suiteBoot();
  for (const [name, fn] of suites) {
    if (!want(name)) continue;
    if (name === "boot" && TOOLS.length) continue;
    try { await fn(); }
    catch (e) { fail++; failures.push({ name, detail: e.message }); console.log(`  \x1b[31mERROR\x1b[0m ${name}: ${e.message}`); }
  }
} catch (e) {
  console.error(`\n\x1b[31mCould not start the server:\x1b[0m ${e.message}`);
  shutdown();
  process.exit(1);
} finally {
  shutdown();
}

console.log(`\n${"─".repeat(64)}`);
console.log(`  \x1b[32m${pass} passed\x1b[0m  \x1b[31m${fail} failed\x1b[0m  ` +
            `\x1b[33m${known} known\x1b[0m  \x1b[35m${stale} stale\x1b[0m`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach(f => console.log(`  - ${f.name}${f.detail ? `\n    ${f.detail}` : ""}`));
}
if (staleEntries.length) {
  console.log("\n\x1b[35mStale KNOWN_ISSUES entries — these now pass and must be deleted:\x1b[0m");
  staleEntries.forEach(n => console.log(`  - ${n}`));
}
if (known) {
  console.log(`\n\x1b[33m${known} known issue(s) did not fail the build. They are tracked in ` +
              `KNOWN_ISSUES with a reason and are not invisible.\x1b[0m`);
}
process.exit(fail || stale ? 1 : 0);
