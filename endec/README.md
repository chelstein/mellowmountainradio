# ENDEC — software EAS encoder

**This directory is deliberately outside `openeas-mcp/`.** The installer copies
`lib/`, `scripts/`, `test/`, and `server.js` and nothing else, so nothing here
can reach the public droplet. That separation is structural, not a convention —
do not move these files under `openeas-mcp/`, and do not import them from the
server.

## What this is

The §11.32 encode function in software: SAME header generation and the Attention
Signal. Together with `openeas-mcp/lib/samedecode.js` (§11.33 decode) it is the
signal-processing core of an ENDEC.

It exists because FCC 26-38 ¶88–117 proposes permitting EAS capabilities to be
implemented in software, Digital Alert Systems opposed that on the ground that
no framework exists, and the Commission said such questions are "properly
considered within a rulemaking proceeding." A proof of concept is how that
question gets answered, and a proof of concept that cannot encode proves
nothing.

## What it must never do

**47 CFR §11.45(a)** prohibits transmitting the EAS codes or Attention Signal
"or a recording or simulation thereof" outside an actual emergency or an
authorized test. That prohibition reaches recordings and simulations, so it binds
the *output of this code*, not merely its use.

- Output goes to a file or a buffer. There is no playback path here and none may
  be added.
- Never route output to an audio interface, a virtual audio device, a stream
  encoder, MegaSeg, or anything that reaches an air chain.
- Never commit generated audio to any repository.
- The enforcement precedent is real: iHeartCommunications paid **$1,000,000** in
  2015 after a syndicated programme aired tones from a recording, cascading
  false activations across 70+ affiliates. Later actions ran to $244,952 and
  $86,400.

## What it is not

Running this does not make a station's EAS path lawful. **§11.34 requires
encoders and decoders certified under Part 2, Subpart J**, and no certification
path exists for software today — that is precisely what FCC 26-38 proposes to
create. Until it does, the certified ENDEC remains the station's EAS equipment
and this remains a development and evidence-gathering tool.

## Use

```sh
node encode.js --header "ZCZC-EAS-RWT-004025+0015-2101800-KAZM/FM -" --out /tmp/frame.wav
node encode.js --header "..." --attention 8 --message alert.wav --out /tmp/frame.wav
```

Round-trip against the decoder — the actual point of having both:

```sh
node roundtrip.js
```
