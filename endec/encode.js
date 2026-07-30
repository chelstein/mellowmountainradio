#!/usr/bin/env node
// ENDEC — SAME encoder. §11.32 encode function, in software.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │  OUTPUT IS A FILE. THERE IS NO PLAYBACK PATH AND NONE MAY BE ADDED.       │
// │                                                                           │
// │  47 CFR §11.45(a) prohibits transmitting the EAS codes or Attention       │
// │  Signal "or a recording or simulation thereof" outside an actual          │
// │  emergency or an authorized test. The prohibition reaches the OUTPUT of   │
// │  this program, not merely its use.                                        │
// │                                                                           │
// │  Never route this to an audio device, a virtual audio device, a stream    │
// │  encoder, MegaSeg, or anything reaching an air chain. Never commit its    │
// │  output. iHeartCommunications paid $1,000,000 in 2015 for tones that      │
// │  reached air from a recording.                                            │
// │                                                                           │
// │  This directory is outside openeas-mcp/ so the installer cannot copy it   │
// │  to the public server. Keep it that way.                                  │
// └───────────────────────────────────────────────────────────────────────────┘
//
// §11.34 requires encoders certified under Part 2 Subpart J. No certification
// path exists for software today — FCC 26-38 ¶88–117 proposes creating one.
// Until then this is a development and evidence tool, not a station's EAS
// equipment.

import { writeFileSync, readFileSync } from "fs";

export const BAUD = 520.83;      // §11.31(a)(1)
export const MARK_HZ = 2083.3;
export const SPACE_HZ = 1562.5;
export const PREAMBLE = 0xAB;    // sixteen bytes before each header and EOM
const ATTN = [853, 960];         // §11.31(a)(2), simultaneous

/**
 * AFSK, continuous phase.
 *
 * Bit boundaries fall at FRACTIONAL sample positions. Rounding samples-per-bit
 * to an integer looks harmless and is not: at 22.05 kHz it yields 42 samples
 * per bit, i.e. 525 baud rather than 520.83. That is off-spec by 0.8%, drifts
 * about one bit every 40, and produces a signal a correct decoder rejects after
 * a handful of characters. This exact bug appeared during development and cost
 * an afternoon.
 */
function afsk(bytes, sampleRate, phaseRef) {
  const spb = sampleRate / BAUD;
  const bits = [];
  for (const b of bytes) for (let i = 0; i < 8; i++) bits.push((b >> i) & 1);  // LSB first

  const total = Math.round(bits.length * spb);
  const out = new Float32Array(total);
  let phase = phaseRef.value;
  for (let s = 0; s < total; s++) {
    const f = bits[Math.min(bits.length - 1, Math.floor(s / spb))] ? MARK_HZ : SPACE_HZ;
    out[s] = Math.sin(phase);
    phase += (2 * Math.PI * f) / sampleRate;
    if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
  }
  phaseRef.value = phase;
  return out;
}

function tones(seconds, sampleRate, [f1, f2]) {
  const n = Math.round(seconds * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = 0.5 * (Math.sin((2 * Math.PI * f1 * i) / sampleRate) +
                    Math.sin((2 * Math.PI * f2 * i) / sampleRate));
  }
  return out;
}

const silence = (sec, sr) => new Float32Array(Math.round(sec * sr));

function concat(chunks) {
  const n = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Float32Array(n);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/**
 * Build a complete SAME frame per the §11.31(c) structure:
 *
 *   [PREAMBLE]header  x3, one-second pauses
 *   Attention Signal, 8-25 s
 *   message audio
 *   [PREAMBLE]NNNN    x3, one-second pauses
 */
export function buildFrame(header, {
  sampleRate = 22050,
  attentionSeconds = 0,
  messageSamples = null,
  gapSeconds = 1,
} = {}) {
  if (!/^ZCZC-[A-Z]{3}-[A-Z]{3}(-\d{6})+\+\d{4}-\d{7}-.{8}-?$/.test(header.trim())) {
    throw new Error(`Header does not match the §11.31(c) form: ${header}`);
  }
  if (attentionSeconds && (attentionSeconds < 8 || attentionSeconds > 25)) {
    throw new Error("§11.31(c): the Attention Signal is 8 to 25 seconds.");
  }

  const pre = new Array(16).fill(PREAMBLE);
  const hdr = [...pre, ...[...header].map(c => c.charCodeAt(0))];
  const eom = [...pre, ...[..."NNNN"].map(c => c.charCodeAt(0))];
  const phase = { value: 0 };
  const parts = [];

  for (let i = 0; i < 3; i++) {
    parts.push(afsk(hdr, sampleRate, phase), silence(gapSeconds, sampleRate));
  }
  if (attentionSeconds > 0) {
    parts.push(tones(attentionSeconds, sampleRate, ATTN), silence(0.5, sampleRate));
  }
  if (messageSamples?.length) parts.push(messageSamples, silence(0.5, sampleRate));
  for (let i = 0; i < 3; i++) {
    parts.push(afsk(eom, sampleRate, phase), silence(gapSeconds, sampleRate));
  }
  return concat(parts);
}

/** 16-bit mono PCM WAV. */
export function writeWav(path, samples, sampleRate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(path, buf);
  return { path, samples: n, seconds: n / sampleRate };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
  const header = arg("--header");
  const out = arg("--out");
  if (!header || !out) {
    console.error("usage: encode.js --header 'ZCZC-...' --out FILE.wav [--attention 8] [--rate 22050]");
    console.error("\nOutput is a FILE. Never route it to an air chain — 47 CFR §11.45(a).");
    process.exit(2);
  }
  const rate = Number(arg("--rate") || 22050);
  const attention = Number(arg("--attention") || 0);
  const frame = buildFrame(header, { sampleRate: rate, attentionSeconds: attention });
  const r = writeWav(out, frame, rate);
  console.log(`wrote ${r.path} — ${r.seconds.toFixed(1)}s @ ${rate} Hz`);
  console.error("\n⚠  47 CFR §11.45(a): this file contains EAS codes" +
                (attention ? " and the Attention Signal" : "") +
                ". Transmitting it outside an actual emergency or authorized test is prohibited.");
}
