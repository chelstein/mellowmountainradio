# OpenEAS

**An open observability and compliance profile for the U.S. Emergency Alert System.**

| | |
|---|---|
| **Version** | 0.1.0-draft |
| **Status** | Working Draft — not yet reviewed by communications counsel |
| **Editor** | KAZM 780 AM / 106.5 FM, Sedona, Arizona (Mellow Mountain Radio) |
| **Reference implementation** | `openeas-mcp/` in this repository |
| **License** | Specification: CC BY 4.0. Reference implementation: see `LICENSE` |

> **Naming note.** "EAS" collides with Expo Application Services in developer
> ecosystems. Prose in this specification and in any announcement MUST spell out
> "Emergency Alert System" on first use. The short form `OpenEAS` is reserved for
> the profile itself.

---

## 0. Scope, and what this is not

OpenEAS defines a **read-only** data model, tool surface, and publication profile
for observing Emergency Alert System activity: the alerts a station is eligible to
receive, what its equipment did with them, what its own recordings prove went to
air, and the append-only compliance record that results.

OpenEAS is **not** an EAS system. It does not originate, encode, relay, gate,
delay, or transmit alerts. It has no path to an air chain. This is a deliberate
architectural commitment, not a phase-one limitation, and §2 states it in the terms
the FCC uses.

### 0.1 The gap this addresses

Three observations motivate the profile.

**Every EAS compliance record in the United States is a self-report.** A station's
decoder logs what it believes it received and forwarded. Nothing independently
corroborates it. Enforcement is complaint- and inspection-driven, so the gap
between the log and the air is invisible until someone goes looking.

**The implementation guide the industry builds against is legally binding and
unmaintained at the same time.** 47 CFR §11.56(a)(2) requires CAP-to-EAS
conversion "following procedures set forth in the EAS-CAP Industry Group's (ECIG)
Implementation Guide," and §11.51(d) requires visual messages be constructed per
§3.6 of that same document. So the *ECIG Recommendations for a CAP EAS
Implementation Guide v1.0* (17 May 2010) is incorporated by reference into federal
rules — it is operative law, not advisory. Meanwhile the EAS-CAP Industry Group's
own published news ends in December 2010 and its listed board is "2009–2010."
Sixteen years of CAP practice have accumulated against a frozen guide maintained
by a body that no longer meets.

This profile therefore **adopts ECIG's vocabulary rather than inventing its own**
(see §4.9), and cites its section numbers directly.

**There is no API layer.** As of July 2026, no Model Context Protocol server exists
anywhere for IPAWS, CAP, SAME, ENDEC hardware, or FCC Part 11 — verified across the
official MCP registry, mcp.so, PulseMCP, Glama, Smithery, GitHub code search, and
npm. No broadcast vendor publishes one. The two incumbent ENDEC manufacturers
publish no developer API at all.

### 0.2 Non-goals

- Alert origination, in any form, under any configuration flag.
- Substituting for a certified encoder or decoder.
- Serving as a station's system of record for FCC compliance (see §7.1).
- Replacing the EAS Operating Handbook required at operator positions by
  47 CFR §11.15.

---

## 1. Terminology

Key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**,
**SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** are to be
interpreted as described in RFC 2119.

| Term | Meaning |
|---|---|
| **Implementation** | Software conforming to this profile. |
| **Participant** | An EAS Participant as defined in 47 CFR §11.11. |
| **Upstream source** | An alert feed originating outside the station: IPAWS, NWS, or a monitored broadcast source. |
| **Station source** | Data originating from the Participant's own equipment: decoder, encoder, automation, or logs. |
| **Air observation** | Evidence derived from a recording of the station's own transmitted or streamed signal. |
| **Reconciliation** | A comparison across upstream, station, and air observations for the same alert. |
| **Authoritative system** | The certified decoder, encoder, and station log. An Implementation is never authoritative. |

Citations in the form §11.x refer to 47 CFR Part 11; §73.x to 47 CFR Part 73.
Proposed rules are cited as *proposed §11.x (FCC 26-38)* and are not in force.

---

## 2. Regulatory position

This section is normative and is the load-bearing clause of the profile. An
Implementation that violates it is not conforming, and — more importantly — may
place its operator in a regulated category it did not intend to enter.

### 2.1 Not EAS Software

Proposed §11.2(e) (FCC 26-38) would define "EAS Software" as software "that
performs and/or manages the requirements specified in § 11.32, § 11.33, and
§ 11.56," required to be "located at the EAS Participant's local facility," and
expressly **excluding** cloud-based systems and cloud-based third-party EAS
services.

An Implementation **MUST NOT** perform or manage any requirement of §11.32
(encoder), §11.33 (decoder), or §11.56 (CAP processing). An Implementation
**MUST** declare this in its documentation and **SHOULD** surface the declaration
programmatically (see `eas.get_conformance`, §5.11).

Consequences of crossing this line, which the profile exists to avoid:
certification under Part 2 Subpart J, mandatory on-premises location, and a
**72-hour** defective-software repair window under proposed §11.35(b) — against
60 days for hardware under current §11.35(b).

### 2.2 Not an Intermediary Device

An Implementation **MUST NOT** hold itself out as, or function as, an Intermediary
Device under §11.56(b).

### 2.3 No origination capability

An Implementation **MUST NOT** contain code capable of generating:

- the SAME AFSK data burst (§11.31(a)(1): 520.83 bits per second, mark 2083.3 Hz,
  space 1562.5 Hz);
- the Attention Signal (§11.31(a)(2): 853 Hz and 960 Hz);
- any recording or simulation of either.

§11.45(a) prohibits transmitting the EAS codes or Attention Signal "or a recording
or simulation thereof" outside an actual emergency or authorized test. The
prohibition reaches recordings and simulations, so this constraint binds test
fixtures, sample data, demonstrations, documentation, and continuous integration
artifacts — not only production code paths.

An Implementation's repository and distributed artifacts **MUST NOT** contain EAS
Attention Signal or SAME burst audio in any encoding. Header *text* and structured
representations are permitted and are the intended interchange format.

Enforcement is active. Recent actions include an $86,400 consent decree
(December 2025, EAS tones in syndicated programming carried by roughly 546
stations), a $244,952 civil penalty, and a $146,976 proposed forfeiture. The
statutory ceiling under §1.80(b)(1) is $62,829 per violation or per day of
continuing violation, capped at $628,305 per single act.

### 2.4 The mandatory-forward path must not traverse an Implementation

§11.51(m)(2) and §11.51(n) require that the EAN event code, and the NPT event code
in a nationwide test, be transmitted **immediately**; the delay feature of
§11.51(n) may not be applied to either. §11.33(a)(11) requires an EAN header
received on any input to override all other messages.

An Implementation **MUST** be architecturally incapable of adding latency to, of
gating, or of holding any alert. Conforming documentation **MUST** include a signal
flow diagram demonstrating that the mandatory-forward path — EAN, nationwide NPT,
and RMT under §11.51(m) / §11.52(e) — does not pass through the Implementation.

### 2.5 The decoder decides

§11.51(m)(1) states that "[t]he decoder performs the functions necessary to
determine which EAS messages are automatically transmitted by the encoder."

An Implementation **MUST** treat the certified decoder's preselected-header
configuration as the authoritative policy engine. An Implementation **MUST NOT**
maintain a parallel or competing forwarding policy, and **MUST NOT** represent its
own view of what should be forwarded as authoritative.

### 2.6 The permitted scope of assistance

Discretion exists in exactly one place. §11.52(d)(4) provides that "[t]he
management of EAS Participants shall determine which header codes will
automatically interrupt their programming for State and Local Area emergency
situations affecting their audiences," and §11.31(e) marks the entire state and
local code list as optional.

Within that discretion, an Implementation **MAY** inform, filter, rank, explain,
summarize, and pre-stage. An Implementation **MUST NOT** be the decision-maker of
record. Every advisory output **MUST** be represented as a proposal requiring human
confirmation, and **MUST** carry the identity of the human who accepted or rejected
it (§4.6).

Where a Participant operates automatically and uses remote control, §11.51(o)
expressly authorizes the remote location to override transmission. An
Implementation **MAY** inform such an override. It **MUST NOT** execute one.

Note for implementers: nothing in Part 11 or in FCC 26-38 addresses artificial
intelligence or machine learning — the terms do not appear. There is accordingly
no prohibition on software-assisted handling, and equally no safe harbor. The
operative constraints are structural: who counts as authorized personnel
(§11.32(a)(1)), who may make and sign a log entry (§73.1800(a)), and who
determines forwarding policy (§11.52(d)(4)).

### 2.7 Read-only enforcement

An Implementation that reads from station equipment **MUST** be read-only at the
network layer — enforced by firewall or segmentation policy, not solely in
application logic — consistent with §11.35(d)(3), which requires that remote
management access be limited to authorized devices and authorized users.

Credentials used by an Implementation are subject to §11.35(d)(1): a minimum of
15 characters, no dictionary words, and **no reuse** across any other account,
device, application, or service of the Participant. An Implementation **MUST**
document a dedicated per-integration credential and **SHOULD** use a read-only
device account where the equipment supports one.

An Implementation **SHOULD** prefer an outbound-initiated topology, in which
station-side software polls outward and no inbound connection to the station
network is required.

---

## 3. Architecture

```
  UPSTREAM                    STATION                      AIR
  ────────                    ───────                      ───
  NWS CAP  ──┐          ┌── decoder log ──┐        ┌── recording ──┐
  IPAWS  ────┼─ open ───┤   encoder log   ├─ MOA/  ┤  SAME decode  │
  monitored  │  no auth └── monitor state ┘  local └── tone detect ─┘
  sources ───┘                                            (§8)
        │                        │                          │
        └────────────────┬───────┴──────────────────────────┘
                         ▼
              CANONICAL MODEL  (§4)
              Alert · StationEvent · AirObservation
              Reconciliation · MonitorSource · LogEntry
                         │
             ┌───────────┴────────────┐
             ▼                        ▼
      TOOL SURFACE (§5)      PUBLICATION PROFILE (§6)
      read-only, advisory    public / attested / never
```

Three tiers, by access requirement:

| Tier | Sources | Requirement |
|---|---|---|
| **A — Open** | FEMA IPAWS-OPEN EAS feed, NWS CAP (`api.weather.gov`) | None. No authentication, no credential. |
| **B — Agreement** | Alert **origination**; onward **redistribution** as a product | Memorandum of Agreement with FEMA; COG registration. |
| **C — Station** | Decoder, encoder, automation, recordings | Physical or authorized network access to the Participant's own facility. |

> **IPAWS-OPEN read access requires no credential.** FEMA removed EAS PIN
> validation in IPAWS-OPEN 4.02 (vendor webinar, 29 November 2023): an
> IPAWS-issued EAS PIN "will no longer be required to access and retrieve IPAWS
> messages from the EAS-ATOM or any other IPAWS feed." Verified live against
> `apps.fema.gov/IPAWSOPEN_EAS_SERVICE/rest/feed` on 2026-07-29 — HTTP 200,
> signed CAP, no credential.
>
> A FEMA MOA and COG registration remain required to **originate**, which this
> profile forbids outright (§2.3). FEMA's published policy for the All-Hazards
> Information Feed additionally asks for an MOA where a consumer **redistributes**
> alerts onward. Redistribution is therefore an operator policy question, not a
> technical gate, and an Implementation that publishes IPAWS-derived data
> **SHOULD** hold an MOA.

**The IPAWS feed has no memory.** It is a rolling window of roughly 30 minutes,
not a log; the `{timestamp}` argument on the `/recent/` paths is a "since" filter
over the already-truncated active set and does **not** return history. An
Implementation that reports historical IPAWS activity **MUST** persist alerts
locally as it observes them, and **MUST NOT** present the live feed as a complete
record. Server-side filtering does not work — `?statefips=04` returns the
unfiltered national feed — so relevance filtering is necessarily client-side.
Historical backfill is available from the OpenFEMA `IpawsArchivedAlerts` dataset.

A conforming Implementation **MUST** function in Tier A alone. Tiers B and C
**MUST** degrade to explicit absence rather than to silence: a tool whose data
source is unavailable **MUST** report the source as unavailable and **MUST NOT**
return an empty result that could be read as "no alerts."

---

## 4. Data model

All timestamps are RFC 3339 with explicit offset. Implementations **MUST** store
UTC and **MUST** additionally render station-local time with its zone designation,
per §73.1800(b), which requires times be marked as advanced or non-advanced.
Arizona does not observe daylight time; the designation is still required.

### 4.1 `Alert`

Normalized across CAP and legacy SAME origins. Fields marked † are required.

| Field | Type | Notes |
|---|---|---|
| `id` † | string | Implementation-stable identifier. |
| `identity` † | object | `{sender, identifier, sent, key}` — the CAP **extended identifier**, which is what `<references>` uses. `identifier` alone is **NOT** unique across senders; observed forms range from `2637867444630562` to `AS-UT-c4e502b5-…` to `urn:oid:2.49.0.1.840…`. Implementations **MUST** key identity on the triple and **MUST NOT** deduplicate on `identifier` alone. |
| `parameters` † | object | Name → **list** of values. CAP permits repeated `valueName`s and ECIG §3.3.1 requires each occurrence be processed independently. Implementations **MUST NOT** model this as a flat dictionary. A live IPAWS evacuation carried `EAS-ORG` and `CMAMtext` twice each across English and Spanish `<info>` blocks; a flat map silently discards half. |
| `blocked_channels` | array | Distinct set from repeated `BLOCKCHANNEL` parameters (`EAS`, `CMAS`, `NWEM`, `CAPEXCH`). An alert carrying `BLOCKCHANNEL=EAS` is suppressed from EAS and **MUST NOT** be presented as EAS-eligible. |
| `event_code_disagreement` | object \| null | Set where two `eventCode` values conflict. See note below. |
| `universal_id` | string \| null | Reserved for the universal alert identifier proposed in FCC 26-38 ¶50–55. Until adopted, `null`. See §9.2. |
| `origin` † | `cap` \| `same` \| `both` | Which representation(s) were observed. |
| `cap` | object \| null | CAP 1.2 fields: `identifier`, `sender`, `sent`, `status`, `msgType`, `scope`, `category[]`, `event`, `responseType[]`, `urgency`, `severity`, `certainty`, `effective`, `onset`, `expires`, `senderName`, `headline`, `description`, `instruction`. |
| `same` | object \| null | `org`, `event_code`, `locations[]` (PSSCCC), `valid_period` (TTTT), `origination` (JJJHHMM), `station_id` (LLLLLLLL). |
| `raw_header` | string \| null | Literal header text, e.g. `ZCZC-WXR-RWT-004025+0015-2091530-KAZM/FM-`. Text only; see §2.3. |
| `area` † | object | `descriptions[]`, `same_geocodes[]`, `fips[]`, `polygons[]`, `circles[]`. Geometry is required-capable, not required-present. See §9.3. |
| `signature` † | object | `{ present: bool, valid: bool \| null, algorithm: string \| null }`. See §9.1. |
| `mandatory_forward` † | bool | True only for EAN, nationwide NPT, and RMT whose location codes include the Participant's state or state/county (§11.51(m)). Derived, and **MUST** be labeled derived. |
| `duplicate_of` | string \| null | Set where §11.33(a)(10) duplicate suppression applies. |
| `format_resolution` | object \| null | See §4.2. |
| `sources[]` † | array | Provenance: which upstream source supplied this, and when. |

An Implementation **MUST NOT** hardcode originator, event, or location code tables.
Codes **MUST** be versioned data (§9.4).

`sent` carries a UTC offset that encodes the originator's local zone (observed
`-06:00`). Implementations **MUST** preserve it verbatim and **MUST NOT** normalize
to Z and discard it.

**The two event codes disagree, and this matters.** The National Weather Service
emits `eventCode` twice — once with `valueName="SAME"` and once with
`valueName="NationalWeatherService"` — and the values routinely differ. Observed
live for Yavapai/Coconino County: a product named "Flash Flood Warning" carrying
`{SAME: "FFS", NationalWeatherService: "FFW"}`, where the SAME slot says
*Statement* while the product name and the NWS slot say *Warning*. EAS equipment
acts on the **SAME** value.

An Implementation **MUST** prefer the SAME value, **MUST** surface the conflict
rather than silently resolving it, and **MUST NOT** infer a SAME code from the
product name.

Two values appearing in the SAME slot are **placeholders, not event codes**:
`NWS` (observed on Extreme Heat Warnings, `{SAME: "NWS", NationalWeatherService:
"XHW"}`) and `OTH` (observed on Extreme Fire Danger). Both mean "no SAME event
code is assigned to this product." An Implementation **MUST NOT** treat either as
forwardable.

Related trap: a **Red Flag Warning is not `FRW`**. NWS fire-weather products map
to `OTH` or `SPS`; `FRW` on IPAWS generally originates from a civil authority
(`EAS-ORG = CIV`). Name-based inference would mislabel a routine forecast as a
Fire Warning.

### 4.2 `format_resolution`

§11.55(c)(2)(i) provides that where a duplicate CAP message exists, a Participant
**shall not** transmit the legacy-format message. §11.55(c)(2)(iii) defines
duplication as identical ORG, EEE, location, and date-time codes with valid periods
covering approximately the same span. §11.55(c)(2)(ii) requires that, at least
10 seconds after detecting an initial legacy header, if no duplicate CAP message has
been identified, IPAWS be polled at least once.

An Implementation that models alert state **MUST** represent the legacy/CAP pairing
and which representation prevailed:

```json
{ "legacy_seen": true, "cap_seen": true,
  "transmitted": "cap", "suppressed": "legacy",
  "poll_performed_at": "2026-07-29T14:32:11Z", "basis": "11.55(c)(2)(i)" }
```

A log that omits this will misdescribe what aired.

### 4.3 `StationEvent`

What the Participant's equipment did. Derived from station sources; never inferred.

| Field | Type | Notes |
|---|---|---|
| `id` † | string | |
| `alert_id` | string \| null | Null where no matching alert is known. |
| `disposition` † | enum | `received`, `forwarded`, `not_forwarded`, `originated_test`, `suppressed_duplicate`, `suppressed_legacy`. |
| `same_fields` † | object | Originator, Event, Location, valid time period — the §11.51(m)(1) permanent-record minimum. |
| `transmitted_local_time` | string \| null | Required for manual actions under §11.51(m)(2), which incorporates the §11.33(a)(4) field set. |
| `mode` † | `automatic` \| `manual` | |
| `reason` | string \| null | Free text. Required where a test was not received (§11.35(a)). |
| `operator` | object \| null | See §4.6. Required for manual actions. |
| `source` † | enum | `decoder`, `encoder`, `automation`, `operator_entry`. |

### 4.4 `AirObservation`

Evidence from a recording of the station's own signal. **Provisional** — see §8.

| Field | Type | Notes |
|---|---|---|
| `id` † | string | |
| `recording_ref` † | string | Opaque reference to the source recording. |
| `offset_seconds` † | number | Position within the recording. |
| `method` † | enum | `same_decode`, `tone_detect`, `transcript_match`. |
| `confidence` † | number | 0–1. `same_decode` yields high confidence; `transcript_match` low. |
| `decoded` | object \| null | SAME fields recovered from audio, where `method` is `same_decode`. |
| `signal_path` † | enum | `off_air`, `stream`, `studio`. Records *which* signal was observed — a stream observation does not evidence over-the-air transmission. |

An Implementation **MUST NOT** present a `stream` observation as evidence of
over-the-air transmission, or the converse.

### 4.5 `Reconciliation`

| Field | Type | Notes |
|---|---|---|
| `alert_id` † | string | |
| `upstream` † | enum | `present`, `absent`, `unavailable`. |
| `station` † | enum | `present`, `absent`, `unavailable`. |
| `air` † | enum | `present`, `absent`, `unavailable`, `not_applicable`. |
| `verdict` † | enum | `consistent`, `discrepancy`, `indeterminate`. |
| `explanation` † | string | Plain language. Required for any verdict other than `consistent`. |

`unavailable` and `absent` are distinct and **MUST NOT** be conflated. A source
that was not consulted has not produced a negative finding. `verdict` **MUST** be
`indeterminate` wherever any input is `unavailable`.

An Implementation **MUST NOT** render a `discrepancy` verdict as a compliance
conclusion about any party. See §6.3.

### 4.6 `Operator`

```json
{ "identity": "string", "role": "operator|chief_operator|management",
  "attested_at": "2026-07-29T14:35:02-07:00", "signature": "string",
  "statement": "string" }
```

§73.1800(a) requires that log entries be kept by station employees "competent to
do so, having actual knowledge of the facts required," and that any employee making
an entry **sign** it, attesting that it accurately represents what transpired.

An Implementation **MUST NOT** synthesize an operator attestation, and **MUST NOT**
present machine-derived content as employee-authored. The conforming pattern is
machine-captured fact plus human attestation. An Implementation that records
entries without attestation **MUST** classify itself as an automatic device under
§73.1820(b) and **MUST** implement the §73.1820(b)(4) manual-fallback requirement:
on failure or malfunction of the automatic equipment, the designated person makes
entries manually. An Implementation **MUST** alarm on its own failure.

### 4.7 `MonitorSource`

| Field | Type | Notes |
|---|---|---|
| `designation` † | enum | `lp1`, `lp2`, `cap`, `other`. |
| `identifier` † | string | Callsign or feed name. |
| `assigned_by` † | string | **MUST** be the current approved State EAS Plan. |
| `last_valid_header` | string \| null | Timestamp. |
| `status` † | enum | `healthy`, `stale`, `failed`, `unknown`. |

Two legacy sources are required per §11.52(d)(1), with assignments from the State
EAS Plan (§11.21(b)(4)). Assignments **MUST** be configuration, never compiled in.

> Implementers: §11.52(d)(1) still refers to assignments specified in the State EAS
> Plan "and FCC Mapbook." The Commission removed the Mapbook provision in
> January 2026 (GN Docket 25-133) on the express ground that the Mapbook "has never
> been developed." Treat the State EAS Plan as the sole authority.

### 4.9 `Disposition` — ECIG vocabulary, adopted not invented

ECIG §6.4–6.6 defines the tri-state a real ENDEC computes for every CAP message,
and §11.56(a)(2) incorporates that guide into federal rules. This profile adopts
it verbatim rather than coining new terms:

| State | Meaning (ECIG) |
|---|---|
| `Accepted` | The message validated and was processed. |
| `Ignored` | A required element was **missing**. Carries a reason. |
| `Rejected` | A required element was **present but invalid**. |

ECIG §6.7 fixes the minimum element set whose absence yields *Ignored* and whose
invalidity yields *Rejected*: `alert`, `identifier`, `sender`, `sent`, `status`,
`msgType`, `scope`, `info`, `eventCode`, `area`, `geocode`.

An Implementation **SHOULD** expose this tri-state per alert, because it is
precisely what answers the operational question *"why didn't this air?"* — and it
answers it in the vocabulary the equipment itself uses.

ECIG §6.6 further defines return-message `note` values, of which one is directly
useful here: **`"Aired on <callsign>"`**. An Implementation reporting station
activity **SHOULD** use that form, giving the profile a standards-blessed way to
say what aired without inventing a term.

Distinguish carefully: `Accepted` means the equipment processed the message. It
does **not** mean the message aired, and an Implementation **MUST NOT** conflate
them. Alert existed → Participant was obligated or eligible → Participant aired it
are three separate facts from three separate sources (§4.5).

### 4.8 `LogEntry`

Append-only. See §7.

| Field | Type | Notes |
|---|---|---|
| `seq` † | integer | Monotonic, gapless. |
| `recorded_at` † | string | |
| `prev_hash` † | string | Hash of the preceding entry. |
| `hash` † | string | Over canonical serialization including `prev_hash`. |
| `kind` † | enum | `alert`, `station_event`, `test`, `equipment`, `correction`, `attestation`, `review`. |
| `payload` † | object | |
| `operator` | object \| null | §4.6. |
| `corrects_seq` | integer \| null | Present only where `kind` is `correction`. |
| `legal_hold` † | bool | See §7.2. |

---

## 5. Tool surface

Tools are named to be unmistakably non-actuating. An Implementation **MUST NOT**
expose a tool whose name or description could be read as commanding EAS equipment.
Permitted verbs: `get_`, `list_`, `search_`, `explain_`, `verify_`, `draft_`,
`export_`.

Names below are protocol-neutral. An MCP binding **MUST** expose them with `.`
replaced by `_` (e.g. `eas_get_active_alerts`) and **MUST** set
`readOnlyHint: true` and `destructiveHint: false` on every tool.

| # | Tool | Tier | Purpose |
|---|---|---|---|
| 1 | `eas.get_active_alerts` | A | Active alerts for the Participant's area, normalized per §4.1, including SAME codes and derived `mandatory_forward`. |
| 2 | `eas.search_alert_history` | A | Historical alerts by date, event code, severity, or area. |
| 3 | `eas.explain_alert` | A | Decode a SAME header or CAP message into plain language, field by field, with rule citations. Accepts header **text**. |
| 4 | `eas.get_event_codes` | A | Originator, event, and location code tables as versioned data (§9.4). |
| 5 | `eas.get_monitor_health` | C | `MonitorSource` state (§4.7). |
| 6 | `eas.get_station_activity` | C | `StationEvent` records (§4.3). |
| 7 | `eas.get_test_status` | C | RWT/RMT/NPT status; ETRS deadlines; the §11.35(b) 60-day defect clock. |
| 8 | `eas.verify_air` | C | `Reconciliation` (§4.5). Provisional — §8. |
| 9 | `eas.get_compliance_log` | C | Search the append-only log (§4.8). |
| 10 | `eas.export_log` | C | Full-size export per §7.3. |
| 11 | `eas.get_conformance` | A | This profile's version, declared regulatory position (§2), tier availability, and source health. |
| 12 | `eas.draft_false_alert_report` | C | Draft the §11.45(b) report. Drafts only — see below. |
| 13 | `eas.get_ipaws_feed` | A | The national IPAWS active window. |
| 14 | `eas.get_ipaws_alert` | A | One full signed CAP alert by identifier. |
| 15 | `eas.lookup_location` | A | Resolve SAME location codes to places; search by county or state. |
| 16 | `eas.find_alerts_for_point` | A | Alerts whose area contains a latitude/longitude. |
| 17 | `eas.get_alert_geojson` | A | An alert's area as GeoJSON. |
| 18 | `eas.get_alert_languages` | A | Every language variant of an alert. |
| 19 | `eas.search_archive` | A | Search the permanent archive of everything observed. |
| 20 | `eas.verify_archive` | A | Verify the hash chain end to end. |
| 21 | `eas.get_archive_stats` | A | Holdings **and poll coverage**. |
| 22 | `eas.backfill_history` | A | Ingest history from OpenFEMA. |

### 5.4 Persistence is required for any historical claim

The IPAWS feed holds an alert roughly 30 minutes and has no history endpoint, so
an alert issued and expired between two polls was never observable and leaves no
trace anywhere. Poll cadence, not server uptime, therefore bounds what an
Implementation can honestly assert about the past.

An Implementation that reports historical alert activity **MUST** persist
observations locally, and **MUST** record every poll — including failed polls —
so that a coverage gap is distinguishable from a quiet period. Alert counts alone
cannot make that distinction, and an audit that cannot make it is worthless.

An Implementation **MUST** state, wherever it reports archive contents, that
absence from the archive is not evidence that an alert did not exist.

Historical backfill **SHOULD** use the OpenFEMA `IpawsArchivedAlerts` dataset,
whose records carry the complete signed CAP as FEMA received it, so history can
be parsed through the same code path as live traffic. Backfill **MUST NOT** be
presented as a substitute for polling: its latency relative to real time is
undocumented.

### 5.5 The archive must be verifiable by someone who does not trust it

The premise of this profile is that EAS compliance records are self-reports
nobody can check. An archive that is itself an unverifiable self-report
reproduces exactly that problem.

An Implementation holding an archive **MUST** chain records by hash such that
altering a record, removing one, or reordering them is detectable, and **MUST**
expose verification as a tool. Verification **MUST** be possible from the stored
files and a hash implementation alone, without the Implementation's own code.
Storage **SHOULD** therefore use a plain, documented, line-oriented text format.

Verification **MUST** report where the chain broke rather than a bare boolean, and
**MUST** state that chain integrity proves internal consistency only — never
completeness, which depends on poll coverage.

### 5.0 National scope

An Implementation **MUST NOT** hardcode a single service area. Any station
configuration is a **default**, never a constraint.

Alert-returning tools **MUST** accept at least one of: state (postal code or FIPS),
SAME location codes, NWS zones, a latitude/longitude point, or nationwide. An
Implementation **MUST** report which scope was applied, so a caller can never
mistake a narrow query for an empty country.

Location resolution **SHOULD** use the National Weather Service SAME table
(`https://www.weather.gov/source/nwr/SameCode.txt`, 3,295 rows, `PSSCCC,County, ST`).
Note that statewide codes (`CCC=000`) are **absent** from that file and must be
synthesized, and that the historical `nws.noaa.gov/nwr/data/` path now returns 403
while `weather.gov/nwr/data/` returns HTML — only `/source/nwr/` returns the table.

### 5.3 Validation mode

Alert-returning tools **SHOULD** accept a `validate` flag, off by default. When
set, the response **MUST** include a field-by-field audit in which every check
names the rule or specification clause it derives from.

Each check **MUST** report exactly one of four results, and an Implementation
**MUST NOT** collapse them to a boolean:

| Result | Meaning |
|---|---|
| `pass` | Requirement satisfied. |
| `fail` | Requirement violated, or two authorities disagree. |
| `absent` | Optional element not present. **Not** a failure. |
| `unknown` | Could not be determined. **Not** a pass and **not** a failure. |

An overall verdict **MUST** be `indeterminate` whenever any check is `unknown`.
Reporting `clean` while a check could not be completed misrepresents the evidence
— which is the whole failure this profile exists to prevent.

The purpose is evidentiary. A proof of concept offered into a rulemaking record
must be inspectable: a reviewer at the Commission, at a State Emergency
Communications Committee, or at a competing vendor should be able to take one
alert, read every element, see which authority governs it, and check the verdict
without trusting the implementation.

### 5.1 Constraints on tool 12

§11.45(b) requires that, within 24 hours of actual knowledge that the station
transmitted or otherwise sent a false alert to the public, the Participant email
FCCOPS@fcc.gov. This is the only mandatory EAS incident report; the Commission
declined in FCC 26-38 ¶38 to require reporting of equipment compromise.

`eas.draft_false_alert_report` **MUST** produce a draft only. It **MUST NOT** send
mail, and **MUST NOT** represent a draft as a filed report. It **SHOULD** surface
the 24-hour deadline with the time remaining.

### 5.2 Absence semantics

Every tool **MUST** distinguish, in its response, between:

- **no alerts** — the source was consulted and returned nothing;
- **unavailable** — the source could not be consulted;
- **out of scope** — the tier is not provisioned.

Returning an empty list for the second or third case is non-conforming. The failure
mode this prevents is a consumer concluding "no emergency" from a broken feed.

---

## 6. Publication profile

This section governs what a Participant operating an Implementation may publish.
It exists because the profile's reference implementation publishes openly, and
because a standard that asks others to be transparent must specify the boundaries.

### 6.1 Rationale for open publication

Emergency Alert System transmissions are unencrypted and broadcast to the general
public. There is no confidentiality in what a station aired: any person with a
receiver and a SAME decoder can independently construct the same record.
Publication therefore removes friction from an already-public fact rather than
disclosing a private one.

### 6.2 Publication classes

| Class | Content | Disposition |
|---|---|---|
| **Public** | Normalized alerts; SAME/CAP decodes as text; the Participant's own `StationEvent` records; own test history; own `Reconciliation` verdicts; aggregate statistics. | **MAY** be published openly. |
| **Attested** | Log entries bearing operator identity; chief-operator reviews. | **SHOULD** be published with identity reduced to role unless the individual consents. |
| **Never** | EAS Attention Signal or SAME burst audio, in any encoding, at any bitrate, including excerpts. Anything replayable into an air chain that would decode as a valid alert. Credentials, equipment addresses, network topology, or configuration of EAS or studio-transmitter-link equipment. | **MUST NOT** be published. |

The audio prohibition follows §2.3. The infrastructure prohibition follows
§11.35(d)(3): publishing the management surface of equipment that routes, processes,
or inserts content into transmission defeats the segmentation the rule requires.

### 6.3 Third-party findings

A Participant's monitoring record necessarily contains evidence about its assigned
monitoring sources — including whether a required test arrived.

An Implementation **MUST** express such findings as observations about the
Participant's own receiver, not as conclusions about another party's compliance.

- Conforming: *"No valid header decoded on LP-1 during the RMT window
  2026-07-15T14:00Z–15:00Z."*
- Non-conforming: *"Station X failed to forward the Required Monthly Test."*

The distinction is not diplomatic. A Participant cannot determine from its own
receiver whether an upstream transmitter failed, propagation failed, or its own
receiver failed. The conforming form is what the evidence supports.

### 6.4 Consumer obligations

Published data **MUST** be accompanied by a machine-readable statement that it is
observational, not authoritative, and **MUST NOT** be relied upon for life-safety
decisions. Life-safety consumers **MUST** be directed to the alert originator.

---

## 7. Log integrity

### 7.1 The Implementation is not the system of record

§73.1820(a)(1)(iii) permits a separate EAS log but provides that it "is considered
a part of the station log," which imports §§73.1800, 73.1820, 73.1840, and 73.1226
in full.

An Implementation **SHOULD** position itself as a read-only mirror and search index
over authoritative sources. Where an Implementation does hold entries subject to
those sections, §7.2–7.4 are **REQUIRED**.

### 7.2 Immutability

§73.1800(d): "No automatically kept log shall be altered in any way after entries
have been recorded." §73.1800(e) prohibits erasure, obliteration, or willful
destruction during the retention period.

An Implementation **MUST**:

- store entries append-only, with no update or delete path;
- chain entries by hash (§4.8);
- represent corrections **only** as new entries with `corrects_seq` set, carrying
  sufficient information to identify where the correction was made, and when and by
  whom (§73.1840(b)(3)(ii));
- implement no log compaction, rotation, or retention-driven pruning.

Corrections to manually kept logs additionally require, under §73.1800(c), that
the erroneous portion be struck with a dated and signed explanation by the person
who kept the log, the chief operator, the station manager, or an officer of the
licensee.

### 7.3 Retention and export

§73.1840(a) sets two years, **except** that logs "involving communications incident
to a disaster," logs incident to an FCC investigation of which the licensee has been
notified, and logs incident to a claim or complaint of which the licensee has notice
are retained until the Commission authorizes destruction in writing, or the matter
is satisfied or time-barred.

An Implementation **MUST NOT** implement automatic deletion at two years. It
**MUST** implement a `legal_hold` mechanism. Because EAS activation records are by
their nature incident to disasters, indefinite retention **SHOULD** be the default
for activation entries.

§73.1840(b) permits retention on "other data-storage systems" subject to: viewing
devices adequate for FCC inspection under §73.1226; reproduction to full-size copies
on request, **completed within two full working days**; corrections carrying
where/when/by whom; and full-size reproduction for anything filed with the
Commission.

An Implementation **MUST** provide an export producing full-size human-readable
copies within that window, and **SHOULD** provide an inspection mode. §73.1226(a)
permits an FCC representative to remove logs from the licensee's possession;
exports **SHOULD** therefore be self-contained and independently readable.

### 7.4 Weekly review

§73.1870(c)(3) requires the chief operator to review station records at least once
each week to determine whether required entries are being made correctly, verify
compliant operation, then date and sign the log, initiate corrective action, and
advise the licensee of any repetitive condition.

An Implementation **SHOULD** provide a weekly review queue, an attestation step
producing a `review` entry, and detection of repeating conditions.

---

## 8. Air observation — provisional

The `AirObservation` model (§4.4) and `eas.verify_air` (tool 8) are **provisional**
in version 0.1.0. One question of the two that gated them is now answered; the
other is a per-deployment facts question. An Implementation **MUST NOT** claim
conformance for air observation until it has answered Q1 for its own facility.

### 8.1 Q2 — Decode survivability: ANSWERED, affirmatively

The SAME data burst survives lossy stream encoding. Measured across **152
conditions with 100% header recovery**, using a spec-exact generator
(§11.31(a)(1): 520.83 bps, mark 2083.3 Hz, space 1562.5 Hz, 16×`0xAB` preamble,
LSB-first bytes) decoded with `samedec`:

- **MP3** 320 kbps down to **24 kbps at 11.025 kHz** — all pass. VBR q0–q8 — all pass.
- **AAC** 32–128 kbps, **Opus** 24–128 kbps — all pass.
- **Level** to −40 dB; **clipping** to +20 dB drive; **compression** to 20:1;
  **band-limiting** to 800 Hz low-pass and 2500 Hz high-pass; **broadband noise**
  to 0 dB SNR — all pass, and pass identically raw and through MP3.
- Failure appears only below roughly **−10 to −12 dB SNR**, and MP3 does not move
  that threshold.

The mechanism: the tones sit at 1562/2083 Hz, dead centre of where perceptual
codecs spend their bits; they are pure stationary sinusoids, the easiest possible
content for an MDCT codec; and because both frequencies are integer cycles per
1.92 ms bit (4.0 and 3.0), the modulation is continuous-phase FSK. Codec
quantization noise does not move a frequency decision variable.

The widely-repeated engineering claim that broadcast audio processing destroys
SAME data appears **unsubstantiated**. The strongest documentation found is the
Sage manual's own footnote: "While it is probably possible to adjust (or
mis-adjust) processing so that EAS alert data will not pass through in a way that
will be decodable, we had no trouble with processing during testing."

**Implementations MUST NOT let codec anxiety shape the design.** Budget the
engineering concern for Q1 and for dropouts.

### 8.2 The real failure mode is a dropout, so findings MUST be graded

The three redundant header transmissions span only about 5.4 seconds. Measured:
excising or muting up to 2.0 s still recovers the header; muting 3.6 s — enough to
destroy two of three bursts — recovers nothing but the End of Message.

A single ~4 second stream stall at the wrong instant therefore costs the alert's
identity while leaving evidence that *something* aired. An Implementation **MUST**
report a graded finding and **MUST NOT** collapse these to a boolean:

| `method` / finding | Evidences | `confidence` |
|---|---|---|
| `header_decoded` | which alert aired | high |
| `attention_signal_only` | an alert-shaped event aired | medium |
| `eom_only` | an alert ended | low |
| `nothing` | no evidence either way | — |

An Implementation **MUST NOT** synthesize `decoded` fields from a tone detection.

Two caveats on tone detection: §11.45(a) permits the Attention Signal in EAS public
service announcements under §11.46, so detections have legitimate false positives;
and an RWT carries **no** Attention Signal at all (§11.51(b)), so tone detection
alone will miss every weekly test.

### 8.3 Q1 — Signal path: OPEN, and decisive

Whether the station's EAS insertion point sits upstream or downstream of the
recording tap. Where the recording is taken from a streaming relay and the ENDEC
inserts downstream of that tap, the recording contains no EAS activity whatsoever
and the method is inapplicable.

**The industry norm is the unfavorable case.** Broadcast industry comment to the
FCC on internet alerting (PS Docket Nos. 15-94, 15-91) characterizes station
streaming feeds as "originated upstream of the EAS encoder/decoder in the
programming chain." There is no FCC requirement to carry EAS on a webstream, and
many stations deliberately tap upstream to keep alerts off it.

Four topologies, with their consequences:

| Tap point | EAS in recordings | Viable |
|---|---|---|
| Console or automation, upstream of ENDEC | no | **no** |
| Post-ENDEC, pre-processor | yes, clean | yes |
| Post-processor / STL feed | yes, processed | yes — §8.1 shows processing is not the obstacle |
| Off-air receiver | yes, true radiated signal | **strongest** — the only path that evidences what the transmitter actually radiated |

An Implementation **MUST** record which of these it observed in `signal_path`
(§4.4) rather than assume, and **MUST NOT** present a `stream` observation as
evidence of over-the-air transmission.

**The resolving experiment is free.** A Participant must originate a Required
Weekly Test anyway under §11.61(a)(2)(i)(A). Note its wall-clock time, then decode
that minute of the recording. Because an RWT carries no Attention Signal, it tests
bare header recovery — the harder case — directly.

### 8.4 A liability specific to holding this evidence

An air-observation archive contains genuine Attention Signals and SAME bursts.
Re-transmitting them is the exact conduct that drew a **$1,000,000** civil penalty
against iHeartCommunications in 2015, when a syndicated programme aired EAS tones
from a recording and cascaded false activations across more than 70 affiliates.

An Implementation holding such recordings **MUST NOT** re-broadcast, auto-play, or
export them in playable form, and **MUST NOT** serve them over any public
interface (§6.2, **Never** class).

Air observation is the profile's distinguishing capability. It is stated
provisionally because a standard that overclaims its evidence is worse than one
that scopes honestly.

---

## 9. Forward compatibility

FCC 26-38 proposes four changes that bear directly on this data model. An
Implementation **SHOULD** accommodate them now; each is cheap in advance and
expensive to retrofit.

### 9.1 Signature validation polarity

Proposed §11.56(c) would change from rejecting messages that "include an invalid
digital signature" to rejecting messages that "do not include a valid digital
signature." The `signature` object (§4.1) is **REQUIRED** for this reason:
`{present, valid}` must be distinguishable, because absence and invalidity would
become equivalent in effect but remain distinct as facts.

### 9.2 Universal alert identifier

FCC 26-38 ¶50–55 proposes a universal alert identification number to detect and
block duplicates. Legacy SAME headers provide no stable cross-format key. The
`universal_id` field (§4.1) is reserved for it and **MUST** be `null` until adopted.
This is the single highest-value alignment available to the profile.

### 9.3 Geometry

Proposed §11.55(d) would key relay decisions off "an event code and CAP area segment
(using SAME geocodes or polygon/circle coordinates)." Current §11.55(d) speaks only
of header codes. The `area` object (§4.1) **MUST** be capable of polygons and
circles, not only PSSCCC geocodes.

### 9.4 Versioned code tables

Event codes change. MEP (Missing and Endangered Persons) was added effective
8 September 2025 by FCC 24-83; §11.31(d)(2) was reserved in January 2026. A
multilingual template proposal (89 FR 16504) remains pending and would introduce
template identifiers with language variants.

An Implementation **MUST** load code tables as versioned data, **MUST** expose the
table version via `eas.get_event_codes`, and **MUST NOT** reject an unknown code —
unknown codes **MUST** be passed through with the code preserved verbatim.

---

## 10. Conformance

An Implementation conforms to OpenEAS 0.1.0 if it:

1. satisfies every **MUST** in §2 (regulatory position);
2. implements tools 1–4 and 11 (§5), the Tier A minimum;
3. implements absence semantics per §5.2;
4. implements §6.2 publication classes, including the **Never** class;
5. implements §7.2 immutability for any log entries it holds;
6. ships a signal flow diagram per §2.4;
7. contains no EAS audio artifact anywhere in its repository or distribution.

Air observation (§8) is **OPTIONAL** and, in 0.1.0, provisional.

---

## 11. Open questions

Recorded rather than resolved. Each warrants review by communications counsel
before this draft is frozen.

1. **Electronic-only EAS Operating Handbook.** §11.15 requires "a copy" located at
   normal duty positions; §11.41 requires "immediate access." Neither specifies
   medium, and no FCC statement, public notice, or enforcement action addressing
   electronic-only was located. An Implementation **MAY** serve and version the
   Handbook; it **MUST NOT** represent itself as satisfying §11.15.
2. **AI-assisted log entries under §73.1800(a).** Whether an entry derived by
   software can satisfy "station employees competent to do so, having actual
   knowledge." The profile's answer is §4.6 — machine fact, human attestation —
   which is defensible but untested.
3. **The boundary of "assist" under §11.52(d)(4).** A ranked advisory list is
   comfortably assist. Auto-applying a model-derived decoder policy is not. The
   middle needs an explicit documented line.
4. **CAP polling interval.** §11.52(d)(2) requires only "regularly poll." The single
   hard figure is the ≥10 second rule of §11.55(c)(2)(ii). Any polling-health SLO an
   Implementation reports **MUST** be labeled as the Implementation's own, not a
   regulatory threshold.
5. **Whether a read-only Implementation is "remotely managed equipment that routes,
   processes, or inserts content"** under §11.35(d). "Routes" is undefined. Keep
   provably out of the content path and document the data flow.
6. **§11.16 status.** The January 2026 order's preamble and amendatory heading
   indicate removal, the numbered amendatory instruction appears absent, and the
   section remains in the eCFR as of the 2026-07-01 snapshot. Do not rely on it in
   either direction.
7. **Two-source monitoring over IP.** §11.51(o) requires a decoder at a remote
   location *directly* monitoring both assigned sources for manual operation.
   Whether IP-delivered audio is "direct" is unaddressed; the plain reading and the
   Commission's resilience rationale (FCC 26-38 ¶98) both suggest not. Assume
   automatic operation in any remote-console design.

---

## 12. References

**Rules** (47 CFR, eCFR snapshot 2026-07-01) — Part 11 §§11.2, 11.11, 11.15, 11.21,
11.31, 11.32, 11.33, 11.34, 11.35, 11.41, 11.44, 11.45, 11.46, 11.51, 11.52, 11.54,
11.55, 11.56, 11.61; Part 73 §§73.1226, 73.1350, 73.1800, 73.1820, 73.1840, 73.1870;
§1.80.

**Proceedings** — FCC 26-38, Report and Order in PS Dockets 25-224 and 22-329 and
Further Notice of Proposed Rulemaking in PS Dockets 25-224, 15-94, 15-91 (adopted
25 June 2026, released 29 June 2026). FCC 25-50, Modernization of the Nation's
Alerting Systems NPRM, PS Docket 25-224, 90 FR 41530. FCC 25-80, GN Docket 25-133,
91 FR 1400. FCC 24-83, 89 FR 72724 (MEP event code). 89 FR 16504 (multilingual
template NPRM, pending).

**Standards** — OASIS Common Alerting Protocol v1.2; IPAWS CAP v1.2 Profile;
ECIG Recommendations for a CAP EAS Implementation Guide v1.0 (17 May 2010,
unmaintained); RFC 2119; RFC 3339.

---

*This specification is regulatory research applied to software design. It is not
legal advice. §11 items, and the whole of §2, warrant review by communications
counsel before any party relies on this profile for compliance.*
