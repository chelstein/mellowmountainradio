import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import webpush from "web-push";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file from server directory (VPS-only, never committed)
try {
  const envLines = readFileSync(join(__dirname, ".env"), "utf8").split("\n");
  for (const line of envLines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* no .env file is fine */ }
const SUBS_FILE = join(__dirname, "push-subs.json");
const VAPID_PUBLIC  = "BH1bX1nN1mAHuXoKxJXiwCq3cCGAxAvzha3gUHeT7gk2leZkb4dnHErh07Jmz8IeiAsO4CKcYOAe6wYw8WVqDLE";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
if (VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:chuck@mellowmountainradio.com", VAPID_PUBLIC, VAPID_PRIVATE);
}
function loadSubs()    { try { return JSON.parse(readFileSync(SUBS_FILE, "utf8")); } catch { return []; } }
function saveSubs(arr) { writeFileSync(SUBS_FILE, JSON.stringify(arr, null, 2)); }

const REQUESTS_FILE = join(__dirname, "requests.json");
const PULSE_FILE    = join(__dirname, "pulse.json");
function loadRequests()    { try { return JSON.parse(readFileSync(REQUESTS_FILE, "utf8")); } catch { return []; } }
function saveRequests(arr) { writeFileSync(REQUESTS_FILE, JSON.stringify(arr, null, 2)); }
function loadPulse()       { try { return JSON.parse(readFileSync(PULSE_FILE,    "utf8")); } catch { return {}; } }
function savePulse(obj)    { writeFileSync(PULSE_FILE, JSON.stringify(obj, null, 2)); }

const PORT      = process.env.PORT      || 3000;
const AZ_HOST   = (process.env.AZ_HOST  || "https://streaming.mellowmountainradio.com").replace(/\/$/,"");
const STATION   = process.env.STATION_ID || "kazm";
const AZ_KEY    = process.env.AZ_KEY    || "";
const GH_RAW    = (process.env.GH_RAW   || "https://raw.githubusercontent.com/chelstein/mellowmountainradio/main").replace(/\/$/,"");

// ── helpers ──────────────────────────────────────────────────────────────────

async function azGet(path) {
  const headers = AZ_KEY ? { "X-API-Key": AZ_KEY } : {};
  const res = await fetch(`${AZ_HOST}${path}`, { headers });
  if (!res.ok) throw new Error(`AzuraCast ${res.status}: ${path}`);
  return res.json();
}

async function ghGet(file) {
  const res = await fetch(`${GH_RAW}/${file}`);
  if (!res.ok) throw new Error(`GitHub raw ${res.status}: ${file}`);
  return res.json();
}

// ── server factory ────────────────────────────────────────────────────────────
// Created fresh per request (stateless) as required by StreamableHTTPServerTransport.

function buildServer() {
  const mcp = new McpServer({
    name:    "kazm-mellow-mountain-radio",
    version: "1.0.0",
  });

  // 1. Now Playing ─────────────────────────────────────────────────────────────
  mcp.tool(
    "get_now_playing",
    "Returns the song currently on air: title, artist, album, artwork URL, start time, and stream URL.",
    {},
    async () => {
      const data = await azGet(`/api/nowplaying/${STATION}`);
      const np   = data.now_playing || {};
      const song = np.song || {};
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            title:      song.title        || null,
            artist:     song.artist       || null,
            album:      song.album        || null,
            art:        song.art          || null,
            started_at: np.played_at      || null,
            elapsed_s:  np.elapsed        || null,
            duration_s: np.duration       || null,
            stream_url: (data.station && data.station.listen_url) || null,
          }),
        }],
      };
    }
  );

  // 2. Listener Count ──────────────────────────────────────────────────────────
  mcp.tool(
    "get_listener_count",
    "Returns the current live listener count across all mounts, plus per-mount breakdown.",
    {},
    async () => {
      const data    = await azGet(`/api/nowplaying/${STATION}`);
      const live    = data.listeners || {};
      const mounts  = (data.station && data.station.mounts) || [];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total:  live.current || 0,
            unique: live.unique  || 0,
            mounts: mounts.map(m => ({
              name:      m.display_name || m.name,
              listeners: m.listeners    || 0,
              url:       m.url          || null,
            })),
          }),
        }],
      };
    }
  );

  // 3. Song History ─────────────────────────────────────────────────────────────
  mcp.tool(
    "search_song_history",
    "Returns the most recently played songs (up to 25). Optionally filter by keyword in title or artist.",
    { query: z.string().optional().describe("Keyword to filter by title or artist") },
    async ({ query }) => {
      const data  = await azGet(`/api/station/${STATION}/history?rows=25`);
      let items   = Array.isArray(data) ? data : [];
      if (query) {
        const q = query.toLowerCase();
        items = items.filter(i => {
          const s = i.song || {};
          return (s.title  || "").toLowerCase().includes(q)
              || (s.artist || "").toLowerCase().includes(q);
        });
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify(items.slice(0, 25).map(i => {
            const s = i.song || {};
            return { title: s.title || null, artist: s.artist || null, played_at: i.played_at || null };
          })),
        }],
      };
    }
  );

  // 4. Fire Restrictions ────────────────────────────────────────────────────────
  mcp.tool(
    "get_fire_restrictions",
    "Returns current fire restriction level and fire danger rating for the Sedona / Coconino National Forest area. Includes any active Stage 1 or Stage 2 restrictions and Sedona-area alerts.",
    {},
    async () => {
      try {
        const res = await fetch("https://www.fs.usda.gov/r03/coconino/alerts", {
          headers: { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`FS ${res.status}`);
        const html = await res.text();

        // Danger level from CSS class e.g. danger_level--low
        const levelMatch = html.match(/danger_level--(\w+)/);
        const danger = levelMatch
          ? levelMatch[1].charAt(0).toUpperCase() + levelMatch[1].slice(1)
          : null;

        // Stage 1/2 restrictions
        const stageMatch = html.match(/Stage\s+([12])\s+(?:fire\s+)?restrictions?/i);
        const stage = stageMatch ? parseInt(stageMatch[1]) : null;

        // Sedona / Oak Creek alerts with their URLs
        const sedonaAlerts = [];
        const alertRe = /<a[^>]+href="(\/[^"]+)"[^>]*>([^<]*(?:Oak.Creek|Sedona|Red.Rock)[^<]*)<\/a>/gi;
        for (const m of html.matchAll(alertRe)) {
          const text = m[2].replace(/\s+/g, " ").trim();
          if (text) sedonaAlerts.push({ text, url: `https://www.fs.usda.gov${m[1]}` });
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              updated:       new Date().toISOString(),
              agency:        "Coconino National Forest",
              source:        "https://www.fs.usda.gov/r03/coconino/alerts",
              stage:         stage,
              danger:        danger || "Unknown",
              sedona_alerts: sedonaAlerts,
              notes:         stage
                ? `Stage ${stage} fire restrictions are in effect for the Coconino National Forest.`
                : "No Stage 1 or Stage 2 fire restrictions currently in effect. Year-round campfire and camping restrictions apply to the Sedona and Oak Creek Canyon areas.",
            }),
          }],
        };
      } catch (_) {
        // Fall back to the cached fire.json if live fetch fails
        const data = await ghGet("fire.json");
        return { content: [{ type: "text", text: JSON.stringify({ ...data, cached: true }) }] };
      }
    }
  );

  // 5. Weather ──────────────────────────────────────────────────────────────────
  mcp.tool(
    "get_weather",
    "Returns current conditions and a 7-day forecast for Sedona AZ from Open-Meteo (free, no key required).",
    {},
    async () => {
      const url = "https://api.open-meteo.com/v1/forecast"
        + "?latitude=34.8697&longitude=-111.7610"
        + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code"
        + "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code"
        + "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch"
        + "&timezone=America%2FPhoenix&forecast_days=7";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
      const data = await res.json();
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  // 6. Road Conditions ──────────────────────────────────────────────────────────
  mcp.tool(
    "get_road_conditions",
    "Returns active road and trail closures for the Sedona / Oak Creek area from the Coconino National Forest alerts page. Also includes highway incidents for SR-89A, SR-179, and I-17 via Road511 when ROAD511_KEY is set.",
    {},
    async () => {
      const result = {
        updated:    new Date().toISOString(),
        sources:    [],
        closures:   [],
        incidents:  [],
      };

      // Coconino NF alerts — free, no key, covers Sedona-area forest roads and trails
      try {
        const res = await fetch("https://www.fs.usda.gov/r03/coconino/alerts", {
          headers: { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const html = await res.text();
          for (const m of html.matchAll(/<li[^>]+usa-card[^>]*>([\s\S]*?)<\/li>/g)) {
            const card   = m[1];
            const titleM = card.match(/<span>([^<]+)<\/span>/);
            const bodyM  = card.match(/usa-card__body[^>]*>\s*([\s\S]*?)\s*<\/div>/);
            const levelM = card.match(/alert_level--(\w+)/);
            const dateM  = card.match(/Alert Start Date[^:]*:\s*([A-Za-z]+ \d+, \d{4})/);
            if (titleM && bodyM) {
              result.closures.push({
                title:  titleM[1].trim(),
                desc:   bodyM[1].replace(/<[^>]+>/g, "").trim().slice(0, 250),
                level:  levelM ? levelM[1] : null,
                start:  dateM  ? dateM[1]  : null,
                source: "Coconino National Forest",
              });
            }
          }
          result.sources.push(`Coconino National Forest (${result.closures.length} alerts)`);
        }
      } catch (_) {}

      // Road511 highway incidents — requires ROAD511_KEY env var (free account at road511.com)
      const ROAD511_KEY = process.env.ROAD511_KEY || "";
      if (ROAD511_KEY) {
        try {
          // bbox covers SR-89A, Oak Creek Canyon, SR-179, and I-17 near Sedona/Verde Valley
          const bbox = "-112.2,34.5,-111.5,35.35";
          const res = await fetch(
            `https://api.road511.com/api/v1/events/geojson?bbox=${bbox}&status=active`,
            { headers: { "X-API-Key": ROAD511_KEY }, signal: AbortSignal.timeout(8000) }
          );
          if (res.ok) {
            const data = await res.json();
            result.incidents = (data.features || []).map(f => {
              const p      = f.properties || {};
              const coords = f.geometry?.coordinates;
              return {
                type:        p.type        || null,
                headline:    p.headline    || p.description || null,
                description: p.description || null,
                road:        Array.isArray(p.roads) ? p.roads.join(", ") : (p.road || null),
                direction:   p.direction   || null,
                severity:    p.severity    || null,
                start:       p.start       || null,
                lat:         coords ? coords[1] : null,
                lon:         coords ? coords[0] : null,
              };
            });
            result.sources.push(`Road511 (${result.incidents.length} highway incidents)`);
          }
        } catch (_) {}
      } else {
        result.road511_note = "AZ highway incidents unavailable — set ROAD511_KEY env var. Free key at road511.com.";
      }

      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  // 7. Concerts ─────────────────────────────────────────────────────────────────
  mcp.tool(
    "get_concerts",
    "Returns upcoming concerts and shows sourced from KAZM's data, primarily AZ and regional venues.",
    { state: z.string().optional().describe("Filter by state abbreviation, e.g. 'AZ'") },
    async ({ state }) => {
      const data = await ghGet("concerts.json");
      let list   = (data.concerts || data || []);
      if (state) list = list.filter(c => (c.state || "").toUpperCase() === state.toUpperCase());
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ updated: data.updated || null, count: list.length, concerts: list }),
        }],
      };
    }
  );

  // 8. Events ────────────────────────────────────────────────────────────────────
  mcp.tool(
    "get_events",
    "Returns upcoming local Sedona events including library events and festivals.",
    {},
    async () => {
      const [library, festivals] = await Promise.all([
        ghGet("library-events.json").catch(() => []),
        ghGet("festivals.json").catch(() => []),
      ]);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            library_events: Array.isArray(library) ? library : (library.events || []),
            festivals:      Array.isArray(festivals) ? festivals : (festivals.festivals || []),
          }),
        }],
      };
    }
  );

  // 9. Stream URL ────────────────────────────────────────────────────────────────
  mcp.tool(
    "get_stream_url",
    "Returns the live audio stream URLs for KAZM (MP3 and AAC mounts) plus the station web player URL.",
    {},
    async () => {
      const data   = await azGet(`/api/nowplaying/${STATION}`);
      const mounts = (data.station && data.station.mounts) || [];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            web_player: "https://mellowmountainradio.com",
            streams: mounts.map(m => ({
              name:    m.display_name || m.name,
              url:     m.url,
              bitrate: m.bitrate || null,
              format:  m.autoplay ? m.url.match(/\.(mp3|aac|ogg)/i)?.[1] || null : null,
            })),
          }),
        }],
      };
    }
  );

  // 10. Show Schedule ────────────────────────────────────────────────────────────
  mcp.tool(
    "get_show_schedule",
    "Returns KAZM's weekly on-air program schedule. Optionally filter by day (weekday, saturday, sunday) or show name keyword.",
    {
      day:   z.enum(["weekday","saturday","sunday"]).optional().describe("Filter to a specific day group"),
      query: z.string().optional().describe("Keyword to filter by show name or host"),
    },
    async ({ day, query }) => {
      const data = await ghGet("schedule.json");
      let result = {};
      const days = day ? [day] : ["weekday", "saturday", "sunday"];
      for (const d of days) {
        let shows = data[d] || [];
        if (query) {
          const q = query.toLowerCase();
          shows = shows.filter(s =>
            (s.name || "").toLowerCase().includes(q) ||
            (s.host || "").toLowerCase().includes(q) ||
            (s.description || "").toLowerCase().includes(q)
          );
        }
        if (shows.length) result[d] = shows;
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            station:  data.station  || "KAZM 106.5 FM & 780 AM",
            timezone: data.timezone || "America/Phoenix",
            schedule: result,
          }),
        }],
      };
    }
  );

  // 11. Horoscope ───────────────────────────────────────────────────────────────
  mcp.tool(
    "get_horoscope",
    "Returns daily, weekly, and monthly horoscopes for all signs or a specific sign.",
    {
      sign:   z.enum(["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"]).optional().describe("Zodiac sign (omit for all)"),
      period: z.enum(["daily","weekly","monthly"]).optional().describe("Which forecast period (default: daily)"),
    },
    async ({ sign, period = "daily" }) => {
      const data  = await ghGet("horoscopes.json");
      const signs = data.signs || {};
      const out   = {};
      const keys  = sign ? [sign] : Object.keys(signs);
      for (const k of keys) {
        if (signs[k]) out[k] = { [period]: signs[k][period] || null, date: signs[k].daily_date || null };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ updated: data.updated || null, period, horoscopes: out }),
        }],
      };
    }
  );

  // 12. Schumann Resonance ───────────────────────────────────────────────────────
  mcp.tool(
    "get_schumann_resonance",
    "Returns the current Schumann resonance reading — Earth's electromagnetic pulse measured at the Tomsk observatory. Includes frequency, energy score, activity level, and spectrogram URL.",
    {},
    async () => {
      const data = await ghGet("schumann.json");
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  // 13. Sound Session Recommendation ───────────────────────────────────────────
  mcp.tool(
    "get_sound_session",
    "Recommends a KAZM sound healing session — binaural or tonal — based on the listener's goal or current time of day. Returns session name, description, frequency, duration, and link.",
    {
      goal: z.enum(["sleep","focus","meditation","energy","calm","anxiety","creativity","healing"]).optional()
        .describe("Listener's intent — omit to get a time-of-day recommendation"),
    },
    async ({ goal }) => {
      const SESSIONS = {
        delta: {
          name: "Delta Drift",
          type: "binaural",
          hz_beat: 2,
          brainwave: "Delta (0.5–4 Hz)",
          description: "A 2 Hz binaural beat guides the brain toward delta waves — the deepest brainwave state, associated with dreamless sleep and cellular repair.",
          best_for: ["sleep","healing","anxiety"],
          timing: "30–60 min before sleep",
          requires: "headphones",
          url: "https://mellowmountainradio.com/soundhealing.html",
        },
        theta: {
          name: "Theta Gate",
          type: "binaural",
          hz_beat: 5,
          brainwave: "Theta (4–8 Hz)",
          description: "A 5 Hz binaural beat targets the hypnagogic edge between waking and sleep — where insight, creativity, and deep meditation occur.",
          best_for: ["meditation","creativity","healing"],
          timing: "20–45 min, seated or reclined",
          requires: "headphones",
          url: "https://mellowmountainradio.com/soundhealing.html",
        },
        alpha: {
          name: "Alpha Clear",
          type: "binaural",
          hz_beat: 10,
          brainwave: "Alpha (8–12 Hz)",
          description: "A 10 Hz binaural beat promotes alpha waves — the relaxed-alert state optimal for focused work, studying, or gentle stress relief.",
          best_for: ["focus","calm","energy","anxiety"],
          timing: "15–30 min",
          requires: "headphones",
          url: "https://mellowmountainradio.com/soundhealing.html",
        },
        kazm: {
          name: "The KAZM Harmonic Stack",
          type: "tones",
          frequencies_hz: [54, 72, 84, 111],
          description: "Four sub-bass tones (54, 72, 84, 111 Hz) cycling individually then together — KAZM's year-long overnight experiment on 780 AM. Works through any speakers; no headphones required.",
          best_for: ["meditation","calm","healing","sleep"],
          timing: "Any length — designed for 5-min segments or overnight",
          requires: "any speakers or headphones",
          url: "https://mellowmountainradio.com/soundhealing.html",
        },
      };
      const hour = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Phoenix" })).getHours();
      let recommendation, reason;
      if (goal) {
        if (["sleep","healing"].includes(goal)) {
          recommendation = SESSIONS.delta;
          reason = `For ${goal}, Delta Drift's 2 Hz binaural beat guides the nervous system toward its deepest rest state.`;
        } else if (["meditation","creativity"].includes(goal)) {
          recommendation = SESSIONS.theta;
          reason = `For ${goal}, Theta Gate's 5 Hz beat opens the hypnagogic channel — where insight and deep meditation live.`;
        } else if (["focus","energy"].includes(goal)) {
          recommendation = SESSIONS.alpha;
          reason = `For ${goal}, Alpha Clear's 10 Hz beat promotes relaxed alertness without sedation.`;
        } else if (goal === "anxiety") {
          recommendation = SESSIONS.alpha;
          reason = "Alpha Clear gently shifts the nervous system toward calm focus. For deeper relief, follow with Delta Drift before sleep.";
        } else {
          recommendation = SESSIONS.kazm;
          reason = "The KAZM harmonic stack works without headphones and suits any listening environment.";
        }
      } else {
        if (hour >= 22 || hour < 5) {
          recommendation = SESSIONS.delta; reason = "Late night — Delta Drift supports sleep onset and overnight repair.";
        } else if (hour < 10) {
          recommendation = SESSIONS.alpha; reason = "Morning — Alpha Clear promotes calm focus to start the day.";
        } else if (hour < 16) {
          recommendation = SESSIONS.kazm;  reason = "Daytime — the KAZM harmonic stack suits an ambient background session without headphones.";
        } else if (hour < 20) {
          recommendation = SESSIONS.theta; reason = "Evening — Theta Gate eases the transition from work-mode to rest.";
        } else {
          recommendation = SESSIONS.delta; reason = "Pre-sleep hours — Delta Drift begins guiding the nervous system toward deep rest.";
        }
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            recommended: recommendation,
            reason,
            also_available: Object.values(SESSIONS)
              .filter(s => s.name !== recommendation.name)
              .map(s => ({ name: s.name, best_for: s.best_for })),
          }),
        }],
      };
    }
  );

  // 14. Chakra Guide ────────────────────────────────────────────────────────────
  mcp.tool(
    "get_chakra_guide",
    "Full guide to the seven chakras — Sanskrit name, Solfeggio frequency, musical note, color, element, bija mantra, petal count, governing theme, balanced and blocked states, affirmation, crystals, essential oils, yoga pose, and the Sedona vortex tied to each center.",
    {
      chakra: z.enum(["root","sacral","solar_plexus","heart","throat","third_eye","crown"]).optional()
        .describe("Specific chakra — omit for all seven"),
    },
    async ({ chakra }) => {
      const CHAKRAS = [
        {
          id: "root", name: "Root", sanskrit: "Muladhara",
          location: "Base of the spine", color: "#e0393f", element: "Earth",
          bija_mantra: "LAM", hz: 396, note: "G", petals: 4,
          governs: "Safety, grounding, survival, belonging",
          when_balanced: "Steady, secure, present in your body",
          when_blocked: "Anxious, ungrounded, scattered, insecure about money or home",
          affirmation: "I am safe. I belong here.",
          crystals: ["Red jasper", "Hematite", "Black tourmaline"],
          essential_oils: ["Cedarwood", "Patchouli", "Vetiver"],
          yoga_pose: "Mountain pose (Tadasana)",
          sedona_vortex: "Bell Rock — stand at the base and feel your feet on the red rock.",
        },
        {
          id: "sacral", name: "Sacral", sanskrit: "Svadhisthana",
          location: "Lower belly", color: "#f07a24", element: "Water",
          bija_mantra: "VAM", hz: 417, note: "G♯", petals: 6,
          governs: "Creativity, emotion, pleasure, flow",
          when_balanced: "Playful, feeling, open to change",
          when_blocked: "Numb or overwhelmed, creatively stuck, guilt around pleasure",
          affirmation: "I feel, I create, I flow.",
          crystals: ["Carnelian", "Orange calcite", "Sunstone"],
          essential_oils: ["Sweet orange", "Ylang-ylang", "Sandalwood"],
          yoga_pose: "Goddess pose (Utkata Konasana)",
          sedona_vortex: "Oak Creek — let moving water pull the stuck stuff loose.",
        },
        {
          id: "solar_plexus", name: "Solar Plexus", sanskrit: "Manipura",
          location: "Upper belly", color: "#f2c53d", element: "Fire",
          bija_mantra: "RAM", hz: 528, note: "C", petals: 10,
          governs: "Willpower, confidence, identity",
          when_balanced: "Empowered, decisive, warm",
          when_blocked: "Powerless or controlling, low self-worth, digestive tension",
          affirmation: "I am strong. I choose my path.",
          crystals: ["Citrine", "Tiger's eye", "Yellow calcite"],
          essential_oils: ["Lemon", "Ginger", "Bergamot"],
          yoga_pose: "Boat pose (Navasana)",
          sedona_vortex: "Airport Mesa at sunset — claim your fire as the rocks glow.",
        },
        {
          id: "heart", name: "Heart", sanskrit: "Anahata",
          location: "Center of the chest", color: "#4fae58", element: "Air",
          bija_mantra: "YAM", hz: 639, note: "E", petals: 12,
          governs: "Love, compassion, connection",
          when_balanced: "Open-hearted, forgiving, at peace",
          when_blocked: "Guarded, grieving, resentful, hard to trust",
          affirmation: "I give and receive love freely.",
          crystals: ["Rose quartz", "Green aventurine", "Malachite"],
          essential_oils: ["Rose", "Bergamot", "Geranium"],
          yoga_pose: "Camel pose (Ustrasana)",
          sedona_vortex: "Boynton Canyon — the tender heart of the red rocks.",
        },
        {
          id: "throat", name: "Throat", sanskrit: "Vishuddha",
          location: "The throat", color: "#3aa0d8", element: "Ether / Sound",
          bija_mantra: "HAM", hz: 741, note: "F♯", petals: 16,
          governs: "Truth, expression, your voice",
          when_balanced: "Honest, clear, heard",
          when_blocked: "Held back, unheard, throat tension, fear of speaking up",
          affirmation: "I speak my truth with ease.",
          crystals: ["Lapis lazuli", "Aquamarine", "Blue lace agate"],
          essential_oils: ["Eucalyptus", "Peppermint", "Chamomile"],
          yoga_pose: "Fish pose (Matsyasana)",
          sedona_vortex: "Sing along on 106.5 — your voice carries across the canyon.",
        },
        {
          id: "third_eye", name: "Third Eye", sanskrit: "Ajna",
          location: "Between the brows", color: "#3d5aa8", element: "Light",
          bija_mantra: "OM", hz: 852, note: "A", petals: 2,
          governs: "Intuition, insight, imagination",
          when_balanced: "Perceptive, focused, trusting your knowing",
          when_blocked: "Foggy, doubtful, over-thinking, cut off from intuition",
          affirmation: "I trust my inner knowing.",
          crystals: ["Amethyst", "Lapis lazuli", "Fluorite"],
          essential_oils: ["Clary sage", "Frankincense", "Juniper"],
          yoga_pose: "Child's pose (Balasana)",
          sedona_vortex: "Cathedral Rock — the seer's vortex, where the veil goes thin.",
        },
        {
          id: "crown", name: "Crown", sanskrit: "Sahasrara",
          location: "Top of the head", color: "#9b5fc0", element: "Thought / Cosmos",
          bija_mantra: "OM (or silence)", hz: 963, note: "B", petals: 1000,
          governs: "Connection, transcendence, the infinite",
          when_balanced: "Awake, unified, part of something vast",
          when_blocked: "Cynical, isolated, spiritually flat, stuck in the head",
          affirmation: "I am one with all that is.",
          crystals: ["Clear quartz", "Selenite", "Amethyst"],
          essential_oils: ["Frankincense", "Lotus", "Myrrh"],
          yoga_pose: "Corpse pose (Savasana)",
          sedona_vortex: "The dark sky over Sedona — dissolve up into the Milky Way.",
        },
      ];
      const result = chakra ? CHAKRAS.filter(c => c.id === chakra) : CHAKRAS;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            chakras: result,
            note: "Frequencies are the Solfeggio healing set used in sound baths. Vortex connections are Sedona-specific.",
            chakra_sound_bath: "https://mellowmountainradio.com/chakras.html",
            sound_healing_page: "https://mellowmountainradio.com/soundhealing.html",
          }),
        }],
      };
    }
  );

  // 14b. Chakra Frequencies (legacy alias — thin version kept for back-compat) ──
  mcp.tool(
    "get_chakra_frequencies",
    "Returns the seven Solfeggio chakra frequencies with musical notes, colors, and affirmations. For the full guide (crystals, oils, poses, Sedona vortex) use get_chakra_guide.",
    {
      chakra: z.enum(["root","sacral","solar_plexus","heart","throat","third_eye","crown"]).optional()
        .describe("Specific chakra — omit for all seven"),
    },
    async ({ chakra }) => {
      const CHAKRAS = [
        { id: "root",         name: "Root",         sanskrit: "Muladhara",    hz: 396, note: "G",  color: "#e0393f", affirmation: "I am safe. I belong here." },
        { id: "sacral",       name: "Sacral",       sanskrit: "Svadhisthana", hz: 417, note: "G♯", color: "#f07a24", affirmation: "I feel, I create, I flow." },
        { id: "solar_plexus", name: "Solar Plexus", sanskrit: "Manipura",    hz: 528, note: "C",  color: "#f2c53d", affirmation: "I am strong. I choose my path." },
        { id: "heart",        name: "Heart",        sanskrit: "Anahata",      hz: 639, note: "E",  color: "#4fae58", affirmation: "I give and receive love freely." },
        { id: "throat",       name: "Throat",       sanskrit: "Vishuddha",    hz: 741, note: "F♯", color: "#3aa0d8", affirmation: "I speak my truth with ease." },
        { id: "third_eye",    name: "Third Eye",    sanskrit: "Ajna",         hz: 852, note: "A",  color: "#3d5aa8", affirmation: "I trust my inner knowing." },
        { id: "crown",        name: "Crown",        sanskrit: "Sahasrara",    hz: 963, note: "B",  color: "#9b5fc0", affirmation: "I am one with all that is." },
      ];
      const result = chakra ? CHAKRAS.filter(c => c.id === chakra) : CHAKRAS;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            chakras: result,
            tip: "Use get_chakra_guide for crystals, essential oils, yoga poses, and Sedona vortex connections.",
            chakra_sound_bath: "https://mellowmountainradio.com/chakras.html",
          }),
        }],
      };
    }
  );

  // 15. Solfeggio Frequencies ───────────────────────────────────────────────────
  mcp.tool(
    "get_solfeggio",
    "Returns the nine-tone Solfeggio frequency scale with each tone's traditional healing properties, note name, and use cases. These frequencies underpin modern sound healing practice.",
    {
      hz: z.number().int().optional().describe("Look up a specific frequency in Hz — e.g. 528"),
    },
    async ({ hz }) => {
      const SOLFEGGIO = [
        { hz: 174, note: "—",   name: "Foundation",    theme: "Pain relief, security, physical grounding. The lowest Solfeggio tone — felt more than heard, working on the physical body and nervous system." },
        { hz: 285, note: "—",   name: "Renewal",       theme: "Tissue healing, cellular repair, field coherence. Said to influence energy fields around the body and accelerate recovery." },
        { hz: 396, note: "Ut",  name: "Liberation",    theme: "Releases guilt and fear. Transforms grief into joy. The root of the original Gregorian hexachord." },
        { hz: 417, note: "Re",  name: "Undoing",       theme: "Facilitates change. Clears traumatic imprints and negative cycles. Helps break patterns that no longer serve." },
        { hz: 528, note: "Mi",  name: "Transformation",theme: "The 'love frequency.' Associated with DNA repair, cellular transformation, and fundamental healing. The most-cited frequency in sound healing." },
        { hz: 639, note: "Fa",  name: "Connection",    theme: "Harmonizes relationships, promotes empathy and tolerance. Used for healing interpersonal conflicts and deepening connection." },
        { hz: 741, note: "Sol", name: "Awakening",     theme: "Cleanses and detoxifies. Promotes expression and problem-solving. Associated with the throat — speaking truth." },
        { hz: 852, note: "La",  name: "Returning",     theme: "Returns the body to spiritual order. Awakens intuition and elevates awareness. Third-eye frequency." },
        { hz: 963, note: "—",   name: "Transcendence", theme: "The crown frequency. Pure tone associated with divine consciousness, unity, and the return to oneness." },
      ];
      const result = hz ? SOLFEGGIO.filter(s => s.hz === hz) : SOLFEGGIO;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            frequencies: result,
            note: "The six original Solfeggio tones (396–852 Hz) derive from a Medieval hymn; 174, 285, and 963 Hz were identified later as extensions of the same mathematical pattern.",
            sound_healing_page: "https://mellowmountainradio.com/soundhealing.html",
          }),
        }],
      };
    }
  );

  // 16. Song Request Library ─────────────────────────────────────────────────────
  mcp.tool(
    "search_song_request_library",
    "Search KAZM's requestable song library by artist or title keyword. Returns matching tracks the DJ can play on request.",
    { query: z.string().describe("Artist name or song title to search for") },
    async ({ query }) => {
      const data = await ghGet("request-library.json");
      const list = Array.isArray(data) ? data : [];
      const q    = query.toLowerCase();
      const hits = list.filter(s =>
        (s.t || "").toLowerCase().includes(q) ||
        (s.a || "").toLowerCase().includes(q)
      ).map(s => ({ title: s.t, artist: s.a }));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ query, count: hits.length, results: hits.slice(0, 50) }),
        }],
      };
    }
  );

  // 17. Rewind / Archive ─────────────────────────────────────────────────────────
  mcp.tool(
    "get_rewind",
    "Returns available on-demand rewind blocks — past KAZM broadcasts you can listen to, with dates and stream URLs.",
    {},
    async () => {
      const data   = await ghGet("rewind-manifest.json");
      const blocks = (data.blocks || []).map(b => ({
        date:      b.date  || null,
        start_hour: b.start ?? null,
        url:       b.url   || null,
      }));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ count: blocks.length, blocks }),
        }],
      };
    }
  );

  // 15. Jeep Trails ──────────────────────────────────────────────────────────────
  mcp.tool(
    "get_jeep_trails",
    "Returns Sedona jeep trail names available on the KAZM trail map. Pass a trail name to get its GPS coordinate path.",
    { trail: z.string().optional().describe("Trail slug, e.g. 'broken-arrow', 'schnebly'. Omit for the full list.") },
    async ({ trail }) => {
      const data   = await ghGet("jeeptrails-geo.json");
      const names  = Object.keys(data);
      if (!trail) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ trails: names, map_url: "https://mellowmountainradio.com/jeeptrails.html" }),
          }],
        };
      }
      const key  = trail.toLowerCase().replace(/\s+/g, "-");
      const geo  = data[key] || data[Object.keys(data).find(k => k.includes(key))] || null;
      if (!geo) throw new Error(`Trail not found: ${trail}. Available: ${names.join(", ")}`);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ trail: key, coordinates: geo }),
        }],
      };
    }
  );

  // 16. Movies ──────────────────────────────────────────────────────────────────
  mcp.tool(
    "get_movies",
    "Returns current movie showings at Sedona-area theaters (Mary D. Fisher Theatre, Harkins Sedona 6, and others).",
    {},
    async () => {
      const data = await ghGet("showtimes.json");
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            updated:  data.updated  || null,
            venues:   data.venues   || [],
            showings: data.showings || [],
          }),
        }],
      };
    }
  );

  // 17. Emergency Alerts (EAS) ──────────────────────────────────────────────────
  mcp.tool(
    "get_emergency_alerts",
    "Returns active Emergency Alert System (EAS) alerts for the Sedona area — Yavapai and Coconino counties. Covers weather emergencies, evacuation orders, Amber Alerts, and all FEMA IPAWS-distributed alerts. Data is live from the National Weather Service public API.",
    {
      severity: z.enum(["Extreme","Severe","Moderate","Minor"]).optional()
        .describe("Filter to alerts at or above this severity level (Extreme > Severe > Moderate > Minor)"),
    },
    async ({ severity }) => {
      const SEVERITY_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
      const minRank = severity ? (SEVERITY_RANK[severity] ?? 0) : 0;

      const res = await fetch(
        "https://api.weather.gov/alerts/active?zone=AZC025,AZC005",
        { headers: { "Accept": "application/geo+json", "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)" } }
      );
      if (!res.ok) throw new Error(`NWS alerts ${res.status}`);
      const data = await res.json();

      const features = (data.features || []);
      const alerts = features
        .map(f => f.properties || {})
        .filter(p => (SEVERITY_RANK[p.severity] ?? 0) >= minRank)
        .map(p => ({
          id:          p.id            || null,
          event:       p.event         || null,
          headline:    p.headline       || null,
          description: p.description   || null,
          instruction: p.instruction   || null,
          severity:    p.severity      || null,
          urgency:     p.urgency       || null,
          certainty:   p.certainty     || null,
          areas:       p.areaDesc      || null,
          sender:      p.senderName    || null,
          effective:   p.effective     || null,
          expires:     p.expires       || null,
          url:         p["@id"]        || null,
        }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            updated:  new Date().toISOString(),
            counties: ["Yavapai", "Coconino"],
            count:    alerts.length,
            alerts,
          }),
        }],
      };
    }
  );

  // 18. Submit Song Request ──────────────────────────────────────────────────────
  mcp.tool(
    "submit_song_request",
    "Submit a song request to KAZM 106.5 FM & 780 AM via the station website. Searches the real studio library, then logs the request for the DJ — every request gets read. Provide both song title and artist for best results.",
    {
      query: z.string().describe("Song title and/or artist name, e.g. 'Sailing Christopher Cross' or 'Truckin Grateful Dead'"),
      name:  z.string().max(60).optional().describe("Your name and town for the request card, e.g. 'Sarah from Sedona' (optional)"),
      note:  z.string().max(140).optional().describe("A dedication or message, e.g. 'Happy birthday Maria!' (optional)"),
    },
    async ({ query, name = "", note = "" }) => {
      const LIBRARY_URL = "https://mellowmountainradio.com/request-library.json";
      const REQUEST_URL = "https://n8n.mellowmountainradio.com/webhook/kazm-request-line";

      // Fetch the station's requestable library (format: [{ t: title, a: artist }, ...])
      const libRes = await fetch(LIBRARY_URL, { headers: { "User-Agent": "KAZM-MCP/1.0" } });
      if (!libRes.ok) {
        return { content: [{ type: "text", text: JSON.stringify({
          success: false,
          message: "Could not load the KAZM request library right now. Try again in a moment.",
        }) }] };
      }
      const library = await libRes.json();

      // Fuzzy search: normalize text, score by substring / word-hit count
      function norm(s) {
        return String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
      }
      const q     = norm(query);
      const words = q.split(" ").filter(Boolean);

      const scored = library
        .map(s => {
          const t = norm(s.t), a = norm(s.a), combo = t + " " + a;
          if (t === q)           return { s, score: 110 }; // exact title match
          if (combo === q)       return { s, score: 105 }; // exact full-combo match
          if (combo.includes(q)) return { s, score: 100 }; // full query is a substring
          const hits = words.filter(w => combo.includes(w)).length;
          return hits > 0 ? { s, score: hits } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

      if (!scored.length) {
        return { content: [{ type: "text", text: JSON.stringify({
          success: false,
          message: `No songs matching "${query}" found in the KAZM request library. Try a different spelling or include both title and artist. KAZM plays soft-rock and yacht-rock from the 70s–90s.`,
        }) }] };
      }

      // Multiple songs tie for top score — ambiguous, return choices
      if (scored.length > 1 && scored[0].score === scored[1].score) {
        return { content: [{ type: "text", text: JSON.stringify({
          success: false,
          matches: scored.slice(0, 5).map(x => ({ title: x.s.t, artist: x.s.a })),
          message: `Found ${scored.length} songs matching "${query}". Re-call with both title and artist, e.g. "${scored[0].s.t} ${scored[0].s.a}".`,
        }) }] };
      }

      // Clear winner — submit to the n8n webhook (same endpoint the website uses)
      const pick    = scored[0].s;
      const postRes = await fetch(REQUEST_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "KAZM-MCP/1.0" },
        body:    JSON.stringify({ title: pick.t, artist: pick.a, name: name.slice(0, 60), note: note.slice(0, 140) }),
      });

      let result = {};
      try { result = await postRes.json(); } catch (_) {}

      if (!postRes.ok || result.success === false) {
        return { content: [{ type: "text", text: JSON.stringify({
          success: false,
          message: result.message || `Studio webhook returned HTTP ${postRes.status}. Try again in a moment.`,
        }) }] };
      }

      return { content: [{ type: "text", text: JSON.stringify({
        success:   true,
        submitted: { title: pick.t, artist: pick.a },
        name:      name || null,
        note:      note || null,
        message:   `"${pick.t}" by ${pick.a} has been logged for the KAZM studio. Every request gets read — no auto-queue, but your request just landed on the DJ's desk.`,
      }) }] };
    }
  );

  // 19. Local News Headlines ─────────────────────────────────────────────────────
  mcp.tool(
    "get_local_news_headlines",
    "Returns the latest Sedona and Verde Valley local news headlines. Pulls live from the Sedona Red Rock News and Verde Independent RSS feeds. Covers local government, arts, community events, real estate, and Verde Valley news.",
    {
      limit: z.number().int().min(1).max(20).optional()
        .describe("Max headlines to return per source (default 8)"),
    },
    async ({ limit = 8 }) => {
      const sources = [
        { name: "Sedona Red Rock News", url: "https://www.redrocknews.com/feed/" },
        { name: "Verde Independent",    url: "https://www.verdenews.com/feed/"   },
      ];

      const results = await Promise.allSettled(
        sources.map(async (src) => {
          const res = await fetch(src.url, {
            headers: { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)" },
            signal:  AbortSignal.timeout(7000),
          });
          if (!res.ok) throw new Error(`${src.name} HTTP ${res.status}`);
          const xml = await res.text();

          const items = [];
          const itemRe = /<item>([\s\S]*?)<\/item>/gi;
          for (const m of xml.matchAll(itemRe)) {
            const block = m[1];
            const titleM = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)
                        || block.match(/<title>([\s\S]*?)<\/title>/);
            const linkM  = block.match(/<link>([\s\S]*?)<\/link>/)
                        || block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
            const dateM  = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
            const descM  = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)
                        || block.match(/<description>([\s\S]*?)<\/description>/);
            const title = titleM?.[1]?.trim();
            if (!title) continue;
            const summary = descM?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
            items.push({
              title,
              link:      linkM?.[1]?.trim() || null,
              published: dateM?.[1]?.trim()  || null,
              summary,
            });
            if (items.length >= limit) break;
          }
          return { source: src.name, count: items.length, items };
        })
      );

      const feeds = results
        .filter(r => r.status === "fulfilled")
        .map(r => r.value);

      const errors = results
        .map((r, i) => r.status === "rejected" ? { source: sources[i].name, error: r.reason?.message } : null)
        .filter(Boolean);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            updated: new Date().toISOString(),
            feeds,
            ...(errors.length ? { errors } : {}),
          }),
        }],
      };
    }
  );

  // 20. Air Quality ──────────────────────────────────────────────────────────────
  mcp.tool(
    "get_air_quality",
    "Returns current air quality index (AQI) and pollutant readings for Sedona, AZ from Open-Meteo. Includes US AQI category, PM2.5, PM10, ozone, and UV index. Especially useful during wildfire season for tracking smoke and outdoor safety.",
    {},
    async () => {
      const url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        + "?latitude=34.8697&longitude=-111.7610"
        + "&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,dust,uv_index"
        + "&timezone=America%2FPhoenix";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo AQI ${res.status}`);
      const data    = await res.json();
      const current = data.current || {};
      const aqi     = current.us_aqi;

      let category = "Unknown";
      if (aqi !== undefined && aqi !== null) {
        if      (aqi <= 50)  category = "Good";
        else if (aqi <= 100) category = "Moderate";
        else if (aqi <= 150) category = "Unhealthy for Sensitive Groups";
        else if (aqi <= 200) category = "Unhealthy";
        else if (aqi <= 300) category = "Very Unhealthy";
        else                 category = "Hazardous";
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            location:          "Sedona, AZ",
            coordinates:       { lat: 34.8697, lon: -111.7610 },
            updated:           current.time || new Date().toISOString(),
            us_aqi:            aqi          ?? null,
            category,
            pm2_5_ug_m3:       current.pm2_5             ?? null,
            pm10_ug_m3:        current.pm10              ?? null,
            ozone_ug_m3:       current.ozone             ?? null,
            uv_index:          current.uv_index          ?? null,
            dust_ug_m3:        current.dust              ?? null,
            carbon_monoxide:   current.carbon_monoxide   ?? null,
            nitrogen_dioxide:  current.nitrogen_dioxide  ?? null,
            source:            "Open-Meteo Air Quality API (open-meteo.com)",
          }),
        }],
      };
    }
  );

  // 21. Sports Scores ───────────────────────────────────────────────────────────
  mcp.tool(
    "get_sports_scores",
    "Returns current and recent scores for Arizona sports teams — Cardinals (NFL), Suns (NBA), D-backs (MLB), Mercury (WNBA), ASU Sun Devils, Arizona Wildcats, NAU Lumberjacks, and UFC events. Powered by ESPN.",
    {
      team: z.enum(["cardinals","suns","dbacks","mercury","asu","wildcats","arizona","nau","ufc"]).optional()
        .describe("Filter by team — omit for all Arizona teams"),
    },
    async ({ team }) => {
      const headers = { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)" };
      async function espn(path) {
        try {
          const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}`, { headers, signal: AbortSignal.timeout(7000) });
          return r.ok ? r.json() : null;
        } catch { return null; }
      }
      function parseGame(event) {
        const comp = (event.competitions || [])[0] || {};
        const teams = (comp.competitors || []).map(c => ({
          team:   c.team?.displayName || c.team?.name || "?",
          abbr:   c.team?.abbreviation || "?",
          score:  c.score ?? "–",
          home:   c.homeAway === "home",
          winner: c.winner ?? false,
        }));
        const st = comp.status?.type || event.status?.type || {};
        return {
          game:   event.name || event.shortName || teams.map(t => t.team).join(" vs "),
          date:   event.date || null,
          status: st.description || st.name || "–",
          live:   st.name === "STATUS_IN_PROGRESS",
          period: comp.status?.displayClock ? `Q${comp.status.period} ${comp.status.displayClock}` : null,
          teams,
        };
      }
      function azGames(data, abbrs) {
        return (data?.events || []).filter(e =>
          !abbrs || (e.competitions || []).some(c =>
            (c.competitors || []).some(t => abbrs.includes(t.team?.abbreviation?.toUpperCase()))
          )
        ).map(parseGame);
      }
      function recentAndNext(data) {
        const events = data?.events || [];
        const now = Date.now();
        const done = events.filter(e => e.competitions?.[0]?.status?.type?.name === "STATUS_FINAL");
        const next = events.filter(e => new Date(e.date).getTime() > now);
        return [...done.slice(-2), ...next.slice(0, 1)].map(parseGame);
      }

      const [nfl, nba, mlb, wnba, ufc, cfb_asu, cbb_asu, cfb_ua, cbb_ua, cfb_nau, cbb_nau] = await Promise.all([
        espn("football/nfl/scoreboard"),
        espn("basketball/nba/scoreboard"),
        espn("baseball/mlb/scoreboard"),
        espn("basketball/wnba/scoreboard"),
        espn("mma/ufc/scoreboard"),
        espn("football/college-football/teams/9/schedule"),
        espn("basketball/mens-college-basketball/teams/9/schedule"),
        espn("football/college-football/teams/12/schedule"),
        espn("basketball/mens-college-basketball/teams/12/schedule"),
        espn("football/college-football/teams/2038/schedule"),
        espn("basketball/mens-college-basketball/teams/2038/schedule"),
      ]);

      const all = {
        cardinals:           { sport: "NFL",  team: "Arizona Cardinals",        games: azGames(nfl,  ["ARI"]) },
        suns:                { sport: "NBA",  team: "Phoenix Suns",              games: azGames(nba,  ["PHX"]) },
        dbacks:              { sport: "MLB",  team: "Arizona Diamondbacks",      games: azGames(mlb,  ["ARI"]) },
        mercury:             { sport: "WNBA", team: "Phoenix Mercury",           games: azGames(wnba, ["PHX"]) },
        ufc:                 { sport: "UFC",  team: "UFC",                       games: azGames(ufc,  null).slice(0, 10) },
        asu_football:        { sport: "CFB",  team: "ASU Sun Devils Football",   games: recentAndNext(cfb_asu) },
        asu_basketball:      { sport: "CBB",  team: "ASU Sun Devils Basketball", games: recentAndNext(cbb_asu) },
        wildcats_football:   { sport: "CFB",  team: "Arizona Wildcats Football", games: recentAndNext(cfb_ua) },
        wildcats_basketball: { sport: "CBB",  team: "Arizona Wildcats Basketball",games: recentAndNext(cbb_ua) },
        nau_football:        { sport: "CFB",  team: "NAU Lumberjacks Football",  games: recentAndNext(cfb_nau) },
        nau_basketball:      { sport: "CBB",  team: "NAU Lumberjacks Basketball",games: recentAndNext(cbb_nau) },
      };

      const FILTERS = {
        cardinals: ["cardinals"],
        suns:      ["suns"],
        dbacks:    ["dbacks"],
        mercury:   ["mercury"],
        ufc:       ["ufc"],
        asu:       ["asu_football","asu_basketball"],
        wildcats:  ["wildcats_football","wildcats_basketball"],
        arizona:   ["wildcats_football","wildcats_basketball"],
        nau:       ["nau_football","nau_basketball"],
      };

      let scores = team && FILTERS[team]
        ? Object.fromEntries(FILTERS[team].map(k => [k, all[k]]))
        : all;
      Object.keys(scores).forEach(k => { if (!scores[k].games.length) delete scores[k]; });

      return { content: [{ type: "text", text: JSON.stringify({ updated: new Date().toISOString(), scores }) }] };
    }
  );

  // 22. Sun Times & Solstice ────────────────────────────────────────────────────
  mcp.tool(
    "get_sun_times",
    "Returns sunrise, sunset, solar noon, day length, golden hours, and astronomical twilight for Sedona from the KAZM transmitter site. Optional date param for any day. Also flags next solstice and equinox.",
    {
      date: z.string().optional().describe("Date in YYYY-MM-DD format — omit for today"),
    },
    async ({ date }) => {
      const d = date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
      try {
        const r = await fetch(
          `https://api.sunrise-sunset.org/json?lat=34.8697&lng=-111.7610&date=${d}&formatted=0`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (json.status !== "OK") throw new Error(json.status);
        const res = json.results;
        // Next solstice/equinox relative to today
        const today = new Date(d + "T12:00:00-07:00");
        const year = today.getFullYear();
        const events = [
          { name: "Spring Equinox",  date: new Date(`${year}-03-20T10:00:00-07:00`) },
          { name: "Summer Solstice", date: new Date(`${year}-06-20T16:00:00-07:00`) },
          { name: "Fall Equinox",    date: new Date(`${year}-09-22T18:00:00-07:00`) },
          { name: "Winter Solstice", date: new Date(`${year}-12-21T04:00:00-07:00`) },
          { name: "Spring Equinox",  date: new Date(`${year + 1}-03-20T10:00:00-07:00`) },
          { name: "Summer Solstice", date: new Date(`${year + 1}-06-20T16:00:00-07:00`) },
        ];
        const next = events.filter(e => e.date > today)[0];
        const daysUntilNext = next ? Math.ceil((next.date - today) / 86400000) : null;

        return { content: [{ type: "text", text: JSON.stringify({
          date: d,
          location:             "Sedona, AZ (KAZM transmitter site)",
          sunrise:              res.sunrise,
          sunset:               res.sunset,
          solar_noon:           res.solar_noon,
          day_length_seconds:   res.day_length,
          civil_twilight_begin: res.civil_twilight_begin,
          civil_twilight_end:   res.civil_twilight_end,
          nautical_twilight_begin: res.nautical_twilight_begin,
          nautical_twilight_end:   res.nautical_twilight_end,
          astronomical_twilight_begin: res.astronomical_twilight_begin,
          astronomical_twilight_end:   res.astronomical_twilight_end,
          next_solstice_or_equinox: next ? { name: next.name, date: next.date.toISOString(), days_away: daysUntilNext } : null,
          source: "sunrise-sunset.org",
        }) }] };
      } catch (e) {
        return { content: [{ type: "text", text: JSON.stringify({ error: String(e.message), date: d }) }] };
      }
    }
  );

  // 23. Moon Phase ──────────────────────────────────────────────────────────────
  mcp.tool(
    "get_moon_phase",
    "Returns tonight's moon phase for Sedona, AZ — illumination percent, phase name, and a 7-day lunar calendar. Perfect for stargazing and outdoor planning.",
    { date: z.string().optional().describe("Date YYYY-MM-DD (default today)") },
    async ({ date }) => {
      const d = date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
      function moonPhase(ds) {
        const jd = new Date(ds + "T12:00:00Z").getTime() / 86400000 + 2440587.5;
        let age = (jd - 2451549.5) % 29.53058867;
        if (age < 0) age += 29.53058867;
        const illum = Math.round(50 * (1 - Math.cos(age / 29.53058867 * 2 * Math.PI)) * 10) / 10;
        let phase, emoji;
        if      (age < 1.85)  { phase = "New Moon";        emoji = "🌑"; }
        else if (age < 7.38)  { phase = "Waxing Crescent"; emoji = "🌒"; }
        else if (age < 9.22)  { phase = "First Quarter";   emoji = "🌓"; }
        else if (age < 14.77) { phase = "Waxing Gibbous";  emoji = "🌔"; }
        else if (age < 16.61) { phase = "Full Moon";       emoji = "🌕"; }
        else if (age < 22.15) { phase = "Waning Gibbous";  emoji = "🌖"; }
        else if (age < 23.99) { phase = "Third Quarter";   emoji = "🌗"; }
        else                  { phase = "Waning Crescent"; emoji = "🌘"; }
        return { date: ds, phase, emoji, illumination_pct: illum, moon_age_days: Math.round(age * 10) / 10 };
      }
      const base = new Date(d + "T12:00:00Z");
      const calendar = Array.from({ length: 7 }, (_, i) => {
        const ds = new Date(base.getTime() + i * 86400000).toISOString().slice(0, 10);
        return moonPhase(ds);
      });
      return { content: [{ type: "text", text: JSON.stringify({
        location: "Sedona, AZ",
        today: moonPhase(d),
        next_7_days: calendar,
        source: "Astronomical calculation",
      }) }] };
    }
  );

  // 24. Sedona Vortex Guide ─────────────────────────────────────────────────────
  mcp.tool(
    "get_vortex_guide",
    "Returns a guide to Sedona's four famous energy vortex sites — Bell Rock, Cathedral Rock, Airport Mesa, and Boynton Canyon. Includes directions, hiking info, best visit times, and energy type.",
    { site: z.enum(["bell_rock","cathedral_rock","airport_mesa","boynton_canyon"]).optional().describe("Filter to one vortex site") },
    async ({ site }) => {
      const vortexes = {
        bell_rock: {
          name: "Bell Rock", type: "Electric (masculine/upflow)",
          coordinates: { lat: 34.7940, lon: -111.7614 },
          trailhead: "Bell Rock Pathway trailhead, AZ-179, Village of Oak Creek",
          hike: "Easy–moderate. Loop around base ~1.5 mi; summit scramble ~3 mi RT.",
          best_time: "Sunrise or late afternoon golden hour",
          parking: "Bell Rock Vista parking (free)",
          description: "One of the most iconic and accessible vortexes. The bell-shaped red butte radiates an upward, energizing force said to strengthen the spirit and inspire action. Twisted junipers near the base are often cited as visible evidence of the vortex energy.",
          distance_mi_from_kazm: 7,
        },
        cathedral_rock: {
          name: "Cathedral Rock", type: "Magnetic (feminine/inflow)",
          coordinates: { lat: 34.8214, lon: -111.7892 },
          trailhead: "Back O' Beyond trailhead off AZ-179",
          hike: "Moderate–strenuous. ~1.2 mi RT, 700 ft gain to saddle.",
          best_time: "Late afternoon — rocks glow orange at sunset",
          parking: "Red Rock Crossing / Crescent Moon picnic area ($12/car)",
          description: "One of the most photographed spots in Arizona. The magnetic, inward-drawing energy is associated with feminine power, calm, and introspection. Oak Creek flows below, creating a reflective pool that mirrors the spires at sunset.",
          distance_mi_from_kazm: 4,
        },
        airport_mesa: {
          name: "Airport Mesa", type: "Electric (upflow)",
          coordinates: { lat: 34.8717, lon: -111.7878 },
          trailhead: "Airport Road, Sedona — turnout on the left climbing the mesa",
          hike: "Easy. Flat loop ~0.7 mi along the rim.",
          best_time: "Sunset — 360° panoramic views",
          parking: "Small pullout on Airport Road (free, fills fast at sunset)",
          description: "The most accessible vortex, a short walk from town. At 4,500 ft, it offers sweeping views of the red rocks in every direction. The electric energy here promotes clarity, vitality, and a sense of possibility.",
          distance_mi_from_kazm: 2,
        },
        boynton_canyon: {
          name: "Boynton Canyon", type: "Balanced (electric + magnetic)",
          coordinates: { lat: 34.9053, lon: -111.8497 },
          trailhead: "Boynton Canyon trailhead, Enchantment Resort road",
          hike: "Moderate. ~6 mi RT through the canyon, 500 ft gain.",
          best_time: "Morning — canyon fills with light from the east",
          parking: "Boynton Canyon trailhead ($12 Red Rock Pass)",
          description: "The most secluded of the four major vortexes, tucked in a red-walled canyon near Enchantment Resort. Both masculine and feminine energies converge here — a place of balance and deep renewal. Kachina Woman spire near the trailhead is sacred in Yavapai-Apache tradition.",
          distance_mi_from_kazm: 6,
        },
      };
      return { content: [{ type: "text", text: JSON.stringify({
        location: "Sedona, AZ",
        note: "Red Rock Pass required at most trailhead parking areas — buy at the Sedona Chamber visitor center or automated kiosks.",
        vortex_sites: site ? { [site]: vortexes[site] } : vortexes,
      }) }] };
    }
  );

  // 25. NWS Weather Alerts ──────────────────────────────────────────────────────
  mcp.tool(
    "get_nws_alerts",
    "Returns active National Weather Service alerts for the Sedona / Yavapai County area — watches, warnings, and advisories. Returns empty when conditions are clear.",
    {},
    async () => {
      const r = await fetch(
        "https://api.weather.gov/alerts/active?zone=AZZ018",
        { headers: { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)", "Accept": "application/geo+json" }, signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) throw new Error(`NWS ${r.status}`);
      const data = await r.json();
      const alerts = (data.features || []).map(f => {
        const p = f.properties || {};
        return {
          event:       p.event,
          severity:    p.severity,
          urgency:     p.urgency,
          headline:    p.headline,
          description: (p.description || "").slice(0, 500),
          instruction: (p.instruction || "").slice(0, 300),
          effective:   p.effective,
          expires:     p.expires,
          areas:       p.areaDesc,
        };
      });
      return { content: [{ type: "text", text: JSON.stringify({
        location: "Sedona / Yavapai County, AZ (NWS zone AZZ018)",
        updated: new Date().toISOString(),
        alert_count: alerts.length,
        alerts,
        source: "National Weather Service (weather.gov)",
      }) }] };
    }
  );

  // 26. Oak Creek Water Levels ──────────────────────────────────────────────────
  mcp.tool(
    "get_oak_creek_levels",
    "Returns current Oak Creek stream level and discharge at the Sedona USGS gauge. Useful for creek crossing safety, swimming holes, and recreation planning.",
    {},
    async () => {
      const r = await fetch(
        "https://waterservices.usgs.gov/nwis/iv/?sites=09504420&parameterCd=00060,00065&format=json&siteStatus=all",
        { headers: { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)" }, signal: AbortSignal.timeout(10000) }
      );
      if (!r.ok) throw new Error(`USGS ${r.status}`);
      const data = await r.json();
      const result = {};
      for (const ts of (data.value?.timeSeries || [])) {
        const code = ts.variable?.variableCode?.[0]?.value;
        const vals = ts.values?.[0]?.value || [];
        const latest = vals[vals.length - 1];
        if (latest) {
          const key = code === "00060" ? "discharge_cfs" : code === "00065" ? "gage_height_ft" : code;
          result[key] = { value: parseFloat(latest.value), dateTime: latest.dateTime };
        }
      }
      const cfs = result.discharge_cfs?.value;
      let level_label = null;
      if      (cfs != null && cfs < 10)  level_label = "Very low — some sections may be dry";
      else if (cfs != null && cfs < 50)  level_label = "Low — easy wading";
      else if (cfs != null && cfs < 200) level_label = "Moderate — ankle to knee-deep";
      else if (cfs != null && cfs < 500) level_label = "High — strong current, use caution";
      else if (cfs != null)              level_label = "Flood stage — do not enter";
      return { content: [{ type: "text", text: JSON.stringify({
        station: "Oak Creek near Sedona, AZ",
        station_id: "USGS 09504420",
        updated: new Date().toISOString(),
        level_label, ...result,
        source: "USGS National Water Information System (waterservices.usgs.gov)",
      }) }] };
    }
  );

  // 27. Artist Info ─────────────────────────────────────────────────────────────
  mcp.tool(
    "get_artist_info",
    "Returns biography, genre tags, and album discography for the artist currently on KAZM, or any named artist, from MusicBrainz (open music encyclopedia).",
    { artist: z.string().optional().describe("Artist name — omit to use the current now-playing artist") },
    async ({ artist }) => {
      let name = artist;
      if (!name) {
        const np = await azGet(`/api/nowplaying/${STATION}`);
        name = np?.now_playing?.song?.artist || null;
      }
      if (!name) return { content: [{ type: "text", text: JSON.stringify({ error: "No artist playing and none provided" }) }] };
      const hdrs = { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)", Accept: "application/json" };
      const sr = await fetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(name)}&limit=1&fmt=json`, { headers: hdrs, signal: AbortSignal.timeout(8000) });
      if (!sr.ok) throw new Error(`MusicBrainz ${sr.status}`);
      const mb = (await sr.json()).artists?.[0];
      if (!mb) return { content: [{ type: "text", text: JSON.stringify({ searched_for: name, found: false }) }] };
      const dr = await fetch(`https://musicbrainz.org/ws/2/artist/${mb.id}?inc=url-rels+release-groups&fmt=json`, { headers: hdrs, signal: AbortSignal.timeout(8000) });
      const full = dr.ok ? await dr.json() : mb;
      const albums = (full["release-groups"] || []).filter(rg => rg["primary-type"] === "Album").slice(0, 10).map(rg => ({
        title: rg.title, year: rg["first-release-date"]?.slice(0, 4) || null,
      }));
      return { content: [{ type: "text", text: JSON.stringify({
        searched_for: name,
        name:           full.name || mb.name,
        disambiguation: full.disambiguation || mb.disambiguation || null,
        type:           full.type || mb.type || null,
        country:        full.country || mb.country || null,
        life_span:      full["life-span"] || mb["life-span"] || null,
        tags: (full.tags || mb.tags || []).slice(0, 8).map(t => t.name),
        albums,
        musicbrainz_id: mb.id,
        source: "MusicBrainz (musicbrainz.org)",
      }) }] };
    }
  );

  // 28. Active Wildfires ─────────────────────────────────────────────────────────
  mcp.tool(
    "get_wildfire_perimeters",
    "Returns active wildfire incidents within ~150 miles of Sedona from the National Interagency Fire Center (NIFC). Especially critical during Arizona fire season (April–July). Returns name, acreage, containment, and distance from Sedona.",
    {},
    async () => {
      const url = "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer/0/query"
        + "?where=1%3D1&outFields=IncidentName,State,Lat,Long_,GISAcres,PercentContained,FireDiscoveryDateTime,FireBehaviorGeneral,IncidentTypeCategory"
        + "&geometry=-114%2C32%2C-109%2C37&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects"
        + "&outSR=4326&f=json&resultRecordCount=25";
      const r = await fetch(url, { headers: { "User-Agent": "KAZM-MCP/1.0" }, signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error(`NIFC ${r.status}`);
      const data = await r.json();
      const fires = (data.features || []).map(f => {
        const a = f.attributes || {};
        const lat = a.Lat || f.geometry?.y;
        const lon = a.Long_ || f.geometry?.x;
        let dist_mi = null;
        if (lat && lon) {
          const dLat = (lat - 34.8697) * Math.PI / 180;
          const dLon = (lon - (-111.7610)) * Math.PI / 180;
          const aa = Math.sin(dLat / 2) ** 2 + Math.cos(34.8697 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
          dist_mi = Math.round(2 * 3958.8 * Math.asin(Math.sqrt(aa)));
        }
        return {
          name: a.IncidentName, state: a.State,
          acres: a.GISAcres != null ? Math.round(a.GISAcres) : null,
          contained_pct: a.PercentContained ?? null,
          discovered: a.FireDiscoveryDateTime ? new Date(a.FireDiscoveryDateTime).toISOString() : null,
          behavior: a.FireBehaviorGeneral || null,
          lat, lon, dist_mi_from_sedona: dist_mi,
        };
      }).filter(f => f.name).sort((a, b) => (a.dist_mi_from_sedona || 999) - (b.dist_mi_from_sedona || 999));
      return { content: [{ type: "text", text: JSON.stringify({
        updated: new Date().toISOString(),
        search_area: "Arizona and surrounding states",
        active_fire_count: fires.length,
        fires,
        source: "National Interagency Fire Center (nifc.gov)",
      }) }] };
    }
  );

  // 29. Day in Music History ─────────────────────────────────────────────────────
  mcp.tool(
    "get_day_in_music_history",
    "Returns notable music events that happened on this day in history — album releases, iconic concerts, chart milestones, artist birthdays — from Wikipedia's On This Day feed. Great for on-air trivia.",
    { date: z.string().optional().describe("Date as MM-DD or YYYY-MM-DD — omit for today") },
    async ({ date }) => {
      let month, day;
      if (date) {
        const parts = date.replace(/^\d{4}-/, "").split("-");
        month = parts[0]; day = parts[1];
      } else {
        const now = new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
        [, month, day] = now.split("-");
      }
      const monthNames = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
      const r = await fetch(
        `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`,
        { headers: { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)" }, signal: AbortSignal.timeout(10000) }
      );
      if (!r.ok) throw new Error(`Wikipedia OTD ${r.status}`);
      const data = await r.json();
      const re = /\b(music|song|album|band|singer|record|chart|concert|grammy|billboard|rock|pop|jazz|blues|country|hip.?hop|rapper|guitarist|drummer|piano|guitar|released|debut|tour|label|studio|lp|ep|single|top 40|hit|number one|mtv|radio)\b/i;
      const events = (data.events || []).filter(e => re.test(e.text)).slice(0, 10)
        .map(e => ({ year: e.year, event: e.text }));
      const births = (data.births || []).filter(b => re.test(b.text)).slice(0, 5)
        .map(b => ({ year: b.year, person: b.text }));
      const deaths = (data.deaths || []).filter(d => re.test(d.text)).slice(0, 3)
        .map(d => ({ year: d.year, person: d.text }));
      return { content: [{ type: "text", text: JSON.stringify({
        date: `${monthNames[parseInt(month, 10)]} ${parseInt(day, 10)}`,
        music_events: events, music_birthdays: births, music_passings: deaths,
        source: "Wikipedia On This Day (en.wikipedia.org)",
      }) }] };
    }
  );

  // 30. Sedona Visitor Info ──────────────────────────────────────────────────────
  mcp.tool(
    "get_visitor_info",
    "Returns practical visitor information for Sedona, AZ — Red Rock Pass requirements, state park hours and fees, popular attractions, best seasons to visit, and local tips. Perfect for tourist queries.",
    { topic: z.enum(["parks","passes","attractions","seasons","tips","all"]).optional().describe("Category of info — omit for all") },
    async ({ topic = "all" }) => {
      const info = {
        passes: {
          red_rock_pass: {
            required_at: "Most Coconino National Forest trailheads, picnic areas, and developed sites",
            day_pass: "$12/vehicle", weekly_pass: "$20/vehicle", annual_pass: "$40/vehicle",
            where_to_buy: "Sedona Chamber Visitor Center (331 Forest Rd), automated kiosks at most trailheads, Recreation.gov",
            note: "America the Beautiful (National Parks) pass covers Red Rock Pass sites",
          },
        },
        parks: {
          slide_rock_state_park: { hours: "8am–6pm (summer) / 8am–5pm (winter)", fee: "$30/vehicle summer, $20 winter", note: "Oak Creek natural water slide — timed entry required in summer" },
          red_rock_state_park: { hours: "8am–5pm daily", fee: "$15/vehicle", note: "Nature center, guided hikes, birding along Oak Creek" },
          dead_horse_ranch_state_park: { hours: "Open year-round", fee: "$10/vehicle", location: "Cottonwood, AZ (20 min from Sedona)", note: "Birding, fishing, camping along the Verde River" },
        },
        attractions: {
          chapel_of_holy_cross: { hours: "9am–5pm Mon–Sat, 10am–5pm Sun", fee: "Free", note: "Iconic chapel built into the red rocks — one of Sedona's most visited sites" },
          tlaquepaque: { hours: "Shops 10am–5pm daily", fee: "Free to enter", note: "Arts village with galleries, boutiques, and fountains" },
          airport_mesa_overlook: { hours: "Sunrise to sunset", fee: "Free", note: "Best 360° panoramic sunset view in Sedona" },
          pink_jeep_tours: { note: "Book in advance — most popular guided off-road tours in Sedona" },
        },
        seasons: {
          spring: { months: "March–May", weather: "60s–80s°F", highlights: "Wildflower bloom, creek swimming, ideal hiking", note: "Busiest season — book lodging 3+ months ahead" },
          summer: { months: "June–August", weather: "80s–100°F", highlights: "Monsoon storms (dramatic skies), Slide Rock, swimming", note: "Hike early morning. Monsoons start mid-July" },
          fall: { months: "September–November", weather: "50s–80°F", highlights: "Best hiking weather, fall color, fewer crowds", note: "Shoulder season — better rates" },
          winter: { months: "December–February", weather: "30s–60s°F", highlights: "Snow on red rocks (rare), quiet trails, astronomy", note: "Some trails may be icy. Gallery events and festivals" },
        },
        tips: [
          "Arrive at popular trailheads before 8am — lots fill by 9am on weekends year-round",
          "Download offline maps — cell service is spotty in Oak Creek Canyon and backcountry",
          "Dogs are allowed on most trails but must be leashed in National Forest",
          "KAZM 106.5 FM broadcasts emergency info during wildfires and floods",
          "Oak Creek Canyon (Hwy 89A) can close during flash floods — check road conditions first",
          "Stock up on groceries in Cottonwood (20 min) or Flagstaff (30 min) — limited options in Sedona",
        ],
        contact: {
          sedona_chamber: "928-282-7722 | sedonachamber.com",
          coconino_nf_ranger: "928-203-7500",
          slide_rock_state_park: "928-282-3034",
          kazm: "mellowmountainradio.com",
        },
      };
      return { content: [{ type: "text", text: JSON.stringify({
        location: "Sedona, AZ",
        last_verified: "2025",
        info: topic === "all" ? info : { [topic]: info[topic] },
      }) }] };
    }
  );

  // 34. Stargazing Conditions ───────────────────────────────────────────────────
  mcp.tool(
    "get_stargazing_conditions",
    "Returns tonight's stargazing forecast for Sedona, AZ — astronomical darkness window, moon interference, Milky Way galactic core visibility, and best times to shoot the night sky. Sedona sits near the Verde Valley Dark Sky corridor.",
    { date: z.string().optional().describe("Date YYYY-MM-DD (default tonight)") },
    async ({ date }) => {
      const d = date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
      const r = await fetch(
        `https://api.sunrise-sunset.org/json?lat=34.8697&lng=-111.7610&date=${d}&formatted=0`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      if (json.status !== "OK") throw new Error(json.status);
      const res = json.results;

      // Moon phase
      const jd = new Date(d + "T12:00:00Z").getTime() / 86400000 + 2440587.5;
      let age = (jd - 2451549.5) % 29.53058867;
      if (age < 0) age += 29.53058867;
      const moonIllum = Math.round(50 * (1 - Math.cos(age / 29.53058867 * 2 * Math.PI)) * 10) / 10;
      let moonPhase, moonEmoji;
      if      (age < 1.85)  { moonPhase = "New Moon";        moonEmoji = "🌑"; }
      else if (age < 7.38)  { moonPhase = "Waxing Crescent"; moonEmoji = "🌒"; }
      else if (age < 9.22)  { moonPhase = "First Quarter";   moonEmoji = "🌓"; }
      else if (age < 14.77) { moonPhase = "Waxing Gibbous";  moonEmoji = "🌔"; }
      else if (age < 16.61) { moonPhase = "Full Moon";       moonEmoji = "🌕"; }
      else if (age < 22.15) { moonPhase = "Waning Gibbous";  moonEmoji = "🌖"; }
      else if (age < 23.99) { moonPhase = "Third Quarter";   moonEmoji = "🌗"; }
      else                  { moonPhase = "Waning Crescent"; moonEmoji = "🌘"; }

      // Moon interference rating
      let moonRating, moonNote;
      if      (moonIllum < 15)  { moonRating = "Excellent"; moonNote = "Dark skies — minimal moon interference"; }
      else if (moonIllum < 35)  { moonRating = "Good";      moonNote = "Crescent moon sets early — good window after moonset"; }
      else if (moonIllum < 65)  { moonRating = "Fair";      moonNote = "Partial moon — shoot before moonrise or after moonset"; }
      else if (moonIllum < 85)  { moonRating = "Poor";      moonNote = "Bright moon washes out fainter stars and Milky Way"; }
      else                      { moonRating = "Bad";       moonNote = "Full or near-full moon — not recommended for deep-sky work"; }

      // Milky Way galactic core season (best April–October, peak May–July at Sedona lat 34.9°N)
      const [, mo] = d.split("-").map(Number);
      let mwStatus, mwNote;
      if      (mo >= 5 && mo <= 7) { mwStatus = "Peak season"; mwNote = "Galactic core rises ~9–11pm, crosses south, sets before dawn — best views of the year"; }
      else if (mo === 4 || mo === 8) { mwStatus = "Good season"; mwNote = "Core visible 10pm–3am, high enough for wide-angle shots"; }
      else if (mo === 3 || mo === 9) { mwStatus = "Shoulder season"; mwNote = "Core barely clears the southern horizon after midnight"; }
      else                          { mwStatus = "Off season"; mwNote = "Galactic core below horizon or behind the sun — not visible"; }

      return { content: [{ type: "text", text: JSON.stringify({
        date: d,
        location: "Sedona, AZ (Verde Valley Dark Sky corridor)",
        darkness: {
          astronomical_twilight_end:   res.astronomical_twilight_end,
          astronomical_twilight_begin: res.astronomical_twilight_begin,
          note: "True astronomical darkness between these two times — zero sky glow from the sun",
        },
        moon: {
          phase: moonPhase, emoji: moonEmoji,
          illumination_pct: moonIllum,
          moon_age_days: Math.round(age * 10) / 10,
          interference_rating: moonRating,
          note: moonNote,
        },
        milky_way: { status: mwStatus, note: mwNote },
        top_sites: [
          { name: "Airport Mesa", why: "360° unobstructed horizon; low horizon to south means more Milky Way arc" },
          { name: "Cathedral Rock reflection (Red Rock Crossing)", why: "Oak Creek creates mirror images; shoot south for the galactic core" },
          { name: "Bell Rock", why: "Rock silhouette against star trails; flat parking lot for tripod setup" },
          { name: "Boynton Canyon", why: "No light pollution to the west; good for Milky Way setting shots" },
        ],
        source: "sunrise-sunset.org + astronomical calculation",
      }) }] };
    }
  );

  // 35. Photography Guide ────────────────────────────────────────────────────────
  mcp.tool(
    "get_photography_guide",
    "Returns Sedona photography locations with today's real golden hour / blue hour times, current light quality score, and camera settings for each scenario. Great for landscape and astrophotography planning.",
    { location: z.enum(["cathedral_rock","airport_mesa","bell_rock","chapel_holy_cross","devils_bridge","oak_creek_canyon"]).optional()
        .describe("Filter to a single location — omit for all 6") },
    async ({ location }) => {
      const d = new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
      const r = await fetch(
        `https://api.sunrise-sunset.org/json?lat=34.8697&lng=-111.7610&date=${d}&formatted=0`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      const res = json.results;

      // Compute light phase at current UTC moment
      const nowMs = Date.now();
      const sunriseMs  = new Date(res.sunrise).getTime();
      const sunsetMs   = new Date(res.sunset).getTime();
      const civilEndMs = new Date(res.civil_twilight_end).getTime();
      const civilBegMs = new Date(res.civil_twilight_begin).getTime();
      const astroEndMs = new Date(res.astronomical_twilight_end).getTime();
      const astroBegMs = new Date(res.astronomical_twilight_begin).getTime();

      // Golden hour: ~1 hour after sunrise and ~1 hour before sunset
      const ghAMend  = sunriseMs  + 60 * 60 * 1000;
      const ghPMbeg  = sunsetMs   - 60 * 60 * 1000;

      let currentLight;
      if      (nowMs < astroBegMs || nowMs > astroEndMs) currentLight = "Night — stars";
      else if (nowMs < civilBegMs || nowMs > civilEndMs)  currentLight = "Astronomical twilight";
      else if (nowMs < sunriseMs  || nowMs > sunsetMs)    currentLight = "Blue hour";
      else if (nowMs < ghAMend)                           currentLight = "Morning golden hour";
      else if (nowMs > ghPMbeg)                           currentLight = "Evening golden hour";
      else                                                 currentLight = "Midday / flat light";

      const lightScore = ["Morning golden hour","Evening golden hour"].includes(currentLight) ? 10
        : currentLight === "Blue hour" ? 9
        : currentLight.includes("twilight") ? 7
        : currentLight === "Night — stars" ? 8
        : 4;

      function iso(ms) { return new Date(ms).toISOString(); }

      const today_times = {
        sunrise:        res.sunrise,
        morning_golden_hour: { start: res.sunrise, end: iso(ghAMend) },
        solar_noon:     res.solar_noon,
        evening_golden_hour: { start: iso(ghPMbeg), end: res.sunset },
        sunset:         res.sunset,
        civil_twilight_blue_hour: { start: res.sunset, end: res.civil_twilight_end },
        astronomical_darkness:    { start: res.astronomical_twilight_end, end: res.astronomical_twilight_begin },
      };

      const locations = {
        cathedral_rock: {
          name: "Cathedral Rock — Red Rock Crossing",
          why: "Iconic spires reflected in Oak Creek. One of the 10 most photographed spots in the US.",
          best_light: ["Sunset / evening golden hour", "Blue hour", "Milky Way (April–Oct)"],
          composition_tips: "Wade or stand on rocks in the creek — reflection doubles the drama. Shoot south at sunset for color behind the towers.",
          camera_settings: {
            golden_hour_landscape: { aperture: "f/8–f/11", shutter: "1/60–1/200s", iso: "ISO 100–400", note: "Use polarizer to cut reflection glare" },
            blue_hour_long_expo: { aperture: "f/8", shutter: "10–30s", iso: "ISO 100", note: "Tripod required; remote shutter recommended" },
            milky_way: { aperture: "f/2.8–f/4", shutter: "15–20s", iso: "ISO 3200–6400", note: "Focus on a bright star, shoot south" },
          },
          parking: "Red Rock Crossing / Crescent Moon picnic area ($12/car). Fills by 4pm on weekends.",
          coordinates: { lat: 34.8214, lon: -111.7892 },
        },
        airport_mesa: {
          name: "Airport Mesa Overlook",
          why: "360° panoramic views over Sedona. Best spot for Milky Way arcs and city-light foregrounds.",
          best_light: ["Sunset", "Blue hour", "Night / astrophotography"],
          composition_tips: "Hike 5 min past the main overlook for unobstructed southern horizon. The twinkling Sedona lights below add depth to night shots.",
          camera_settings: {
            sunset_landscape: { aperture: "f/8–f/11", shutter: "1/100–1/400s", iso: "ISO 100" },
            blue_hour: { aperture: "f/8", shutter: "5–15s", iso: "ISO 400–800", note: "Bracket 3 exposures for HDR" },
            milky_way: { aperture: "f/2.8", shutter: "20s (500 rule: 500/focal_len)", iso: "ISO 3200–12800" },
          },
          parking: "Small pullout on Airport Road (free). Arrives fast at sunset — be there 90 min early.",
          coordinates: { lat: 34.8717, lon: -111.7878 },
        },
        bell_rock: {
          name: "Bell Rock & Courthouse Butte",
          why: "Iconic bell-shaped butte glowing orange at sunrise. Great for silhouettes and foreground interest.",
          best_light: ["Sunrise / morning golden hour", "Late afternoon warm light"],
          composition_tips: "Position Bell Rock on the left third, Courthouse Butte on the right. Walk the loop trail to find leading-line paths toward the rocks.",
          camera_settings: {
            sunrise: { aperture: "f/8", shutter: "1/60–1/250s", iso: "ISO 100–400", note: "Expose for the sky — rocks will glow in warm light" },
            telephoto_detail: { aperture: "f/5.6–f/8", shutter: "1/500s", iso: "ISO 200–400", lens: "70–200mm for rock texture" },
          },
          parking: "Bell Rock Vista parking (free). Arrive by 7am for sunrise.",
          coordinates: { lat: 34.7940, lon: -111.7614 },
        },
        chapel_holy_cross: {
          name: "Chapel of the Holy Cross — Blue Hour",
          why: "Modernist chapel built directly into the red rock. The interior and spire light up beautifully at blue hour.",
          best_light: ["Blue hour (20–40 min after sunset)", "Overcast / diffused light for exterior"],
          composition_tips: "Stand on the approach road looking up — the chapel frames perfectly in a 24mm or 35mm lens. Include the cross and rock in the same shot.",
          camera_settings: {
            blue_hour: { aperture: "f/5.6", shutter: "2–8s", iso: "ISO 400–800", note: "Chapel interior lights come on at dusk — perfect contrast" },
            overcast_exterior: { aperture: "f/8", shutter: "1/60–1/250s", iso: "ISO 400" },
          },
          parking: "Chapel Road parking lot (free). Chapel open 9am–5pm but the exterior and overlook are always accessible.",
          coordinates: { lat: 34.8398, lon: -111.7670 },
        },
        devils_bridge: {
          name: "Devil's Bridge — Natural Arch",
          why: "Largest natural sandstone arch in the Verde Valley. Classic shot: person standing on the bridge with blue sky and red rock canyon below.",
          best_light: ["Sunrise — soft light, empty trail", "Overcast days — even exposure, no harsh shadows"],
          composition_tips: "Hike in by 6:30am to beat crowds for the bridge-standing shot. Shoot with wide angle (16–24mm) from the overlook rock to include canyon depth.",
          camera_settings: {
            person_on_bridge: { aperture: "f/8–f/11", shutter: "1/250s", iso: "ISO 200–400", note: "Expose for the sky — use fill flash or reflector for the person" },
            sunrise_canyon: { aperture: "f/8", shutter: "1/100s", iso: "ISO 100", note: "Polarizer reduces haze and deepens blue sky" },
          },
          parking: "Dry Creek trailhead ($12 Red Rock Pass). 4.4 mi RT — moderate. Runs out of parking by 8am on weekends.",
          coordinates: { lat: 34.9047, lon: -111.8164 },
        },
        oak_creek_canyon: {
          name: "Oak Creek Canyon — Slide Rock Area",
          why: "Towering canyon walls, rushing water, and brilliant fall color in October–November. One of Arizona's most scenic drives.",
          best_light: ["Midday (canyon walls block direct sunrise/sunset)", "Fall color (mid-Oct to mid-Nov)", "After rain for rich saturation"],
          composition_tips: "The canyon runs N-S; midday light bounces off the walls and illuminates the creek. Shoot up-canyon for leading lines. Slide Rock's red slick is best photographed in the first and last hours of canyon light (~10am and ~3pm).",
          camera_settings: {
            canyon_landscape: { aperture: "f/8–f/11", shutter: "1/100–1/500s", iso: "ISO 100–400", note: "CPL filter essential for water reflections" },
            running_water: { aperture: "f/16", shutter: "1/4–1s", iso: "ISO 100", note: "ND filter for silky water in bright midday" },
            fall_color: { aperture: "f/8", shutter: "1/100s", iso: "ISO 200", note: "Shoot on overcast days — cloudy light saturates the yellows and reds without blowing highlights" },
          },
          parking: "Slide Rock State Park ($30/car summer, $20 winter). Timed entry required in summer.",
          coordinates: { lat: 34.9420, lon: -111.7515 },
        },
      };

      const result = location ? { [location]: locations[location] } : locations;
      return { content: [{ type: "text", text: JSON.stringify({
        location_context: "Sedona, AZ",
        date: d,
        current_light_phase: currentLight,
        current_light_score: `${lightScore}/10`,
        today_times,
        locations: result,
      }) }] };
    }
  );

  // 36. Tarot Card ──────────────────────────────────────────────────────────────
  mcp.tool(
    "get_tarot_card",
    "Draws from the full 78-card Rider-Waite tarot deck. Returns the card of the day over Sedona (same for all listeners, turns at midnight MST), a single random draw, or a three-card past/present/future spread. Each card includes upright and reversed meanings, astrological correspondence, and suit element.",
    {
      spread: z.enum(["daily","single","three"]).optional()
        .describe("daily = today's card of the day (deterministic, Sedona date); single = one random card; three = past/present/future. Defaults to daily."),
      card_name: z.string().optional()
        .describe("Look up a specific card by name, e.g. 'The Tower' or 'Ten of Cups'. Returns full upright and reversed meanings."),
    },
    async ({ spread, card_name }) => {
      const MAJORS = [
        { name: "The Fool",          glyph: "🌄", upright: "a leap of faith, fresh starts, innocence",                           reversed: "recklessness, cold feet, a start delayed",                 astro: "Air",            tag: "0 · Major Arcana" },
        { name: "The Magician",      glyph: "✨", upright: "manifestation, skill, as above so below",                            reversed: "untapped talent, trickery, scattered will",                 astro: "Mercury ☿",      tag: "I · Major Arcana" },
        { name: "The High Priestess",glyph: "🔮", upright: "intuition, the inner voice, mystery",                               reversed: "secrets kept from you, ignoring your gut",                  astro: "Moon ☽",         tag: "II · Major Arcana" },
        { name: "The Empress",       glyph: "🌹", upright: "abundance, nurture, creation in bloom",                             reversed: "creative block, smothering, self-neglect",                  astro: "Venus ♀",        tag: "III · Major Arcana" },
        { name: "The Emperor",       glyph: "🏛",  upright: "structure, authority, solid foundations",                           reversed: "rigidity, control, a challenge to power",                   astro: "Aries ♈",        tag: "IV · Major Arcana" },
        { name: "The Hierophant",    glyph: "🗝",  upright: "tradition, teachers, spiritual guidance",                           reversed: "breaking convention, dogma, your own path",                 astro: "Taurus ♉",       tag: "V · Major Arcana" },
        { name: "The Lovers",        glyph: "💞", upright: "union, alignment, a choice of the heart",                           reversed: "disharmony, imbalance, values at odds",                     astro: "Gemini ♊",       tag: "VI · Major Arcana" },
        { name: "The Chariot",       glyph: "🏆", upright: "willpower, momentum, hard-won victory",                             reversed: "scattered force, stalling, losing the reins",               astro: "Cancer ♋",       tag: "VII · Major Arcana" },
        { name: "Strength",          glyph: "🦁", upright: "quiet courage, gentle power, patience",                             reversed: "self-doubt, raw nerves, forcing it",                        astro: "Leo ♌",          tag: "VIII · Major Arcana" },
        { name: "The Hermit",        glyph: "🏮", upright: "introspection, seeking, the inner lamp",                            reversed: "isolation, withdrawal, lost in the cave",                   astro: "Virgo ♍",        tag: "IX · Major Arcana" },
        { name: "Wheel of Fortune",  glyph: "☸",  upright: "cycles turning, luck, a pivotal moment",                            reversed: "resisting change, a rough turn, delays",                    astro: "Jupiter ♃",      tag: "X · Major Arcana" },
        { name: "Justice",           glyph: "⚖",  upright: "truth, fairness, cause and effect",                                 reversed: "imbalance, avoidance, unfair dealings",                     astro: "Libra ♎",        tag: "XI · Major Arcana" },
        { name: "The Hanged Man",    glyph: "🙃", upright: "surrender, a new angle, sacred pause",                              reversed: "stalling, martyrdom, sacrifice in vain",                    astro: "Water",          tag: "XII · Major Arcana" },
        { name: "Death",             glyph: "🦋", upright: "endings that free you, transformation",                             reversed: "clinging to what's done, stagnation",                       astro: "Scorpio ♏",      tag: "XIII · Major Arcana" },
        { name: "Temperance",        glyph: "🕊",  upright: "balance, blending, the middle way",                                 reversed: "excess, impatience, forces out of mix",                     astro: "Sagittarius ♐",  tag: "XIV · Major Arcana" },
        { name: "The Devil",         glyph: "⛓",  upright: "attachment, shadow work, the tether seen",                          reversed: "release, reclaiming power, chains loosening",               astro: "Capricorn ♑",    tag: "XV · Major Arcana" },
        { name: "The Tower",         glyph: "🌩", upright: "sudden truth, upheaval that clears",                                reversed: "disaster averted, fear of the shake-up",                    astro: "Mars ♂",         tag: "XVI · Major Arcana" },
        { name: "The Star",          glyph: "⭐", upright: "hope, healing, quiet renewal",                                      reversed: "dimmed faith, doubt, refill the well",                      astro: "Aquarius ♒",     tag: "XVII · Major Arcana" },
        { name: "The Moon",          glyph: "🌙", upright: "dreams, the unknown, trust the tide",                               reversed: "confusion lifting, fear losing its grip",                   astro: "Pisces ♓",       tag: "XVIII · Major Arcana" },
        { name: "The Sun",           glyph: "☀",  upright: "joy, vitality, everything illuminated",                             reversed: "clouded optimism, small delays, look up",                   astro: "Sun ☉",          tag: "XIX · Major Arcana" },
        { name: "Judgement",         glyph: "📯", upright: "awakening, the call, rising renewed",                               reversed: "self-doubt, ignoring the call, harsh review",               astro: "Fire",           tag: "XX · Major Arcana" },
        { name: "The World",         glyph: "🌍", upright: "completion, wholeness, the circle closed",                          reversed: "loose ends, almost there, close the loop",                  astro: "Saturn ♄",       tag: "XXI · Major Arcana" },
      ];
      const SUITS = [
        { suit: "Wands",    glyph: "🔥", element: "Fire · will & creativity",
          upright:  ["a spark of pure inspiration","planning, the world in your hand","expansion, ships coming in","celebration, homecoming, stable joy","friction, creative competition","victory, public recognition","defending your ground","swift movement, news in flight","resilience, the last push","a heavy load nearly carried home","an eager message, curiosity lit","bold pursuit, adventure at speed","warm confidence, magnetic energy","visionary leadership, the long view"],
          reversed: ["a spark delayed, false starts","fear of the leap, small plans","obstacles, watch the horizon","shaky ground, celebrate later","conflict avoided or gone sour","a fall from favor, ego's cost","worn down, ground given","delays, crossed signals","paranoia, guard too high","burnout, put something down","bad news, a message astray","haste, a scattered chase","jealousy, warmth withdrawn","tyranny, vision without care"] },
        { suit: "Cups",     glyph: "💧", element: "Water · heart & feeling",
          upright:  ["new love, the heart overflows","partnership, mutual attraction","friendship, celebration shared","apathy, a gift unnoticed","grief, spilled cups — two remain","nostalgia, kindness returned","choices, dreams and illusions","walking away toward deeper meaning","contentment, the wish fulfilled","lasting happiness, family harmony","a tender message, imagination","romance, the offer of the heart","compassion, emotional depth","calm mastery of the heart"],
          reversed: ["a blocked heart, self-love first","a bond strained, imbalance","overindulgence, the third wheel","waking up, new appetite","acceptance, moving through grief","stuck in the past, come home to now","clarity cutting through fog","one more try, fear of change","smugness, hollow satisfaction","discord at home, a dream deferred","creative block, moody waters","moodiness, a flatterer","emotions overflowing their banks","manipulation, the cold current"] },
        { suit: "Swords",   glyph: "🗡",  element: "Air · mind & truth",
          upright:  ["breakthrough, clarity's blade","a stalemate, eyes covered","heartbreak that tells the truth","rest, recovery, quiet the mind","a hollow win, count the cost","transition, calmer waters ahead","strategy, moving quietly","restriction that is mostly mental","anxiety in the small hours","an ending, rock bottom's gift","hunger for ideas, watchfulness","charging thought, the direct route","sharp perception, independent mind","intellectual command, hard truth"],
          reversed: ["fog, a truth resisted","the blindfold slips, decision due","healing begins, forgiveness","restlessness, burnout warning","make amends, an old grudge","carrying baggage, rough water","conscience calls, come clean","self-imposed limits released","the dread was worse than the day","recovery, the worst is behind","gossip, all talk","recklessness, slow the charge","coldness, the edge overused","cruelty, abuse of the mind's power"] },
        { suit: "Pentacles", glyph: "🪙", element: "Earth · body & work",
          upright:  ["a seed of prosperity, opportunity","juggling, graceful balance","teamwork, craft recognized","holding on, security kept close","hard times, help nearby unseen","generosity, giving and receiving","patience, the long investment","apprenticeship, devoted craft","earned luxury, self-sufficiency","legacy, lasting wealth, roots","a student's spark, good news of work","steady effort, the reliable path","practical warmth, the nurturing home","abundance mastered, the good steward"],
          reversed: ["an opportunity missed, greed","dropped balls, overcommitment","mediocrity, credit taken","letting go, generosity opens","recovery, the door was open","strings attached, debt's weight","impatience, effort misplaced","cut corners, half-hearted work","overwork, hollow success","a windfall with strings, family friction","procrastination, a lesson unheeded","boredom, stuck in a rut","self-care neglected, clutter","hoarding, worth measured wrong"] },
      ];
      const RANKS = ["Ace","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Page","Knight","Queen","King"];

      // Build the full 78-card deck
      const deck = [
        ...MAJORS,
        ...SUITS.flatMap(su => RANKS.map((r, i) => ({
          name: `${r} of ${su.suit}`,
          glyph: su.glyph,
          upright: su.upright[i],
          reversed: su.reversed[i],
          astro: "",
          tag: su.element,
        }))),
      ];

      // Lookup by card name
      if (card_name) {
        const q = card_name.trim().toLowerCase();
        const found = deck.find(c => c.name.toLowerCase() === q)
          || deck.find(c => c.name.toLowerCase().includes(q));
        if (!found) return { content: [{ type: "text", text: JSON.stringify({ error: `Card not found: "${card_name}". Try "The Tower", "Ten of Cups", "The Fool", etc.` }) }] };
        return { content: [{ type: "text", text: JSON.stringify({
          card: found.name, glyph: found.glyph, tag: found.tag, astro: found.astro || undefined,
          upright: found.upright, reversed: found.reversed,
          tarot_page: "https://mellowmountainradio.com/chakras.html",
        }) }] };
      }

      const mode = spread || "daily";

      // Card of the day — seeded by Sedona date (same for all listeners until midnight MST)
      function dailyCard() {
        const mstOffset = -7; // Arizona never observes DST
        const day = Math.floor((Date.now() / 86400000) + (mstOffset / 24));
        let h = (day * 2654435761) >>> 0;
        h = (h ^ (h >>> 13)) >>> 0;
        const idx = h % 78;
        const isReversed = ((h >>> 8) % 100) < 20; // ~20% reversed for daily
        return [{ card: deck[idx], reversed: isReversed, position: "Card of the Day" }];
      }

      // Cryptographically random draw using Node's crypto
      function randomDraw(n) {
        const { randomInt } = require("crypto");
        const pool = [...deck];
        const draws = [];
        const positions = n === 3 ? ["Past", "Present", "Future"] : ["Your draw"];
        for (let i = 0; i < n; i++) {
          const idx = randomInt(0, pool.length);
          const isReversed = randomInt(0, 100) < 30; // ~30% reversed, tradition-adjacent
          draws.push({ card: pool.splice(idx, 1)[0], reversed: isReversed, position: positions[i] });
        }
        return draws;
      }

      const draws = mode === "daily" ? dailyCard()
        : mode === "three" ? randomDraw(3)
        : randomDraw(1);

      const cards = draws.map(d => ({
        position: d.position,
        card: d.card.name,
        glyph: d.card.glyph,
        tag: d.card.tag,
        astro: d.card.astro || undefined,
        orientation: d.reversed ? "reversed" : "upright",
        meaning: d.reversed ? d.card.reversed : d.card.upright,
        upright: d.card.upright,
        reversed: d.card.reversed,
      }));

      const sedonaDate = new Date(Date.now() + (-7 * 3600000)).toISOString().slice(0, 10);

      return { content: [{ type: "text", text: JSON.stringify({
        spread: mode === "daily" ? "Card of the Day — Sedona" : mode === "three" ? "Past · Present · Future" : "Single Draw",
        date: sedonaDate,
        note: mode === "daily" ? "Same card for every listener all day — turns at midnight Sedona time." : "Drawn fresh for this reading.",
        cards,
        tarot_page: "https://mellowmountainradio.com/chakras.html",
      }) }] };
    }
  );

  // ── MCP Prompts ──────────────────────────────────────────────────────────────
  // Pre-built conversation starters that chain multiple KAZM tools together.

  mcp.prompt(
    "plan_sedona_trip",
    "Complete Sedona trip brief — weather, fire conditions, concerts, events, photography golden hours, vortex sites, and visitor tips.",
    { days: z.string().optional().describe("Number of days visiting (e.g. '3')") },
    ({ days }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `I'm planning a trip to Sedona, AZ${days ? ` for ${days} day${days !== "1" ? "s" : ""}` : ""}. Please use the KAZM Mellow Mountain Radio tools to build me a complete trip brief covering:\n\n1. Current weather and 7-day forecast\n2. Active fire restrictions and air quality\n3. Any NWS weather alerts\n4. Upcoming concerts and local events\n5. Today's photography golden hour times and the best shooting spots right now\n6. The Sedona energy vortex sites — which one to visit first\n7. Practical visitor info: Red Rock Pass, park fees, tips\n\nGive me a concise but complete trip brief.`,
        },
      }],
    })
  );

  mcp.prompt(
    "whats_on_kazm",
    "Full KAZM radio status — what's playing, who's listening, what's on next, and artist background.",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "Tell me everything about what's happening on KAZM Mellow Mountain Radio right now. Use the KAZM tools to check: what song is currently playing, the artist info and discography, current listener count, recent song history (last 5 songs), today's show schedule, and the live stream URL. Give me the full picture.",
        },
      }],
    })
  );

  mcp.prompt(
    "outdoor_safety_check",
    "Full outdoor safety brief for Sedona — fire, weather, air quality, alerts, road conditions, and Oak Creek levels.",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "I'm planning to spend the day outdoors in Sedona. Use the KAZM tools to run a complete safety check: fire restriction level, current weather and any storm risk, air quality index and smoke conditions, active NWS weather alerts, active wildfire perimeters near Sedona, current road conditions on SR-89A and Oak Creek Canyon, and Oak Creek water level at the Sedona gauge. Give me a go/no-go summary for hiking, swimming, and driving.",
        },
      }],
    })
  );

  mcp.prompt(
    "stargazing_tonight",
    "Tonight's stargazing forecast for Sedona — darkness window, moon phase, Milky Way visibility, and best sites.",
    {},
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "What are tonight's stargazing conditions in Sedona, AZ? Use the KAZM tools to check: tonight's astronomical darkness window, the current moon phase and interference rating, Milky Way galactic core visibility status, and the top astrophotography sites. Also pull today's weather to flag any cloud cover risk. Give me a go/no-go for astrophotography and the best site to head to tonight.",
        },
      }],
    })
  );

  mcp.prompt(
    "request_a_song",
    "Walk through requesting a song on KAZM — search the library and submit the request.",
    { song: z.string().optional().describe("Song title or artist to search for") },
    ({ song }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: song
            ? `I want to request "${song}" on KAZM 106.5 FM Mellow Mountain Radio. First search the song request library to find the exact title and artist, then submit the request for me. Let me know when it's been sent to the studio.`
            : "I'd like to request a song on KAZM 106.5 FM Mellow Mountain Radio. What's currently playing? Check the song history for the last few songs too, so I can pick something that fits the vibe. Then help me search the request library and submit my request.",
        },
      }],
    })
  );

  mcp.prompt(
    "sedona_drive_check",
    "Road and weather check before driving to or through Sedona — 89A, Oak Creek Canyon, I-17.",
    { destination: z.string().optional().describe("Where you're headed (e.g. 'Flagstaff', 'Oak Creek Canyon', 'Jerome')") },
    ({ destination }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `I'm about to drive${destination ? ` to ${destination}` : " through Sedona"}. Use the KAZM tools to check current road conditions on SR-89A, Oak Creek Canyon, and I-17, Oak Creek water levels (flash flood risk), active NWS weather alerts, and the current weather forecast. Tell me if it's safe to drive and what to watch out for.`,
        },
      }],
    })
  );

  return mcp;
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Push notification hub ─────────────────────────────────────────────────────

// CORS preflight for browser push subscription calls
app.options("/push/:any", (_req, res) => {
  res.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
  res.sendStatus(204);
});

// Store / update a subscription
app.post("/push/subscribe", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  const { subscription, topic = "alerts", song = null } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: "Missing subscription.endpoint" });
  const subs = loadSubs();
  const idx  = subs.findIndex(s => s.endpoint === subscription.endpoint);
  const entry = { endpoint: subscription.endpoint, keys: subscription.keys || {}, topic, song, ts: new Date().toISOString() };
  if (idx >= 0) subs[idx] = entry; else subs.push(entry);
  saveSubs(subs);
  res.json({ ok: true, total: subs.length });
});

// Remove a subscription
app.post("/push/unsubscribe", (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
  const subs = loadSubs().filter(s => s.endpoint !== endpoint);
  saveSubs(subs);
  res.json({ ok: true });
});

// List subscriptions — internal, for n8n and the push sender
app.get("/push/subscriptions", (req, res) => {
  const { topic } = req.query;
  let subs = loadSubs();
  if (topic) subs = subs.filter(s => s.topic === topic);
  res.json({ subscriptions: subs, total: subs.length });
});

// Send a push notification to all subscribers matching a topic
app.post("/push/send", async (req, res) => {
  const { topic, title, body, url = "/", icon = "/icon-192.png", tag } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: "Missing title or body" });
  if (!VAPID_PRIVATE)  return res.status(503).json({ error: "VAPID_PRIVATE_KEY not set" });

  const subs    = loadSubs().filter(s => !topic || s.topic === topic);
  const payload = JSON.stringify({ title, body, url, icon, tag: tag || `kazm-${topic || "alert"}` });
  const opts    = { vapidDetails: { subject: "mailto:chuck@mellowmountainradio.com", publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE } };

  const results = await Promise.allSettled(
    subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, opts))
  );

  // Prune gone subscriptions (410 / 404)
  const dead = subs
    .filter((_, i) => results[i].status === "rejected" && [404, 410].includes(results[i].reason?.statusCode))
    .map(s => s.endpoint);
  if (dead.length) saveSubs(loadSubs().filter(s => !dead.includes(s.endpoint)));

  const sent   = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;
  res.json({ ok: true, sent, failed, pruned: dead.length });
});

// ── Site REST endpoints ───────────────────────────────────────────────────────

function setCors(res) {
  res.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
}

app.options(/^\/(request|requests|pulse|playlog|charts|roads|aircraft)$/, (_req, res) => {
  setCors(res); res.sendStatus(204);
});

// POST /request — probe or submit a song request
app.post("/request", (req, res) => {
  setCors(res);
  const body = req.body || {};
  if (body.probe) return res.json({ success: true });
  const { title, artist, name = "", note = "" } = body;
  if (!title || !artist) return res.status(400).json({ success: false, error: "title and artist required" });
  const reqs = loadRequests();
  reqs.push({ title, artist, name, note, at: new Date().toISOString() });
  if (reqs.length > 200) reqs.splice(0, reqs.length - 200);
  saveRequests(reqs);
  res.json({ success: true });
});

// GET /requests — jukebox board wall (last 20, newest first)
app.get("/requests", (_req, res) => {
  setCors(res);
  const all = loadRequests();
  res.json({ requests: all.slice(-20).reverse(), total: all.length });
});

// POST /pulse — love / nah vote for a song
app.post("/pulse", (req, res) => {
  setCors(res);
  const { title, artist, vote } = req.body || {};
  if (!title || !artist || !["love", "nah"].includes(vote))
    return res.status(400).json({ ok: false, error: "title, artist, and vote (love|nah) required" });
  const pulse = loadPulse();
  const key = `${title}\x00${artist}`;
  if (!pulse[key]) pulse[key] = { title, artist, love: 0, nah: 0 };
  pulse[key][vote]++;
  pulse[key].at = Date.now();
  savePulse(pulse);
  res.json({ ok: true });
});

// Music-play filter matching the client-side isMusicPlay()
function serverIsMusicPlay(ti, ar) {
  if (!ti || !ar) return false;
  if (/^ADBREAK_|^GO2-|^Sweeper_|^CLEARWATER|^Station ID|^Mellow Mountain Radio|^ID\/PSA|^AZ Sports|^Sports Update|^AZ State News/i.test(ti)) return false;
  if (/^[A-Z0-9][A-Z0-9_\-]{4,}$/.test(ti)) return false;
  if (/^Live365$|^Mellow Mountain Radio$|^Station ID$|^Talk Break$|^Diamondbacks Bumper$|^c2c$|^CBS$|^Brad Cesmat$|Brought to you|APS.*(Fire|Mitigation)|Versatile Roofing|Sedona Chamber|Franklin Pest|Yavapai Bottle|Toastmasters|Sedona Fire|CBS News|Cutter Grind/i.test(ar)) return false;
  return true;
}

// GET /playlog?d=YYYY-MM-DD — plays for a day in Phoenix time (UTC-7)
app.get("/playlog", async (req, res) => {
  setCors(res);
  const d = String(req.query.d || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
    return res.status(400).json({ ok: false, error: "d=YYYY-MM-DD required" });
  try {
    // Phoenix = UTC-7 (no DST). Midnight Phoenix = 07:00 UTC.
    const startISO = d + "T07:00:00Z";
    const endISO   = new Date(new Date(startISO).getTime() + 86400000).toISOString().replace(/\.\d+Z$/, "Z");
    const data = await azGet(`/api/station/${STATION}/history?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&rows=5000`);
    const plays = [];
    for (const p of (Array.isArray(data) ? data : [])) {
      const ti = p.song?.title  || p.title  || "";
      const ar = p.song?.artist || p.artist || "";
      if (!serverIsMusicPlay(ti, ar)) continue;
      const playedAt = p.played_at || p.timestamp || 0;
      // Shift unix UTC to Phoenix local (UTC-7) then read as UTC for HH:MM
      const phxDate = new Date((playedAt - 7 * 3600) * 1000);
      const hh = String(phxDate.getUTCHours()).padStart(2, "0");
      const mm = String(phxDate.getUTCMinutes()).padStart(2, "0");
      plays.push({ ti, ar, t: `${hh}:${mm}` });
    }
    res.json({ ok: true, plays });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message) });
  }
});

// GET /charts — rolling 7-day top songs, artists, debut slots
app.get("/charts", async (_req, res) => {
  setCors(res);
  try {
    const nowMs     = Date.now();
    const weekAgoMs = nowMs - 7 * 86400 * 1000;
    const startISO  = new Date(weekAgoMs).toISOString().replace(/\.\d+Z$/, "Z");
    const endISO    = new Date(nowMs).toISOString().replace(/\.\d+Z$/, "Z");
    const data      = await azGet(`/api/station/${STATION}/history?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}&rows=5000`);
    const since     = new Date(weekAgoMs).toISOString().slice(0, 10);
    const songMap = {}, artistMap = {};
    for (const p of (Array.isArray(data) ? data : [])) {
      const ti = p.song?.title  || p.title  || "";
      const ar = p.song?.artist || p.artist || "";
      if (!serverIsMusicPlay(ti, ar)) continue;
      const key = `${ti}\x00${ar}`;
      songMap[key]   = (songMap[key]   || 0) + 1;
      artistMap[ar]  = (artistMap[ar]  || 0) + 1;
    }
    const spins      = Object.values(songMap).reduce((a, b) => a + b, 0);
    const uniques    = Object.keys(songMap).length;
    const top        = Object.entries(songMap).sort((a, b) => b[1] - a[1]).slice(0, 20)
                         .map(([k, n]) => { const [ti, ar] = k.split("\x00"); return { ti, ar, n }; });
    const topArtists = Object.entries(artistMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
                         .map(([ar, n]) => ({ ar, n }));
    res.json({ ok: true, since, spins, uniques, top, topArtists, debuts: [] });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message) });
  }
});

// GET /roads — Road511 incidents for Sedona / Verde Valley area
function miFromSedona(lat, lon) {
  if (lat == null || lon == null) return null;
  const R    = 3958.8;
  const dLat = (lat - 34.8697) * Math.PI / 180;
  const dLon = (lon - (-111.7610)) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2 + Math.cos(34.8697 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

app.get("/roads", async (_req, res) => {
  setCors(res);
  const ROAD511_KEY = process.env.ROAD511_KEY || "";
  if (!ROAD511_KEY) return res.status(503).json({ ok: false, error: "ROAD511_KEY not configured" });
  try {
    const bbox = "-112.2,34.5,-111.5,35.35";
    const r = await fetch(
      `https://api.road511.com/api/v1/events/geojson?bbox=${bbox}&status=active`,
      { headers: { "X-API-Key": ROAD511_KEY }, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return res.status(502).json({ ok: false, error: `Road511 ${r.status}` });
    const data   = await r.json();
    const events = (data.features || []).map(f => {
      const p      = f.properties || {};
      const coords = f.geometry?.coordinates;
      const lat    = coords ? coords[1] : null;
      const lon    = coords ? coords[0] : null;
      const desc   = p.headline || p.description || "";
      return {
        road:    Array.isArray(p.roads) ? p.roads.join(", ") : (p.road || null),
        dir:     p.direction   || null,
        desc,
        type:    (p.type    || "").toLowerCase(),
        sub:     (p.subtype || "").toLowerCase(),
        full:    /full.closure|road.closed/i.test((p.subtype || "") + " " + desc),
        mi:      miFromSedona(lat, lon),
        updated: p.updated || p.start || null,
        lat,
        lon,
      };
    }).filter(e => e.desc);
    res.json({ ok: true, events });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message) });
  }
});

// GET /aircraft — adsb.lol CORS proxy for the Living Scene aircraft layer
app.get("/aircraft", async (req, res) => {
  setCors(res);
  const lat    = parseFloat(req.query.lat    || "34.8697");
  const lon    = parseFloat(req.query.lon    || "-111.7610");
  const radius = Math.min(parseInt(req.query.radius || "45", 10), 250);
  try {
    const r = await fetch(
      `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${radius}`,
      { headers: { "User-Agent": "KAZM-MCP/1.0 (mellowmountainradio.com)" }, signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return res.status(502).json({ ok: false, error: `adsb.lol ${r.status}` });
    const data = await r.json();
    const aircraft = (data.ac || [])
      .filter(a => a && a.alt_baro != null && a.alt_baro !== "ground" && a.dir != null)
      .map(a => ({
        flight:   (a.flight || "").trim(),
        dir:      a.dir,
        track:    a.track != null ? a.track : a.dir,
        alt_baro: a.alt_baro,
        dst:      a.dst || 0,
      }));
    res.json({ aircraft });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message) });
  }
});

// ── MCP auto-discovery endpoints (Smithery, official registry, etc.)
app.get("/.well-known/mcp-registry-auth", (_req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send("v=MCPv1; k=ed25519; p=1RUaBvZhCCxIHpcOcFbQueEHsX5ameBW7GlG67C+hXA=");
});

app.get("/.well-known/mcp.json", (_req, res) => {
  res.json({
    name: "KAZM Mellow Mountain Radio",
    description: "37 live tools for KAZM 106.5 FM & 780 AM — now playing, song requests, weather, fire restrictions, sports scores, moon phases, chakra guide, tarot card, stargazing conditions, photography guide, vortex guide, wildfires, and more for Sedona/Verde Valley.",
    version: "1.0.0",
    url: "https://mcp.mellowmountainradio.com/mcp",
    documentation: "https://mcp.mellowmountainradio.com/docs",
    transport: "streamable-http",
    repository: "https://github.com/chelstein/mellowmountainradio",
  });
});

app.get("/.well-known/mcp/server-card.json", (_req, res) => {
  res.json({
    $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
    name: "com.mellowmountainradio.mcp/kazm",
    title: "KAZM Mellow Mountain Radio",
    description: "37 live tools for KAZM 106.5 FM & 780 AM — now playing, song requests, weather, fire restrictions, sports scores, moon phases, chakra guide, tarot card, stargazing conditions, photography guide, vortex guide, wildfires, and more for Sedona/Verde Valley.",
    version: "1.0.0",
    websiteUrl: "https://mellowmountainradio.com",
    repository: { url: "https://github.com/chelstein/mellowmountainradio", source: "github" },
    remotes: [{ type: "streamable-http", url: "https://mcp.mellowmountainradio.com/mcp" }],
    _meta: {
      "io.modelcontextprotocol.registry/publisher-provided": {
        categories: ["radio", "local", "media", "weather", "entertainment"],
        keywords: ["radio", "sedona", "arizona", "kazm", "music-request", "now-playing", "weather", "fire-restrictions"],
        contact: "chuck@mellowmountainradio.com",
      }
    }
  });
});

// Health / info
app.get("/", (_req, res) => {
  res.json({
    name:    "KAZM Mellow Mountain Radio MCP Server",
    version: "1.0.0",
    mcp:     `${process.env.PUBLIC_URL || ""}/mcp`,
    docs:    `${process.env.PUBLIC_URL || ""}/docs`,
    tools:   37,
  });
});

// MCP endpoint (stateless per-request)
app.all("/mcp", async (req, res) => {
  const server    = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("finish", () => server.close().catch(() => {}));
});

// Docs page
app.get("/docs", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KAZM MCP Server — Tool Reference</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a1a2e}
  h1{color:#223d6e}code{background:#f0f4ff;border-radius:4px;padding:2px 6px;font-size:.9em}
  pre{background:#0d1f3e;color:#c8d8f0;padding:16px;border-radius:8px;overflow-x:auto}
  .tool{border:1px solid #dde4f0;border-radius:8px;padding:16px 20px;margin:16px 0}
  .tool h3{margin:0 0 4px;color:#223d6e}.tool p{margin:4px 0;color:#444}
  .new{display:inline-block;background:#e8f5e9;color:#2e7d32;font-size:.75em;font-weight:600;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:middle}
</style>
</head>
<body>
<h1>KAZM MCP Server</h1>
<p>Live data from Sedona's Mellow Mountain Radio — available to any MCP-compatible AI assistant.</p>
<h2>Connect</h2>
<pre>{"mcpServers":{"kazm":{"url":"https://mcp.mellowmountainradio.com"}}}</pre>
<h2>Tools (37)</h2>
<div class="tool"><h3>get_now_playing</h3><p>Currently on-air song with artist, album, artwork, and stream URL.</p></div>
<div class="tool"><h3>get_listener_count</h3><p>Live listener count across all mounts.</p></div>
<div class="tool"><h3>search_song_history</h3><p>Recently played songs; optional keyword filter. <code>query</code>: string (optional)</p></div>
<div class="tool"><h3>get_fire_restrictions</h3><p>Current fire restriction level for the Sedona area — live from the Forest Service.</p></div>
<div class="tool"><h3>get_weather</h3><p>Current conditions and 7-day forecast for Sedona, AZ.</p></div>
<div class="tool"><h3>get_road_conditions</h3><p>Active incidents on SR-89A, Oak Creek Canyon, and I-17 (Road511).</p></div>
<div class="tool"><h3>get_concerts</h3><p>Upcoming concerts. <code>state</code>: string (optional, e.g. "AZ")</p></div>
<div class="tool"><h3>get_events</h3><p>Library events and local festivals.</p></div>
<div class="tool"><h3>get_stream_url</h3><p>Live audio stream URLs (MP3 and AAC).</p></div>
<div class="tool"><h3>get_show_schedule</h3><p>KAZM weekly on-air program schedule. <code>day</code>: weekday/saturday/sunday (optional). <code>query</code>: keyword (optional).</p></div>
<div class="tool"><h3>get_horoscope</h3><p>Daily, weekly, or monthly horoscope for any sign. <code>sign</code>: zodiac sign (optional). <code>period</code>: daily/weekly/monthly (optional).</p></div>
<div class="tool"><h3>get_schumann_resonance</h3><p>Earth's electromagnetic pulse from the Tomsk observatory — frequency, energy score, activity level.</p></div>
<div class="tool"><h3>get_sound_session</h3><p>Recommends a binaural or tonal session based on goal or time of day. <code>goal</code>: sleep/focus/meditation/energy/calm/anxiety/creativity/healing (optional).</p></div>
<div class="tool"><h3>get_chakra_guide <span class="new">NEW</span></h3><p>Full chakra guide — Sanskrit name, Solfeggio Hz, note, color, element, bija mantra, petal count, governs, balanced/blocked states, affirmation, crystals, essential oils, yoga pose, and Sedona vortex connection. <code>chakra</code>: root/sacral/solar_plexus/heart/throat/third_eye/crown (optional).</p></div>
<div class="tool"><h3>get_chakra_frequencies</h3><p>All seven chakras with Hz, note, color, body location, and affirmation. <code>chakra</code>: root/sacral/solar_plexus/heart/throat/third_eye/crown (optional). For the full guide use <code>get_chakra_guide</code>.</p></div>
<div class="tool"><h3>get_solfeggio</h3><p>Nine-tone Solfeggio scale with healing properties. <code>hz</code>: specific frequency like 528 (optional).</p></div>
<div class="tool"><h3>search_song_request_library</h3><p>Search KAZM's requestable song catalog. <code>query</code>: artist or title keyword (required).</p></div>
<div class="tool"><h3>get_rewind</h3><p>Available on-demand past broadcasts with dates and stream URLs.</p></div>
<div class="tool"><h3>get_jeep_trails</h3><p>Sedona jeep trail list and GPS paths. <code>trail</code>: trail slug, e.g. "broken-arrow" (optional).</p></div>
<div class="tool"><h3>get_movies</h3><p>Current movie showings at Sedona-area theaters.</p></div>
<div class="tool"><h3>get_emergency_alerts</h3><p>Live EAS alerts for Yavapai and Coconino counties — weather emergencies, evacuations, Amber Alerts. <code>severity</code>: Extreme/Severe/Moderate/Minor (optional filter).</p></div>
<div class="tool"><h3>submit_song_request <span class="new">NEW</span></h3><p>Queue a song for broadcast on KAZM — live, bidirectional. <code>query</code>: song title or artist (required).</p></div>
<div class="tool"><h3>get_local_news_headlines <span class="new">NEW</span></h3><p>Latest Sedona &amp; Verde Valley headlines from Red Rock News and Verde Independent. <code>limit</code>: max per source (optional).</p></div>
<div class="tool"><h3>get_air_quality <span class="new">NEW</span></h3><p>US AQI, PM2.5, PM10, ozone, and UV index for Sedona — from Open-Meteo. Wildfire smoke tracking built in.</p></div>
<div class="tool"><h3>get_sports_scores</h3><p>Scores for Cardinals, Suns, D-backs, Mercury, ASU, Arizona Wildcats, NAU, and UFC. <code>team</code>: optional filter.</p></div>
<div class="tool"><h3>get_sun_times</h3><p>Sunrise, sunset, solar noon, day length, twilight, and next solstice/equinox for Sedona. <code>date</code>: YYYY-MM-DD (optional).</p></div>
<div class="tool"><h3>get_moon_phase <span class="new">NEW</span></h3><p>Tonight's moon phase, illumination %, and 7-day lunar calendar for Sedona stargazers. <code>date</code>: YYYY-MM-DD (optional).</p></div>
<div class="tool"><h3>get_vortex_guide <span class="new">NEW</span></h3><p>Full guide to Sedona's 4 energy vortex sites — Bell Rock, Cathedral Rock, Airport Mesa, Boynton Canyon. Directions, hiking, best times. <code>site</code>: optional filter.</p></div>
<div class="tool"><h3>get_nws_alerts <span class="new">NEW</span></h3><p>Active NWS weather watches, warnings, and advisories for Yavapai County / Sedona. Empty when skies are clear.</p></div>
<div class="tool"><h3>get_oak_creek_levels <span class="new">NEW</span></h3><p>Current Oak Creek stream level and discharge from the USGS Sedona gauge — safe for wading or flood stage.</p></div>
<div class="tool"><h3>get_artist_info <span class="new">NEW</span></h3><p>Biography, genre tags, and album discography for the current KAZM artist or any named artist. <code>artist</code>: optional.</p></div>
<div class="tool"><h3>get_wildfire_perimeters <span class="new">NEW</span></h3><p>Active wildfire incidents near Sedona from NIFC — name, acreage, containment %, and distance from Sedona.</p></div>
<div class="tool"><h3>get_day_in_music_history <span class="new">NEW</span></h3><p>Notable music events, birthdays, and milestones that happened on this day in history. <code>date</code>: MM-DD (optional).</p></div>
<div class="tool"><h3>get_visitor_info <span class="new">NEW</span></h3><p>Practical Sedona visitor guide — Red Rock Pass, park hours/fees, attractions, best seasons, local tips. <code>topic</code>: optional filter.</p></div>
<div class="tool"><h3>get_stargazing_conditions <span class="new">NEW</span></h3><p>Tonight's darkness window, moon interference rating, Milky Way status, and top astrophotography sites. <code>date</code>: YYYY-MM-DD (optional).</p></div>
<div class="tool"><h3>get_photography_guide <span class="new">NEW</span></h3><p>Real golden hour / blue hour times, current light score, shooting tips, and camera settings for 6 iconic Sedona spots. <code>location</code>: optional filter.</p></div>
<div class="tool"><h3>get_tarot_card <span class="new">NEW</span></h3><p>Full 78-card Rider-Waite tarot deck. <code>spread</code>: daily (card of the day over Sedona, same for all listeners), single (random draw), three (past/present/future). <code>card_name</code>: look up any specific card.</p></div>
<p style="color:#888;margin-top:40px">KAZM 106.5 FM &amp; 780 AM · Sedona, AZ · mellowmountainradio.com</p>
</body>
</html>`);
});

// POST /push/loves — link a push subscription to an artist for live alerts
app.post("/push/loves", (req, res) => {
  setCors(res);
  const { endpoint, artist } = req.body || {};
  if (!endpoint || !artist) return res.status(400).json({ ok: false, error: "endpoint and artist required" });
  const subs = loadSubs();
  const idx  = subs.findIndex(s => s.endpoint === endpoint);
  if (idx < 0) return res.status(404).json({ ok: false, error: "subscription not found" });
  if (!Array.isArray(subs[idx].loves)) subs[idx].loves = [];
  const norm = artist.toLowerCase().trim();
  if (!subs[idx].loves.some(a => a.toLowerCase() === norm)) subs[idx].loves.push(artist);
  saveSubs(subs);
  res.json({ ok: true, loves: subs[idx].loves });
});

app.options("/push/loves", (_req, res) => {
  res.set({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
  res.sendStatus(204);
});

// ── Artist alert polling loop ─────────────────────────────────────────────────
// Check now-playing every 60s; push "your artist is on" to subscribers who loved them.

let _lastAlertKey = "";
setInterval(async () => {
  if (!VAPID_PRIVATE) return;
  try {
    const data   = await azGet(`/api/station/${STATION}/nowplaying`);
    const np     = Array.isArray(data) ? data[0] : data;
    const title  = np?.now_playing?.song?.title  || "";
    const artist = np?.now_playing?.song?.artist || "";
    const key    = `${title}\x00${artist}`;
    if (!title || !artist || key === _lastAlertKey) return;
    _lastAlertKey = key;

    const norm = artist.toLowerCase().trim();
    const targets = loadSubs().filter(s => Array.isArray(s.loves) && s.loves.some(a => a.toLowerCase().trim() === norm));
    if (!targets.length) return;

    const payload = JSON.stringify({
      title: `${artist} on KAZM right now`,
      body:  title,
      url:   "/",
      icon:  "/icon-192.png",
      tag:   "kazm-artist-alert",
    });
    const opts = { vapidDetails: { subject: "mailto:chuck@mellowmountainradio.com", publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE } };

    const results = await Promise.allSettled(
      targets.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, opts))
    );
    const dead = targets
      .filter((_, i) => results[i].status === "rejected" && [404, 410].includes(results[i].reason?.statusCode))
      .map(s => s.endpoint);
    if (dead.length) saveSubs(loadSubs().filter(s => !dead.includes(s.endpoint)));
  } catch {}
}, 60000);

app.listen(PORT, () => console.log(`KAZM MCP server listening on :${PORT}`));
