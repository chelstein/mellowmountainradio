# OpenEAS test lab

```sh
npm test                 # all suites
node test/run.js parser  # one suite
node test/capture.js     # refresh the corpus from FEMA
```

77 assertions, zero dependencies, no test framework — so the lab keeps working
when a framework's major version moves and nobody notices for eight months.

## Two rules

**Real data only.** `test/corpus/cap-openfema.json` is genuine signed CAP
captured from FEMA's `IpawsArchivedAlerts` dataset — 40 alerts, 18 distinct
senders, county emergency management through state agencies through the Weather
Service. Synthetic alerts would test the parser against the author's assumptions
rather than against what the federal system actually emits, which is exactly the
class of bug this suite exists to catch. Synthetic input appears only where the
test *is* the synthesis: deliberately malformed headers, and archive tampering.

The corpus is committed so runs are reproducible and so a reviewer can see
precisely what was tested against.

**No EAS audio, ever.** 47 CFR §11.45(a) reaches recordings and simulations, so
it binds fixtures as surely as production code. The suite exercises header
**text** and CAP **XML** only. `scripts/no-eas-audio.js` enforces this and runs
here as its own suite.

## What it covers

| Suite | Checks |
|---|---|
| `parser` | §11.31(c) header form, PSSCCC decomposition, Julian-day resolution, malformed-input rejection, §11.51(m) mandatory-forward derivation |
| `codes` | §11.31(d)–(f) tables, unknown-code pass-through, NWS/OTH placeholders, the Red Flag ≠ `FRW` trap |
| `cap` | Every corpus document parses; identity is the `(sender, identifier, sent)` triple; `parameter` stays a multimap; signatures detected |
| `geo` | Polygon/circle parsing, point-in-polygon with boundary inside, haversine, CAP `lat,lon` → GeoJSON `[lon,lat]` |
| `store` | Append-only, dedup, corrections, and **three tamper attacks** |
| `guard` | No EAS audio or tone-generation code anywhere |

## The bug this lab caught on its first run

`derivedMandatoryForward()` did not treat SAME location code `000000` as
covering the station.

`000000` is *all United States territory* — it is how an EAN and a nationwide NPT
reach every station in the country. The function compared the alert's state FIPS
against the station's, so `000000` (state `00`) never matched, and **a national
activation would have been reported as not mandatory.**

Wrong in the most dangerous direction available. Fixed in `lib/same.js`, with a
regression test. This is the entire argument for having a lab.

## Archive tamper tests

Three attacks, each detected and distinguished:

| Attack | Detected as |
|---|---|
| Edit a record's content | `content_altered` |
| Edit it **and** recompute the hash to hide the edit | `broken_link` on the next record |
| Delete a record | `sequence_gap` **and** `broken_link` |

The suite then re-verifies the chain with a verifier written inline from the
format description, using **no OpenEAS code**. That is the property that makes
the archive citable rather than merely asserted: a third party can check it
without trusting us.

## EAS-Tools as an external oracle

`github.com/chelstein/EAS-Tools` is an independent browser-based EAS/SAME
toolkit with a mature decoder. It is valuable for differential testing —
feed the same header text to both implementations and compare.

**It must not be vendored into this repository, for two independent reasons.**

**Licensing.** EAS-Tools is **GPLv3**; OpenEAS is Apache-2.0. Compatibility runs
one way: Apache code may go into a GPL project, but GPL code may not go into an
Apache one without relicensing all of OpenEAS to GPLv3. That would materially
affect adoption of a reference implementation intended for vendors and other
broadcasters.

**§11.45(a).** EAS-Tools ships a working tone encoder — `assets/js/encoder-bundle.js`
contains the SAME AFSK and Attention Signal frequencies. That is entirely proper
for what EAS-Tools is, and its own README says lab and educational use only. But
this repository deploys to a public production server, and `no-eas-audio.js`
would reject it — correctly. A tone generator on the box serving a public
endpoint is the exact leak that guard exists to prevent.

**Correct integration:** run EAS-Tools as a **separate program** — its own
checkout, driven headlessly, compared at the boundary. Its decoder is a browser
ES module requiring `window`, so a headless browser is needed rather than a
Node import. Mere aggregation across a process boundary raises no GPL issue and
no §11.45(a) issue.
