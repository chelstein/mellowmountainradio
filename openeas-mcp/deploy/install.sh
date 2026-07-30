#!/usr/bin/env bash
#
# OpenEAS MCP server — installer for Ubuntu 24.04 LTS.
#
# Run as root on a fresh droplet:
#
#   curl -fsSL https://raw.githubusercontent.com/chelstein/mellowmountainradio/main/openeas-mcp/deploy/install.sh | bash -s -- eas.mellowmountainradio.com
#
# or, having cloned the repo:
#
#   sudo bash openeas-mcp/deploy/install.sh eas.mellowmountainradio.com
#
# Pass no hostname to install without TLS and serve on port 80 only.
# Idempotent: safe to re-run to upgrade an existing install.

set -euo pipefail

DOMAIN="${1:-}"
# Branch may come from a second positional argument or from the environment.
# The positional form is the safer one to document: piping into bash means
#   OPENEAS_BRANCH=x curl ... | bash
# sets the variable in curl's environment, NOT in the bash that runs this
# script, so the branch silently falls back to the default. Positional args
# survive the pipe.
BRANCH="${2:-${OPENEAS_BRANCH:-main}}"
REPO="${OPENEAS_REPO:-https://github.com/chelstein/mellowmountainradio.git}"
APP_DIR=/opt/openeas
SRC_DIR=/opt/openeas-src
ENV_DIR=/etc/openeas
NODE_MAJOR=20

log()  { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root (use sudo)."

log "OpenEAS installer — Ubuntu 24.04 target"
. /etc/os-release 2>/dev/null || true
[[ "${ID:-}" == "ubuntu" ]] || warn "Expected Ubuntu; found '${ID:-unknown}'. Continuing."

# ── packages ────────────────────────────────────────────────────────────────
log "Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git nginx ufw >/dev/null

# Ubuntu 24.04 ships Node 18 in apt; the server needs 20+ for stable fetch.
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]]; then
  log "Installing Node.js ${NODE_MAJOR}.x from NodeSource"
  install -d -m 0755 /usr/share/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/nodesource.gpg
  echo "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs >/dev/null
fi
log "node $(node --version)"

# ── service account ─────────────────────────────────────────────────────────
if ! id openeas &>/dev/null; then
  log "Creating unprivileged service account 'openeas'"
  useradd --system --no-create-home --shell /usr/sbin/nologin openeas
fi

# ── source ──────────────────────────────────────────────────────────────────
log "Fetching source (branch: ${BRANCH})"
if [[ -d "$SRC_DIR/.git" ]]; then
  # Explicit refspec. A shallow clone made with --branch X configures its remote
  # refspec for X only, so `git fetch origin Y` would update FETCH_HEAD without
  # ever creating refs/remotes/origin/Y — and the reset would then fail or, worse,
  # silently leave the old branch checked out. Naming both sides fixes it and
  # makes switching branches on re-run work.
  git -C "$SRC_DIR" fetch --depth 1 origin \
      "+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}" -q \
    || die "Could not fetch branch '${BRANCH}' from ${REPO}. Does it exist?"
  git -C "$SRC_DIR" reset --hard "refs/remotes/origin/${BRANCH}" -q
  git -C "$SRC_DIR" clean -fdq
else
  rm -rf "$SRC_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$SRC_DIR" -q \
    || die "Could not clone branch '${BRANCH}' from ${REPO}. Does it exist?"
fi

if [[ ! -f "$SRC_DIR/openeas-mcp/server.js" ]]; then
  echo
  warn "Checked out branch: $(git -C "$SRC_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  warn "Top-level entries:  $(ls "$SRC_DIR" | tr '\n' ' ' | cut -c1-160)"
  echo
  cat >&2 <<'HINTEOF'
openeas-mcp/ is not present on the branch that was checked out.

Most likely cause: the branch defaulted. If you piped this script into bash,
note that

    OPENEAS_BRANCH=my-branch curl ... | bash -s -- example.com

sets the variable for CURL, not for the bash that runs the script. Pass the
branch as the SECOND POSITIONAL ARGUMENT instead:

    curl -fsSL .../install.sh | bash -s -- example.com my-branch

or put the assignment on the bash side of the pipe:

    curl -fsSL .../install.sh | OPENEAS_BRANCH=my-branch bash -s -- example.com
HINTEOF
  die "openeas-mcp/server.js not found in ${SRC_DIR}"
fi

log "Installing to ${APP_DIR}"
install -d -m 0755 "$APP_DIR"
rm -rf "$APP_DIR"/{lib,scripts,test,node_modules}
# test/ ships deliberately. It is text-only and dependency-free, and it lets an
# operator — or an auditor — run the suite against the ARTIFACT THAT IS ACTUALLY
# DEPLOYED rather than against a checkout that may have drifted. For a system
# whose value rests on being checkable by someone who does not trust it, that
# distinction is the whole point.
cp -r "$SRC_DIR/openeas-mcp"/{lib,scripts,test,server.js,package.json,README.md} "$APP_DIR"/
[[ -f "$SRC_DIR/openeas-mcp/package-lock.json" ]] && cp "$SRC_DIR/openeas-mcp/package-lock.json" "$APP_DIR"/

log "Installing dependencies"
( cd "$APP_DIR" && npm install --omit=dev --no-fund --no-audit --silent )

# ── conformance gate ────────────────────────────────────────────────────────
# 47 CFR §11.45(a) reaches recordings and simulations of the EAS codes and
# Attention Signal, so an audio artifact must never reach a running deployment.
# Refuse to install rather than install and warn.
log "Running conformance guard (no EAS audio, no origination capability)"
node "$APP_DIR/scripts/no-eas-audio.js" || die "Conformance guard FAILED — refusing to install. See SPEC §2.3."

chown -R root:root "$APP_DIR"
chmod -R a-w "$APP_DIR"

# ── configuration ───────────────────────────────────────────────────────────
install -d -m 0750 "$ENV_DIR"
if [[ ! -f "$ENV_DIR/openeas.env" ]]; then
  log "Writing default configuration to ${ENV_DIR}/openeas.env"
  cat > "$ENV_DIR/openeas.env" <<'ENVEOF'
# OpenEAS configuration. Restart after editing: systemctl restart openeas
PORT=3100

EAS_CALLSIGN=KAZM
EAS_STATION_NAME=KAZM 780 AM / 106.5 FM (Mellow Mountain Radio)
EAS_SERVICE_AREA=Sedona, Arizona — Yavapai and Coconino counties

# Two-digit state FIPS and three-digit county FIPS.
EAS_STATE_FIPS=04
EAS_COUNTY_FIPS=025

# NWS county zones. Sedona straddles the Yavapai/Coconino line.
EAS_NWS_ZONES=AZC025,AZC005

# SAME watch list. 000000 (all US) is REQUIRED to catch EAN and a nationwide NPT.
# 004000 Arizona statewide, 004025 Yavapai, 004005 Coconino.
EAS_SAME_CODES=000000,004000,004025,004005

EAS_TIMEZONE=America/Phoenix
EAS_TZ_LABEL=MST (non-advanced; Arizona does not observe DST)

# Monitoring assignments come from the current approved Arizona State EAS Plan
# (§11.21(b)(4)) and are station-specific. Obtain from the Arizona SECC. Do not
# guess — a wrong assignment is worse than an absent one.
# EAS_PLAN_REF=
ENVEOF
  chmod 0640 "$ENV_DIR/openeas.env"
  chown root:openeas "$ENV_DIR/openeas.env"
else
  log "Keeping existing ${ENV_DIR}/openeas.env"
fi

# ── systemd ─────────────────────────────────────────────────────────────────
log "Installing systemd unit"
cp "$SRC_DIR/openeas-mcp/deploy/openeas.service" /etc/systemd/system/openeas.service

# The unit hardcodes /usr/bin/node. NodeSource installs there, but a nodenv or
# nvm-managed node would not — fail with a clear message rather than letting
# systemd report a confusing exec error.
if [[ ! -x /usr/bin/node ]]; then
  REAL_NODE="$(command -v node || true)"
  [[ -n "$REAL_NODE" ]] || die "node not found on PATH."
  warn "/usr/bin/node missing; pointing the unit at ${REAL_NODE}"
  sed -i "s|/usr/bin/node|${REAL_NODE}|g" /etc/systemd/system/openeas.service
fi

systemctl daemon-reload
systemctl enable openeas -q

# Do NOT let `set -e` abort here. A failed start is exactly when the logs are
# worth printing, and dying on the systemctl exit code skips them entirely.
systemctl restart openeas || true

sleep 3
if ! systemctl is-active --quiet openeas; then
  echo
  warn "Service did not start. Unit status:"
  systemctl status openeas --no-pager -l 2>&1 | sed 's/^/    /' | head -25 || true
  echo
  warn "Recent journal:"
  journalctl -u openeas -n 40 --no-pager 2>&1 | sed 's/^/    /' || true
  echo
  warn "Sanity check — running the same command by hand:"
  ( cd /opt/openeas && /usr/bin/node scripts/no-eas-audio.js 2>&1 | sed 's/^/    /' ) || true
  ( cd /opt/openeas && timeout 5 /usr/bin/node -e 'console.log("    node executes fine outside systemd")' 2>&1 ) || true
  echo
  cat >&2 <<'SDHINTEOF'
If node runs by hand but not under systemd, the cause is a sandboxing directive
in /etc/systemd/system/openeas.service. The usual culprit is
MemoryDenyWriteExecute=true, which is incompatible with V8's JIT and produces
"a fatal signal was delivered causing the control process to dump core".
This unit does not set it; if you added it, remove it.

To bisect, comment out the hardening block, then re-add lines one at a time:
    systemctl edit --full openeas
    systemctl restart openeas
SDHINTEOF
  die "Service failed to start."
fi
log "Service active"

# ── nginx ───────────────────────────────────────────────────────────────────
log "Configuring nginx"
NGX=/etc/nginx/sites-available/openeas
cp "$SRC_DIR/openeas-mcp/deploy/nginx-openeas.conf" "$NGX"

# The shipped config is HTTP-only by design — nginx refuses `listen ... ssl`
# without a certificate, and certbot cannot issue one until nginx is already
# valid and answering the ACME challenge on port 80. certbot adds the TLS server
# block itself, so there is nothing to strip for the IP-only case.
if [[ -n "$DOMAIN" ]]; then
  sed -i "s/SERVER_NAME_HERE/${DOMAIN}/g" "$NGX"
else
  sed -i "s/SERVER_NAME_HERE/_/g" "$NGX"
  # Only site on port 80 (the distro default was removed), so make that explicit
  # for access by bare IP.
  sed -i "s|^\(\s*\)listen 80;|\1listen 80 default_server;|" "$NGX"
  sed -i "s|^\(\s*\)listen \[::\]:80;|\1listen [::]:80 default_server;|" "$NGX"
  echo
  warn "No hostname given — serving plain HTTP on port 80 by IP address."
  warn "Traffic is unencrypted and readable/modifiable in transit. That is"
  warn "acceptable for bring-up; add a hostname and re-run to obtain TLS before"
  warn "publishing this endpoint or listing it in a registry."
fi

ln -sf "$NGX" /etc/nginx/sites-enabled/openeas
rm -f /etc/nginx/sites-enabled/default

if ! nginx -t 2>/tmp/openeas-nginx-test.log; then
  echo
  warn "nginx rejected the config:"
  sed 's/^/    /' /tmp/openeas-nginx-test.log >&2
  echo
  warn "nginx version: $(nginx -v 2>&1)"
  # Leaving a broken symlink in place would break any later `systemctl reload
  # nginx` for unrelated reasons, so disable ours before bailing out.
  rm -f /etc/nginx/sites-enabled/openeas
  warn "Disabled /etc/nginx/sites-enabled/openeas so nginx stays reloadable."
  warn "The openeas service itself is unaffected and is listening on 127.0.0.1:3100."
  die "nginx config test failed."
fi
systemctl reload nginx

# ── firewall ────────────────────────────────────────────────────────────────
log "Configuring firewall"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || warn "ufw enable skipped"

# Port 3100 is deliberately NOT opened. nginx is the only public entry point.

# ── TLS ─────────────────────────────────────────────────────────────────────
if [[ -n "$DOMAIN" ]]; then
  log "Requesting TLS certificate for ${DOMAIN}"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
       -m "chuck@mellowmountainradio.com" --redirect; then
    log "TLS issued"
  else
    warn "certbot failed — is ${DOMAIN} pointed at this droplet's IP yet?"
    warn "Re-run once DNS resolves:  certbot --nginx -d ${DOMAIN}"
  fi
fi

# ── verify ──────────────────────────────────────────────────────────────────
log "Verifying"
curl -fsS --max-time 10 http://127.0.0.1:3100/health | head -c 300; echo

echo
printf '\033[1;32m==> OpenEAS installed.\033[0m\n\n'
if [[ -n "$DOMAIN" ]]; then
  echo "  MCP endpoint : https://${DOMAIN}/mcp"
  echo "  Health       : https://${DOMAIN}/health"
else
  IP=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "<droplet-ip>")
  echo "  MCP endpoint : http://${IP}/mcp"
  echo "  Health       : http://${IP}/health"
fi
cat <<'NEXTEOF'

  Config       : /etc/openeas/openeas.env
  Logs         : journalctl -u openeas -f
  Restart      : systemctl restart openeas
  Upgrade      : re-run this script

  Smoke test:
    curl -s -X POST http://127.0.0.1:3100/mcp \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json, text/event-stream' \
      -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

  Read-only. No origination capability. No air-chain connection.
  Advisory data only — not authoritative, not for life-safety decisions.
NEXTEOF
