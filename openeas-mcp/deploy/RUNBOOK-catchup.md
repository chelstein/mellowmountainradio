# Catch-up runbook — get the OpenEAS page live

Three deploys, in this order. Nothing here is reversible-unsafe; the installer
is idempotent and the relay change is additive.

Every command below is meant to be pasted as-is. Expected output is given for
each so you can tell success from a silent no-op.

**Current state, verified 31 July 2026:**

| Thing | Where | State |
|---|---|---|
| OpenEAS server | `161.35.225.111` | healthy, HTTP only, **15 tools** (needs 18) |
| `eas.mellowmountainradio.com` | — | **no DNS record at all** |
| Station MCP server | `mcp.mellowmountainradio.com` | running the **28 July build**, `/eas` 404s |
| `eas.html` / `mcp.html` | live site | redesigned, deployed, waiting on data |

---

## Step 1 — DNS (do this first; it propagates while you do the rest)

Cloudflare dashboard → `mellowmountainradio.com` → **DNS** → **Add record**:

| Field | Value |
|---|---|
| Type | `A` |
| Name | `eas` |
| IPv4 address | `161.35.225.111` |
| Proxy status | **DNS only** (grey cloud — *not* orange) |
| TTL | Auto |

**Grey cloud matters, twice over.** Certbot's HTTP-01 challenge has to reach the
origin directly, and Cloudflare's proxy buffers responses, which breaks the
SSE framing that MCP's streamable-HTTP transport rides on. Orange cloud will
appear to work and then fail on long-lived tool calls.

Verify before moving on:

```sh
dig +short eas.mellowmountainradio.com
```

Expect exactly `161.35.225.111`. If it returns nothing, wait and retry — do not
run Step 2 until it resolves, because certbot will fail and the installer will
leave the server on plain HTTP.

---

## Step 2 — Upgrade the OpenEAS droplet and add TLS

```sh
ssh root@161.35.225.111
```

```sh
curl -fsSL https://raw.githubusercontent.com/chelstein/mellowmountainradio/main/openeas-mcp/deploy/install.sh \
  | bash -s -- eas.mellowmountainradio.com
```

The installer is idempotent — it upgrades in place, keeps the archive under
`/var/lib/openeas/archive`, and runs certbot once the hostname resolves. Passing
no hostname would install without TLS, which is not what you want here.

Verify from your laptop, not the droplet:

```sh
curl -s https://eas.mellowmountainradio.com/health
```

Expect JSON containing `"ok":true` and `"profile":"OpenEAS"`.

```sh
curl -s -X POST https://eas.mellowmountainradio.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | grep -o '"name":"eas_[a-z_]*"' | sort -u | wc -l
```

**Expect `18`.** It reports 15 today. The three new ones are
`eas_get_playout_status`, `eas_get_asrun_log` and `eas_get_parity_report`.

They will each report **`unavailable`** on this box, and that is correct — it is
a cloud instance with no playout system attached, and proposed §11.2(e) excludes
cloud from the "EAS Software" category the whole regulatory position depends on.
Deploying them here is for conformance, not for parity. Parity runs on the Mac
Studio or nowhere.

---

## Step 3 — Redeploy the station MCP server

This is the one that actually lights up the public page, and it needs no DNS at
all — the relay reaches the droplet by raw IP.

```sh
ssh root@157.230.163.69
```

**Discover how it runs before changing anything.** I could not determine this
remotely, so don't guess:

```sh
systemctl list-units --type=service | grep -iE 'kazm|mcp|node'
command -v pm2 >/dev/null && pm2 list
docker ps
```

Then whichever matched:

```sh
# systemd
cd /path/to/repo && git pull origin main && systemctl restart <service-name>

# pm2
cd /path/to/repo && git pull origin main && npm install --omit=dev && pm2 restart <app-name>

# docker compose
cd /path/to/deploy && git pull origin main && docker compose up -d --build
```

Verify:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://mcp.mellowmountainradio.com/eas
curl -s https://mcp.mellowmountainradio.com/eas/national | head -c 200
```

Expect **`200`**, and JSON whose `sources[0].status` is `"ok"`. It returns `404`
today because the deployed build predates the `/eas` routes.

I verified this relay end-to-end from a local copy against the live droplet:
`/eas/national` returned 8 alerts, `/eas` returned 5 for Sedona. The code is
correct; it has simply never been deployed.

---

## Step 4 — Confirm the page

Load <https://mellowmountainradio.com/eas.html>.

Both panels should populate. **Either** Step 2 **or** Step 3 alone is enough —
the page tries the direct endpoint first and falls back to the relay, which is
what the two-endpoint design is for. Doing both gives you the redundancy.

If a panel still reads **"No reading"**, open the browser console. The page
reports which endpoint it tried and why it failed, and does not silently render
an empty alert list — an unreadable feed must never look like "no emergency".

If a panel reads **"Nothing active"**, that is success. It means the feed was
read and there is genuinely nothing in the IPAWS window, which is the normal
state most of the time.

---

## What is deliberately *not* here

**The studio instance.** Tier C — `OPENEAS_TIER_C=1` plus `PLAYOUT_LOG_DIR`
pointed at the MegaSeg logs — runs on the Mac Studio and should not be publicly
reachable. That is a separate piece of work, and it is where the parity report
does real work and where the MegaSeg column mapping still needs verifying
against a real log before any parity output is treated as evidence.
