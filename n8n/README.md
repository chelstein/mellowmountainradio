# Mellow Mountain Radio — station-owned data layer (n8n)

The website pulls live data from **your own** n8n at
`n8n.mellowmountainradio.com` instead of depending on third-party services.
This folder holds the importable workflow that serves the site's news and
sports headline feeds.

## What runs where

| Data | Endpoint | Status |
|------|----------|--------|
| Scoreboards (MLB / NFL / NBA) | `…/webhook/api/scoreboard/{sport}` | Already live |
| News + sports **headline feeds** | `…/webhook/feed?src=<key>` | Import `feed-proxy.workflow.json` |

### Why a feed proxy

The browser can't read most RSS feeds directly (CORS), and the previous setup
leaned on third parties (`rss.app`, `allorigins.win`, Google News). This
workflow fetches the feed **server-side** (no CORS limit) and returns the XML
with `Access-Control-Allow-Origin: *`, so the site reads it straight from your
domain. The site addresses feeds by a stable **key** — the upstream URL lives
only in the workflow, so you can re-point any feed without touching the site.

Feed keys the site requests:

| Key | Used on | Default source |
|-----|---------|----------------|
| `news-local` | News → Local | rss.app (Sedona / Verde Valley) |
| `news-national` | News → National | rss.app |
| `news-world` | News → World | rss.app |
| `sports-az` | Sports → Arizona teams | Google News (D-backs / Cardinals / Suns / Wildcats / Sun Devils) |
| `sports-national` | Sports → Around the leagues | Google News — Sports topic |

## Import & activate (one time)

1. In n8n: **Workflows → Import from File →** select `feed-proxy.workflow.json`.
2. Open the imported workflow and click **Active** (top-right toggle).
3. Confirm the production URL is `https://n8n.mellowmountainradio.com/webhook/feed`.
   If your instance uses a different webhook host/prefix, update `FEED_PROXY`
   in `main.js` to match.
4. Test in a browser or terminal:
   ```
   curl "https://n8n.mellowmountainradio.com/webhook/feed?src=sports-az"
   ```
   You should get RSS XML back. The site will now serve every feed from n8n;
   no further site deploy is needed.

> The site works **before and after** activation: until the workflow is live,
> `fetchFeed` in `main.js` transparently falls back to fetching the source
> directly and then through a public CORS proxy. Activating the workflow simply
> makes your own infrastructure the primary (and only) path.

### Changing or adding a feed later

Edit the `sources` map in the **Resolve source** Code node. To add a brand-new
feed, also add the key → URL pair to the `FEEDS` map in `main.js` and reference
it with `data-feed="<key>"` on the page.

## Scoreboards: make them CORS-open too

The scoreboard webhooks already work, but if they're locked to a single origin
they'll fail when the site is viewed from the apex domain or the app shell.
In each scoreboard workflow's **Respond to Webhook** node, add a response
header:

```
Access-Control-Allow-Origin: *
```

That's the same treatment the feed proxy uses and removes the last
origin-specific dependency.
