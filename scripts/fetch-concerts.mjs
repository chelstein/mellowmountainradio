// Builds the upcoming-concerts list server-side (GitHub Actions) so the page
// doesn't depend on a per-visitor Ticketmaster call (which gets throttled and
// burns the daily quota). Mirrors the in-page fetch: each artist, Southwest geo
// radius, exact-attraction match, Arizona first. Writes concerts.json.
import fs from "fs";

const KEY = process.env.TM_KEY || "H39V0X17gyaXgi9T85ChGhGWsk3gTPdr"; // public consumer key
const SW = { AZ: 1, NM: 1, NV: 1, CA: 1, UT: 1, CO: 1 };

const ARTISTS = [
  "Eagles", "Don Henley", "Joe Walsh", "Fleetwood Mac", "Stevie Nicks", "Lindsey Buckingham",
  "Steely Dan", "The Doobie Brothers", "Michael McDonald", "Chicago", "Toto", "Boz Scaggs",
  "Christopher Cross", "Kenny Loggins", "Steve Winwood", "Hall & Oates", "Daryl Hall", "John Oates",
  "James Taylor", "Jackson Browne", "Graham Nash", "Stephen Stills", "Bonnie Raitt",
  "America", "Little River Band", "Air Supply", "The Beach Boys", "Seals & Crofts",
  "Earth, Wind & Fire", "Lionel Richie", "The Commodores", "Three Dog Night",
  "Bachman-Turner Overdrive", ".38 Special", "Lynyrd Skynyrd", "The Marshall Tucker Band",
  "Firefall", "Ambrosia", "Pablo Cruise", "Player", "Al Stewart", "Poco", "Orleans",
  "The Guess Who", "Dave Mason", "Gino Vannelli", "Robbie Dupree",
  "Jim Messina", "Loggins & Messina", "England Dan & John Ford Coley", "Stephen Bishop",
  "Rupert Holmes", "Gerry Rafferty", "Atlanta Rhythm Section", "Looking Glass",
  "David Gates", "Climax Blues Band", "Nicolette Larson", "Rita Coolidge",
  "Kim Carnes", "Maria Muldaur", "Carole King", "Linda Ronstadt"
];

const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

function pickImage(imgs) {
  imgs = imgs || [];
  const w = imgs.filter(function (i) { return i.ratio === "16_9" && i.width >= 600; }).sort(function (a, b) { return a.width - b.width; })[0];
  return ((w || imgs.filter(function (i) { return i.ratio === "16_9"; })[0] || imgs[0]) || {}).url || "";
}
function tmMatch(e, artist) {
  const a = artist.toLowerCase(), atts = (e._embedded && e._embedded.attractions) || [];
  if (atts.length) return atts.some(function (x) { return (x.name || "").toLowerCase() === a; });
  return (e.name || "").toLowerCase().indexOf(a) >= 0;
}
async function fetchArtist(artist) {
  const url = "https://app.ticketmaster.com/discovery/v2/events.json?apikey=" + KEY +
    "&classificationName=Music&latlong=36.0,-110.5&radius=550&unit=miles&sort=date,asc&size=20&keyword=" + encodeURIComponent(artist);
  try {
    const r = await fetch(url, { headers: { "User-Agent": "MMR/1.0 concerts" } });
    if (!r.ok) return [];
    const d = await r.json();
    const evs = (d && d._embedded && d._embedded.events) || [];
    return evs.filter(function (e) { return tmMatch(e, artist); }).map(function (e) {
      const v = (e._embedded && e._embedded.venues && e._embedded.venues[0]) || {};
      const st = (e.dates && e.dates.start) || {};
      const pr = (e.priceRanges && e.priceRanges[0]) || null;
      const others = ((e._embedded && e._embedded.attractions) || []).map(function (a) { return a.name; })
        .filter(function (n) { return n && n.toLowerCase() !== artist.toLowerCase(); });
      return {
        id: e.id, artist: artist, date: st.localDate || "", time: st.localTime || "",
        venue: v.name || "", city: (v.city && v.city.name) || "", state: (v.state && v.state.stateCode) || "",
        url: e.url || "", img: pickImage(e.images),
        price: pr ? Math.round(pr.min) : null,
        status: (e.dates && e.dates.status && e.dates.status.code) || "",
        saleStart: (e.sales && e.sales.public && e.sales.public.startDateTime) || "",
        lineup: others.slice(0, 2)
      };
    }).filter(function (x) { return SW[x.state] && x.date; });
  } catch (e) { return []; }
}

(async function () {
  const all = [], seen = {};
  for (const artist of ARTISTS) {
    const shows = await fetchArtist(artist);
    shows.forEach(function (e) { if (!seen[e.id]) { seen[e.id] = 1; all.push(e); } });
    await sleep(120); // gentle on the shared quota
  }
  all.sort(function (a, b) {
    return (a.state === "AZ" ? 0 : 1) - (b.state === "AZ" ? 0 : 1) || (a.date + a.time).localeCompare(b.date + b.time);
  });
  fs.writeFileSync("concerts.json", JSON.stringify({ updated: new Date().toISOString(), concerts: all }, null, 1));
  console.log("concerts:", all.length);
})();
