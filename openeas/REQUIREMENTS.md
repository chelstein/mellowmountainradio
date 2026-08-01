# OpenEAS normative requirement register

Generated from `SPEC.md` by `openeas/tools/extract-requirements.js`. Do not edit by hand.

Every normative statement in the specification, with a permanent identifier.
Cite these. `OE-0042` will mean the same sentence in five years — withdrawn
requirements keep their number and it is never reused.

**140 active requirements** — 69 MUST, 47 MUST NOT, 17 SHOULD, 1 SHOULD NOT, 6 MAY.

| Verification | Meaning |
|---|---|
| `wire` | Checkable against a running implementation by `openeas-conformance` |
| `inspect` | Checkable by reading the implementation's source or distribution |
| `attest` | Not remotely checkable; the implementer states it and is accountable for it |
| `unclassified` | Not yet assigned a verification method |

---

## 1. Terminology

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0001` | MUST NOT | `attest` | Key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, |
| `OE-0002` | SHOULD NOT | `attest` | **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** are to be |

## 2.1 Not EAS Software

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0003` | MUST NOT | `attest` | An Implementation **MUST NOT** perform or manage any requirement of §11.32 |
| `OE-0004` | MUST | `attest` | **MUST** declare this in its documentation and **SHOULD** surface the declaration |

## 2.2 Not an Intermediary Device

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0005` | MUST NOT | `attest` | An Implementation **MUST NOT** hold itself out as, or function as, an Intermediary |

## 2.3 No origination capability

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0006` | MUST NOT | `wire` | An Implementation **MUST NOT** contain code capable of generating: |
| `OE-0007` | MUST NOT | `inspect` | An Implementation's repository and distributed artifacts **MUST NOT** contain EAS |

## 2.4 The mandatory-forward path must not traverse an Implementation

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0008` | MUST | `attest` | An Implementation **MUST** be architecturally incapable of adding latency to, of |
| `OE-0009` | MUST | `attest` | gating, or of holding any alert. Conforming documentation **MUST** include a signal |

## 2.5 The decoder decides

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0010` | MUST | `attest` | An Implementation **MUST** treat the certified decoder's preselected-header |
| `OE-0011` | MUST NOT | `attest` | configuration as the authoritative policy engine. An Implementation **MUST NOT** |
| `OE-0012` | MUST NOT | `attest` | maintain a parallel or competing forwarding policy, and **MUST NOT** represent its |

## 2.6 The permitted scope of assistance

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0013` | MAY | `attest` | Within that discretion, an Implementation **MAY** inform, filter, rank, explain, |
| `OE-0014` | MUST NOT | `attest` | summarize, and pre-stage. An Implementation **MUST NOT** be the decision-maker of |
| `OE-0015` | MUST | `wire` | record. Every advisory output **MUST** be represented as a proposal requiring human |
| `OE-0016` | MUST | `attest` | confirmation, and **MUST** carry the identity of the human who accepted or rejected |
| `OE-0017` | MUST NOT | `attest` | Implementation **MAY** inform such an override. It **MUST NOT** execute one. |

## 2.7 Read-only enforcement

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0018` | MUST | `attest` | An Implementation that reads from station equipment **MUST** be read-only at the |
| `OE-0019` | MUST | `attest` | device, application, or service of the Participant. An Implementation **MUST** |
| `OE-0020` | SHOULD | `attest` | document a dedicated per-integration credential and **SHOULD** use a read-only |
| `OE-0021` | SHOULD | `attest` | An Implementation **SHOULD** prefer an outbound-initiated topology, in which |

## 3. Architecture

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0022` | SHOULD | `attest` | > **SHOULD** hold an MOA. |
| `OE-0023` | MUST | `attest` | Implementation that reports historical IPAWS activity **MUST** persist alerts |
| `OE-0024` | MUST NOT | `attest` | locally as it observes them, and **MUST NOT** present the live feed as a complete |
| `OE-0025` | MUST | `attest` | A conforming Implementation **MUST** function in Tier A alone. Tiers B and C |
| `OE-0026` | MUST | `wire` | **MUST** degrade to explicit absence rather than to silence: a tool whose data |
| `OE-0027` | MUST NOT | `wire` | source is unavailable **MUST** report the source as unavailable and **MUST NOT** |

## 4. Data model

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0028` | MUST | `wire` | All timestamps are RFC 3339 with explicit offset. Implementations **MUST** store |
| `OE-0029` | MUST | `attest` | UTC and **MUST** additionally render station-local time with its zone designation, |

## 4.1 `Alert`

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0030` | MUST NOT | `attest` | \| `identity` † \| object \| `{sender, identifier, sent, key}` — the CAP **extended identifier**, which is what `<references>` uses. `identifier` alone is **NOT** unique across senders; observed forms range from `2637867444630562` to `AS-UT-c4e502b5-…` to `urn:oid:2.49.0.1.840…`. Implementations **MUST** key identity on the triple and **MUST NOT** deduplicate on `identifier` alone. \| |
| `OE-0031` | MUST NOT | `attest` | \| `parameters` † \| object \| Name → **list** of values. CAP permits repeated `valueName`s and ECIG §3.3.1 requires each occurrence be processed independently. Implementations **MUST NOT** model this as a flat dictionary. A live IPAWS evacuation carried `EAS-ORG` and `CMAMtext` twice each across English and Spanish `<info>` blocks; a flat map silently discards half. \| |
| `OE-0032` | MUST NOT | `attest` | \| `blocked_channels` \| array \| Distinct set from repeated `BLOCKCHANNEL` parameters (`EAS`, `CMAS`, `NWEM`, `CAPEXCH`). An alert carrying `BLOCKCHANNEL=EAS` is suppressed from EAS and **MUST NOT** be presented as EAS-eligible. \| |
| `OE-0033` | MUST | `wire` | \| `mandatory_forward` † \| bool \| True only for EAN, nationwide NPT, and RMT whose location codes include the Participant's state or state/county (§11.51(m)). Derived, and **MUST** be labeled derived. \| |
| `OE-0034` | MUST NOT | `attest` | An Implementation **MUST NOT** hardcode originator, event, or location code tables. |
| `OE-0035` | MUST | `attest` | Codes **MUST** be versioned data (§9.4). |
| `OE-0036` | MUST NOT | `attest` | `-06:00`). Implementations **MUST** preserve it verbatim and **MUST NOT** normalize |
| `OE-0037` | MUST | `attest` | An Implementation **MUST** prefer the SAME value, **MUST** surface the conflict |
| `OE-0038` | MUST NOT | `attest` | rather than silently resolving it, and **MUST NOT** infer a SAME code from the |
| `OE-0039` | MUST NOT | `attest` | code is assigned to this product." An Implementation **MUST NOT** treat either as |

## 4.2 `format_resolution`

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0040` | MUST | `attest` | An Implementation that models alert state **MUST** represent the legacy/CAP pairing |

## 4.4 `AirObservation`

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0041` | MUST NOT | `attest` | An Implementation **MUST NOT** present a `stream` observation as evidence of |

## 4.5 `Reconciliation`

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0042` | MUST NOT | `attest` | `unavailable` and `absent` are distinct and **MUST NOT** be conflated. A source |
| `OE-0043` | MUST | `attest` | that was not consulted has not produced a negative finding. `verdict` **MUST** be |
| `OE-0044` | MUST NOT | `attest` | An Implementation **MUST NOT** render a `discrepancy` verdict as a compliance |

## 4.6 `Operator`

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0045` | MUST NOT | `attest` | An Implementation **MUST NOT** synthesize an operator attestation, and **MUST NOT** |
| `OE-0046` | MUST | `attest` | entries without attestation **MUST** classify itself as an automatic device under |
| `OE-0047` | MUST | `attest` | §73.1820(b) and **MUST** implement the §73.1820(b)(4) manual-fallback requirement: |
| `OE-0048` | MUST | `attest` | entries manually. An Implementation **MUST** alarm on its own failure. |

## 4.7 `MonitorSource`

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0049` | MUST | `attest` | \| `assigned_by` † \| string \| **MUST** be the current approved State EAS Plan. \| |
| `OE-0050` | MUST | `attest` | EAS Plan (§11.21(b)(4)). Assignments **MUST** be configuration, never compiled in. |

## 4.9 `Disposition` — ECIG vocabulary, adopted not invented

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0051` | SHOULD | `attest` | An Implementation **SHOULD** expose this tri-state per alert, because it is |
| `OE-0052` | SHOULD | `attest` | activity **SHOULD** use that form, giving the profile a standards-blessed way to |
| `OE-0053` | MUST NOT | `attest` | does **not** mean the message aired, and an Implementation **MUST NOT** conflate |

## 5. Tool surface

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0054` | MUST NOT | `wire` | Tools are named to be unmistakably non-actuating. An Implementation **MUST NOT** |
| `OE-0055` | MUST | `wire` | Names below are protocol-neutral. An MCP binding **MUST** expose them with `.` |
| `OE-0056` | MUST | `wire` | replaced by `_` (e.g. `eas_get_active_alerts`) and **MUST** set |

## 5.4 Persistence is required for any historical claim

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0057` | MUST | `attest` | An Implementation that reports historical alert activity **MUST** persist |
| `OE-0058` | MUST | `wire` | observations locally, and **MUST** record every poll — including failed polls — |
| `OE-0059` | MUST | `wire` | An Implementation **MUST** state, wherever it reports archive contents, that |
| `OE-0060` | SHOULD | `attest` | Historical backfill **SHOULD** use the OpenFEMA `IpawsArchivedAlerts` dataset, |
| `OE-0061` | MUST NOT | `attest` | be parsed through the same code path as live traffic. Backfill **MUST NOT** be |

## 5.5 The archive must be verifiable by someone who does not trust it

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0062` | MUST | `attest` | An Implementation holding an archive **MUST** chain records by hash such that |
| `OE-0063` | MUST | `attest` | altering a record, removing one, or reordering them is detectable, and **MUST** |
| `OE-0064` | MUST | `wire` | expose verification as a tool. Verification **MUST** be possible from the stored |
| `OE-0065` | SHOULD | `attest` | Storage **SHOULD** therefore use a plain, documented, line-oriented text format. |
| `OE-0066` | MUST | `wire` | Verification **MUST** report where the chain broke rather than a bare boolean, and |
| `OE-0067` | MUST | `wire` | **MUST** state that chain integrity proves internal consistency only — never |

## 5.0 National scope

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0068` | MUST NOT | `attest` | An Implementation **MUST NOT** hardcode a single service area. Any station |
| `OE-0069` | MUST | `attest` | Alert-returning tools **MUST** accept at least one of: state (postal code or FIPS), |
| `OE-0070` | MUST | `attest` | Implementation **MUST** report which scope was applied, so a caller can never |
| `OE-0071` | SHOULD | `attest` | Location resolution **SHOULD** use the National Weather Service SAME table |

## 5.3 Validation mode

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0072` | SHOULD | `attest` | Alert-returning tools **SHOULD** accept a `validate` flag, off by default. When |
| `OE-0073` | MUST | `attest` | set, the response **MUST** include a field-by-field audit in which every check |
| `OE-0074` | MUST | `wire` | Each check **MUST** report exactly one of four results, and an Implementation |
| `OE-0075` | MUST NOT | `attest` | **MUST NOT** collapse them to a boolean: |
| `OE-0076` | MUST | `wire` | An overall verdict **MUST** be `indeterminate` whenever any check is `unknown`. |

## 5.1 Constraints on tool 12

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0077` | MUST NOT | `attest` | `eas.draft_false_alert_report` **MUST** produce a draft only. It **MUST NOT** send |
| `OE-0078` | MUST NOT | `attest` | mail, and **MUST NOT** represent a draft as a filed report. It **SHOULD** surface |

## 5.2 Absence semantics

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0079` | MUST | `wire` | Every tool **MUST** distinguish, in its response, between: |

## 6.2 Publication classes

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0080` | MAY | `attest` | \| **Public** \| Normalized alerts; SAME/CAP decodes as text; the Participant's own `StationEvent` records; own test history; own `Reconciliation` verdicts; aggregate statistics. \| **MAY** be published openly. \| |
| `OE-0081` | SHOULD | `attest` | \| **Attested** \| Log entries bearing operator identity; chief-operator reviews. \| **SHOULD** be published with identity reduced to role unless the individual consents. \| |
| `OE-0082` | MUST NOT | `attest` | \| **Never** \| EAS Attention Signal or SAME burst audio, in any encoding, at any bitrate, including excerpts. Anything replayable into an air chain that would decode as a valid alert. Credentials, equipment addresses, network topology, or configuration of EAS or studio-transmitter-link equipment. \| **MUST NOT** be published. \| |

## 6.3 Third-party findings

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0083` | MUST | `attest` | An Implementation **MUST** express such findings as observations about the |

## 6.4 Consumer obligations

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0084` | MUST | `attest` | Published data **MUST** be accompanied by a machine-readable statement that it is |
| `OE-0085` | MUST NOT | `attest` | observational, not authoritative, and **MUST NOT** be relied upon for life-safety |
| `OE-0086` | MUST | `attest` | decisions. Life-safety consumers **MUST** be directed to the alert originator. |

## 7.1 The Implementation is not the system of record

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0087` | SHOULD | `attest` | An Implementation **SHOULD** position itself as a read-only mirror and search index |
| `OE-0088` | MUST | `attest` | those sections, §7.2–7.4 are **REQUIRED**. |

## 7.2 Immutability

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0089` | MUST | `attest` | An Implementation **MUST**: |

## 7.3 Retention and export

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0090` | MUST NOT | `attest` | An Implementation **MUST NOT** implement automatic deletion at two years. It |
| `OE-0091` | MUST | `attest` | **MUST** implement a `legal_hold` mechanism. Because EAS activation records are by |
| `OE-0092` | SHOULD | `attest` | their nature incident to disasters, indefinite retention **SHOULD** be the default |
| `OE-0093` | MUST | `attest` | An Implementation **MUST** provide an export producing full-size human-readable |
| `OE-0094` | SHOULD | `attest` | copies within that window, and **SHOULD** provide an inspection mode. §73.1226(a) |
| `OE-0095` | SHOULD | `attest` | exports **SHOULD** therefore be self-contained and independently readable. |

## 7.4 Weekly review

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0096` | SHOULD | `attest` | An Implementation **SHOULD** provide a weekly review queue, an attestation step |

## 8. Air observation — provisional

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0097` | MUST NOT | `attest` | other is a per-deployment facts question. An Implementation **MUST NOT** claim |

## 8.2 The real failure mode is a dropout, so findings MUST be graded

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0098` | MUST | `attest` | identity while leaving evidence that *something* aired. An Implementation **MUST** |
| `OE-0099` | MUST NOT | `attest` | report a graded finding and **MUST NOT** collapse these to a boolean: |
| `OE-0100` | MUST NOT | `attest` | An Implementation **MUST NOT** synthesize `decoded` fields from a tone detection. |

## 8.3 Q1 — Signal path: OPEN, and decisive

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0101` | MUST | `attest` | An Implementation **MUST** record which of these it observed in `signal_path` |
| `OE-0102` | MUST NOT | `attest` | (§4.4) rather than assume, and **MUST NOT** present a `stream` observation as |

## 8.4 A liability specific to holding this evidence

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0103` | MUST NOT | `attest` | An Implementation holding such recordings **MUST NOT** re-broadcast, auto-play, or |
| `OE-0104` | MUST NOT | `attest` | export them in playable form, and **MUST NOT** serve them over any public |

## 8.5 The as-run log — a second, cheaper air record

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0105` | MUST | `attest` | An Implementation offering tool 24 **MUST** treat the as-run log as evidence of |
| `OE-0106` | MUST NOT | `attest` | and **MUST NOT** present it as satisfying §73.1820. |

## 8.5.1 Vendor neutrality is normative, not a convenience

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0107` | MUST | `attest` | An Implementation therefore **MUST**: |
| `OE-0108` | MUST NOT | `attest` | Vendor knowledge **MAY** narrow detection but **MUST NOT** replace it. |
| `OE-0109` | MUST | `attest` | Accept an **explicit column mapping** from configuration, which **MUST** |
| `OE-0110` | MUST NOT | `attest` | **MUST** return an error naming the remedy, and **MUST NOT** return |

## 8.5.2 Path candidates make no claim

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0111` | MUST | `attest` | **MUST** disclose every path probed and its result. Probing is self-verifying — |
| `OE-0112` | MUST NOT | `attest` | An Implementation **MUST NOT** report a system as present on the strength of a |
| `OE-0113` | MUST | `attest` | path guess alone, and **MUST** distinguish, per adapter, between a location that |

## 8.5.3 Systems with no flat log

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0114` | MUST | `attest` | **read** API, an Implementation **MAY** use it and **MUST** label the result with |

## 8.6 Parity

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0115` | MUST | `attest` | An Implementation offering tool 25 **MUST**: |

## 9. Forward compatibility

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0116` | SHOULD | `attest` | Implementation **SHOULD** accommodate them now; each is cheap in advance and |

## 9.1 Signature validation polarity

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0117` | MUST | `attest` | signature." The `signature` object (§4.1) is **REQUIRED** for this reason: |

## 9.2 Universal alert identifier

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0118` | MUST | `attest` | `universal_id` field (§4.1) is reserved for it and **MUST** be `null` until adopted. |

## 9.3 Geometry

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0119` | MUST | `attest` | of header codes. The `area` object (§4.1) **MUST** be capable of polygons and |

## 9.4 Versioned code tables

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0120` | MUST | `wire` | An Implementation **MUST** load code tables as versioned data, **MUST** expose the |
| `OE-0121` | MUST NOT | `wire` | table version via `eas.get_event_codes`, and **MUST NOT** reject an unknown code — |
| `OE-0122` | MUST | `wire` | unknown codes **MUST** be passed through with the code preserved verbatim. |
| `OE-0129` | MUST | `attest` | The version **MUST** appear at `table.version`, and the authority it was taken |
| `OE-0130` | MUST | `attest` | from **MUST** appear at `table.source`: |

## 10. Conformance

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0123` | MUST | `attest` | satisfies every **MUST** in §2 (regulatory position); |
| `OE-0124` | MAY | `attest` | Air observation (§8) is **OPTIONAL** and, in 0.1.0, provisional. |
| `OE-0125` | MUST | `attest` | (tool 25) conforms only if it satisfies every **MUST** in §8.5.1, §8.5.2 and §8.6. |

## 11. Open questions

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0126` | MAY | `attest` | electronic-only was located. An Implementation **MAY** serve and version the |
| `OE-0127` | MUST NOT | `attest` | Handbook; it **MUST NOT** represent itself as satisfying §11.15. |
| `OE-0128` | MUST | `attest` | Implementation reports **MUST** be labeled as the Implementation's own, not a |

## 12.2 Versioning

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0131` | MUST | `attest` | \| A new **MUST**, or a **SHOULD** raised to **MUST** \| MAJOR \| |
| `OE-0132` | SHOULD | `attest` | \| A new **SHOULD** or **MAY**, or a new optional tool \| MINOR \| |
| `OE-0133` | MUST | `attest` | An Implementation **MUST** report the profile version it targets via |
| `OE-0134` | MUST NOT | `attest` | `eas.get_conformance`. A consumer **MUST NOT** assume that an Implementation |

## 12.3 Change process

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0135` | MUST | `attest` | Changes that add or strengthen a **MUST** **MUST** state how the new |

## 12.4 Errata

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0136` | MUST NOT | `attest` | Errata **MUST NOT** change what conforms. If a correction would change what |

## 13.1 What may be claimed

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0137` | MAY | `attest` | An Implementation **MAY** state that it "conforms to OpenEAS 0.1.0" only if it |
| `OE-0138` | MUST NOT | `attest` | An Implementation **MUST NOT** describe itself as "certified" or "approved" on |

## 13.2 The three verification methods, and the honest ratio

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0139` | MUST | `attest` | every new **MUST** to declare its verification method precisely so this number |

## 13.3 The checker

| ID | Level | Verify | Requirement |
|---|---|---|---|
| `OE-0140` | MAY | `attest` | A third party **MAY** run the checker against any Implementation, including this |

