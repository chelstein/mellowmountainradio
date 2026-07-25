# mellowmountainradio

Official website and MCP server for **KAZM 106.5 FM & 780 AM, Mellow Mountain Radio** in Sedona, Arizona.

[![smithery badge](https://smithery.ai/badge/chuck/mellowmountainradio)](https://smithery.ai/servers/chuck/mellowmountainradio)

## MCP Server

KAZM runs a live **Model Context Protocol (MCP) server** with 45 real-time tools and 6 prompts for any MCP-compatible AI assistant (Claude, Cursor, Windsurf, etc.).

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

## Tools (45)

| Tool | Description |
|---|---|
| `get_now_playing` | Song currently on air — title, artist, album, artwork, stream URL |
| `get_listener_count` | Live listener count across all mounts |
| `search_song_history` | Recently played songs with optional keyword filter |
| `search_song_request_library` | Search KAZM's requestable song catalog |
| `submit_song_request` | Submit a song request directly to the KAZM studio |
| `get_stream_url` | Live audio stream URLs (MP3 and AAC) |
| `get_show_schedule` | KAZM weekly on-air program schedule |
| `get_rewind` | Available on-demand past broadcasts with stream URLs |
| `get_artist_info` | Biography, genre tags, and album discography for any artist |
| `get_day_in_music_history` | Notable music events, birthdays, and milestones on this day in history |
| `get_weather` | Current conditions and 7-day forecast for Sedona, AZ |
| `get_fire_restrictions` | Current fire restriction stage for Sedona / Coconino National Forest |
| `get_road_conditions` | Active road closures and AZ511 highway incidents |
| `get_air_quality` | US AQI, PM2.5, PM10, ozone, and UV index for Sedona |
| `get_emergency_alerts` | Live EAS alerts for Yavapai and Coconino counties |
| `get_nws_alerts` | Active NWS weather watches, warnings, and advisories |
| `get_oak_creek_levels` | Current Oak Creek stream level and discharge from the USGS gauge |
| `get_wildfire_perimeters` | Active wildfire incidents near Sedona from NIFC |
| `get_local_news_headlines` | Latest Sedona & Verde Valley news headlines |
| `get_concerts` | Upcoming concerts — filter by state |
| `get_events` | Library events and local Sedona festivals |
| `get_movies` | Current movie showings at Sedona-area theaters |
| `get_sports_scores` | Scores for Cardinals, Suns, D-backs, Mercury, ASU, Arizona, NAU, and UFC |
| `get_sun_times` | Sunrise, sunset, solar noon, day length, and twilight for Sedona |
| `get_moon_phase` | Tonight's moon phase, illumination %, and 7-day lunar calendar |
| `get_stargazing_conditions` | Tonight's darkness window, moon interference, and Milky Way visibility |
| `get_photography_guide` | Golden hour / blue hour times and shooting tips for 6 iconic Sedona spots |
| `get_horoscope` | Daily, weekly, or monthly horoscope for any zodiac sign |
| `get_chakra_guide` | Full chakra guide with Sanskrit names, Solfeggio Hz, and Sedona vortex connection |
| `get_chakra_frequencies` | All seven chakras with Hz, note, color, body location, and affirmation |
| `get_solfeggio` | Nine-tone Solfeggio scale with healing properties |
| `get_sound_session` | Binaural / tonal session recommendations based on goal or time of day |
| `get_schumann_resonance` | Earth's electromagnetic pulse from the Tomsk observatory |
| `get_vortex_guide` | Full guide to Sedona's 4 energy vortex sites with directions and best times |
| `get_tarot_card` | Full 78-card Rider-Waite tarot deck — daily, single, or three-card spread |
| `get_hiking_trails` | 15 top Sedona hiking trails — distance, elevation, difficulty, and trailhead info |
| `get_jeep_trails` | Sedona jeep trail list and GPS coordinate paths |
| `get_red_rock_pass` | Complete Red Rock Pass guide — all 19 required sites and accepted passes |
| `get_visitor_info` | Practical Sedona visitor guide — tips, best seasons, and attractions |
| `register_listener` | Create or update a KAZM listener profile |
| `get_or_create_listener` | Zero-friction entry point for KAZM personalization |
| `get_listener_profile` | Retrieve a KAZM listener's full profile by ID or email |
| `update_listener_preference` | Update a specific preference for a KAZM listener |
| `log_listener_history` | Log a listening event for a KAZM listener |
| `get_personalized_content` | Fully personalized KAZM experience based on listener history |

## Prompts (6)

| Prompt | Description |
|---|---|
| `plan_sedona_trip` | Complete Sedona trip planning brief — weather, events, road conditions, vortex guide, and what's on KAZM |
| `get_kazm_status` | Full KAZM radio status — now playing, listener count, upcoming shows, and stream links |
| `check_outdoor_safety` | Full outdoor safety brief for Sedona — fire restrictions, air quality, NWS alerts, Oak Creek levels |
| `get_stargazing_forecast` | Tonight's stargazing forecast — darkness window, moon phase, Milky Way visibility, and best sites |
| `request_a_song` | Walk through requesting a song on KAZM — search the catalog, confirm the track, and submit |
| `check_drive_conditions` | Road and weather check before driving to or through Sedona — SR-89A, Oak Creek Canyon, I-17 |

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
