# KAZM Mellow Mountain Radio — MCP Server

Live data from **KAZM 106.5 FM & 780 AM** in Sedona, Arizona — available to any MCP-compatible AI assistant via a Streamable HTTP server.

**Endpoint:** `https://mcp.mellowmountainradio.com/mcp`  
**Transport:** Streamable HTTP  
**Auth:** None required  
**Tools:** 20

## Connect

Add to any MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "kazm": {
      "url": "https://mcp.mellowmountainradio.com/mcp"
    }
  }
}
```

Full interactive docs at **https://mcp.mellowmountainradio.com/docs**

## Tools

| Tool | Description |
|---|---|
| `get_now_playing` | Song currently on air — title, artist, album, artwork, elapsed time, stream URL |
| `get_listener_count` | Live listener count across all mounts with per-mount breakdown |
| `search_song_history` | Recently played songs (up to 25); optional keyword filter by title or artist |
| `get_fire_restrictions` | Current fire restriction stage for Sedona / Coconino National Forest — live from the Forest Service |
| `get_weather` | Current conditions and 7-day forecast for Sedona, AZ (Open-Meteo, no key required) |
| `get_road_conditions` | Active road closures from Coconino NF alerts and AZ511 highway incidents |
| `get_concerts` | Upcoming concerts; optional `state` filter (e.g. `"AZ"`) |
| `get_events` | Upcoming library events and local Sedona festivals |
| `get_stream_url` | Live audio stream URLs — MP3 and AAC mounts |
| `get_show_schedule` | KAZM weekly on-air program schedule; filter by `day` or keyword |
| `get_horoscope` | Daily, weekly, or monthly horoscope for any zodiac sign |
| `get_schumann_resonance` | Earth's electromagnetic pulse from the Tomsk observatory — frequency, energy, activity level |
| `search_song_request_library` | Search KAZM's requestable song catalog by artist or title |
| `get_rewind` | Available on-demand past broadcasts with dates and stream URLs |
| `get_jeep_trails` | Sedona jeep trail list; pass a trail slug for the full GPS coordinate path |
| `get_movies` | Current showings at Sedona-area theaters (Mary D. Fisher, Harkins Sedona 6) |
| `get_emergency_alerts` | Live EAS alerts for Yavapai and Coconino counties — weather emergencies, evacuations, Amber Alerts |
| `submit_song_request` | Submit a song request directly to the KAZM studio DJ desk |
| `get_local_news_headlines` | Latest Sedona & Verde Valley news from Red Rock News and Verde Independent RSS feeds |
| `get_air_quality` | US AQI, PM2.5, PM10, ozone, and UV index for Sedona — wildfire smoke tracking built in |

## Run locally

```bash
cd mcp-server
cp .env.example .env   # fill in AZ_KEY etc.
npm install
node server.js
```

The server listens on port 3000 by default (`PORT` env var overrides).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `AZ_HOST` | Yes | AzuraCast base URL, e.g. `https://streaming.mellowmountainradio.com` |
| `AZ_KEY` | Yes | AzuraCast API key |
| `STATION_ID` | Yes | AzuraCast station ID (numeric) |
| `PORT` | No | HTTP port (default `3000`) |
| `PUBLIC_URL` | No | Public base URL shown in health response |
| `AZ511_KEY` | No | Free AZ511 key for highway incidents (`az511.gov`) |
| `GH_RAW` | No | GitHub raw content base URL for static JSON files |

## Discovery endpoints

| Endpoint | Purpose |
|---|---|
| `/.well-known/mcp-registry-auth` | Official MCP registry domain verification |
| `/.well-known/mcp.json` | MCP auto-discovery metadata |
| `/.well-known/mcp/server-card.json` | Full server card for directory indexing |
| `/docs` | Interactive HTML tool reference |
| `/` | Health check — returns name, version, tool count |
