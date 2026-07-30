// OpenEAS — SAME/EAS demodulator. DECODE ONLY.
//
// Recovers SAME headers from audio: the §11.33 decoder function, in software.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │  THIS FILE DECODES. IT MUST NEVER GAIN A MODULATOR.                       │
// │                                                                           │
// │  47 CFR §11.45(a) prohibits TRANSMITTING the EAS codes or Attention       │
// │  Signal "or a recording or simulation thereof". Decoding is not           │
// │  transmitting and is not restricted — an ENDEC decodes continuously, and  │
// │  so does every monitoring receiver in the country.                        │
// │                                                                           │
// │  Generation is the other half of §11.32 and lives elsewhere, deliberately │
// │  outside anything that deploys to a public server. See README.            │
// └───────────────────────────────────────────────────────────────────────────┘
//
// ── The physical layer, from §11.31(a)-(c) ──────────────────────────────────
//
//   Modulation   AFSK, 520.83 bits/s
//   Mark         2083.3 Hz   (4.0 cycles per 1.92 ms bit)
//   Space        1562.5 Hz   (3.0 cycles per bit)
//   Bit period   1.92 ms exactly
//   Coding       ASCII 7-bit + 1 null bit = 8-bit bytes, NRZ, LSB first
//   Preamble     sixteen bytes of 0xAB before each header and each EOM
//   Structure    header ×3, then Attention Signal 8–25 s, then audio, then
//                EOM (NNNN) ×3
//
// Both tone frequencies are integer cycles per bit, which is why this is
// continuous-phase FSK and why it survives so much abuse: there is no phase
// discontinuity at a bit boundary to smear.
//
// ── Why non-coherent Goertzel ───────────────────────────────────────────────
//
// Per bit, measure energy at mark and at space and take the larger. It needs no
// carrier recovery, no PLL, and no phase reference — which matters because this
// has to work on audio that has been through a codec, a broadcast processor,
// and possibly a receiver's discriminator. Measured elsewhere in this project:
// the burst survives MP3 to 24 kbps at 11.025 kHz, failing only below about
// −10 dB SNR.
//
// ── Redundancy is the error correction ──────────────────────────────────────
//
// SAME has no checksum. Its integrity comes from transmitting the header three
// times, and §11.33(a)(10) requires two of three to match exactly before a
// message is treated as valid. That is implemented here in `vote()`, and it is
// why a decoder that returns a header from a single burst is not conformant.

import { parseHeader } from "./same.js";

export const BAUD = 520.83;
export const MARK_HZ = 2083.3;
export const SPACE_HZ = 1562.5;
export const PREAMBLE_BYTE = 0xAB;
// §11.31(a)(2). Detected, never generated.
export const ATTN_HZ = [853, 960];

/**
 * Goertzel: energy at one frequency over one window. Cheaper than an FFT when
 * only a couple of bins are wanted, which is exactly this case.
 */
function goertzel(samples, start, len, freq, sampleRate) {
  const k = (2 * Math.PI * freq) / sampleRate;
  const coeff = 2 * Math.cos(k);
  let s0 = 0, s1 = 0, s2 = 0;
  const end = Math.min(start + len, samples.length);
  for (let i = start; i < end; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

/**
 * Demodulate to a bit string.
 *
 * `offset` sub-samples the bit clock. SAME carries no sync word beyond the
 * preamble, so the clock phase is found by trying several offsets and keeping
 * whichever yields a valid frame (see decodeBursts).
 */
function demodulate(samples, sampleRate, offset = 0) {
  const spb = sampleRate / BAUD;          // samples per bit, fractional
  const n = Math.floor((samples.length - offset) / spb);
  const bits = new Uint8Array(n);
  const conf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const start = Math.round(offset + i * spb);
    const len = Math.round(spb);
    const m = goertzel(samples, start, len, MARK_HZ, sampleRate);
    const s = goertzel(samples, start, len, SPACE_HZ, sampleRate);
    bits[i] = m > s ? 1 : 0;
    const tot = m + s;
    conf[i] = tot > 0 ? Math.abs(m - s) / tot : 0;
  }
  return { bits, conf };
}

/** LSB-first byte assembly from a bit offset. */
function byteAt(bits, at) {
  if (at + 8 > bits.length) return null;
  let b = 0;
  for (let i = 0; i < 8; i++) if (bits[at + i]) b |= (1 << i);
  return b;
}

/**
 * Find preamble runs: 0xAB repeated. Requires several consecutive matches so
 * that noise cannot fabricate a frame start.
 */
function findPreambles(bits, minRun = 8) {
  const hits = [];
  for (let at = 0; at + 8 * minRun <= bits.length; at++) {
    let run = 0;
    while (byteAt(bits, at + run * 8) === PREAMBLE_BYTE) run++;
    if (run >= minRun) {
      hits.push({ at, run, dataAt: at + run * 8 });
      at += run * 8;                       // skip past what we consumed
    }
  }
  return hits;
}

/** Read printable ASCII from a bit offset until a terminator or limit. */
function readAscii(bits, at, max = 268) {
  let out = "";
  for (let i = 0; i < max; i++) {
    const b = byteAt(bits, at + i * 8);
    if (b === null) break;
    const c = b & 0x7F;                    // eighth bit is the null bit
    if (c === 0x0D || c === 0x0A || c === 0) break;
    if (c < 0x20 || c > 0x7E) break;       // left the frame
    out += String.fromCharCode(c);
  }
  return out;
}

/**
 * Decode every burst present in a block of audio.
 *
 * Returns raw candidate strings; `vote()` applies the §11.33(a)(10) two-of-three
 * rule to decide what, if anything, was actually received.
 */
// Default clock-offset search width.
//
// SAME has no sync word beyond the preamble, so bit-clock phase is recovered by
// trying offsets and keeping whichever locks. Measured across 10 trials per
// condition at 22.05 kHz: a clean signal decodes 10/10 at any setting, but under
// noise the limiting factor is this granularity rather than SNR — 4 offsets
// gives 3/10 at -20 dB where 32 gives 9/10. 16 is the working compromise.
//
// The proper fix is transition-based clock recovery off the preamble rather
// than brute force. Worth doing before this is relied on for off-air
// monitoring; brute force is adequate for file analysis.
export function decodeBursts(samples, sampleRate, { offsets = 16 } = {}) {
  const candidates = [];
  const spb = sampleRate / BAUD;

  for (let o = 0; o < offsets; o++) {
    const offset = (o * spb) / offsets;
    const { bits, conf } = demodulate(samples, sampleRate, offset);
    for (const p of findPreambles(bits)) {
      const text = readAscii(bits, p.dataAt);
      if (!text) continue;

      if (text.startsWith("ZCZC")) {
        // Trailing hyphen is part of the header per §11.31(c).
        const end = text.indexOf("-", text.lastIndexOf("+"));
        const header = end > 0 ? text.slice(0, text.length) : text;
        let mean = 0, count = 0;
        for (let i = p.dataAt; i < Math.min(p.dataAt + header.length * 8, conf.length); i++) {
          mean += conf[i]; count++;
        }
        candidates.push({
          kind: "header",
          text: header.trim(),
          bit_offset: p.dataAt,
          preamble_bytes: p.run,
          confidence: count ? mean / count : 0,
          clock_offset: offset,
        });
      } else if (text.startsWith("NNNN")) {
        candidates.push({
          kind: "eom",
          text: "NNNN",
          bit_offset: p.dataAt,
          preamble_bytes: p.run,
          clock_offset: offset,
        });
      }
    }
  }
  return candidates;
}

/**
 * §11.33(a)(10): two of three headers must match exactly.
 *
 * SAME has no checksum, so this vote IS the error detection. Returning a header
 * seen only once would be non-conformant and, worse, would make a noise-induced
 * false positive indistinguishable from a real alert.
 */
export function vote(candidates) {
  const headers = candidates.filter(c => c.kind === "header");
  const eoms = candidates.filter(c => c.kind === "eom");

  const tally = new Map();
  for (const h of headers) {
    const k = h.text;
    if (!tally.has(k)) tally.set(k, []);
    tally.get(k).push(h);
  }

  let best = null;
  for (const [text, group] of tally) {
    if (!best || group.length > best.copies) {
      best = { text, copies: group.length, group };
    }
  }

  // How many DISTINCT transmissions of this header were seen?
  //
  // Every clock offset that locks produces its own candidate for the same
  // burst, so counting candidates would inflate the total and could declare a
  // single burst "conformant" — the one error that matters here, since
  // §11.33(a)(10) exists precisely to stop a noise artefact being treated as a
  // received alert.
  //
  // A preamble-plus-header frame is about (16 + 49) x 8 = 520 bits, and
  // §11.31(c) puts at least a one-second gap between transmissions, so real
  // bursts are separated by far more than a header length. Cluster candidates
  // that fall within half a header of each other and count the clusters.
  const BURST_SPAN_BITS = 260;
  const distinctBursts = (() => {
    if (!best) return 0;
    const offs = [...new Set(best.group.map(g => g.bit_offset))].sort((a, b) => a - b);
    let clusters = 0, last = -Infinity;
    for (const o of offs) {
      if (o - last > BURST_SPAN_BITS) { clusters++; last = o; }
    }
    return clusters;
  })();

  return {
    header: best?.text ?? null,
    copies: distinctBursts,
    // The rule is two matching of three transmitted.
    conformant: distinctBursts >= 2,
    eom_seen: eoms.length > 0,
    distinct_candidates: tally.size,
    all_candidates: [...tally.keys()],
    basis: "47 CFR §11.33(a)(10) — two of three headers must match exactly. " +
           "SAME carries no checksum; this vote is the error detection.",
  };
}

/** Attention Signal presence: 853 Hz and 960 Hz simultaneously (§11.31(a)(2)). */
export function detectAttention(samples, sampleRate, { minSeconds = 3 } = {}) {
  const win = Math.floor(sampleRate * 0.05);           // 50 ms
  const need = Math.floor((minSeconds * sampleRate) / win);
  let run = 0, best = 0, startAt = null, bestStart = null;

  for (let i = 0; i + win <= samples.length; i += win) {
    const a = goertzel(samples, i, win, ATTN_HZ[0], sampleRate);
    const b = goertzel(samples, i, win, ATTN_HZ[1], sampleRate);
    // Reference bins away from both tones, to reject broadband noise.
    const n1 = goertzel(samples, i, win, 1200, sampleRate);
    const n2 = goertzel(samples, i, win, 2600, sampleRate);
    const floor = Math.max(n1, n2, 1e-12);
    const both = a > floor * 4 && b > floor * 4;
    if (both) {
      if (run === 0) startAt = i / sampleRate;
      run++;
      if (run > best) { best = run; bestStart = startAt; }
    } else {
      run = 0;
    }
  }

  const seconds = (best * win) / sampleRate;
  return {
    present: best >= need,
    duration_seconds: Number(seconds.toFixed(2)),
    starts_at_seconds: bestStart,
    // §11.31(c) specifies 8 to 25 seconds.
    within_spec: seconds >= 8 && seconds <= 25,
    note: "853 Hz and 960 Hz simultaneously (§11.31(a)(2)). Distinct from NOAA " +
          "Weather Radio's single 1050 Hz Warning Alarm Tone — a decoder that " +
          "conflates them will misclassify NWR audio. Note also that an RWT " +
          "carries NO Attention Signal (§11.51(b)), so absence proves nothing.",
  };
}

/**
 * Full decode of one audio block.
 *
 * `year` is required to resolve the Julian day in the header, which carries no
 * year of its own.
 */
export function decodeAudio(samples, sampleRate, { year, offsets = 16 } = {}) {
  const candidates = decodeBursts(samples, sampleRate, { offsets });
  const voted = vote(candidates);
  const attention = detectAttention(samples, sampleRate);

  let parsed = null;
  if (voted.header) {
    parsed = parseHeader(voted.header, year);
  }

  // Graded finding. Losing one of three bursts is survivable; losing two leaves
  // evidence that something aired without establishing what.
  let finding = "nothing";
  if (voted.header && voted.conformant) finding = "header_decoded";
  else if (voted.header) finding = "header_unconfirmed";
  else if (attention.present) finding = "attention_signal_only";
  else if (voted.eom_seen) finding = "eom_only";

  return {
    finding,
    header: voted.header,
    parsed,
    vote: voted,
    attention,
    candidate_count: candidates.length,
    sample_rate: sampleRate,
    duration_seconds: Number((samples.length / sampleRate).toFixed(2)),
    grading:
      "header_decoded — which alert aired, high confidence. " +
      "header_unconfirmed — a header was recovered but fewer than two bursts " +
      "agreed, so §11.33(a)(10) is not satisfied and it must not be treated as " +
      "received. attention_signal_only — an alert-shaped event aired but not " +
      "which one. eom_only — an alert ended. nothing — no evidence either way.",
  };
}

/**
 * Parse a RIFF/WAVE file into mono float samples.
 *
 * Handles 8/16/24/32-bit PCM and 32-bit float, and downmixes to mono. Mono is
 * correct for this: EAS is inserted as mono by the ENDEC's relay, so summing
 * channels adds coherently.
 */
export function readWav(buf) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" ||
      buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file.");
  }

  let pos = 12, fmt = null, dataOffset = null, dataLen = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === "fmt ") {
      fmt = {
        format: buf.readUInt16LE(pos + 8),
        channels: buf.readUInt16LE(pos + 10),
        sampleRate: buf.readUInt32LE(pos + 12),
        bits: buf.readUInt16LE(pos + 22),
      };
    } else if (id === "data") {
      dataOffset = pos + 8;
      dataLen = Math.min(size, buf.length - dataOffset);
    }
    pos += 8 + size + (size % 2);          // chunks are word-aligned
  }
  if (!fmt || dataOffset === null) throw new Error("Missing fmt or data chunk.");

  const { channels, bits, sampleRate, format } = fmt;
  const bytes = bits / 8;
  const frames = Math.floor(dataLen / (bytes * channels));
  const out = new Float32Array(frames);

  for (let f = 0; f < frames; f++) {
    let acc = 0;
    for (let c = 0; c < channels; c++) {
      const o = dataOffset + (f * channels + c) * bytes;
      let v;
      if (format === 3 && bits === 32) v = buf.readFloatLE(o);
      else if (bits === 8) v = (buf.readUInt8(o) - 128) / 128;
      else if (bits === 16) v = buf.readInt16LE(o) / 32768;
      else if (bits === 24) {
        const raw = buf.readUIntLE(o, 3);
        v = (raw & 0x800000 ? raw - 0x1000000 : raw) / 8388608;
      } else if (bits === 32) v = buf.readInt32LE(o) / 2147483648;
      else throw new Error(`Unsupported bit depth: ${bits}`);
      acc += v;
    }
    out[f] = acc / channels;
  }
  return { samples: out, sampleRate, channels, bits, frames };
}
