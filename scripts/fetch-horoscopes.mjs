// Pulls the live daily / weekly / monthly horoscope for all twelve signs from
// freehoroscopeapi.com (free, open) server-side in GitHub Actions, because the
// API sends no CORS header — so the static site can't read it from the browser.
// We commit horoscopes.json and the page reads it same-origin. Runs every 6h.
import fs from "fs";

const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const BASE = "https://freehoroscopeapi.com/api/v1/get-horoscope";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function grab(period, sign) {
  const url = BASE + "/" + period + "?sign=" + sign + (period === "daily" ? "&day=TODAY" : "");
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "MMR/1.0 horoscopes (chuck@mellowmountainradio.com)" }, redirect: "follow" });
      if (r.ok) {
        const j = await r.json();
        const d = j && j.data;
        const text = d && (d.horoscope || d.horoscope_data || d.text);
        if (text) return { text: String(text).trim(), date: d.date || "" };
      }
    } catch (e) { /* retry */ }
    await sleep(500 * (attempt + 1));
  }
  return null;
}

(async function () {
  const out = { updated: new Date().toISOString(), source: "freehoroscopeapi.com", signs: {} };
  let ok = 0;
  for (const sign of SIGNS) {
    const [daily, weekly, monthly] = [await grab("daily", sign), await grab("weekly", sign), await grab("monthly", sign)];
    if (!daily && !weekly && !monthly) { console.log("  ✗", sign, "(no data)"); continue; }
    out.signs[sign] = {
      daily: daily ? daily.text : "", daily_date: daily ? daily.date : "",
      weekly: weekly ? weekly.text : "", monthly: monthly ? monthly.text : ""
    };
    ok++;
    console.log("  •", sign, "daily", daily ? daily.text.length + "ch" : "—", "weekly", weekly ? "✓" : "—", "monthly", monthly ? "✓" : "—");
    await sleep(150);
  }
  // Only overwrite if we actually got a healthy set — never blank the page on a bad run.
  if (ok >= 8) {
    fs.writeFileSync("horoscopes.json", JSON.stringify(out, null, 1));
    console.log("horoscopes: wrote", ok, "signs");
  } else {
    console.log("horoscopes: only", ok, "signs — keeping existing file");
    process.exitCode = 1;
  }
})();
