# OpenEAS reference implementation

A read-only Model Context Protocol server for observing U.S. Emergency Alert
System activity. Reference implementation of [OpenEAS 0.1.0-draft](../openeas/SPEC.md).

As of July 2026 no MCP server exists anywhere for IPAWS, CAP, SAME, ENDEC
hardware, or FCC Part 11 — verified across the official MCP registry, mcp.so,
PulseMCP, Glama, Smithery, GitHub code search, and npm. This is the first.

## What makes it different from a weather wrapper

There are a dozen MCP servers that wrap `api.weather.gov`. None of them touch the
Emergency Alert System layer. This one:

- reads **FEMA IPAWS-OPEN**, the federal alert aggregator — civil-authority
  traffic (evacuations, AMBER, Missing and Endangered Persons, civil emergency
  messages) that the Weather Service feed does not carry;
- surfaces **SAME event codes and FIPS location codes** as first-class fields,
  and decodes raw SAME header text field by field with rule citations;
- models **CAP identity as the `(sender, identifier, sent)` triple**, not
  `identifier` alone, which is not unique across senders;
- keeps **`parameter` as a repeatable multimap**, because CAP permits repeated
  `valueName`s and ECIG §3.3.1 requires each occurrence be processed
  independently. A live IPAWS evacuation carried `EAS-ORG` and `CMAMtext` twice
  each across English and Spanish `<info>` blocks — a flat dictionary would have
  silently discarded half of it;
- reports **digital signature metadata**. IPAWS signs every alert (rsa-sha256,
  `CN=IPAWSOPEN<COGID>`); `api.weather.gov` strips the signature entirely;
- distinguishes **"no alerts" from "source unavailable"**, so a broken feed can
  never be read as "no emergency."

## Regulatory position — read this before extending it

This is load-bearing, not boilerplate. Full detail in [SPEC §2](../openeas/SPEC.md).

- **Not EAS Software.** Does not perform or manage any requirement of 47 CFR
  §11.32, §11.33, or §11.56, and is therefore outside proposed §11.2(e)
  (FCC 26-38) — which would require on-premises location and expressly excludes
  cloud-based services. Crossing that line means Part 2 certification and a
  72-hour defect-repair window instead of 60 days.
- **No origination capability, ever.** No AFSK generation, no Attention Signal
  generation, no audio synthesis, no audio artifacts. §11.45(a) reaches
  *recordings and simulations*, so this binds fixtures and demos too.
  `npm run check` enforces it mechanically.
- **The decoder decides.** §11.51(m)(1) provides that the certified decoder
  determines which messages are transmitted. Anything this server computes about
  forwarding is labeled `derived: true`.
- **The mandatory-forward path does not traverse this server.** It has no
  connection to any air chain, so EAN, a nationwide NPT, and RMT cannot be
  delayed, gated, or held by it.

## Data access

| Source | Auth | Notes |
|---|---|---|
| FEMA IPAWS-OPEN EAS feed | **none** | FEMA removed EAS PIN validation in IPAWS-OPEN 4.02 (Nov 2023). Verified live. |
| NWS CAP (`api.weather.gov`) | none | `User-Agent` with contact info required. Signature stripped. |

**On the FEMA MOA.** A Memorandum of Agreement and COG registration are required
to *originate* alerts — which this software never does. FEMA's published policy
for the All-Hazards Information Feed also asks for an MOA where a consumer
*redistributes* alerts onward. Reading is technically ungated; redistribution is
an operator policy question. If you publish this data publicly, contact
`ipaws@fema.dhs.gov`. Technical questions: `fema-ipaws-lab@fema.dhs.gov`.

**The IPAWS feed has no memory.** It is a rolling ~30-minute active window, not a
log. A missed poll is an alert lost forever. This reference implementation reads
live and does not persist; a production deployment must. Historical backfill comes
from the OpenFEMA `IpawsArchivedAlerts` dataset, not yet wired up here.

## Run it

```sh
npm install
npm start                 # listens on :3100
npm run check             # conformance guard — must pass before shipping
curl localhost:3100/health
```

Configuration is environment-driven; defaults are KAZM's.

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3100` | |
| `EAS_CALLSIGN` | `KAZM` | |
| `EAS_STATE_FIPS` | `04` | Two-digit state FIPS (Arizona) |
| `EAS_COUNTY_FIPS` | `025` | County FIPS (Yavapai) |
| `EAS_NWS_ZONES` | `AZC025,AZC005` | Comma-separated NWS county zones |
| `EAS_SAME_CODES` | `000000,004000,004025,004005` | SAME watch list. **`000000` is required** to catch EAN and a nationwide NPT. |
| `EAS_TIMEZONE` | `America/Phoenix` | |

Sedona straddles the Yavapai/Coconino line, so the service area genuinely needs
both `004025` and `004005`.

Tier C — the station-side tools — only makes sense on the studio machine, and is
off unless you turn it on. Off the studio machine these tools report *unavailable*
rather than returning an empty result, because an empty parity report reads as
agreement.

| Variable | Default | Meaning |
|---|---|---|
| `OPENEAS_TIER_C` | unset | `1` enables decision recording |
| `PLAYOUT_SYSTEM` | `auto` | Adapter id, or `auto`, or `generic` |
| `PLAYOUT_LOG_DIR` | unset | As-run log directory. Skips path probing. **Any delimited export works** |
| `PLAYOUT_COLUMNS` | unset | Explicit column map, e.g. `time,title,artist,-,duration` (`-` skips). Overrides detection |
| `PLAYOUT_API_URL` | unset | Base URL for database-backed systems (AzuraCast, LibreTime) |
| `PLAYOUT_API_KEY` | unset | Credential for the authenticated history endpoint |

## Tools

All read-only, all `readOnlyHint: true`. Verbs are constrained to `get_`, `list_`,
`search_`, `explain_`, `verify_`, `draft_`, `export_` so no tool name can be
mistaken for a command to EAS equipment.

| Tool | Purpose |
|---|---|
| `eas_get_active_alerts` | Merged IPAWS + NWS alerts for the station's area, deduplicated on CAP extended identity |
| `eas_get_ipaws_feed` | The national IPAWS active window (Atom index) |
| `eas_get_ipaws_alert` | One full signed CAP alert by `POSTEDMSGID` |
| `eas_search_alert_history` | Historical NWS alerts (public endpoint covers ~7 days) |
| `eas_explain_alert` | Decode SAME header **text** field by field with rule citations |
| `eas_get_event_codes` | Versioned §11.31 code tables |
| `eas_get_conformance` | Profile version, regulatory position, tier availability, per-tool status |
| `eas_get_playout_status` | Which automation this host runs, where its as-run log is, and how that was determined |
| `eas_get_asrun_log` | What actually aired, read from the automation's as-run log |
| `eas_get_parity_report` | Decisions vs. air records — three buckets, never a score |

The remaining station-side tools (monitor health, station activity, test status,
off-air verification, compliance log, export, false-alert report drafting) are
specified but not implemented — see [SPEC §5](../openeas/SPEC.md) and the blockers
below.

## Parity, and why it works on any playout system

The last three tools implement the operating model this was built for, which is
deliberately **not** an autopilot. The certified ENDEC runs its path. The software
runs its own, independently. Parity reports where the two agree and where they
diverge, and a human reviews the divergence. Nothing here touches an air chain.

The air-record half comes from the automation's as-run log, and there is no
standard for those. Roughly forty playout systems are in serious use worldwide and
no two agree on delimiter, column order, time format, or file location. So the
**detector is the engine and vendor knowledge is only a hint**:

- Delimiter, header row, and column roles are detected from the file. Adapters
  contribute header synonyms and path candidates; they never hard-code columns.
- Path candidates are *probed*, which is self-verifying — a directory either
  exists or it does not — and every path probed is disclosed. Each adapter says
  whether its locations are vendor-documented or merely conventional.
- Detection confidence ships with the entries. A log with no header row is
  reported *low confidence, verify this* rather than parsed silently.
- A log with no recoverable structure is **refused**, not guessed at. A parser
  that mis-maps a column produces a parity report that looks authoritative and is
  wrong, and this data sits upstream of evidence.

Adapters exist for MegaSeg, Rivendell, AzuraCast, LibreTime, StationPlaylist,
RadioDJ, mAirList, SAM Broadcaster and Liquidsoap — but the important one is
`generic`. Point `PLAYOUT_LOG_DIR` at any delimited as-run export and it works on
day one, including for automation nobody here has heard of. Zetta, WideOrbit,
NexGen, Simian, Myriad, ENCO and OpX all export delimited text; that is all the
detector needs. Vendor adapters only save a station the configuration step.

Parity returns **three buckets and never collapses them into a score**: agreed,
decided-with-no-air-record, aired-with-no-decision. A score is the artefact most
likely to be quoted out of context, and "97% agreement" is exactly the number that
conceals whether the 3% was the software missing a tornado warning or the ENDEC
simply sitting downstream of the log.

That last case matters more than it sounds. If the certified ENDEC inserts
downstream of the playout system — the common arrangement — the automation never
sees the alert and logs nothing, so an **empty air-record side is the expected
result, not a finding**. Establishing which arrangement a station uses is a
one-time experiment, and it is the same experiment that resolves the off-air
blocker below: originate a Required Weekly Test (mandatory anyway under
§11.61(a)(2)(i)(A)), note the time, and see whether it appears in the log.

## Things live data taught us

Worth knowing before you trust any alert API, including this one.

**The two NWS event codes disagree, routinely.** Observed live for
Yavapai/Coconino: a product named "Flash Flood Warning" carrying
`eventCode {SAME: "FFS", NationalWeatherService: "FFW"}` — the SAME slot says
*Statement* while the name and the NWS slot say *Warning*. EAS equipment acts on
the SAME value. Never infer the SAME code from the product name. This server
surfaces the conflict in `event_code_disagreement` rather than silently picking.

**`SAME: "NWS"` is a placeholder, not a code.** Extreme Heat Warnings arrive as
`{SAME: "NWS", NationalWeatherService: "XHW"}`, meaning no SAME event code is
assigned to that product. `OTH` is used the same way. Neither is forwardable.

**Red Flag Warning is not `FRW`.** NWS fire-weather products map to `OTH`/`SPS`.
`FRW` on IPAWS generally comes from a civil authority (`EAS-ORG = CIV`). Mapping
by name would mislabel a routine forecast as a Fire Warning, so this server does
not guess — an honest `null` beats a confident wrong answer.

## Air observation — one blocker left, and it is not the one we expected

The distinguishing capability in the profile is using the station's own broadcast
recordings to independently corroborate what actually aired, decoding the SAME
header back out of the audio. Two questions gated it:

**Does the SAME burst survive lossy stream encoding? — ANSWERED, yes, decisively.**
Measured across 152 conditions with 100% header recovery: MP3 from 320 kbps down
to **24 kbps at 11.025 kHz**, AAC, Opus, hard clipping to +20 dB drive, 20:1
compression, band-limiting to 800 Hz, and broadband noise to 0 dB SNR. Failure
appears only below roughly −10 dB SNR, and MP3 does not move that threshold. The
tones sit at 1562/2083 Hz — dead centre of where every perceptual codec spends
its bits — and the modulation is frequency, not phase or amplitude. Codec anxiety
here was misplaced.

The realistic failure mode is a **stream dropout**. The three redundant header
bursts span only ~5.4 s: losing one is survivable, losing two leaves nothing but
the End of Message. Findings must therefore be graded —
`header_decoded` / `attention_signal_only` / `eom_only` / `nothing`.

**Where is the stream tapped? — OPEN, and this decides everything.** If the
recording tap sits upstream of the ENDEC, EAS never reaches the tapes and the
whole method is inapplicable. Industry comment to the FCC describes upstream
tapping as *typical*, precisely so alerts stay off webstreams.

There is a free experiment that settles it. The station must originate a Required
Weekly Test anyway under §11.61(a)(2)(i)(A). Note its wall-clock time, then run
[`samedec`](https://github.com/cbs228/sameold) (Rust, MIT/Apache-2.0, decodes
from a file) over that minute of tape. An RWT carries no Attention Signal
(§11.51(b)), so it tests the harder case — bare header recovery — directly.

**One liability to design around.** The archive will contain real Attention
Signals and SAME bursts. Re-transmitting those is the exact conduct that cost
iHeartCommunications $1,000,000 in 2015. Alert audio must never be re-broadcast,
auto-played, or exported playable.

## License

Specification: CC BY 4.0. This implementation: Apache-2.0.

Not legal advice. The regulatory analysis is research applied to software design
and warrants review by communications counsel before anyone relies on it for
compliance.
