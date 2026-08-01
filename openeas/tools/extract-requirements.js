#!/usr/bin/env node
// OpenEAS — normative requirement register.
//
// A specification nobody can check is a README with opinions. This turns every
// normative statement in SPEC.md into a citable, stably-numbered requirement so
// that an implementer, a reviewer, a regulator, or a competitor can point at
// OE-0042 and argue about that specific sentence.
//
// STABLE IDS ARE THE WHOLE POINT. IDs are assigned once and recorded in
// requirements.json. They are matched back to the spec by normalised text, not
// by position, so inserting a paragraph in §4 does not renumber §9 and silently
// invalidate every citation anyone has made. A requirement that disappears from
// the spec is marked withdrawn rather than deleted and its number is never
// reused — same rule the FCC uses for rule sections, and for the same reason.
//
//   node openeas/tools/extract-requirements.js          verify, exit 1 on drift
//   node openeas/tools/extract-requirements.js --update  assign IDs to new text
//
// Verification runs in CI. Drift means the register and the spec disagree, and
// then neither can be trusted.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC = join(HERE, "..", "SPEC.md");
const REG  = join(HERE, "..", "requirements.json");
const DOC  = join(HERE, "..", "REQUIREMENTS.md");

const KEYWORDS = ["MUST NOT", "MUST", "SHOULD NOT", "SHOULD", "MAY", "REQUIRED", "OPTIONAL"];
const KW_RE = new RegExp(`\\*\\*(${KEYWORDS.join("|")})\\*\\*`);

/** Normalising is what makes matching survive reflowing and typo fixes. */
function normalise(s) {
  return s
    .replace(/\s+/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*/g, "")
    .trim()
    .toLowerCase();
}

function extract() {
  const lines = readFileSync(SPEC, "utf8").split("\n");
  let section = "(preamble)", out = [], inCode = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) { inCode = !inCode; return; }
    if (inCode) return;
    const h = line.match(/^(#{2,4})\s+(.*)/);
    if (h) { section = h[2].trim(); return; }
    if (!KW_RE.test(line)) return;
    const kws = [];
    let rest = line;
    for (const k of KEYWORDS) {
      const re = new RegExp(`\\*\\*${k}\\*\\*`, "g");
      const n = (rest.match(re) || []).length;
      for (let j = 0; j < n; j++) kws.push(k);
      rest = rest.replace(re, "");
    }
    out.push({
      section,
      line: i + 1,
      // Strongest keyword present drives the obligation level: a sentence
      // containing both MUST and MAY is a MUST with an allowance, not a MAY.
      level: kws.includes("MUST NOT") ? "MUST NOT"
           : kws.includes("MUST") || kws.includes("REQUIRED") ? "MUST"
           : kws.includes("SHOULD NOT") ? "SHOULD NOT"
           : kws.includes("SHOULD") ? "SHOULD" : "MAY",
      keywords: kws,
      text: line.trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""),
    });
  });
  return out;
}

const found = extract();
const reg = existsSync(REG) ? JSON.parse(readFileSync(REG, "utf8")) : { version: null, requirements: [] };
const byNorm = new Map(reg.requirements.map(r => [r.norm, r]));
const update = process.argv.includes("--update");

let next = reg.requirements.reduce((m, r) => Math.max(m, Number(r.id.slice(3))), 0) + 1;
const seen = new Set();
const added = [], changed = [];

for (const f of found) {
  const norm = normalise(f.text);
  seen.add(norm);
  const hit = byNorm.get(norm);
  if (hit) {
    if (hit.section !== f.section || hit.level !== f.level) {
      changed.push({ id: hit.id, from: `${hit.section} / ${hit.level}`, to: `${f.section} / ${f.level}` });
      if (update) { hit.section = f.section; hit.level = f.level; }
    }
    if (update) hit.line = f.line;
    continue;
  }
  const id = `OE-${String(next++).padStart(4, "0")}`;
  added.push({ id, section: f.section, text: f.text });
  if (update) {
    reg.requirements.push({
      id, level: f.level, section: f.section, line: f.line,
      text: f.text, norm,
      // How this requirement can be checked. Set to "wire" by hand once a
      // conformance test exists for it; everything starts unclassified rather
      // than optimistically marked testable.
      verify: "unclassified",
      status: "active",
    });
  }
}

const withdrawn = reg.requirements.filter(r => r.status === "active" && !seen.has(r.norm));
if (update) for (const w of withdrawn) w.status = "withdrawn";

if (update) {
  reg.version = "0.1.0-draft";
  reg.spec = "openeas/SPEC.md";
  reg.generated_note =
    "IDs are permanent. A withdrawn requirement keeps its number forever and " +
    "the number is never reused, so a citation made against an older revision " +
    "still resolves to the sentence it was about.";
  reg.requirements.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(REG, JSON.stringify(reg, null, 1) + "\n");

  const active = reg.requirements.filter(r => r.status === "active");
  const bySec = new Map();
  for (const r of active) { if (!bySec.has(r.section)) bySec.set(r.section, []); bySec.get(r.section).push(r); }
  let md = `# OpenEAS normative requirement register\n\n` +
    `Generated from \`SPEC.md\` by \`openeas/tools/extract-requirements.js\`. Do not edit by hand.\n\n` +
    `Every normative statement in the specification, with a permanent identifier.\n` +
    `Cite these. \`OE-0042\` will mean the same sentence in five years — withdrawn\n` +
    `requirements keep their number and it is never reused.\n\n` +
    `**${active.length} active requirements** — ` +
    ["MUST", "MUST NOT", "SHOULD", "SHOULD NOT", "MAY"]
      .map(l => `${active.filter(r => r.level === l).length} ${l}`).join(", ") + `.\n\n` +
    `| Verification | Meaning |\n|---|---|\n` +
    `| \`wire\` | Checkable against a running implementation by \`openeas-conformance\` |\n` +
    `| \`inspect\` | Checkable by reading the implementation's source or distribution |\n` +
    `| \`attest\` | Not remotely checkable; the implementer states it and is accountable for it |\n` +
    `| \`unclassified\` | Not yet assigned a verification method |\n\n---\n\n`;
  for (const [s, rs] of bySec) {
    md += `## ${s}\n\n| ID | Level | Verify | Requirement |\n|---|---|---|---|\n`;
    for (const r of rs) {
      md += `| \`${r.id}\` | ${r.level} | \`${r.verify}\` | ${r.text.replace(/\|/g, "\\|")} |\n`;
    }
    md += `\n`;
  }
  const wd = reg.requirements.filter(r => r.status === "withdrawn");
  if (wd.length) {
    md += `## Withdrawn\n\nNumbers are retained and never reused.\n\n| ID | Requirement |\n|---|---|\n`;
    for (const r of wd) md += `| \`${r.id}\` | ${r.text.replace(/\|/g, "\\|")} |\n`;
  }
  writeFileSync(DOC, md);
  console.log(`[openeas] register updated: ${active.length} active, ${wd.length} withdrawn`);
  console.log(`[openeas] ${added.length} new, ${changed.length} moved`);
  process.exit(0);
}

// Verify mode.
console.log(`[openeas] spec has ${found.length} normative statement(s); ` +
            `register has ${reg.requirements.filter(r => r.status === "active").length} active`);
let bad = false;
if (added.length)     { bad = true; console.error(`\n${added.length} statement(s) in SPEC.md with no requirement ID:`); added.forEach(a => console.error(`  ${a.section} — ${a.text.slice(0, 90)}`)); }
if (withdrawn.length) { bad = true; console.error(`\n${withdrawn.length} registered requirement(s) no longer in SPEC.md:`); withdrawn.forEach(w => console.error(`  ${w.id} — ${w.text.slice(0, 90)}`)); }
if (changed.length)   { bad = true; console.error(`\n${changed.length} requirement(s) moved section or level:`); changed.forEach(c => console.error(`  ${c.id}: ${c.from} -> ${c.to}`)); }
if (bad) { console.error(`\nRun with --update to reconcile. Drift means the register and the spec disagree.`); process.exit(1); }
console.log("[openeas] PASS — register matches the specification.");
