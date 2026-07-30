#!/usr/bin/env python3
"""
KAZM EAS Decision Engine — Mac Studio, SHADOW MODE.

Polls OpenEAS, computes what a software EAS system WOULD do with every alert
reaching this station, records that decision with its reasoning and rule
citation, and touches nothing else.

═══════════════════════════════════════════════════════════════════════════════
WHY SHADOW MODE, AND WHY IT IS NOT A LIMITATION
═══════════════════════════════════════════════════════════════════════════════

The goal is a station that needs no EAS box. The obstacle is not engineering —
it is that 47 CFR §11.34 requires EAS encoders and decoders to be certified
under Part 2, Subpart J, and no certification path exists for software today.
FCC 26-38 proposes to create one. Digital Alert Systems opposed it, arguing no
framework and no cybersecurity standard exists for EAS software.

The way that argument loses is evidence.

This engine produces it. Every alert, it records the decision a software system
would have made, with the rule it derives from. The certified ENDEC keeps doing
its job in parallel. Comparing the two over months yields something no filing has
ever carried: a hash-chained record showing software decisions matching a
certified device's decisions, alert for alert, across real national traffic.

That record is the certification case. It is also, incidentally, the strongest
possible answer to "software cannot be trusted with this."

So: run this now, alongside the box. When the rule changes, the evidence is
already years deep and the switch is a configuration change rather than a leap
of faith.

═══════════════════════════════════════════════════════════════════════════════
WHAT THIS FILE DELIBERATELY CANNOT DO
═══════════════════════════════════════════════════════════════════════════════

  * It cannot generate the SAME AFSK burst (§11.31(a)(1)) or the Attention
    Signal (§11.31(a)(2)). No tone synthesis exists here and none may be added.
    §11.45(a) reaches recordings and simulations, so the prohibition binds test
    code as surely as production code.
  * It cannot touch MegaSeg, the audio chain, or any output device. It writes
    decision records and notifies a human. Nothing else.
  * It is not a decoder. It does not monitor LP-1/LP-2 and cannot replace
    §11.52 monitoring.
  * It is therefore NOT "EAS Software" under proposed §11.2(e), and running it
    creates no equipment-authorisation obligation.

The certified ENDEC remains authoritative for every forwarding decision, as
§11.51(m)(1) provides. Everything here is labelled derived.

═══════════════════════════════════════════════════════════════════════════════
SETUP
═══════════════════════════════════════════════════════════════════════════════

  mkdir -p /Users/Shared/kazm
  cp eas-decision-engine.py /Users/Shared/kazm/
  chmod +x /Users/Shared/kazm/eas-decision-engine.py
  cp com.kazm.eas.plist ~/Library/LaunchAgents/
  launchctl load ~/Library/LaunchAgents/com.kazm.eas.plist

  Test:  python3 /Users/Shared/kazm/eas-decision-engine.py --once --verbose

Decisions land in ~/Desktop/KAZM EAS Decisions.txt (human-readable) and
/Users/Shared/kazm/eas-decisions.jsonl (hash-chained, machine-verifiable).
"""

import argparse
import datetime
import hashlib
import json
import os
import subprocess
import sys
import urllib.request

# ── configuration ────────────────────────────────────────────────────────────

OPENEAS = os.environ.get("KAZM_OPENEAS_URL", "http://161.35.225.111")

STATION = {
    "callsign": os.environ.get("KAZM_CALLSIGN", "KAZM"),
    "state_fips": os.environ.get("KAZM_STATE_FIPS", "04"),
    "county_fips": os.environ.get("KAZM_COUNTY_FIPS", "025"),
    # 000000 (all US) is REQUIRED to receive EAN and a nationwide NPT.
    "same_codes": os.environ.get("KAZM_SAME_CODES", "000000,004000,004025,004005").split(","),
}

STATE_DIR = os.environ.get("KAZM_STATE_DIR", "/Users/Shared/kazm")
LEDGER = os.path.join(STATE_DIR, "eas-decisions.jsonl")
HUMAN_LOG = os.path.expanduser("~/Desktop/KAZM EAS Decisions.txt")

# §11.51(m): the only codes carrying a transmission obligation.
MANDATORY = {"EAN", "NPT", "RMT"}
# §11.51(n): delay may never be applied to these.
IMMEDIATE = {"EAN", "NPT"}

GENESIS = "0" * 64


# ── hash chain ───────────────────────────────────────────────────────────────
# Deliberately identical to openeas-mcp/lib/store.js, so one verifier checks
# both ledgers and neither depends on the other's code.

def stable(v):
    if v is None or not isinstance(v, (dict, list)):
        return json.dumps(v)
    if isinstance(v, list):
        return "[" + ",".join(stable(x) for x in v) + "]"
    return "{" + ",".join(json.dumps(k) + ":" + stable(v[k]) for k in sorted(v)) + "}"


def canonical(rec):
    return json.dumps([
        rec["seq"], rec["recorded_at"], rec["prev_hash"], rec["kind"], rec["key"],
        stable(rec["payload"]), 1 if rec["legal_hold"] else 0,
        rec.get("corrects_seq"), rec.get("operator"),
    ], separators=(",", ":"))


def read_tip():
    """Last sequence and hash. Returns (seq, hash, seen_keys)."""
    seq, prev, seen = 0, GENESIS, set()
    if not os.path.exists(LEDGER):
        return seq, prev, seen
    with open(LEDGER) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except ValueError:
                continue
            seq, prev = r["seq"], r["hash"]
            if r.get("key"):
                seen.add(r["key"])
    return seq, prev, seen


def append(kind, key, payload, legal_hold=True):
    """Append-only. There is no update and no delete — see §73.1800(d)."""
    os.makedirs(STATE_DIR, exist_ok=True)
    seq, prev, _ = read_tip()
    rec = {
        "seq": seq + 1,
        "recorded_at": datetime.datetime.now(datetime.timezone.utc)
                        .strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "prev_hash": prev,
        "kind": kind,
        "key": key,
        "payload": payload,
        "legal_hold": legal_hold,
        "corrects_seq": None,
        "operator": None,
    }
    rec["hash"] = hashlib.sha256(canonical(rec).encode()).hexdigest()
    with open(LEDGER, "a") as f:
        f.write(json.dumps(rec) + "\n")
    return rec


def verify():
    """Walk the chain. Same guarantees as the server-side archive."""
    prev, expected, problems, n = GENESIS, 1, [], 0
    if not os.path.exists(LEDGER):
        return {"verified": True, "records": 0, "problems": []}
    with open(LEDGER) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            n += 1
            if r["seq"] != expected:
                problems.append(f"seq {r['seq']}: expected {expected} — records missing or reordered")
                expected = r["seq"]
            if r["prev_hash"] != prev:
                problems.append(f"seq {r['seq']}: broken link — a prior record was altered or removed")
            if hashlib.sha256(canonical(r).encode()).hexdigest() != r["hash"]:
                problems.append(f"seq {r['seq']}: content altered after it was written")
            prev = r["hash"]
            expected += 1
    return {"verified": not problems, "records": n, "problems": problems, "tip": prev}


# ── OpenEAS ──────────────────────────────────────────────────────────────────

def mcp_call(tool, args=None):
    body = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "tools/call",
        "params": {"name": tool, "arguments": args or {}},
    }).encode()
    req = urllib.request.Request(
        OPENEAS + "/mcp", data=body, method="POST",
        headers={"Content-Type": "application/json",
                 "Accept": "application/json, text/event-stream"})
    raw = urllib.request.urlopen(req, timeout=30).read().decode()
    for line in raw.split("\n"):
        s = line[5:].strip() if line.startswith("data:") else line.strip()
        if not s or s.startswith("event:"):
            continue
        try:
            d = json.loads(s)
        except ValueError:
            continue
        if "error" in d:
            raise RuntimeError(d["error"].get("message", "rpc error"))
        content = d.get("result", {}).get("content", [])
        if content and content[0].get("text"):
            return json.loads(content[0]["text"])
    raise RuntimeError("no result in OpenEAS response")


# ── the decision ─────────────────────────────────────────────────────────────

def covers_station(geocodes):
    """Does any SAME geocode reach this station?"""
    for g in geocodes or []:
        g = str(g)
        if g == "000000":                     # all US territory
            return True, g
        if len(g) != 6:
            continue
        ss, ccc = g[1:3], g[3:6]
        if ss != STATION["state_fips"]:
            continue
        if ccc == "000" or ccc == STATION["county_fips"]:
            return True, g
    return False, None


def decide(alert):
    """
    What a software EAS system would do — and precisely why.

    This is the record that becomes certification evidence, so the reasoning
    matters as much as the verdict. Every branch names the rule it derives from.
    """
    same = alert.get("same") or {}
    cap = alert.get("cap") or {}
    area = alert.get("area") or {}
    code = same.get("event_code")
    geocodes = area.get("same_geocodes") or []
    covered, via = covers_station(geocodes)

    blocked = alert.get("blocked_channels") or []
    if "EAS" in blocked:
        return {
            "action": "no_action",
            "reason": "BLOCKCHANNEL includes EAS — the originator suppressed this "
                      "alert from the Emergency Alert System.",
            "rule": "FEMA IPAWS BLOCKCHANNEL parameter",
            "mandatory": False,
        }

    if cap.get("status") and cap["status"] != "Actual":
        return {
            "action": "no_action",
            "reason": f'status="{cap["status"]}" is not "Actual"; ECIG §3.9 provides '
                      f"that such a message must not be broadcast.",
            "rule": "ECIG Implementation Guide §3.9, incorporated at §11.56(a)(2)",
            "mandatory": False,
        }

    if not covered:
        return {
            "action": "no_action",
            "reason": f"Location codes {geocodes} do not include this station's state "
                      f"({STATION['state_fips']}) or county ({STATION['county_fips']}).",
            "rule": "47 CFR §11.51(m)",
            "mandatory": False,
        }

    if code in MANDATORY:
        immediate = code in IMMEDIATE
        return {
            "action": "would_transmit",
            "reason": f"Event {code} with location code {via} covering this station. "
                      + ("Must be transmitted immediately; §11.51(n) forbids applying "
                         "the delay feature." if immediate else
                         "Must be transmitted within 60 minutes."),
            "rule": "47 CFR §11.51(m)(2)" + (", §11.51(n)" if immediate else ""),
            "mandatory": True,
            "immediate": immediate,
            "max_delay_minutes": 0 if immediate else 60,
        }

    return {
        "action": "would_defer_to_management",
        "reason": f"Event {code} is a state or local code, marked optional by §11.31(e). "
                  f"Whether it interrupts programming is determined by station "
                  f"management, not by software.",
        "rule": "47 CFR §11.52(d)(4), §11.31(e)",
        "mandatory": False,
    }


def notify(title, message):
    """Operator awareness. The human stays in the loop — that is the design."""
    try:
        subprocess.run(["osascript", "-e",
                        f'display notification "{message[:200]}" with title "{title}" '
                        f'sound name "Sosumi"'], timeout=10)
    except Exception:
        pass


# ── run ──────────────────────────────────────────────────────────────────────

def run_once(verbose=False, speak=False):
    try:
        data = mcp_call("eas_get_active_alerts", {})
    except Exception as e:
        append("poll", None, {"source": "openeas", "ok": False, "error": str(e)}, legal_hold=False)
        if verbose:
            print(f"[eas] poll failed: {e}", file=sys.stderr)
        return 1

    alerts = data.get("alerts") or []
    _, _, seen = read_tip()
    new = 0

    for a in alerts:
        key = (a.get("identity") or {}).get("key") or a.get("id")
        if not key or key in seen:
            continue

        d = decide(a)
        same = a.get("same") or {}
        cap = a.get("cap") or {}
        places = ", ".join((a.get("area") or {}).get("place_names") or []) or \
                 ", ".join((a.get("area") or {}).get("descriptions") or []) or "unknown area"

        append("decision", key, {
            "mode": "SHADOW",
            "alert": {
                "event_code": same.get("event_code"),
                "event": cap.get("event"),
                "severity": cap.get("severity"),
                "sender": cap.get("sender"),
                "sent": cap.get("sent"),
                "expires": cap.get("expires"),
                "same_geocodes": (a.get("area") or {}).get("same_geocodes"),
                "places": places,
            },
            "decision": d,
            "authority_note":
                "DERIVED and ADVISORY. Under §11.51(m)(1) the certified decoder "
                "performs the functions that determine which messages are "
                "transmitted. This record states what a software system would "
                "have decided; it did not act.",
        })
        new += 1
        seen.add(key)

        line = (f"{datetime.datetime.now():%Y-%m-%d %H:%M}  "
                f"[{d['action'].upper()}] {same.get('event_code') or '---'} "
                f"{cap.get('event') or ''} — {places}\n"
                f"    {d['reason']}\n"
                f"    ({d['rule']})\n")
        try:
            with open(HUMAN_LOG, "a") as f:
                f.write(line)
        except Exception:
            pass

        if verbose:
            print(line)

        if d["mandatory"]:
            notify(f"⚠️ KAZM EAS — {same.get('event_code')}",
                   f"{cap.get('event')} — {places}. Software would transmit. "
                   f"Verify the ENDEC acted.")
            if speak:
                try:
                    subprocess.run(["say", "-v", "Samantha",
                                    f"Emergency alert. {cap.get('event')}. "
                                    f"Check the E A S unit."], timeout=20)
                except Exception:
                    pass

    append("poll", None, {"source": "openeas", "ok": True,
                          "observed": len(alerts), "new_decisions": new}, legal_hold=False)
    if verbose:
        print(f"[eas] {len(alerts)} alert(s) observed, {new} new decision(s) recorded")
    return 0


def main():
    ap = argparse.ArgumentParser(description="KAZM EAS decision engine (shadow mode)")
    ap.add_argument("--once", action="store_true", help="single pass (launchd default)")
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--speak", action="store_true", help="speak mandatory alerts aloud")
    ap.add_argument("--verify", action="store_true", help="verify the decision ledger")
    ap.add_argument("--report", action="store_true", help="equivalence report for certification")
    args = ap.parse_args()

    if args.verify:
        v = verify()
        print(json.dumps(v, indent=2))
        return 0 if v["verified"] else 1

    if args.report:
        return report()

    return run_once(verbose=args.verbose, speak=args.speak)


def report():
    """
    The certification exhibit.

    Summarises what the software decided over the ledger's whole life. Pair this
    with the ENDEC's own log for the same period: every mandatory decision here
    should correspond to an ENDEC forward, and every ENDEC forward to a decision
    here. Divergence in either direction is the finding.
    """
    if not os.path.exists(LEDGER):
        print("No decisions recorded yet.")
        return 0

    decisions, polls, failed_polls = [], 0, 0
    with open(LEDGER) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if r["kind"] == "decision":
                decisions.append(r)
            elif r["kind"] == "poll":
                polls += 1
                if not r["payload"].get("ok"):
                    failed_polls += 1

    by_action, by_code = {}, {}
    for r in decisions:
        a = r["payload"]["decision"]["action"]
        by_action[a] = by_action.get(a, 0) + 1
        c = r["payload"]["alert"].get("event_code") or "---"
        by_code[c] = by_code.get(c, 0) + 1

    v = verify()
    span = (decisions[0]["recorded_at"], decisions[-1]["recorded_at"]) if decisions else (None, None)

    print(json.dumps({
        "station": STATION["callsign"],
        "mode": "SHADOW — recorded decisions only, no air-chain action",
        "ledger": LEDGER,
        "period": {"first": span[0], "last": span[1]},
        "decisions": len(decisions),
        "by_action": by_action,
        "by_event_code": by_code,
        "polls": polls,
        "failed_polls": failed_polls,
        "chain": {"verified": v["verified"], "records": v["records"], "problems": v["problems"]},
        "how_to_use":
            "Pair with the ENDEC log for the same period. Every would_transmit here "
            "should correspond to an ENDEC forward, and every ENDEC forward to a "
            "decision here. Divergence in either direction is the finding, and "
            "sustained agreement is the certification argument.",
        "coverage_caveat":
            "Completeness is bounded by poll coverage, not by uptime. Failed polls "
            "are counted above; a gap wider than the ~30-minute IPAWS window can hide "
            "an entire alert.",
        "authority":
            "All decisions are DERIVED and ADVISORY. §11.51(m)(1) makes the certified "
            "decoder authoritative. This engine has no air-chain connection and no "
            "tone-generation capability.",
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
