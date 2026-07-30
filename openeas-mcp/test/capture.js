#!/usr/bin/env node
// Refresh the test corpus from live federal sources.
//
//   node test/capture.js
//
// REAL DATA ONLY. Synthetic alerts would test the parser against the author's
// assumptions rather than against what the federal system actually emits, which
// is the class of bug this corpus exists to catch. The corpus is committed so
// the suite is reproducible and so a reviewer can inspect exactly what was
// tested against.
//
// Text and XML only — never audio. §11.45(a) reaches recordings and
// simulations, so it binds fixtures as surely as production code.

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = "OpenEAS/0.1.0 (+https://github.com/chelstein/mellowmountainradio)";
const N = Number(process.argv[2] || 40);

mkdirSync(join(HERE, "corpus"), { recursive: true });

const r = await fetch(
  `https://www.fema.gov/api/open/v1/IpawsArchivedAlerts?$top=${N}&$orderby=sent%20desc`,
  { headers: { "User-Agent": UA, Accept: "application/json" } });

if (!r.ok) {
  console.error(`OpenFEMA HTTP ${r.status}. Note www.fema.gov blocks some datacenter ranges; ` +
                `apps.fema.gov (live IPAWS) is a separate host and is usually still reachable.`);
  process.exit(1);
}

const d = await r.json();
const out = (d.IpawsArchivedAlerts ?? [])
  .filter(x => x.originalMessage)
  .map(x => ({ source: "openfema", id: x.id, sent: x.sent, xml: x.originalMessage }));

writeFileSync(join(HERE, "corpus", "cap-openfema.json"), JSON.stringify(out, null, 1));
console.log(`captured ${out.length} real signed CAP documents -> test/corpus/cap-openfema.json`);
