# mellowmountainradio

Official website and MCP server for **KAZM 106.5 FM & 780 AM, Mellow Mountain Radio** in Sedona, Arizona.

## MCP Server

KAZM runs a live **Model Context Protocol (MCP) server** with 20 real-time tools for any MCP-compatible AI assistant (Claude, Cursor, Windsurf, etc.).

```json
{
  "mcpServers": {
    "kazm": {
      "url": "https://mcp.mellowmountainradio.com/mcp"
    }
  }
}
```

Transport: **Streamable HTTP** · No auth required · Docs: https://mcp.mellowmountainradio.com/docs

## Tools

| Tool | Description |
|---|---|
| `get_now_playing` | Song currently on air — title, artist, album, artwork, stream URL |
| `get_listener_count` | Live listener count across all mounts |
| `search_song_history` | Recently played songs with optional keyword filter |
| `get_fire_restrictions` | Current fire restriction stage for Sedona / Coconino National Forest |
| `get_weather` | Current conditions and 7-day forecast for Sedona, AZ |
| `get_road_conditions` | Active road closures and AZ511 highway incidents |
| `get_concerts` | Upcoming concerts — filter by state |
| `get_events` | Library events and local Sedona festivals |
| `get_stream_url` | Live audio stream URLs (MP3 and AAC) |
| `get_show_schedule` | KAZM weekly on-air program schedule |
| `get_horoscope` | Daily, weekly, or monthly horoscope for any zodiac sign |
| `get_schumann_resonance` | Earth's electromagnetic pulse from the Tomsk observatory |
| `search_song_request_library` | Search KAZM's requestable song catalog |
| `get_rewind` | Available on-demand past broadcasts with stream URLs |
| `get_jeep_trails` | Sedona jeep trail list and GPS coordinate paths |
| `get_movies` | Current movie showings at Sedona-area theaters |
| `get_emergency_alerts` | Live EAS alerts for Yavapai and Coconino counties |
| `submit_song_request` | Submit a song request directly to the KAZM studio |
| `get_local_news_headlines` | Latest Sedona & Verde Valley news headlines |
| `get_air_quality` | US AQI, PM2.5, PM10, ozone, and UV index for Sedona |

See [`mcp-server/README.md`](mcp-server/README.md) for full setup and environment variable docs.

---

## Website

A fast, self-contained static site (HTML, CSS, vanilla JS) built around the
station's warm broadcast / yacht-rock identity. No build step.

### Run locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Structure

```
index.html              # the homepage
styles.css              # design system + all sections (light + dark mode)
main.js                 # nav, live stream player, now-playing, scroll reveals
assets/brand/           # primary logo (color / white / navy, svg + png)
assets/campaigns/       # campaign logo variants (neon, retro 780, firepit, yoga, broadcast)
.do/app.yaml            # DigitalOcean App Platform static-site spec
*.eps /*.pdf /*.svg     # original brand kit (source files)
```

### Deploy (DigitalOcean App Platform)

This deploys as a **static site** with no build command. The spec lives in
`.do/app.yaml`. Create the app once:

```bash
doctl apps create --spec .do/app.yaml
```

After that, pushes to the deploy branch (`main`) redeploy automatically.
In the App Platform UI you can also point a new Static Site at this repo,
set the source directory to `/`, and leave the build command empty.

### Brand

- Navy `#223d6e` and terracotta `#a95750` on warm cream.
- Display type: Bricolage Grotesque. Body: Inter Tight.
- One accent color, one radius system, dark mode via `prefers-color-scheme`.

### What still needs real data

The homepage is wired for live content but ships with clearly-labeled samples:

- **Now Playing** rotates sample tracks. Point `updateNowPlaying()` in `main.js`
  at your Live365 metadata feed (station `a56104`).
- **Sports** matchups and **adventure** conditions are placeholders for your feeds.
- **News / Weather** tiles use brand-color art; drop in real photos when ready.
- The **Listen Live** button streams `https://streaming.live365.com/a56104`.
