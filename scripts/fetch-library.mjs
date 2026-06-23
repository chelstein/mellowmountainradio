// Fetches upcoming Sedona / Community Library events server-side (GitHub Actions)
// from LibCal's public iCal feed and writes library-events.json for the site.
import fs from "fs";

const FEED = "https://communitylibrarysedona.libcal.com/ical_subscribe.php?cid=14597";

function unfold(ics) { return ics.replace(/\r\n[ \t]/g, "").replace(/\r/g, ""); }
function field(block, key) {
  const m = block.match(new RegExp("^" + key + "[^:\\n]*:(.*)$", "m"));
  return m ? m[1].trim() : "";
}
function icalText(s) { return String(s || "").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ").replace(/\\\\/g, "\\").replace(/\s+/g, " ").trim(); }

function phoenix(utc) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(utc);
  const g = {}; p.forEach(function (x) { g[x.type] = x.value; });
  return { date: g.year + "-" + g.month + "-" + g.day, time: (g.hour === "24" ? "00" : g.hour) + ":" + g.minute };
}
// DTSTART;VALUE=DATE:20260523  (all-day)  |  DTSTART:20260625T180000Z (UTC)
function parseStart(block) {
  const m = block.match(/^DTSTART([^:\n]*):(.+)$/m);
  if (!m) return null;
  const v = m[2].trim();
  if (/^\d{8}$/.test(v)) return { date: v.slice(0, 4) + "-" + v.slice(4, 6) + "-" + v.slice(6, 8), time: "" };
  const t = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!t) return null;
  const utc = new Date(Date.UTC(+t[1], +t[2] - 1, +t[3], +t[4], +t[5], +t[6]));
  return phoenix(utc);
}

(async function () {
  const out = { updated: new Date().toISOString(), source: "Community Library Sedona", events: [] };
  try {
    const r = await fetch(FEED, { headers: { "User-Agent": "MellowMountainRadio/1.0 events" } });
    if (!r.ok) throw new Error("LibCal " + r.status);
    const ics = unfold(await r.text());
    const blocks = ics.split("BEGIN:VEVENT").slice(1).map(function (b) { return b.split("END:VEVENT")[0]; });
    const today = new Date().toISOString().slice(0, 10);
    const seen = {}, events = [];
    blocks.forEach(function (b) {
      const s = parseStart(b); if (!s || s.date < today) return;
      const title = icalText(field(b, "SUMMARY")); if (!title) return;
      const category = icalText(field(b, "CATEGORIES"));
      if (/private event|staff/i.test(category)) return; // internal/non-public
      if (seen[title]) return; seen[title] = 1; // next occurrence of each distinct event
      events.push({
        title: title,
        date: s.date,
        time: s.time,
        location: icalText(field(b, "LOCATION")),
        category: category.replace(/\s+(Program|Meeting)$/i, ""),
        url: field(b, "URL")
      });
    });
    events.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    out.events = events.slice(0, 50);
    console.log("library events:", out.events.length);
  } catch (err) {
    console.error("LibCal fetch failed:", err.message);
    process.exitCode = 1;
  }
  fs.writeFileSync("library-events.json", JSON.stringify(out, null, 1));
  console.log("wrote library-events.json");
})();
