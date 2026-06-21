# mellowmountainradio

Official website for **KAZM 106.5 FM & 780 AM, Mellow Mountain Radio** in Sedona, Arizona.

A fast, self-contained static site (HTML, CSS, vanilla JS) built around the
station's warm broadcast / yacht-rock identity. No build step.

## Run locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Structure

```
index.html              # the homepage
styles.css              # design system + all sections (light + dark mode)
main.js                 # nav, live stream player, now-playing, scroll reveals
assets/brand/           # primary logo (color / white / navy, svg + png)
assets/campaigns/       # campaign logo variants (neon, retro 780, firepit, yoga, broadcast)
.do/app.yaml            # DigitalOcean App Platform static-site spec
*.eps /*.pdf /*.svg     # original brand kit (source files)
```

## Deploy (DigitalOcean App Platform)

This deploys as a **static site** with no build command. The spec lives in
`.do/app.yaml`. Create the app once:

```bash
doctl apps create --spec .do/app.yaml
```

After that, pushes to the deploy branch (`main`) redeploy automatically.
In the App Platform UI you can also point a new Static Site at this repo,
set the source directory to `/`, and leave the build command empty.

## Brand

- Navy `#223d6e` and terracotta `#a95750` on warm cream.
- Display type: Bricolage Grotesque. Body: Inter Tight.
- One accent color, one radius system, dark mode via `prefers-color-scheme`.

## What still needs real data

The homepage is wired for live content but ships with clearly-labeled samples:

- **Now Playing** rotates sample tracks. Point `updateNowPlaying()` in `main.js`
  at your Live365 metadata feed (station `a56104`).
- **Sports** matchups and **adventure** conditions are placeholders for your feeds.
- **News / Weather** tiles use brand-color art; drop in real photos when ready.
- The **Listen Live** button streams `https://streaming.live365.com/a56104`.
