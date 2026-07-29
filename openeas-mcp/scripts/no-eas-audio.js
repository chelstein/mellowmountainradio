#!/usr/bin/env node
// OpenEAS conformance guard — SPEC §2.3 and §10 item 7.
//
// 47 CFR §11.45(a) prohibits transmitting the EAS codes or Attention Signal
// "or a recording or simulation thereof" outside an actual emergency or an
// authorized test. Because the prohibition reaches RECORDINGS and SIMULATIONS,
// it binds test fixtures, sample data, demos, and CI artifacts — not only
// production code paths.
//
// The downside is not theoretical. iHeartCommunications paid a $1,000,000 civil
// penalty in 2015 after a syndicated show aired EAS tones from a recording,
// cascading false activations across 70+ affiliates. Other actions have run to
// $244,952 and $86,400. The statutory ceiling under §1.80(b)(1) is $62,829 per
// violation or per day.
//
// A leaked audio fixture that reaches an air chain is the single most expensive
// mistake this project could make, and it costs nothing to make it impossible.
//
// Exit 0 = clean. Exit 1 = a violation that must be fixed before shipping.

import { readdirSync, statSync, readFileSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const AUDIO_EXT = new Set([
  ".wav", ".mp3", ".aac", ".m4a", ".ogg", ".opus", ".flac", ".aiff", ".aif",
  ".au", ".snd", ".wma", ".ac3", ".raw", ".pcm", ".s16",
]);

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".cache"]);

// Source patterns that would indicate an encoder or tone generator creeping in.
// Matching is deliberately broad: a false positive costs a code comment, a
// false negative costs a forfeiture.
const FORBIDDEN_PATTERNS = [
  { re: /\b2083\.3\b/,               why: "SAME AFSK mark frequency (§11.31(a)(1))" },
  { re: /\b1562\.5\b/,               why: "SAME AFSK space frequency (§11.31(a)(1))" },
  { re: /\b520\.83\b/,               why: "SAME AFSK baud rate (§11.31(a)(1))" },
  { re: /\b853\b\s*[,+&]\s*\b960\b/, why: "EAS Attention Signal tone pair (§11.31(a)(2))" },
  { re: /\b960\b\s*[,+&]\s*\b853\b/, why: "EAS Attention Signal tone pair (§11.31(a)(2))" },
  { re: /Math\.sin[^;]{0,80}(853|960|2083|1562)/, why: "tone synthesis of an EAS frequency" },
  { re: /\b(OscillatorNode|createOscillator|AudioBuffer|OfflineAudioContext)\b/,
    why: "Web Audio synthesis primitive" },
  { re: /\bencodeHeader\b|\bgenerateSame\b|\bsameEncode\b|\bwriteAfsk\b|\bmakeAttentionSignal\b/,
    why: "encoder-shaped function name" },
];

// Files permitted to mention the frequencies, because their job is to document
// or enforce the prohibition. Everything else is suspect.
const DOC_ALLOWLIST = new Set([
  "scripts/no-eas-audio.js",
  "lib/same.js",     // decoder; carries the do-not-add banner citing the specs
  "README.md",
]);

const violations = [];
let filesScanned = 0, audioChecked = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { walk(full); continue; }

    const rel = relative(ROOT, full).split("\\").join("/");
    const ext = extname(name).toLowerCase();

    // Rule 1: no audio files at all, of any kind. This project has no
    // legitimate reason to ship audio, so the rule is absolute rather than
    // content-inspecting — an absolute rule cannot be argued around later.
    if (AUDIO_EXT.has(ext)) {
      audioChecked++;
      violations.push({
        file: rel,
        rule: "SPEC §2.3 / §10.7 — no audio artifact may exist in this repository",
        detail: `Audio file (${ext}). §11.45(a) reaches recordings and simulations. ` +
                `Remove it. Header TEXT is the intended interchange format.`,
      });
      continue;
    }

    // Rule 2: no encoder or tone-synthesis code.
    if (![".js", ".mjs", ".cjs", ".ts", ".py", ".rs", ".go", ".json"].includes(ext)) continue;
    filesScanned++;
    if (DOC_ALLOWLIST.has(rel)) continue;

    const src = readFileSync(full, "utf8");
    for (const { re, why } of FORBIDDEN_PATTERNS) {
      const m = src.match(re);
      if (!m) continue;
      const line = src.slice(0, m.index).split("\n").length;
      violations.push({
        file: `${rel}:${line}`,
        rule: "SPEC §2.3 — no origination capability",
        detail: `Matched ${why}: ${JSON.stringify(m[0])}. If this is documentation, ` +
                `add the path to DOC_ALLOWLIST. If it is generation, remove it.`,
      });
    }
  }
}

walk(ROOT);

console.log(`[openeas] no-eas-audio: scanned ${filesScanned} source file(s), ` +
            `${audioChecked} audio file(s) found`);

if (violations.length === 0) {
  console.log("[openeas] PASS — no EAS audio artifact, no origination capability.");
  process.exit(0);
}

console.error(`\n[openeas] FAIL — ${violations.length} violation(s):\n`);
for (const v of violations) {
  console.error(`  ${v.file}`);
  console.error(`    ${v.rule}`);
  console.error(`    ${v.detail}\n`);
}
process.exit(1);
