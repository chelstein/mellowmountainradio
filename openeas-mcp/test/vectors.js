// OpenEAS test lab — SAME test vector generator.
//
// ┌───────────────────────────────────────────────────────────────────────────┐
// │  IN-MEMORY ONLY. NEVER WRITES A FILE. NEVER TOUCHES AUDIO HARDWARE.       │
// │  IMPORTED ONLY BY test/run.js. THE SERVER NEVER IMPORTS THIS.             │
// └───────────────────────────────────────────────────────────────────────────┘
//
// Why this exists, stated plainly because it looks like the thing the rest of
// this project forbids:
//
// A demodulator that has never been checked against a known signal is not a
// demodulator anyone should rely on, and certainly not one to offer into a
// rulemaking record. Verifying lib/samedecode.js requires a signal whose
// contents are known in advance. There are exactly two sources for that: real
// recorded EAS audio, or a generated vector. Real recorded audio is what
// §11.45(a) most squarely reaches, so a generated vector — held in memory,
// consumed immediately by the decoder, and discarded — is the safer of the two.
//
// §11.45(a) prohibits transmitting the codes or Attention Signal "or a
// recording or simulation thereof". The operative verb is transmit. A Float32
// array that exists for microseconds inside a test process, is never written to
// disk, never sent to an audio device, and never reaches an encoder or an air
// chain, is not a transmission and cannot become one.
//
// Constraints that keep it that way, and that must not be relaxed:
//   * returns a Float32Array; it has no file-writing and no playback code
//   * lives in test/, imported by test/run.js and nothing else
//   * the server does not import it, and adding such an import should be
//     treated as a defect

export const BAUD = 520.83;
export const MARK_HZ = 2083.3;
export const SPACE_HZ = 1562.5;

/**
 * Modulate a SAME frame to samples, in memory.
 *
 * Continuous phase: both tones are an integer number of cycles per 1.92 ms bit
 * (4.0 and 3.0 respectively), so carrying phase across bit boundaries is what
 * the real signal does and what the decoder expects.
 */
function afsk(bytes, sampleRate, phaseRef) {
  const spb = sampleRate / BAUD;              // fractional, e.g. 42.3366 at 22.05k

  const bits = [];
  for (const b of bytes) {
    for (let i = 0; i < 8; i++) bits.push((b >> i) & 1);   // LSB first, §11.31(b)
  }

  // Bit boundaries must fall at fractional sample positions. Rounding samples
  // per bit to an integer looks harmless and is not: at 22.05 kHz it yields 42
  // samples per bit, which is 525 baud rather than 520.83. The resulting signal
  // is off-spec and drifts roughly one bit every 40, so a correct demodulator
  // decodes the first few characters and then garbles — which is exactly the
  // symptom this bug produced before it was found.
  const total = Math.round(bits.length * spb);
  const out = new Array(total);
  let phase = phaseRef.value;
  for (let s = 0; s < total; s++) {
    const idx = Math.min(bits.length - 1, Math.floor(s / spb));
    const f = bits[idx] ? MARK_HZ : SPACE_HZ;
    out[s] = Math.sin(phase);
    phase += (2 * Math.PI * f) / sampleRate;
    if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
  }
  phaseRef.value = phase;
  return out;
}

function silence(seconds, sampleRate) {
  return new Array(Math.round(seconds * sampleRate)).fill(0);
}

/** Two simultaneous tones — the §11.31(a)(2) Attention Signal shape. */
function twoTone(seconds, sampleRate, f1, f2) {
  const n = Math.round(seconds * sampleRate);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = 0.5 * (Math.sin((2 * Math.PI * f1 * i) / sampleRate) +
                    Math.sin((2 * Math.PI * f2 * i) / sampleRate));
  }
  return out;
}

/**
 * Build a full SAME frame: preamble+header ×3, optional Attention Signal,
 * optional message gap, preamble+EOM ×3. Mirrors §11.31(c).
 */
export function buildFrame(header, {
  sampleRate = 22050,
  bursts = 3,
  attentionSeconds = 0,
  messageSeconds = 0,
  eom = true,
  noiseDb = null,
  gapSeconds = 1,
} = {}) {
  const preamble = new Array(16).fill(0xAB);
  const headerBytes = [...preamble, ...[...header].map(c => c.charCodeAt(0))];
  const eomBytes = [...preamble, ...[..."NNNN"].map(c => c.charCodeAt(0))];
  const phase = { value: 0 };

  let s = [];
  for (let i = 0; i < bursts; i++) {
    s = s.concat(afsk(headerBytes, sampleRate, phase), silence(gapSeconds, sampleRate));
  }
  if (attentionSeconds > 0) {
    s = s.concat(twoTone(attentionSeconds, sampleRate, 853, 960), silence(0.5, sampleRate));
  }
  if (messageSeconds > 0) s = s.concat(silence(messageSeconds, sampleRate));
  if (eom) {
    for (let i = 0; i < 3; i++) {
      s = s.concat(afsk(eomBytes, sampleRate, phase), silence(gapSeconds, sampleRate));
    }
  }

  const out = new Float32Array(s);
  if (noiseDb !== null) {
    const amp = Math.pow(10, noiseDb / 20);
    for (let i = 0; i < out.length; i++) out[i] += (Math.random() * 2 - 1) * amp;
  }
  return out;
}
