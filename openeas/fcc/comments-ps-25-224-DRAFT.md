# DRAFT — Comments of KAZM / Cutter Grind Broadcasting LLC

> **STATUS: DRAFT FOR THE LICENSEE'S REVIEW. NOT FILED.**
>
> This document was prepared to be ready when the comment window opens. As of
> 30 July 2026, **FCC 26-38 has not been published in the Federal Register**
> (verified against the Federal Register API), so the 30-day comment period has
> not begun. Do not file until publication; then confirm the exact deadline from
> the published notice rather than from this document.
>
> **Review by communications counsel is strongly recommended before filing.**
> This is a technical submission written by the licensee's engineering side. It
> makes factual representations about a licensed station's own systems, and it
> takes positions adverse to at least one equipment manufacturer that has already
> opposed the licensee's Petition for Declaratory Ruling. Both warrant a lawyer's
> read.
>
> Bracketed items marked **[CONFIRM]** need the licensee to verify or supply
> facts the drafter could not independently establish.

---

**Before the**
**FEDERAL COMMUNICATIONS COMMISSION**
**Washington, D.C. 20554**

| In the Matter of | |
|---|---|
| Modernization of the Nation's Alerting Systems | PS Docket No. 25-224 |
| Amendment of Part 11 of the Commission's Rules Regarding the Emergency Alert System | PS Docket No. 15-94 |
| Wireless Emergency Alerts | PS Docket No. 15-91 |

## COMMENTS OF CUTTER GRIND BROADCASTING LLC

Cutter Grind Broadcasting LLC, licensee of **KAZM(AM), Sedona, Arizona**, and its
FM translator, submits these comments in response to the Further Notice of
Proposed Rulemaking in FCC 26-38, released 29 June 2026.

The licensee has participated in these proceedings previously, including a
Supplemental Filing and Notice of Ex Parte in PS Docket Nos. 15-94 and 22-329
(31 July 2025), a Comment and a Petition for Declaratory Ruling in PS Docket
No. 15-94 (4 August 2025), a Statement in PS Docket No. 25-224 (11 August 2025),
and comments in PS Docket No. 25-224 (22 September 2025).

These comments are narrower than those filings and are grounded in something the
earlier ones could not offer: **a working implementation, in continuous operation,
that the Commission and any other party can inspect.**

---

## SUMMARY

KAZM supports the Commission's proposal to permit EAS capabilities to be
implemented in software rather than dedicated hardware. In opposing that
proposal, Digital Alert Systems argued that no certification process and no
cybersecurity standard exists for EAS software. The Commission responded that
those questions are "properly considered within a rulemaking proceeding." KAZM
agrees, and offers evidence toward answering them: a software system reading the
federal alert infrastructure in production today, whose integrity properties can
be verified by third parties without trusting its operator.

KAZM also supports the proposals on alert authentication, a universal alert
identifier, and expanded geotargeting, and offers implementation experience
bearing on each. The universal identifier in particular addresses a defect this
licensee encountered directly and can document.

Finally, KAZM asks the Commission to recognize a category its proposals do not
presently reach: **read-only observability of the alerting system.** Software that
merely *observes* — that originates nothing, transmits nothing, and touches no air
chain — is not "EAS Software" as proposed §11.2(e) would define it, and should not
inadvertently be swept into that definition. The distinction matters, because that
category is where independent verification of EAS performance becomes possible at
all.

---

## I. INTEREST OF THE COMMENTER

KAZM is a small commercial station in Sedona, Arizona, serving Yavapai and
Coconino Counties. It is an EAS Participant. It has no manufacturing interest in
EAS equipment, sells nothing to broadcasters, and has no commercial stake in the
outcome beyond operating its own facility.

That is relevant because most of the record in EAS proceedings comes from
equipment manufacturers and from national trade associations. Small licensees
bear the cost of Part 11 compliance and receive its rules, but rarely file.
**[CONFIRM: licensee may wish to state operating status of the AM/FM facilities as
of the filing date.]**

---

## II. THE COMMISSION SHOULD ADOPT THE SOFTWARE EAS PROPOSAL (¶88–117)

### A. The objection to software EAS is answerable, and this filing answers part of it

Digital Alert Systems opposed NAB's petition on the ground that there exists no
FCC certification process and no cybersecurity standard for EAS software. The
Commission declined to treat that as dispositive, observing that such matters are
properly resolved in a rulemaking.

The premise deserves scrutiny. The absence of a certification framework is not a
property of software; it is a consequence of the Commission never having needed
one, because §11.34 has always required Part 2 certification of physical
encoders and decoders. An absent framework is an argument for building one, not
for foreclosing the category — and the Commission builds certification frameworks
routinely.

KAZM's contribution is narrower and factual. Since July 2026 the licensee has
operated software that reads the federal alerting infrastructure continuously:
the IPAWS-OPEN feed at `apps.fema.gov` and the National Weather Service CAP
service. It parses CAP 1.2 and the IPAWS Profile, resolves SAME event and
location codes, evaluates each message against the minimum element set in the
ECIG Implementation Guide, and records what it observed in an append-only,
hash-chained archive.

Two figures bear on feasibility. Against 120 signed CAP documents drawn from
FEMA's own `IpawsArchivedAlerts` dataset, the parser achieved a **100% parse
rate**. In live operation the same code path handles the live feed, so historical
and real-time processing are not two implementations that can drift apart.

The licensee does **not** claim this software is certifiable today, or that it
performs the functions of a certified decoder. It does not. The claim is
narrower: the technical difficulty of correctly processing CAP-to-EAS semantics
in software is demonstrably tractable, and the Commission need not accept an
assertion to the contrary from parties whose existing products would face new
competition.

### B. The on-premises limitation is sound; the cloud exclusion should be preserved

Proposed §11.2(e) would require EAS Software to be located at the Participant's
local facility and would exclude cloud-based systems and cloud-based third-party
EAS services. KAZM supports that limitation and urges the Commission not to
weaken it.

The reasoning at ¶98 — that emergency planning should assume commercial IP
transport may be unavailable across a wide area — is correct and matches
operational reality in rural Arizona, where a regional fibre cut or a wildfire
affecting transport can isolate a community precisely when alerting matters most.
A station whose EAS decoding depends on reaching a distant data centre has
introduced a dependency that fails in the scenario the system exists for.

KAZM notes that it has structured its own software to fall **outside** proposed
§11.2(e) deliberately, for this reason among others. See Part IV below.

### C. The 72-hour repair window for software is too short

Proposed §11.35(b) would allow a Participant only **72 hours** to operate with
defective EAS Software, against **60 days** for defective hardware.

KAZM respectfully suggests this is backwards on the facts. Software defects are
typically remediable in hours by reinstalling a known-good version — an operation
requiring no parts, no shipping, and no site visit. Hardware defects require an
RMA, a replacement unit, and an engineer at the transmitter site, which is why
60 days is reasonable for hardware.

If the Commission's concern is that a software failure may be less visible than a
dead box, the proportionate response is a **notification** obligation, not a
compressed repair clock. A 72-hour window in a small market — where the engineer
may be a contractor covering several stations across a large area — risks pushing
licensees back toward hardware for reasons unrelated to reliability.

**Recommendation:** align the software window with the hardware window at 60 days,
or in the alternative adopt a shorter window coupled to an automated
self-monitoring requirement that the software must alarm on its own failure.

---

## III. THE TECHNICAL PROPOSALS

### A. Universal alert identifier (¶50–55) — strongest support

KAZM supports this proposal more strongly than any other in the FNPRM, because
the defect it addresses is one the licensee encountered in implementation and can
document.

CAP's `identifier` element is **not unique across senders**. Observed formats in
live IPAWS traffic vary widely, from bare numeric strings to UUIDs to OID-based
URNs. Correct de-duplication therefore requires the CAP "extended identifier" —
the `(sender, identifier, sent)` triple — which is what CAP's own `<references>`
element uses. Any implementation that keys on `identifier` alone will
mis-deduplicate, and the failure is silent.

Legacy SAME headers provide no cross-format key at all. So a Participant
receiving the same emergency as both a legacy header and a CAP message must infer
their relationship from originator, event code, location codes, and timing —
which is exactly what §11.55(c)(2)(iii) prescribes, and exactly the kind of
heuristic that a stable identifier would render unnecessary.

**A universal alert identifier would eliminate an entire class of duplicate-relay
error.** KAZM urges adoption, and asks that the identifier be required in **both**
CAP and, where technically feasible, legacy representations, so that the pairing
required by §11.55(c)(2) becomes deterministic rather than inferential.

### B. Alert authentication (¶41–48)

KAZM supports requiring authentication before transmission, and offers one
implementation observation.

Proposed §11.56(c) would change the rule from rejecting messages that "include an
invalid digital signature" to rejecting messages that "do not include a valid
digital signature." That inverts the default, and correctly so.

The implementation consequence is that **three states must be distinguished, not
two**: signature present and valid; signature present and invalid; and signature
absent or not verified. Systems that collapse the third into either of the first
two will misreport. KAZM's own software reports an unverified signature as
*unknown* rather than as valid or invalid, and marks any overall assessment
containing an unknown as *indeterminate* rather than clean.

One factual note the Commission may find useful: alerts retrieved from IPAWS-OPEN
carry their XML digital signature, while the same alerts retrieved through the
National Weather Service's JSON representation at `api.weather.gov` **do not** —
the signature is stripped in that representation. Any authentication requirement
should be explicit about which retrieval path it governs, or Participants relying
on the JSON path will be unable to comply through no fault of their own.

### C. Geotargeting (¶70–75)

KAZM supports keying relay decisions on CAP area segments including polygon and
circle coordinates, and has implemented that capability.

One caution from live data: **IPAWS alerts frequently carry no geometry at all.**
Civil-authority alerts in particular are often geocode-only, resolvable no more
finely than the county. A rule assuming geometry will be present would either
fail against a large fraction of real traffic or silently degrade to county
resolution without telling the operator which happened. KAZM suggests any adopted
rule require that a Participant's equipment **report the resolution actually
achieved**, so that "the whole county was alerted" is distinguishable from "we
could not do better than the whole county."

---

## IV. AN UNREPRESENTED CATEGORY: READ-ONLY OBSERVABILITY

The FNPRM contemplates software that *performs* EAS functions. It does not
address software that only *observes* them, and KAZM asks the Commission to
recognize the distinction expressly.

### A. Why the category matters

**Every EAS compliance record in the United States is a self-report.** A station's
decoder logs what it believes it received and forwarded. Nothing independently
corroborates it. Enforcement is complaint- and inspection-driven, so a divergence
between the log and what actually aired is invisible until someone goes looking.

That is a peculiar situation for a life-safety system, and it is not one the
Commission's proposals address. Software that observes — correlating what the
federal aggregator distributed against what a station's equipment reports doing,
and against evidence of what the station actually transmitted — is the only
practical route to independent verification.

### B. Such software is not, and should not become, "EAS Software"

KAZM's implementation performs and manages **no** requirement of §11.32, §11.33,
or §11.56. It cannot originate, encode, relay, delay, or transmit an alert. It has
no connection to any air chain, and therefore cannot add latency to, gate, or hold
an EAN, a nationwide NPT, or an RMT. It contains no code capable of generating the
SAME data burst or the Attention Signal, and no such audio exists anywhere in its
distribution — a constraint enforced automatically at install and again at every
service start, because §11.45(a) reaches recordings and simulations, not only
transmissions.

The certified decoder remains authoritative for every forwarding decision, as
§11.51(m)(1) provides. Anything the observing software derives about forwarding
obligations is labelled as derived.

**Request:** if the Commission adopts proposed §11.2(e), KAZM asks that it state in
the accompanying order that software which does not perform or manage §11.32,
§11.33, or §11.56 functions is not "EAS Software," and is not thereby subject to
certification or to the on-premises requirement. Without that clarity, useful
monitoring and compliance tooling may be chilled by uncertainty about whether
building it triggers an equipment authorization obligation.

### C. Records should be verifiable, not merely retained

Sections 73.1800(d) and (e) forbid altering or erasing an automatically kept log.
Those rules describe an obligation but specify no mechanism, so compliance is
itself a self-report.

KAZM has implemented its archive as an append-only, hash-chained record: each
entry's SHA-256 covers a canonical serialization that includes the prior entry's
hash. Altering an entry, removing one, or reordering them is detectable by anyone
holding the files — using only a hash implementation, **not KAZM's software and not
KAZM's word.** The licensee has tested this against content alteration, against
alteration with the hash recomputed to conceal it, and against outright deletion;
each is detected and distinguished. An independent verifier written from the
format description alone reproduces the result.

KAZM does **not** propose that the Commission mandate any particular technique.
It offers the observation that "records shall not be altered" and "alteration of
records is detectable" are very different assurances, that the second is
inexpensive to achieve, and that the Commission may wish to encourage it as EAS
recordkeeping moves into software.

---

## V. TWO MAINTENANCE PROBLEMS THE COMMISSION SHOULD ADDRESS

### A. The ECIG Implementation Guide is operative law and is unmaintained

Section 11.56(a)(2) requires CAP-to-EAS conversion "following procedures set forth
in the EAS-CAP Industry Group's (ECIG) Implementation Guide," and §11.51(d)
requires visual messages be constructed per §3.6 of that same document. The guide
is therefore incorporated by reference into the Commission's rules.

That document is dated **17 May 2010**. The EAS-CAP Industry Group's own published
news ends in **December 2010**, and the board listed on its website is identified
as "2009–2010." Sixteen years of CAP practice have accumulated against a frozen
specification maintained by a body that appears no longer to meet.

KAZM does not suggest the guide is wrong — it has built to it and found it sound.
The problem is structural: a normative document incorporated into federal rules
has no maintainer, so ambiguities cannot be resolved and new practice cannot be
reflected. **KAZM asks the Commission to address custody of this document** —
whether by assuming maintenance, designating a successor body, or codifying the
necessary provisions directly into Part 11.

### B. There is no machine-readable event code table

Section 11.31(e) prescribes the EAS event codes. It exists as a table in the
Code of Federal Regulations. There is, so far as KAZM can determine, **no
authoritative machine-readable version** — no JSON, CSV, or XML publication of the
event codes with their descriptions and classifications.

Every implementer therefore transcribes the table by hand, and every transcription
is an opportunity for error that no automated process can catch. The codes change:
MEP was added effective 8 September 2025, and §11.31(d)(2) was reserved in
January 2026.

By contrast, the Weather Service publishes SAME **location** codes in machine-
readable form at `weather.gov/source/nwr/SameCode.txt`, and that file is
consequently used consistently across the industry.

**Request:** that the Commission, or the Bureau under delegated authority, publish
the §11.31(e) event code table in a machine-readable, versioned form, keyed to the
Federal Register amendments that change it. This is a small administrative act
with a disproportionate effect on implementation correctness.

---

## VI. CONCLUSION

KAZM urges the Commission to adopt the software EAS proposal with the
on-premises limitation intact and a repair window aligned to hardware; to adopt
the universal alert identifier; to adopt authentication with explicit treatment of
unverified as distinct from invalid; to adopt geotargeting with a resolution-
reporting requirement; to clarify that read-only observability software is not
"EAS Software"; and to resolve the custody of the ECIG guide and publish the event
code table in machine-readable form.

The licensee's implementation, its specification, and its complete source are
public and may be inspected by the Commission or any party at
`https://github.com/chelstein/mellowmountainradio/tree/main/openeas`.

Respectfully submitted,

**CUTTER GRIND BROADCASTING LLC**

Charles Helstein
Licensee, KAZM(AM), Sedona, Arizona
chuck@mellowmountainradio.com

**[CONFIRM: mailing address, telephone, and whether Ryan Thompson or other
co-signatories from the 22 September 2025 filing should join these comments.]**

Date: **[CONFIRM — file only after Federal Register publication]**

---

## Filing notes (not part of the comments)

- **File via ECFS**, https://www.fcc.gov/ecfs, as a Standard Filing in
  **PS Docket No. 25-224**, cross-filed to **15-94** and **15-91**.
- These proceedings are **permit-but-disclose**. Any oral or written
  presentation to Commission staff must be filed in the dockets; see 47 CFR
  §1.1200 *et seq.* and note the Sunshine-period prohibition.
- Comments are due **30 days after Federal Register publication** of FCC 26-38;
  reply comments at **60 days**. As of 30 July 2026 publication had not occurred.
- Verify every rule citation and paragraph number against the released text of
  FCC 26-38 before filing. Paragraph numbers here are drawn from the released
  document and the Commission's own fact sheet, but a released-item paragraph
  number is worth re-checking.
- Consider whether the factual representations about KAZM's systems should be
  supported by a declaration.
