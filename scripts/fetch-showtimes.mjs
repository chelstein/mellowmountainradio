// Fetches upcoming Sedona movie/film showtimes server-side (run by GitHub Actions
// on a schedule) and writes showtimes.json for the site to read same-origin.
// Source: Sedona International Film Festival (The Events Calendar REST API).
// Harkins Sedona 6 has no public API; added here when a source is available.
import fs from "fs";

const ENT = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", "#8217": "’", "#8216": "‘", "#8220": "“", "#8221": "”", "#8211": "–", "#8212": "—", "#038": "&", "#039": "'", nbsp: " " };
function decode(s) {
  return String(s || "")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); })
    .replace(/&([a-z0-9#]+);/gi, function (m, k) { return ENT[k] != null ? ENT[k] : m; })
    .replace(/\s+/g, " ").trim();
}

async function siff() {
  const today = new Date().toISOString().slice(0, 10);
  const url = "https://sedonafilmfestival.com/wp-json/tribe/events/v1/events?per_page=50&start_date=" + today + "&status=publish";
  const r = await fetch(url, { headers: { "User-Agent": "MellowMountainRadio/1.0 showtimes" } });
  if (!r.ok) throw new Error("SIFF " + r.status);
  const j = await r.json();
  return (j.events || []).map(function (e) {
    const d = e.start_date_details || {};
    const hour = parseInt(d.hour, 10);
    return {
      source: "Sedona Film Festival",
      title: decode(e.title),
      date: (d.year && d.month && d.day) ? d.year + "-" + d.month + "-" + d.day : (e.start_date || "").slice(0, 10),
      // suppress placeholder pre-8am times that the festival uses for "time TBD"
      time: (hour >= 8 && hour <= 23) ? d.hour + ":" + d.minutes : "",
      venue: decode(e.venue && e.venue.venue) || "",
      city: decode(e.venue && e.venue.city) || "Sedona",
      url: e.url || "",
      image: (e.image && (e.image.url || e.image)) || ""
    };
  }).filter(function (x) { return x.title && x.date; });
}

(async function () {
  const out = { updated: new Date().toISOString(), venues: ["Mary D. Fisher Theatre", "Alice Gill-Sheldon Theatre", "Harkins Sedona 6"], showings: [] };
  try {
    const s = await siff();
    out.showings = s.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    console.log("SIFF showings:", s.length);
  } catch (err) {
    console.error("SIFF fetch failed:", err.message);
    process.exitCode = 1;
  }
  fs.writeFileSync("showtimes.json", JSON.stringify(out, null, 1));
  console.log("wrote showtimes.json (" + out.showings.length + " showings)");
})();
