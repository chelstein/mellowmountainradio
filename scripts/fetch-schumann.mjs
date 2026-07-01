// Pulls the current Schumann resonance reading from Zero Trust Radio (buoyIQ),
// which parses the Tomsk observatory panels, and writes schumann.json for the
// site to read same-origin. ZTR is auth-gated, so the access key MUST come from
// the ZTR_KEY environment variable (a GitHub Actions secret) — never hardcode it.
import fs from "fs";

const BASE = "https://zerotrustradio-app-vvhi8.ondigitalocean.app";
const KEY = process.env.ZTR_KEY;

function activityLabel(e) {
  if (e == null) return "Unknown";
  return e < 20 ? "Very calm" : e < 40 ? "Calm" : e < 60 ? "Moderate" : e < 80 ? "Elevated" : "High";
}

(async function () {
  const out = { updated: new Date().toISOString(), source: "Zero Trust Radio · Tomsk observatory", available: false };
  try {
    if (!KEY) throw new Error("ZTR_KEY not set");
    // authenticate (access-key only) and grab the session cookie
    const lr = await fetch(BASE + "/login", {
      method: "POST", redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "MMR/1.0 schumann" },
      body: "password=" + encodeURIComponent(KEY)
    });
    const cookie = (lr.headers.get("set-cookie") || "").split(";")[0];
    if (!cookie) throw new Error("login failed (no session cookie)");
    const H = { headers: { "Cookie": cookie, "User-Agent": "MMR/1.0 schumann" } };

    const feat = await (await fetch(BASE + "/api/schumann/features", H)).json();
    const state = await (await fetch(BASE + "/api/schumann/state", H)).json().catch(function () { return {}; });
    const row = (feat.rows || [])[0] || {};
    const im = row.image_metrics || {};
    const bands = row.band_features || [];
    const energy = im.energy_score != null ? im.energy_score : null;
    const detected = (im.harmonics_hz && im.harmonics_hz[0]) != null ? im.harmonics_hz[0]
      : (bands[0] && bands[0].hz != null ? bands[0].hz : null);

    Object.assign(out, {
      available: true,
      station: row.station || "tomsk",
      observed_at: row.observed_at_utc || null,
      energy_score: energy,
      activity: activityLabel(energy),
      nominal_hz: 7.83,
      detected_hz: detected != null ? Math.round(detected * 100) / 100 : null,
      peaks: row.peak_count != null ? row.peak_count : null,
      density: im.band_density != null ? im.band_density : null,
      harmonics_hz: im.harmonics_hz || [],
      cavity_state: im.cavity_state || null,
      stability: im.stability || null,
      state_label: (state.source && state.source.state_label) || null,
      spectrogram: "https://sosrff.tsu.ru/new/shm.jpg"
    });
    // only write when we actually got a reading — never clobber good data
    fs.writeFileSync("schumann.json", JSON.stringify(out, null, 1));
    console.log("schumann:", out.energy_score + " · " + out.activity + " · " + out.detected_hz + "Hz");
  } catch (e) {
    console.error("schumann fetch skipped (leaving existing schumann.json):", e.message);
    process.exitCode = 0;
  }
})();
