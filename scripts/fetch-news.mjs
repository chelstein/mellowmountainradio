// Fetches every news/sports/native feed the site carries and writes news.json,
// read same-origin by the browser. No proxy, no relay, no CORS.
//
// ── Why this exists ────────────────────────────────────────────────────────
//
// No publisher worth carrying sends Access-Control-Allow-Origin: Red Rock News,
// BBC World and the Arizona Daily Sun all omit it, NPR scopes its to
// apps.npr.org. So the browser cannot read these directly and the fetch has to
// happen somewhere else.
//
// It used to happen on the station MCP box, behind a /feed relay. That relay
// works, but it shipped in a commit that was never deployed, so the news pages
// rendered empty for two months while every fallback leg was also dead (the
// n8n webhook unregistered, codetabs 522, allorigins 500, corsproxy.io now
// wanting a key). A feature that needs someone to SSH into a droplet before it
// works is a feature that stays broken.
//
// Fire, concerts, festivals, horoscopes and showtimes never had that problem,
// because they use this pattern instead: the runner fetches, commits JSON, and
// the static site reads it same-origin. This moves the news onto the same
// footing. The MCP relay stays as a later leg for whenever that box is current.

import fs from "fs";

// Both the BBC and the Arizona Daily Sun answer 403/429 to a bare
// "MellowMountainRadio/1.0" UA and 200 to this one. The filter is keyed on the
// missing Mozilla/5.0 prefix, which is a common crude bot block, so this keeps
// the prefix while still saying plainly who is asking and how to reach us —
// no need to pose as a browser.
const UA = "Mozilla/5.0 (compatible; MellowMountainRadio/1.0 feed reader; +https://mellowmountainradio.com)";

// Must stay in step with FEEDS in main.js.
const FEEDS = {
  "news-local":      "https://www.redrocknews.com/feed/",
  "news-regional":   "https://azdailysun.com/search/?f=rss&t=article&c=news&l=25",
  "news-national":   "https://feeds.npr.org/1001/rss.xml",
  "news-world":      "https://feeds.bbci.co.uk/news/world/rss.xml",
  "sports-az":       "https://news.google.com/rss/search?q=%28Arizona%20Diamondbacks%29%20OR%20%28Arizona%20Cardinals%29%20OR%20%28Phoenix%20Suns%29%20OR%20%28Arizona%20Wildcats%29%20OR%20%28Arizona%20State%20Sun%20Devils%29%20when%3A7d&hl=en-US&gl=US&ceid=US:en",
  "sports-national": "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en",
  "native-ict":      "https://ictnews.org/feed",
  "native-nations":  "https://news.google.com/rss/search?q=%22Navajo%20Nation%22%20OR%20%22Hopi%20Tribe%22%20OR%20%22Yavapai-Apache%22%20when%3A14d&hl=en-US&gl=US&ceid=US:en",
};

const PER_FEED = 25;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#34": '"' };

function decode(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&([a-z]+|#\d+);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? m);
}

// Google News double-encodes its summaries ("&amp;nbsp;"), so one decode pass
// leaves visible "&nbsp;" in the text. Decode, strip tags, then decode again.
const strip = (s) => decode(decode(s).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function tag(block, names) {
  for (const n of names) {
    // Self-closing <link href="..."/> (Atom) before the element form.
    const att = block.match(new RegExp(`<${n}\\b[^>]*\\bhref="([^"]+)"[^>]*/?>`, "i"));
    if (att && n === "link") return att[1];
    const m = block.match(new RegExp(`<${n}\\b[^>]*>([\\s\\S]*?)</${n}>`, "i"));
    if (m) return m[1];
  }
  return "";
}

function parseFeed(xml) {
  const out = [];
  // RSS <item> and Atom <entry>.
  for (const m of xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)) {
    const b = m[0];
    const title = strip(tag(b, ["title"]));
    if (!title) continue;
    const link = decode(tag(b, ["link", "guid"])).trim();
    const date = strip(tag(b, ["pubDate", "published", "updated", "dc:date"]));
    const summary = strip(tag(b, ["description", "summary", "content:encoded", "content"]));
    out.push({
      title,
      link: /^https?:\/\//.test(link) ? link : "",
      date: date || "",
      summary: summary.length > 400 ? summary.slice(0, 400) + "…" : summary,
    });
    if (out.length >= PER_FEED) break;
  }
  return out;
}

async function getFeed(key, url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const items = parseFeed(await r.text());
  // A 200 carrying no stories is a miss, not a win — rss.app spent weeks
  // answering 200 with a payment notice in the body, and caching that looked
  // perfectly healthy.
  if (!items.length) throw new Error("200 but no parseable items");
  return items;
}

(async function () {
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync("news.json", "utf8")).feeds || {}; } catch { /* first run */ }

  const now = new Date().toISOString();
  const feeds = {};
  let ok = 0, failed = 0, kept = 0;

  const results = await Promise.all(Object.entries(FEEDS).map(async ([key, url]) => {
    try {
      return [key, { items: await getFeed(key, url), fetched_at: now, source: url }];
    } catch (e) {
      // Keep the last good stories rather than blanking the page, but record the
      // failure so an outage is distinguishable from a quiet news day.
      const old = prev[key];
      return [key, {
        items: old?.items || [],
        fetched_at: old?.fetched_at || null,
        source: url,
        last_fetch_attempt: now,
        last_fetch_error: String(e.message),
        stale: Boolean(old?.items?.length),
      }];
    }
  }));

  for (const [key, val] of results) {
    feeds[key] = val;
    if (val.last_fetch_error) { failed++; if (val.items.length) kept++; }
    else ok++;
    const note = val.last_fetch_error
      ? `FAILED (${val.last_fetch_error})` + (val.items.length ? ` — serving ${val.items.length} kept` : " — EMPTY")
      : `${val.items.length} items`;
    console.log(`  ${key.padEnd(17)} ${note}`);
  }

  fs.writeFileSync("news.json", JSON.stringify({ updated: now, feeds }, null, 1));
  console.log(`news: ${ok} ok, ${failed} failed (${kept} serving kept stories)`);

  if (failed) console.error(`::warning::${failed} of ${Object.keys(FEEDS).length} news feeds failed this run`);
  // Every feed failing at once is the signature of the rss.app outage: a shared
  // dependency, not eight unlucky publishers. Say so loudly.
  if (!ok) {
    console.error("::error::every news feed failed — suspect a shared cause (network, blocked UA) rather than the publishers");
    process.exitCode = 1;
  }
})();
