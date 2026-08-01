# openeas-conformance

**Point it at any OpenEAS implementation. Get a verdict you did not choose.**

```sh
node check.js https://eas.example.com/mcp
node check.js https://eas.example.com/mcp --json > report.json
```

Zero dependencies. Node 18+. Nothing is installed, nothing is written, no
credentials are needed, and no permission is required to run it against anyone —
including against the reference implementation.

## Why this exists

The specification, the reference implementation, and this checker currently have
the same author. That is circular, and saying so plainly is the only honest way
to start. The one thing that breaks the circle is that **this program can be
pointed at somebody else's server and produce a result its author did not
choose** — and pointed at ours by somebody who would enjoy finding it wanting.

A standard nobody outside the authoring organisation can verify is a README with
normative-sounding words in it.

## Three verdicts

| | |
|---|---|
| `PASS` | The requirement was checked and met. |
| `FAIL` | The requirement was checked and not met. |
| `INCONCLUSIVE` | The requirement could not be checked here. |

**`INCONCLUSIVE` is never rounded up to `PASS`.** That is the same rule SPEC §5.3
(`OE-0074`, `OE-0076`) imposes on implementations reporting alert validation: a
check that could not be completed must never be reported as one that passed. A
conformance suite that exempted itself from its own specification's evidentiary
standard would not be worth running.

A tool that is simply absent yields `INCONCLUSIVE`, not `FAIL`, for the
requirements governing that tool. Tier A implementations are not obliged to
expose Tier C tools, and a checker that punished honest scope would push
implementers toward writing stubs.

## What it cannot tell you

Twenty of the specification's 140 requirements are checkable over the wire. One
is checkable by reading a distribution. **The other 119 are attestation** — the
implementer states them and is accountable for them.

So a clean run here means twenty specific things are true. It does not mean the
implementation conforms. In particular this checker cannot see:

- whether the repository contains EAS audio (§2.3) — that is a fact about a
  distribution, not about a response;
- whether logs are genuinely append-only (§7.2), only whether verification is
  *offered* and reports where a chain broke;
- anything about the physical signal path (§8), which is not on the network at
  all.

Requirements are cited by permanent identifier — `OE-0042` — registered in
[`../openeas/requirements.json`](../openeas/requirements.json) and rendered in
[`../openeas/REQUIREMENTS.md`](../openeas/REQUIREMENTS.md). Those numbers are
stable across specification revisions and are never reused.

## Independence

The transport is hand-rolled rather than taken from the MCP SDK. A checker that
depends on the same library as the implementation it checks inherits that
library's bugs, and a bug they share is invisible to both.

## Exit codes

| | |
|---|---|
| `0` | No failures. |
| `1` | At least one `FAIL`. |
| `2` | Could not connect, or the endpoint exposed no tools. **Nothing was checked — this is not a conformance failure, it is no result at all.** |

That last distinction is the same one the profile insists on everywhere else: an
unreachable source is not a report that nothing is wrong.

## Publishing a result

Run it, keep the output unedited, and publish it. SPEC §13.1 requires an
unedited run as part of any conformance claim, and §13.3 explicitly permits any
third party to run this against any implementation and publish what they find.
