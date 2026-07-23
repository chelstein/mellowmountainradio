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

## Push notifications, contest entries, and fire/weather alerts

Three new workflows live alongside the feed proxy.

### Prerequisites (one time)

On the VPS, set the VAPID private key as an environment variable before restarting the MCP server:
```
VAPID_PRIVATE_KEY=7M8asR22DbHH-Ii52brxrrNwSJXxY0cVGLuK2x60zNs
```
Add it to whatever process manager config keeps the `kazm-mcp` PM2 process running
(e.g. `ecosystem.config.cjs` or `/etc/environment`). The key is never in this repo.

### kazm-push-register — push subscription storage

**File:** `kazm-push-register.workflow.json`  
**Endpoint:** `POST https://n8n.mellowmountainradio.com/webhook/kazm-push-register`

Receives a PushSubscription object from the site's service worker and stores it in
the MCP server's push hub at `mcp.mellowmountainradio.com/push/subscribe`.
Subscriptions are deduplicated by endpoint and persisted to `push-subs.json` on the MCP VPS.

### kazm-contest-entry — contest entry collection

**File:** `kazm-contest-entry.workflow.json`  
**Endpoint:** `POST https://n8n.mellowmountainradio.com/webhook/kazm-contest-entry`

Accepts `{ name, phone, email, contest, ts }` and stores in the workflow's static data
(persisted in n8n's database — survives restarts). Up to 10,000 entries per workflow.
To export, open the workflow in n8n and inspect the Code node's static data via
**Executions → View data**, or add a Google Sheets node to sync.

### kazm-push-alerts — fire and EAS alert sender

**File:** `kazm-push-alerts.workflow.json`

Runs every 10 minutes. Calls the KAZM MCP server (`mcp.mellowmountainradio.com/mcp`)
for live fire restriction level and NWS/EAS alerts. When either changes, it sends a
Web Push notification to all `alerts` subscribers via the MCP push hub.

### Import & activate

1. **Workflows → Import from File** — import each `.workflow.json`.
2. **Activate** each workflow (top-right toggle).
3. Verify the push-register endpoint:
   ```
   curl -X POST https://n8n.mellowmountainradio.com/webhook/kazm-push-register \
     -H 'Content-Type: application/json' \
     -d '{"subscription":{"endpoint":"https://test.example/push/abc","keys":{"p256dh":"test","auth":"test"}},"topic":"alerts"}'
   ```
   Should return `{"ok":true,"total":1}`.

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
