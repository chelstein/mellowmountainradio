// Scrapes the official Coconino National Forest alerts page (server-side, via
// GitHub Actions) for the current fire restriction stage and writes fire.json
// for the site to read same-origin. Sedona sits in the Coconino NF, so this is
// the authoritative restriction level for the area.
import fs from "fs";

const SRC = "https://www.fs.usda.gov/r03/coconino/alerts";

function decode(s) {
  return String(s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); })
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ").trim();
}

(async function () {
  var out = { updated: new Date().toISOString(), agency: "Coconino National Forest", source: SRC, stage: null, level: "See official source", headline: "", effective: "", order: "" };
  try {
    const r = await fetch(SRC, { headers: { "User-Agent": "MellowMountainRadio/1.0 fire (chuck@mellowmountainradio.com)" } });
    if (!r.ok) throw new Error("fs.usda.gov " + r.status);
    const text = decode(await r.text());

    var lifted = /\bno (current |active )?fire restrictions\b|fire restrictions?[^.]{0,40}\b(lifted|rescinded|no longer in effect)\b/i;
    var stageM = text.match(/stage\s+([123])\s+fire restriction/i) || text.match(/fire restriction[^.]{0,20}stage\s+([123])\b/i);

    if (stageM) {
      out.stage = parseInt(stageM[1], 10);
      out.level = "Stage " + out.stage;
      out.headline = "Stage " + out.stage + " fire restrictions in effect";
    } else if (lifted.test(text)) {
      out.stage = 0;
      out.level = "No restrictions";
      out.headline = "No fire restrictions in effect";
    }

    var months = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
    var eff = text.match(new RegExp("effective[^.]{0,80}?(" + months + "\\s+\\d{1,2},?\\s+\\d{4})", "i")) ||
      text.match(new RegExp("(" + months + "\\s+\\d{1,2},?\\s+\\d{4})", "i"));
    if (eff) out.effective = eff[1].replace(/,\s*$/, "");
    var ord = text.match(/\b\d{2}-\d{2}-\d{2}-\d{2}-\d{3}\b/);
    if (ord) out.order = ord[0];
  } catch (e) {
    console.error("fire fetch failed:", e.message);
    process.exitCode = 1;
  }
  fs.writeFileSync("fire.json", JSON.stringify(out, null, 1));
  console.log("fire:", out.level, "|", out.effective || "(no date)", "|", out.order || "(no order)");
})();
