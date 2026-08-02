// Pulls the current Schumann resonance reading from Zero Trust Radio (buoyIQ),
// which parses the Tomsk observatory panels, and writes schumann.json for the
// site to read same-origin. ZTR is auth-gated, so the access key MUST come from
// the ZTR_KEY environment variable (a GitHub Actions secret) — never hardcode it.
import fs from "fs";

const BASE = "https://zerotrustradio-app-vvhi8.ondigitalocean.app";
const KEY = process.env.ZTR_KEY;

// The Tomsk panels update continuously and this workflow runs roughly every
// six hours, so an observation older than this is not "the current reading",
// whatever the fetch timestamp says. Discovered the hard way: observed_at sat
// frozen at 2026-07-26T16:33:20 across twelve consecutive runs over three days
// while `updated` advanced each time, so the site showed a week-old number as
// live and nothing anywhere noticed.
const STALE_AFTER_HOURS = 6;

function staleness(observedAt, now) {
  if (!observedAt) return { observed_age_hours: null, stale: true,
                            staleness_note: "No observation timestamp — treat as unknown, not current." };
  const ageMs = now - Date.parse(observedAt);
  if (!Number.isFinite(ageMs)) return { observed_age_hours: null, stale: true,
                            staleness_note: "Unparseable observation timestamp." };
  const hours = Math.round(ageMs / 36e5 * 10) / 10;
  const stale = hours > STALE_AFTER_HOURS;
  return {
    observed_age_hours: hours,
    stale,
    staleness_note: stale
      ? `Last observation is ${hours < 48 ? hours + " hours" : Math.round(hours / 24) + " days"} old. ` +
        `This is the last reading the upstream returned, not a current one — the ` +
        `source has stopped producing new observations.`
      : undefined,
  };
}

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

    // Computed from observed_at, never from the fetch time. A successful fetch
    // of a stale observation is still a stale observation.
    Object.assign(out, staleness(out.observed_at, Date.now()));

    // The upstream reports its own confidence. Passing "no_signal" through as a
    // number and letting the page render it as a reading is how a
    // measurement-that-isn't gets displayed as one.
    out.signal_usable = out.stability !== "no_signal" && out.cavity_state !== "indeterminate";
    // only write when we actually got a reading — never clobber good data
    fs.writeFileSync("schumann.json", JSON.stringify(out, null, 1));
    console.log("schumann:", out.energy_score + " · " + out.activity + " · " + out.detected_hz + "Hz" +
                (out.stale ? "  [STALE: observation is " + out.observed_age_hours + "h old]" : "") +
                (out.signal_usable ? "" : "  [upstream reports no usable signal]"));
    if (out.stale) console.error("::warning::schumann observation is " + out.observed_age_hours + "h old — upstream has stopped producing new readings");
  } catch (e) {
    // Keep the existing reading rather than blanking the page, but record that
    // the attempt failed. Previously this branch left no trace at all, so an
    // outage and a healthy run were indistinguishable from the outside.
    console.error("schumann fetch failed (keeping existing schumann.json):", e.message);
    try {
      const prev = JSON.parse(fs.readFileSync("schumann.json", "utf8"));
      prev.last_fetch_attempt = new Date().toISOString();
      prev.last_fetch_error = String(e.message);
      Object.assign(prev, staleness(prev.observed_at, Date.now()));
      fs.writeFileSync("schumann.json", JSON.stringify(prev, null, 1));
    } catch { /* nothing to preserve */ }
    console.error("::warning::schumann fetch failed: " + e.message);
    process.exitCode = 0;
  }
})();
