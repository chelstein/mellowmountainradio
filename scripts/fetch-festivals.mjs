// Builds the Southwest festivals list server-side (GitHub Actions) so the site
// doesn't spend the Ticketmaster quota per visitor. Combines a curated list of
// real SW music festivals with a keyword sweep, filters to the region, and
// writes festivals.json.
import fs from "fs";

const KEY = process.env.TM_KEY || "H39V0X17gyaXgi9T85ChGhGWsk3gTPdr"; // public consumer key
const GEO = "&latlong=36.0,-110.5&radius=600&unit=miles";
const SW = { AZ: 1, NM: 1, NV: 1, CA: 1, UT: 1, CO: 1 };

// Marquee Southwest festivals (AZ first). Off-season ones simply return nothing.
const CURATED = [
  "Innings Festival", "M3F Festival", "Country Thunder Arizona", "Goldrush Music Festival",
  "Arizona Roots", "Lost Lake Festival", "Decadence Arizona", "Phoenix Lights Festival",
  "Coachella", "Stagecoach", "BeachLife Festival", "Cali Vibes", "Desert Daze", "Cruel World",
  "Just Like Heaven", "This Ain't No Picnic", "Ohana Festival", "Camp Flog Gnaw", "Portola Festival",
  "Besame Mucho", "Hard Summer", "Beyond Wonderland", "Lightning in a Bottle", "Outloud Festival",
  "Life is Beautiful", "When We Were Young", "Lovers & Friends", "Sick New World", "Punk Rock Bowling",
  "iHeartRadio Music Festival", "Las Rageous", "Kilby Block Party", "Ogden Twilight"
];
const KEYWORDS = ["festival", "fest"];

// Iconic festivals that aren't on Ticketmaster (own lottery / AXS / badge system).
// Real, recurring events — shown with official ticket links + typical season,
// not fabricated dates. Marked marquee:true so the card links out for info.
const MARQUEE = [
  { name: "Coachella", city: "Indio", state: "CA", when: "Two weekends each April", url: "https://www.coachella.com" },
  { name: "Stagecoach", city: "Indio", state: "CA", when: "Late April", url: "https://www.stagecoachfestival.com" },
  { name: "Burning Man", city: "Black Rock City", state: "NV", when: "Late August", url: "https://burningman.org" },
  { name: "Life is Beautiful", city: "Las Vegas", state: "NV", when: "Late September", url: "https://www.lifeisbeautiful.com" },
  { name: "Austin City Limits", city: "Austin", state: "TX", when: "Two weekends each October", url: "https://www.aclfestival.com" },
  { name: "SXSW", city: "Austin", state: "TX", when: "Mid-March", url: "https://www.sxsw.com" }
];

function pickImage(imgs) {
  imgs = imgs || [];
  const w = imgs.filter(function (i) { return i.ratio === "16_9" && i.width >= 600; }).sort(function (a, b) { return a.width - b.width; })[0];
  return ((w || imgs.filter(function (i) { return i.ratio === "16_9"; })[0] || imgs[0]) || {}).url || "";
}
function festKey(name) { return (name || "").toLowerCase().replace(/\d{4}/g, "").replace(/\s*[-–(].*$/, "").trim(); }
function clean(n) {
  return (n || "")
    .replace(/\b\d+[- ]?day[- ]?ticket(s)?\b/ig, "").replace(/\bticket(s)?\b/ig, "")
    .replace(/\b(18|21)\s*\+/g, "").replace(/\b(GA|VIP)\b/g, "")
    .replace(/\s+feat\.?\s+.*$/i, "").replace(/\s+presents:.*$/i, "")
    .replace(/\b20\d{2}\b/g, "").replace(/\s*[-–:]\s*$/, "").replace(/\s{2,}/g, " ").trim();
}
async function search(term, national) {
  const url = "https://app.ticketmaster.com/discovery/v2/events.json?apikey=" + KEY +
    "&segmentName=Music&sort=date,asc&size=40" + (national ? "" : GEO) + "&keyword=" + encodeURIComponent(term);
  try { const j = await (await fetch(url, { headers: { "User-Agent": "MMR/1.0" } })).json(); return (j._embedded && j._embedded.events) || []; }
  catch (e) { return []; }
}

(async function () {
  const all = {}, fests = {};
  for (const t of CURATED.concat(KEYWORDS)) {
    (await search(t)).forEach(function (e) { all[e.id] = e; });
  }
  Object.keys(all).forEach(function (id) {
    const e = all[id];
    const v = (e._embedded && e._embedded.venues && e._embedded.venues[0]) || {};
    const seg = e.classifications && e.classifications[0] && e.classifications[0].segment && e.classifications[0].segment.name;
    const nm = e.name || "", state = v.state && v.state.stateCode;
    if (!SW[state] || seg !== "Music") return;
    if (!/\b(fest|festival|palooza|jamboree|block party|bowling)\b/i.test(nm)) return;
    if (/tribute|soccer|\bmatch\b|pride|classical voices|lexus|us open/i.test(nm)) return;
    const key = festKey(nm); if (!key) return;
    const date = (e.dates && e.dates.start && e.dates.start.localDate) || "";
    if (!fests[key]) {
      fests[key] = { name: clean(nm), city: v.city && v.city.name, state: state, url: e.url || "", img: pickImage(e.images),
        genre: e.classifications[0] && e.classifications[0].genre && e.classifications[0].genre.name, start: date, end: date };
    } else {
      if (date && date < fests[key].start) fests[key].start = date;
      if (date && date > fests[key].end) fests[key].end = date;
      if (!fests[key].img) fests[key].img = pickImage(e.images);
    }
  });

  // Nationwide yacht-rock festivals & cruises — on-brand, region-agnostic.
  const yacht = {};
  for (const t of ["yacht rock festival", "yacht rock cruise", "sail rock festival"]) {
    (await search(t, true)).forEach(function (e) { yacht[e.id] = e; });
  }
  Object.keys(yacht).forEach(function (id) {
    const e = yacht[id], nm = e.name || "";
    if (!/yacht rock|sail rock/i.test(nm) || !/\b(fest|festival|cruise)\b/i.test(nm)) return;
    const v = (e._embedded && e._embedded.venues && e._embedded.venues[0]) || {};
    const key = festKey(nm); if (!key || fests[key]) return;
    const date = (e.dates && e.dates.start && e.dates.start.localDate) || "";
    fests[key] = { name: clean(nm), city: v.city && v.city.name, state: v.state && v.state.stateCode,
      url: e.url || "", img: pickImage(e.images), genre: "Yacht Rock", start: date, end: date, yacht: true };
  });

  const all2 = Object.keys(fests).map(function (k) { return fests[k]; });
  // yacht-rock festivals first (on-brand), then AZ, then the rest by date
  const live = all2.sort(function (a, b) {
    return (b.yacht ? 1 : 0) - (a.yacht ? 1 : 0) || (a.state === "AZ" ? 0 : 1) - (b.state === "AZ" ? 0 : 1) || (a.start || "").localeCompare(b.start || "");
  });
  const marquee = MARQUEE.map(function (m) { return { name: m.name, city: m.city, state: m.state, when: m.when, url: m.url, marquee: true }; });
  const list = marquee.concat(live);
  fs.writeFileSync("festivals.json", JSON.stringify({ updated: new Date().toISOString(), festivals: list }, null, 1));
  console.log("festivals:", list.length);
  list.forEach(function (f) { console.log("  •", f.name, "|", f.start, "|", f.city + "," + f.state); });
})();
