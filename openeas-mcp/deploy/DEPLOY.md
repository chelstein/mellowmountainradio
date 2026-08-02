# Deploying OpenEAS

Target: the an Ubuntu 24.04 LTS host, referred to below as `<OPENEAS_HOST>`.

## One command

SSH to the droplet as root, then:

```sh
curl -fsSL https://raw.githubusercontent.com/chelstein/mellowmountainradio/main/openeas-mcp/deploy/install.sh \
  | bash -s -- eas.mellowmountainradio.com
```

Point the DNS A record at `<OPENEAS_HOST>` **first**, or certbot will fail and you'll
have to re-run `certbot --nginx -d eas.mellowmountainradio.com` afterwards.

To install without TLS and serve by IP on port 80, pass no hostname:

```sh
curl -fsSL .../install.sh | bash
```

The script is idempotent — re-run it to upgrade. It preserves
`/etc/openeas/openeas.env`.

> The installer pulls from `main`. Until PR #174 merges, either merge it first or
> run with `OPENEAS_BRANCH=claude/gracious-einstein-qjdvqn`.

## What it does

1. Installs Node 20 from NodeSource — Ubuntu 24.04 ships Node 18 in apt, and the
   server needs 20+ for stable `fetch`.
2. Creates an unprivileged `openeas` system account with no shell.
3. Clones to `/opt/openeas-src`, installs to `/opt/openeas`, production deps only.
4. **Runs the conformance guard and refuses to install if it fails.** 47 CFR
   §11.45(a) reaches recordings and simulations of the EAS codes and Attention
   Signal, so an audio artifact must never reach a running deployment. The guard
   also runs as `ExecStartPre`, so the service will not start if one ever appears.
5. Writes `/etc/openeas/openeas.env` with KAZM defaults (mode 0640).
6. Installs the systemd unit, hardened: `ProtectSystem=strict`, `NoNewPrivileges`,
   empty `CapabilityBoundingSet`, `RestrictAddressFamilies=AF_INET AF_INET6`,
   syscall filtering. The process reads two public HTTPS feeds and serves JSON; it
   needs nothing else.
7. Configures nginx as the sole public entry point, with per-IP rate limiting at
   30 req/min. Port 3100 binds loopback and is **not** opened in the firewall.
8. Enables ufw (OpenSSH + Nginx Full) and requests a Let's Encrypt certificate.

## Verify

```sh
systemctl status openeas
journalctl -u openeas -f

curl -s https://eas.mellowmountainradio.com/health

curl -s -X POST https://eas.mellowmountainradio.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Then confirm it is reading the real federal aggregator, not just weather:

```sh
curl -s -X POST https://eas.mellowmountainradio.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"eas_get_ipaws_feed","arguments":{}}}'
```

You should see live national alerts with SAME event codes. If `national_total` is
`0`, that is a genuine quiet moment — the feed holds an alert for roughly 30
minutes or until it expires. `status: "unavailable"` means the source could not be
reached, which is a different thing and is reported as such.

## Rate limiting, and why it matters here

Both upstreams are public goodwill services. FEMA's own guidance for the
All-Hazards Information Feed is explicit that providers "cannot stress IPAWS
servers with excessive requests," and `api.weather.gov` sets
`cache-control: max-age=5`, so polling faster than ~5 s is pointless.

Neither publishes a hard numeric limit. The nginx zone caps clients at 30 req/min
per IP. If you later add a poller, poll the ~2 KB IPAWS Atom index every 15–30 s
and fetch full CAP only for message IDs you have not seen.

## Persistence — the gap to close next

**The IPAWS feed has no memory.** It is a rolling ~30-minute active window, not a
log. A missed poll is an alert this deployment will never see, and the
`{timestamp}` argument on the `/recent/` paths is a "since" filter over the
already-truncated active set, not history.

This reference implementation reads live and does not persist. Before any
compliance claim rests on it, add a local store fed by a poller, and backfill
history from the OpenFEMA `IpawsArchivedAlerts` dataset. When that store exists it
must be append-only per §73.1800(d) with no automatic two-year purge — see
SPEC §7.

## Rollback

```sh
systemctl stop openeas && systemctl disable openeas
rm -f /etc/nginx/sites-enabled/openeas && systemctl reload nginx
```

Nothing else on the droplet is touched. To remove entirely:

```sh
rm -rf /opt/openeas /opt/openeas-src /etc/openeas \
       /etc/systemd/system/openeas.service /etc/nginx/sites-available/openeas
systemctl daemon-reload
userdel openeas
```

## Registering with Smithery

Once TLS is live, publish `https://eas.mellowmountainradio.com/mcp`. The
`smithery.yaml` in the parent directory declares `type: http` with an empty config
schema — no user configuration is required, because every source the server reads
is public.

Keep it a **separate** listing from the 46-tool KAZM server. They are different
products with different audiences, and conflating them would bury the fact that
this is the first MCP server for the U.S. Emergency Alert System.
