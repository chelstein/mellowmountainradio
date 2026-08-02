// Rate limiting for the public MCP endpoint.
//
// This server is reachable by anyone, requires no authentication, and carries
// five write-capable tools. Until now nothing bounded how often a stranger
// could call them.
//
// ── The thing that makes this dangerous to get wrong ───────────────────────
//
// Caddy sits in front of this server. Without `trust proxy`, Express reports
// req.ip as the PROXY's address for every request on earth — so a limiter keyed
// on req.ip would put every visitor in one shared bucket and start returning
// 429 to everybody after the first burst. That is not a protection, it is an
// outage with a security rationale.
//
// So this module never assumes it can identify a client. `clientKey()` returns
// null when it cannot, and a null key means NO LIMIT IS APPLIED — the request
// is allowed and the condition is reported. Failing open on an
// identification failure is deliberate: throttling everyone because we cannot
// tell them apart would do more damage than the abuse it prevents, and the
// degenerate case is loud (see `status()`) rather than silent.
//
// ── Why not express-rate-limit ─────────────────────────────────────────────
//
// Same reason the test lab has no framework: this file is 150 lines, has no
// supply chain, and does exactly one thing. A dependency here would be a
// dependency in the path of every public request.
//
// ── What this does NOT protect against ─────────────────────────────────────
//
// State is in memory in one process. It resets on restart and is not shared if
// the server is ever scaled to more than one instance. It is keyed on IP, so it
// does not stop a distributed caller. It is a brake on casual abuse and
// runaway clients, not a defence against a determined adversary. Anything
// stronger needs authentication, which is a product decision, not a middleware.

/** Requests allowed per window, by class. Windows are in milliseconds. */
export const LIMITS = {
  // Generous. An assistant answering one question may legitimately call six
  // tools in a few seconds, and a page load fans out further.
  read:  { max: 120, windowMs: 60_000,     label: "120 per minute" },
  // Strict. These append to real data files. A human requesting songs will
  // never approach this; a loop will hit it immediately.
  write: { max: 10,  windowMs: 60_000,     label: "10 per minute"  },
  // Second, slower ceiling on writes so a caller cannot simply pace itself
  // just under the per-minute limit all day.
  writeHourly: { max: 60, windowMs: 3_600_000, label: "60 per hour" },
};

// Bounded so the limiter cannot itself become the memory exhaustion it exists
// to prevent. Oldest entries are evicted first.
const MAX_KEYS = 20_000;

const buckets = new Map();   // key -> { hits: number[], class }
let identified = 0, unidentified = 0, blocked = 0;

/**
 * Work out who is calling, or admit that we cannot.
 *
 * Returns null when the request cannot be attributed to a client, which
 * happens when Express has not been told to trust the proxy in front of it.
 * Callers MUST treat null as "do not limit", never as a shared key.
 */
const NOT_A_CLIENT = [
  /^::1$/, /^127\./, /^::ffff:127\./,        // loopback
  /^fe80:/, /^169\.254\./,                   // link-local
  /^10\./,                                   // RFC1918
  /^192\.168\./,                             // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./,              // RFC1918 — includes Docker's 172.17/16
  /^::ffff:(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
  /^f[cd]/i,                                  // IPv6 unique-local
];

export function clientKey(req) {
  const ip = req.ip || req.socket?.remoteAddress || "";
  if (!ip) return null;
  // A private, loopback or link-local address reaching a server that sits
  // behind a reverse proxy means Express is reporting the PROXY, not the
  // client — because `trust proxy` is unset or set to a value that does not
  // cover where the proxy actually connects from. Docker bridges (172.17/16)
  // are the classic version of this and are NOT loopback, so checking only for
  // 127.0.0.1 would miss it and silently collapse every visitor onto one key.
  //
  // Returning null here means the request is not limited. That is the correct
  // failure: throttling the entire internet as a single client would be an
  // outage, and status() makes the condition loudly visible instead.
  if (NOT_A_CLIENT.some(re => re.test(ip))) return null;
  return ip;
}

function sweep(now) {
  const oldest = now - Math.max(LIMITS.read.windowMs, LIMITS.writeHourly.windowMs);
  for (const [k, b] of buckets) {
    b.hits = b.hits.filter(t => t > oldest);
    if (!b.hits.length) buckets.delete(k);
  }
  // Still too many distinct callers: drop the least recently seen.
  if (buckets.size > MAX_KEYS) {
    const byAge = [...buckets.entries()].sort((a, b) =>
      Math.max(...a[1].hits) - Math.max(...b[1].hits));
    for (let i = 0; i < byAge.length - MAX_KEYS; i++) buckets.delete(byAge[i][0]);
  }
}

let lastSweep = 0;

/**
 * Record a hit and report whether it is allowed.
 *
 * @param {string|null} key   from clientKey(); null means unattributable
 * @param {"read"|"write"} kind
 * @param {number} now        injectable for tests
 */
export function check(key, kind, now = Date.now()) {
  if (key === null) {
    unidentified++;
    return { allowed: true, reason: "client not identifiable — not limited" };
  }
  identified++;

  if (now - lastSweep > 60_000) { sweep(now); lastSweep = now; }

  const id = `${kind}:${key}`;
  let b = buckets.get(id);
  if (!b) { b = { hits: [] }; buckets.set(id, b); }

  const rules = kind === "write"
    ? [LIMITS.write, LIMITS.writeHourly]
    : [LIMITS.read];

  for (const rule of rules) {
    const since = now - rule.windowMs;
    const recent = b.hits.filter(t => t > since).length;
    if (recent >= rule.max) {
      blocked++;
      const oldestInWindow = b.hits.filter(t => t > since).sort((a, z) => a - z)[0];
      return {
        allowed: false,
        limit: rule.max,
        window_ms: rule.windowMs,
        retry_after_s: Math.max(1, Math.ceil((oldestInWindow + rule.windowMs - now) / 1000)),
        reason: `${kind} limit of ${rule.label} exceeded`,
      };
    }
  }

  b.hits.push(now);
  return { allowed: true };
}

/**
 * Operational visibility, so a misconfiguration is discoverable rather than
 * silently doing nothing. If `unidentified` climbs while `identified` stays at
 * zero, `trust proxy` is not set correctly and NOTHING is being limited.
 */
export function status() {
  return {
    tracked_keys: buckets.size,
    requests_identified: identified,
    requests_unidentifiable: unidentified,
    requests_blocked: blocked,
    limits: {
      read: LIMITS.read.label,
      write: LIMITS.write.label,
      write_hourly: LIMITS.writeHourly.label,
    },
    healthy: identified > 0 || unidentified === 0,
    warning: (unidentified > 0 && identified === 0)
      ? "Every request so far was unattributable, so no limit is being applied. " +
        "Express is almost certainly reporting the reverse proxy's address. " +
        "Check app.set('trust proxy', ...)."
      : undefined,
    caveats:
      "In-memory and single-process: resets on restart, not shared across " +
      "instances, and keyed on IP so it does not stop a distributed caller. " +
      "A brake on casual abuse and runaway clients, not a defence against a " +
      "determined adversary.",
  };
}

/**
 * Resolve the Express `trust proxy` setting from configuration.
 *
 * A numeric hop count MUST be a Number. Express reads the string "1" as a
 * subnet specification, fails to match it, and leaves req.ip as the proxy —
 * so every request becomes unattributable and nothing is limited, silently.
 * Caught end to end: TRUST_PROXY=1 produced 13 consecutive 200s where 10 were
 * expected, with status() reporting 15 unattributable and 0 identified.
 */
export function trustProxySetting(raw) {
  const v = raw ?? "loopback";
  return /^\d+$/.test(String(v)) ? Number(v) : v;
}

/** Test seam. */
export function _reset() {
  buckets.clear();
  identified = unidentified = blocked = 0;
  lastSweep = 0;
}
