import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

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
    "Returns active road and trail closures for the Sedona / Oak Creek area from the Coconino National Forest alerts page. Also includes AZ511 highway incidents for Yavapai and Coconino counties when the AZ511_KEY environment variable is set.",
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

      // AZ511 highway incidents — requires AZ511_KEY env var (free account at az511.gov)
      const AZ511_KEY = process.env.AZ511_KEY || "";
      if (AZ511_KEY) {
        try {
          const res = await fetch(
            `https://az511.gov/api/v2/get/event?format=json&status=active&county=Yavapai,Coconino&key=${encodeURIComponent(AZ511_KEY)}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (res.ok) {
            const data = await res.json();
            result.incidents = (data.events || data || []).map(e => ({
              type:        e.event_type  || null,
              headline:    e.headline    || null,
              description: e.description || null,
              road:        e.road_name   || null,
              direction:   e.direction   || null,
              start:       e.start_time  || null,
              county:      e.county      || null,
            }));
            result.sources.push(`AZ511 (${result.incidents.length} highway incidents)`);
          }
        } catch (_) {}
      } else {
        result.az511_note = "AZ highway incidents unavailable — set AZ511_KEY env var. Free registration at az511.gov/my511/register.";
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

  // 13. Song Request Library ─────────────────────────────────────────────────────
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

  // 14. Rewind / Archive ─────────────────────────────────────────────────────────
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

  return mcp;
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// MCP auto-discovery endpoints (Smithery, official registry, etc.)
app.get("/.well-known/mcp-registry-auth", (_req, res) => {
  res.setHeader("Content-Type", "text/plain");
  res.send("v=MCPv1; k=ed25519; p=MCowBQYDK2VwAyEA1RUaBvZhCCxIHpcOcFbQueEHsX5ameBW7GlG67C+hXA=");
});

app.get("/.well-known/mcp.json", (_req, res) => {
  res.json({
    name: "KAZM Mellow Mountain Radio",
    description: "20 live tools for KAZM 106.5 FM & 780 AM — now playing, song requests, weather, fire restrictions, road conditions, concerts, and more for the Sedona/Verde Valley area.",
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
    name: "com.mellowmountainradio/kazm",
    title: "KAZM Mellow Mountain Radio",
    description: "20 live tools for KAZM 106.5 FM & 780 AM — now playing, song requests, weather, fire restrictions, road conditions, concerts, and more for the Sedona/Verde Valley area.",
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
    tools:   20,
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
<h2>Tools (20)</h2>
<div class="tool"><h3>get_now_playing</h3><p>Currently on-air song with artist, album, artwork, and stream URL.</p></div>
<div class="tool"><h3>get_listener_count</h3><p>Live listener count across all mounts.</p></div>
<div class="tool"><h3>search_song_history</h3><p>Recently played songs; optional keyword filter. <code>query</code>: string (optional)</p></div>
<div class="tool"><h3>get_fire_restrictions</h3><p>Current fire restriction level for the Sedona area — live from the Forest Service.</p></div>
<div class="tool"><h3>get_weather</h3><p>Current conditions and 7-day forecast for Sedona, AZ.</p></div>
<div class="tool"><h3>get_road_conditions</h3><p>Active incidents on Yavapai and Coconino county roads (AZ511).</p></div>
<div class="tool"><h3>get_concerts</h3><p>Upcoming concerts. <code>state</code>: string (optional, e.g. "AZ")</p></div>
<div class="tool"><h3>get_events</h3><p>Library events and local festivals.</p></div>
<div class="tool"><h3>get_stream_url</h3><p>Live audio stream URLs (MP3 and AAC).</p></div>
<div class="tool"><h3>get_show_schedule</h3><p>KAZM weekly on-air program schedule. <code>day</code>: weekday/saturday/sunday (optional). <code>query</code>: keyword (optional).</p></div>
<div class="tool"><h3>get_horoscope</h3><p>Daily, weekly, or monthly horoscope for any sign. <code>sign</code>: zodiac sign (optional). <code>period</code>: daily/weekly/monthly (optional).</p></div>
<div class="tool"><h3>get_schumann_resonance</h3><p>Earth's electromagnetic pulse from the Tomsk observatory — frequency, energy score, activity level.</p></div>
<div class="tool"><h3>search_song_request_library</h3><p>Search KAZM's requestable song catalog. <code>query</code>: artist or title keyword (required).</p></div>
<div class="tool"><h3>get_rewind</h3><p>Available on-demand past broadcasts with dates and stream URLs.</p></div>
<div class="tool"><h3>get_jeep_trails</h3><p>Sedona jeep trail list and GPS paths. <code>trail</code>: trail slug, e.g. "broken-arrow" (optional).</p></div>
<div class="tool"><h3>get_movies</h3><p>Current movie showings at Sedona-area theaters.</p></div>
<div class="tool"><h3>get_emergency_alerts</h3><p>Live EAS alerts for Yavapai and Coconino counties — weather emergencies, evacuations, Amber Alerts. <code>severity</code>: Extreme/Severe/Moderate/Minor (optional filter).</p></div>
<div class="tool"><h3>submit_song_request <span class="new">NEW</span></h3><p>Queue a song for broadcast on KAZM — live, bidirectional. <code>query</code>: song title or artist (required).</p></div>
<div class="tool"><h3>get_local_news_headlines <span class="new">NEW</span></h3><p>Latest Sedona &amp; Verde Valley headlines from Red Rock News and Verde Independent. <code>limit</code>: max per source (optional).</p></div>
<div class="tool"><h3>get_air_quality <span class="new">NEW</span></h3><p>US AQI, PM2.5, PM10, ozone, and UV index for Sedona — from Open-Meteo. Wildfire smoke tracking built in.</p></div>
<p style="color:#888;margin-top:40px">KAZM 106.5 FM &amp; 780 AM · Sedona, AZ · mellowmountainradio.com</p>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`KAZM MCP server listening on :${PORT}`));
