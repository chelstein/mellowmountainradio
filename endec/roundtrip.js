#!/usr/bin/env node
// ENDEC round-trip: encode -> decode, and prove they agree.
//
// This is the test that matters for a certification argument. An encoder
// checked only against its own assumptions proves nothing; a decoder checked
// only against its own generator proves nothing. Running the §11.32 encoder
// into the §11.33 decoder and requiring an exact header match, with the
// §11.33(a)(10) two-of-three rule satisfied, exercises both against the
// specification rather than against each other's habits.
//
// Writes to a temp file and deletes it. Nothing durable, nothing playable,
// nothing near an air chain.

import { buildFrame, writeWav } from "./encode.js";
import { readWav, decodeAudio } from "../openeas-mcp/lib/samedecode.js";
import { unlinkSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const CASES = [
  { h: "ZCZC-EAS-RWT-004025+0015-2101800-KAZM/FM -", d: "Required Weekly Test, Yavapai" },
  { h: "ZCZC-WXR-FFW-004025-004005+0100-2101800-KAZM/FM -", d: "Flash Flood, two counties" },
  { h: "ZCZC-PEP-EAN-000000+0100-2101800-WXYZ    -", d: "National Emergency, all US" },
  { h: "ZCZC-CIV-EVI-049027+0030-2101800-SHERIFF -", d: "Evacuation Immediate, Millard UT" },
  { h: "ZCZC-EAS-RMT-004000+0100-2101800-KAZM/FM -", d: "Monthly Test, Arizona statewide" },
];

let pass = 0, fail = 0;
console.log("ENDEC round-trip — §11.32 encode into §11.33 decode\n");

for (const rate of [16000, 22050, 44100]) {
  console.log(`  ${rate} Hz`);
  for (const { h, d } of CASES) {
    const tmp = join(tmpdir(), `endec-rt-${process.pid}-${rate}.wav`);
    try {
      writeWav(tmp, buildFrame(h, { sampleRate: rate }), rate);
      const { samples, sampleRate } = readWav(readFileSync(tmp));
      const r = decodeAudio(samples, sampleRate, { year: 2026 });
      const exact = r.header === h.trim();
      const ok = exact && r.vote.conformant;
      console.log(`    ${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${d.padEnd(38)} ` +
                  `copies=${r.vote.copies} eom=${r.vote.eom_seen ? "y" : "n"}` +
                  (ok ? "" : `  got ${JSON.stringify((r.header || "").slice(0, 44))}`));
      ok ? pass++ : fail++;
    } finally {
      try { unlinkSync(tmp); } catch {}
    }
  }
}

// Attention Signal, checked separately: an RWT carries none (§11.51(b)), so it
// must be exercised on a frame that should have one.
{
  const rate = 22050;
  const tmp = join(tmpdir(), `endec-rt-attn-${process.pid}.wav`);
  try {
    writeWav(tmp, buildFrame(CASES[1].h, { sampleRate: rate, attentionSeconds: 10 }), rate);
    const { samples, sampleRate } = readWav(readFileSync(tmp));
    const r = decodeAudio(samples, sampleRate, { year: 2026 });
    const ok = r.attention.present && r.attention.within_spec && r.header === CASES[1].h.trim();
    console.log(`\n  Attention Signal (853+960 Hz, §11.31(a)(2))`);
    console.log(`    ${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} detected=${r.attention.present} ` +
                `duration=${r.attention.duration_seconds}s within 8-25s=${r.attention.within_spec}`);
    ok ? pass++ : fail++;
  } finally { try { unlinkSync(tmp); } catch {} }
}

// Malformed headers must be refused at encode time, not silently emitted.
console.log(`\n  Encoder input validation`);
for (const [bad, why] of [
  ["ZCZC-EA-RWT-004025+0015-2101800-KAZM/FM -", "2-char originator"],
  ["ZCZC-EAS-RWT-04025+0015-2101800-KAZM/FM -", "5-digit location"],
  ["not a header", "free text"],
]) {
  let threw = false;
  try { buildFrame(bad, { sampleRate: 22050 }); } catch { threw = true; }
  console.log(`    ${threw ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"} refuses ${why}`);
  threw ? pass++ : fail++;
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
