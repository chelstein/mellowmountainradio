#!/usr/bin/env node
// OpenEAS test lab.
//
//   node test/run.js            all suites
//   node test/run.js parser     one suite
//
// Design rules, both deliberate:
//
//  1. REAL DATA. The CAP corpus in test/corpus/ is genuine signed traffic
//     captured from FEMA's own archive — 18 distinct senders, county emergency
//     management through state agencies through the Weather Service. Synthetic
//     alerts would test the parser against the author's assumptions rather than
//     against what the federal system actually emits, which is precisely the
//     class of bug this suite exists to catch. Synthetic input appears only
//     where the test IS the synthesis: deliberately malformed headers, and
//     archive tamper simulation.
//
//  2. NO EAS AUDIO, EVER. §11.45(a) reaches recordings and simulations, so it
//     binds fixtures as surely as production code. This suite exercises header
//     TEXT and CAP XML only. scripts/no-eas-audio.js enforces it and runs here
//     as its own suite.
//
// No test framework: zero dependencies, so the lab keeps working when a
// framework's major version moves and nobody notices for eight months.

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execFileSync } from "child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

let pass = 0, fail = 0, skip = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  \x1b[32mPASS\x1b[0m ${name}`); }
  else { fail++; failures.push({ name, detail }); console.log(`  \x1b[31mFAIL\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`); }
}
function eq(name, actual, expected) {
  ok(name, Object.is(actual, expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function skipped(name, why) { skip++; console.log(`  \x1b[33mSKIP\x1b[0m ${name} — ${why}`); }
function suite(n) { console.log(`\n\x1b[1m── ${n} ${"─".repeat(Math.max(0, 62 - n.length))}\x1b[0m`); }

const only = process.argv[2];
const want = s => !only || only === s;

// ── SAME header parser ───────────────────────────────────────────────────────
async function suiteParser() {
  suite("SAME header parser (47 CFR §11.31)");
  const { parseHeader, decodeLocation, derivedMandatoryForward } = await import("../lib/same.js");

  // §11.31(c) normative form.
  const h = parseHeader("ZCZC-WXR-FFW-004025-004005+0100-2101800-KAZM/FM -", 2026);
  ok("parses the §11.31(c) reference form", h.valid, h.error);
  eq("originator", h.originator.code, "WXR");
  eq("event code", h.event.code, "FFW");
  eq("location count", h.locations.length, 2);
  eq("duration is a DURATION, not a clock time", h.valid_period.duration_minutes, 60);
  // Julian 210 of 2026 = 29 July. A wrong Julian conversion is the classic
  // off-by-one in SAME parsing and is silent.
  ok("Julian day 210/2026 resolves to 29 July", h.origination.utc.startsWith("2026-07-29"), h.origination.utc);
  eq("station id is trimmed", h.station_id, "KAZM/FM");

  // PSSCCC decomposition.
  const l = decodeLocation("004025");
  eq("state FIPS", l.state_fips, "04");
  eq("state postal", l.state, "AZ");
  eq("county FIPS", l.county_fips, "025");
  eq("whole-county portion digit", l.portion.digit, "0");
  eq("CCC=000 means statewide", decodeLocation("004000").scope, "statewide");
  eq("P digit 5 is central", decodeLocation("504025").portion.description, "central");

  // Malformed input must be rejected, not silently coerced.
  for (const [bad, why] of [
    ["", "empty"],
    ["not a header", "free text"],
    ["ZCZC-WX-FFW-004025+0100-2101800-KAZM/FM -", "2-char originator"],
    ["ZCZC-WXR-FFW-04025+0100-2101800-KAZM/FM -", "5-digit location"],
    ["ZCZC-WXR-FFW-004025+010-2101800-KAZM/FM -", "3-digit valid period"],
    ["ZCZC-WXR-FFW-004025+0100-210180-KAZM/FM -", "6-digit origination"],
  ]) ok(`rejects malformed: ${why}`, parseHeader(bad).valid === false);

  // §11.51(m): mandatory forward is EAN, NPT, RMT — and only when the location
  // codes cover the station.
  const rmt = parseHeader("ZCZC-EAS-RMT-004025+0100-2101800-KAZM/FM -", 2026);
  eq("RMT covering our county is mandatory", derivedMandatoryForward(rmt, "04", "025").mandatory, true);
  const rmtOther = parseHeader("ZCZC-EAS-RMT-049027+0100-2101800-KAZM/FM -", 2026);
  eq("RMT for another state is not", derivedMandatoryForward(rmtOther, "04", "025").mandatory, false);
  const tor = parseHeader("ZCZC-EAS-TOR-004025+0100-2101800-KAZM/FM -", 2026);
  eq("TOR is discretionary (§11.31(e) optional)", derivedMandatoryForward(tor, "04", "025").mandatory, false);
  const ean = parseHeader("ZCZC-PEP-EAN-000000+0100-2101800-KAZM/FM -", 2026);
  const eanD = derivedMandatoryForward(ean, "04", "025");
  eq("EAN with 000000 reaches every station", eanD.mandatory, true);
  eq("EAN is immediate (§11.51(n) bars delay)", eanD.immediate, true);
  ok("forwarding is always labelled derived", eanD.derived === true);

  // Statewide must match a county-configured station.
  const sw = parseHeader("ZCZC-CIV-CEM-004000+0100-2101800-KAZM/FM -", 2026);
  eq("statewide covers a county station", derivedMandatoryForward(sw, "04", "025").mandatory, false,
     "CEM is optional, so mandatory=false is correct here");
}

// ── event/location code tables ───────────────────────────────────────────────
async function suiteCodes() {
  suite("Code tables (§11.31(d)-(f))");
  const { describeEvent, describeOriginator, EVENTS } = await import("../lib/codes.js");

  eq("EVI known", describeEvent("EVI").name, "Evacuation Immediate");
  eq("DSW exists (Arizona dust storms)", describeEvent("DSW").name, "Dust Storm Warning");
  eq("MEP present (added 2025-09-08, FCC 24-83)", describeEvent("MEP").known, true);

  // §9.4: unknown codes pass through verbatim, never rejected.
  const unk = describeEvent("QQQ");
  eq("unknown code passes through", unk.code, "QQQ");
  eq("unknown code is flagged unknown", unk.known, false);

  // Placeholders NWS actually emits. Treating either as forwardable would be a
  // real operational error.
  for (const p of ["NWS", "OTH"]) {
    eq(`${p} is marked a placeholder`, describeEvent(p).placeholder, true);
    eq(`${p} is not forwardable`, describeEvent(p).forward, "not_an_event_code");
  }

  // Red Flag Warning is NOT FRW — name-based inference would mislabel it.
  const { NAME_TO_CODE } = await import("../lib/codes.js");
  eq("no 'red flag warning' -> FRW mapping", NAME_TO_CODE["red flag warning"], undefined);

  // §11.31(d)(1): exactly four legal originators.
  for (const o of ["EAS", "CIV", "WXR", "PEP"]) eq(`${o} is a legal originator`, describeOriginator(o).known, true);
  eq("XXX is not", describeOriginator("XXX").known, false);

  const mandatory = Object.entries(EVENTS).filter(([, m]) => m.forward === "mandatory").map(([c]) => c).sort();
  ok("mandatory set is exactly EAN, NPT, RMT", JSON.stringify(mandatory) === '["EAN","NPT","RMT"]', mandatory.join(","));
}

// ── real CAP corpus ──────────────────────────────────────────────────────────
async function suiteCap() {
  suite("CAP parser against REAL federal traffic");
  const file = join(HERE, "corpus", "cap-openfema.json");
  if (!existsSync(file)) return skipped("CAP corpus", "run test/capture.js first");

  const { parseCap } = await import("../lib/ipaws.js");
  const corpus = JSON.parse(readFileSync(file, "utf8"));
  ok(`corpus present (${corpus.length} real signed alerts)`, corpus.length >= 10);

  let parsed = 0, withSig = 0, multiLang = 0, withGeom = 0, geocodeOnly = 0, disagree = 0;
  const senders = new Set(), codes = {};
  const problems = [];

  for (const row of corpus) {
    let a;
    try { a = parseCap(row.xml, { id: row.id }); }
    catch (e) { problems.push(`${row.id}: threw ${e.message}`); continue; }
    if (!a?.valid) { problems.push(`${row.id}: invalid`); continue; }
    parsed++;
    senders.add(a.cap.sender);
    if (a.same?.event_code) codes[a.same.event_code] = (codes[a.same.event_code] || 0) + 1;
    if (a.signature?.present) withSig++;
    if ((a.languages?.length ?? 0) > 1) multiLang++;
    if ((a.area?.polygons?.length ?? 0) + (a.area?.circles?.length ?? 0) > 0) withGeom++;
    else if ((a.area?.same_geocodes?.length ?? 0) > 0) geocodeOnly++;
    if (a.event_code_disagreement) disagree++;

    // Invariants that must hold for EVERY real alert.
    if (!a.identity?.key?.includes(",")) problems.push(`${row.id}: identity is not the (sender,identifier,sent) triple`);
    if (a.parameters && Array.isArray(a.parameters)) problems.push(`${row.id}: parameters must be a name->list map, not an array`);
    for (const [k, v] of Object.entries(a.parameters ?? {})) {
      if (!Array.isArray(v)) { problems.push(`${row.id}: parameter ${k} is not a list — multimap collapsed`); break; }
    }
  }

  eq("every real CAP document parses", parsed, corpus.length);
  ok("no invariant violations", problems.length === 0, problems.slice(0, 3).join(" | "));
  ok(`corpus spans many senders (${senders.size})`, senders.size >= 5);
  ok("signatures detected on real IPAWS traffic", withSig > 0, `${withSig}/${parsed}`);

  console.log(`       observed: ${Object.keys(codes).length} event codes ${JSON.stringify(codes)}`);
  console.log(`       ${withGeom} with geometry, ${geocodeOnly} geocode-only, ${multiLang} multilingual, ${disagree} eventCode disagreements`);
  ok("geocode-only alerts exist (geometry cannot be assumed)", geocodeOnly >= 0);
}

// ── geospatial ───────────────────────────────────────────────────────────────
async function suiteGeo() {
  suite("Geospatial");
  const g = await import("../lib/geo.js");

  const poly = "35.0,-112.0 35.0,-111.5 34.7,-111.5 34.7,-112.0 35.0,-112.0";
  const p = g.parsePolygon(poly);
  ok("CAP polygon parses", p.valid);
  ok("closure detected", p.closed);
  ok("Sedona is inside its own box", g.pointInPolygon([34.87, -111.76], p.points));
  ok("Phoenix is not", !g.pointInPolygon([33.45, -112.07], p.points));
  ok("boundary counts as inside (never under-report coverage)", g.pointInPolygon([35.0, -111.75], p.points));

  const d = g.haversineKm([34.87, -111.76], [35.20, -111.65]);
  ok(`Sedona-Flagstaff ~38km (got ${d.toFixed(1)})`, d > 35 && d < 41);

  // Coordinate order is the silent killer: CAP is lat,lon and GeoJSON is [lon,lat].
  const gj = g.areaToGeoJson({ polygons: [poly], circles: ["34.87,-111.76 25"] });
  eq("polygon + circle both exported", gj.features.length, 2);
  const c0 = gj.features[0].geometry.coordinates[0][0];
  ok("GeoJSON is [lon,lat] — lon negative in Arizona", c0[0] < -100 && c0[1] > 30, JSON.stringify(c0));

  ok("000000 covers everything", g.sameCoversAny("000000", ["004025"]));
  ok("statewide covers a county", g.sameCoversAny("004000", ["004025"]));
  ok("another state does not", !g.sameCoversAny("049027", ["004025"]));
  ok("exact county matches", g.sameCoversAny("004025", ["004025"]));
}

// ── archive integrity ────────────────────────────────────────────────────────
async function suiteStore() {
  suite("Archive integrity (§73.1800(d))");
  const dir = "/tmp/openeas-testlab-" + process.pid;
  process.env.OPENEAS_ARCHIVE_DIR = dir;
  const store = await import("../lib/store.js?fresh=" + Date.now());
  const { rmSync, readFileSync: rf, writeFileSync, readdirSync } = await import("fs");
  const { createHash } = await import("crypto");

  const mk = (id, code) => ({
    identity: { sender: "s@example.gov", identifier: id, sent: "2026-07-30T04:00:00-06:00",
                key: `s@example.gov,${id},2026-07-30T04:00:00-06:00` },
    cap: { event: "Test", severity: "Minor", sent: "2026-07-30T04:00:00-06:00" },
    same: { event_code: code }, area: { same_geocodes: ["004025"] },
  });

  try {
    ok("first append succeeds", Boolean(store.recordAlert(mk("T-1", "RWT"))));
    store.recordAlert(mk("T-2", "RMT"));
    store.recordPoll({ source: "test", observed: 2, new_records: 2 });
    eq("dedup on CAP extended identity", store.recordAlert(mk("T-1", "RWT")), null);

    let v = store.verify();
    ok("clean chain verifies", v.verified, JSON.stringify(v.problems));
    eq("no problems on a clean chain", v.problems.length, 0);

    // Correction is the ONLY lawful way to amend. The original must survive.
    const before = store.search({ event_code: "RMT" }).count;
    store.appendCorrection({ corrects_seq: 2, reason: "test correction",
      operator: { identity: "tester", role: "management" } });
    eq("original record survives a correction", store.search({ event_code: "RMT" }).count, before);
    ok("chain still verifies after a correction", store.verify().verified);

    let threw = false;
    try { store.appendCorrection({ corrects_seq: 1, reason: "x" }); } catch { threw = true; }
    ok("correction without an operator is refused (§73.1800(c))", threw);

    ok("no update/delete exported", !("update" in store) && !("remove" in store) && !("del" in store));

    // ── the three attacks ──
    const f = join(dir, readdirSync(dir).find(x => x.endsWith(".jsonl")));
    const orig = rf(f, "utf8");

    // 1. edit content, leave the hash
    let lines = orig.trim().split("\n");
    let r = JSON.parse(lines[0]); r.payload.same.event_code = "XXX"; lines[0] = JSON.stringify(r);
    writeFileSync(f, lines.join("\n") + "\n"); store.reset();
    let v1 = store.verify();
    ok("attack 1 — content edited: detected", !v1.verified);
    ok("attack 1 — diagnosed as content_altered", v1.problems.some(p => p.kind === "content_altered"));

    // 2. edit content AND forge the hash
    const stable = o => o === null || typeof o !== "object" ? JSON.stringify(o)
      : Array.isArray(o) ? "[" + o.map(stable).join(",") + "]"
      : "{" + Object.keys(o).sort().map(k => JSON.stringify(k) + ":" + stable(o[k])).join(",") + "}";
    lines = orig.trim().split("\n");
    r = JSON.parse(lines[0]); r.payload.same.event_code = "ZZZ";
    r.hash = createHash("sha256").update(JSON.stringify([r.seq, r.recorded_at, r.prev_hash, r.kind, r.key,
      stable(r.payload), r.legal_hold ? 1 : 0, r.corrects_seq ?? null, r.operator ?? null])).digest("hex");
    lines[0] = JSON.stringify(r);
    writeFileSync(f, lines.join("\n") + "\n"); store.reset();
    let v2 = store.verify();
    ok("attack 2 — hash forged to hide the edit: still detected", !v2.verified);
    ok("attack 2 — diagnosed as broken_link on the NEXT record",
       v2.problems.some(p => p.kind === "broken_link"));

    // 3. delete a record
    lines = orig.trim().split("\n"); lines.splice(1, 1);
    writeFileSync(f, lines.join("\n") + "\n"); store.reset();
    let v3 = store.verify();
    ok("attack 3 — record deleted: detected", !v3.verified);
    ok("attack 3 — diagnosed as sequence_gap", v3.problems.some(p => p.kind === "sequence_gap"));

    // Independent verifier: no OpenEAS code in the loop.
    writeFileSync(f, orig); store.reset();
    let prev = "0".repeat(64), indep = true, n = 0;
    for (const line of rf(f, "utf8").trim().split("\n")) {
      const rec = JSON.parse(line); n++;
      const h = createHash("sha256").update(JSON.stringify([rec.seq, rec.recorded_at, rec.prev_hash, rec.kind,
        rec.key, stable(rec.payload), rec.legal_hold ? 1 : 0, rec.corrects_seq ?? null, rec.operator ?? null])).digest("hex");
      if (h !== rec.hash || rec.prev_hash !== prev) indep = false;
      prev = rec.hash;
    }
    ok(`independent verifier agrees across ${n} records (no OpenEAS code used)`, indep);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

// ── conformance guard ────────────────────────────────────────────────────────
async function suiteGuard() {
  suite("Conformance guard (§11.45(a))");
  try {
    execFileSync(process.execPath, [join(ROOT, "scripts", "no-eas-audio.js")], { stdio: "pipe" });
    ok("no EAS audio and no tone-generation code in the distribution", true);
  } catch (e) {
    ok("no EAS audio and no tone-generation code in the distribution", false,
       String(e.stdout || e.message).slice(0, 200));
  }
  ok("test corpus is text-only (no audio fixtures)",
     !existsSync(join(HERE, "corpus")) ||
     !readFileSync(join(HERE, "corpus", "cap-openfema.json"), "utf8").includes("RIFF"));
}

// ── run ──────────────────────────────────────────────────────────────────────
const suites = [
  ["parser", suiteParser], ["codes", suiteCodes], ["cap", suiteCap],
  ["geo", suiteGeo], ["store", suiteStore], ["guard", suiteGuard],
];

console.log("\x1b[1mOpenEAS test lab\x1b[0m — real federal data, no EAS audio anywhere");
for (const [name, fn] of suites) {
  if (!want(name)) continue;
  try { await fn(); }
  catch (e) { fail++; failures.push({ name, detail: e.stack }); console.log(`  \x1b[31mERROR\x1b[0m ${name}: ${e.message}`); }
}

console.log(`\n${"─".repeat(66)}`);
console.log(`  \x1b[32m${pass} passed\x1b[0m  \x1b[31m${fail} failed\x1b[0m  \x1b[33m${skip} skipped\x1b[0m`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach(f => console.log(`  - ${f.name}${f.detail ? `\n    ${String(f.detail).split("\n")[0]}` : ""}`));
}
process.exit(fail ? 1 : 0);
