// Coconino National Forest fire restrictions -> fire.json, read same-origin by
// the site and by get_fire_restrictions on the MCP server. Sedona sits in the
// Coconino NF, so this is the authoritative restriction level for the area.
//
// ── Why this was rewritten ─────────────────────────────────────────────────
//
// The previous version hunted the whole alerts page for the words "Stage 1/2/3"
// and, finding none, wrote `stage: null, level: "See official source"` — which
// it had been doing continuously. Two problems with that.
//
// It had the wrong model of the data. There is often no seasonal Stage
// restriction in force, and that is not the same as there being no
// restrictions: the Coconino carries YEAR-ROUND camping and campfire orders,
// two of which cover Sedona and Oak Creek Canyon specifically. A visitor asking
// "can I have a campfire near Sedona" needs those orders whether or not a Stage
// is posted, and the old code's "lifted" branch could have answered
// "No restrictions" — which would have been wrong in a way that starts fires.
//
// And it scraped the whole page and tried to classify. The site publishes its
// own type filter (field_alert_type_target_id=56 is "Fire Restriction"), so the
// server does the classifying. That also avoids the trap the rewrite hit while
// being built: the page's legend contains a card whose heading is literally
// "Fire Restriction", explaining what the label means. Matching on the class
// alone picks up the legend and counts it as an alert.

import fs from "fs";

const BASE = "https://www.fs.usda.gov/r03/coconino/alerts";
// 56 = "Fire Restriction" in the site's own alert-type filter.
const SRC = BASE + "?field_alert_type_target_id=56";
const UA = "MellowMountainRadio/1.0 fire (chuck@mellowmountainradio.com)";

// Orders naming these places apply to the station's own audience.
const SEDONA = /sedona|oak creek|red rock|village of oak creek|vultee/i;

const strip = (s) => String(s || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ")
  .replace(/\s+/g, " ").trim();

function parseAlerts(html) {
  // Everything before the Forest Alerts heading is chrome and legend.
  const body = html.slice(html.indexOf("<h2>Forest Alerts</h2>"));
  const out = [];
  for (const m of body.matchAll(/<li class="[^"]*wfs-alert-flag[^"]*"[\s\S]*?<\/li>/g)) {
    const card = m[0];
    const title = strip((card.match(/<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
    // A card with no link is a legend entry, not an alert.
    if (!title) continue;
    const href = (card.match(/<a href="([^"]+)"/) || [])[1] || null;
    out.push({
      title,
      url: href ? (href.startsWith("http") ? href : "https://www.fs.usda.gov" + href) : null,
      summary: strip((card.match(/<div class="usa-card__body">([\s\S]*?)<\/div>/) || [])[1]),
      start_date: strip((card.match(/Alert Start Date:<\/strong>([\s\S]*?)<\/div>/) || [])[1]) || null,
      order: strip((card.match(/Forest Order:<\/strong>([\s\S]*?)<\/div>/) || [])[1]) || null,
      sedona_area: false,
    });
  }
  for (const a of out) a.sedona_area = SEDONA.test(a.title + " " + a.summary);
  return out;
}

(async function () {
  const out = {
    updated: new Date().toISOString(),
    agency: "Coconino National Forest",
    source: BASE,
    available: false,
    stage: null,
    level: "Unavailable",
    headline: "",
    restrictions: [],
    sedona_restrictions: [],
  };

  try {
    const r = await fetch(SRC, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error("fs.usda.gov " + r.status);
    const html = await r.text();
    const alerts = parseAlerts(html);

    // A Stage restriction, when one exists, is named in a title or summary.
    let stage = null;
    for (const a of alerts) {
      const m = (a.title + " " + a.summary).match(/stage\s+([123])\b/i);
      if (m) { stage = Math.max(stage ?? 0, parseInt(m[1], 10)); a.stage = parseInt(m[1], 10); }
    }

    const sedona = alerts.filter(a => a.sedona_area);

    Object.assign(out, {
      available: true,
      stage,
      restrictions: alerts,
      sedona_restrictions: sedona,
      count: alerts.length,
      // "No Stage restriction" and "no restrictions" are different claims, and
      // conflating them is the dangerous direction. Year-round campfire orders
      // are in force on the Coconino essentially always.
      level: stage ? `Stage ${stage}`
           : alerts.length ? "No stage restriction; year-round restrictions apply"
           : "No fire restrictions listed",
      headline: stage
        ? `Stage ${stage} fire restrictions in effect`
        : alerts.length
          ? `${alerts.length} fire restriction${alerts.length === 1 ? "" : "s"} in effect` +
            (sedona.length ? `, ${sedona.length} covering the Sedona area` : "")
          : "No fire restrictions currently listed for the Coconino National Forest",
      interpretation: stage
        ? `Stage ${stage} restrictions are in force. Read the order before any fire, stove or smoking use.`
        : alerts.length
          ? "No seasonal Stage restriction is posted, but year-round camping and campfire " +
            "orders are in force. This is NOT 'no restrictions' — check the orders below, " +
            "particularly the Sedona and Oak Creek Canyon ones, before lighting anything."
          : "The Forest Service listed no fire restrictions at this fetch. Verify against the " +
            "source before relying on it; an empty list is not a guarantee.",
    });

    // Back-compat: earlier consumers read flat `effective` and `order`. Populate
    // them from the most locally relevant order rather than dropping the fields.
    const primary = sedona[0] || alerts[0] || null;
    out.effective = primary?.start_date || "";
    out.order = primary?.order || "";

    fs.writeFileSync("fire.json", JSON.stringify(out, null, 1));
    console.log("fire:", out.level, "|", alerts.length, "alert(s),", sedona.length, "Sedona-area");
    alerts.forEach(a => console.log("   -", (a.sedona_area ? "[SEDONA] " : "") + a.title, a.order ? "(" + a.order + ")" : ""));
    if (!alerts.length) console.error("::warning::no fire-restriction alerts parsed — the page structure may have changed");
  } catch (e) {
    // Keep the previous reading rather than blanking the page, but record the
    // failure so an outage is distinguishable from a quiet fire season.
    console.error("fire fetch failed (keeping existing fire.json):", e.message);
    try {
      const prev = JSON.parse(fs.readFileSync("fire.json", "utf8"));
      prev.last_fetch_attempt = new Date().toISOString();
      prev.last_fetch_error = String(e.message);
      fs.writeFileSync("fire.json", JSON.stringify(prev, null, 1));
    } catch { /* nothing to preserve */ }
    console.error("::warning::fire fetch failed: " + e.message);
    process.exitCode = 0;
  }
})();
