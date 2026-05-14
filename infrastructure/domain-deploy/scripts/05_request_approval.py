#!/opt/homebrew/bin/python3
"""Step 5: create a payment-approval request for the domain purchase and email it.

Mirrors what cf.sh does for a payable endpoint, but for a purchase that will be
completed via the Playwright dashboard checkout (the CF API can't register new
domains). Writes approvals/pending/<id>.json and sends the HTML approval email.

Prints the approval id on the last line so the next step can poll for it.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.expanduser("~/.config/cloudflare"))
import cf_common as cf  # noqa: E402

DOMAIN = "customizeyourlingua.com"
COST_USD = 10.46
ENDPOINT = f"POST /accounts/{{id}}/registrar/domains/{DOMAIN} (via Playwright dashboard)"
BODY = json.dumps({
    "domain": DOMAIN,
    "years": 1,
    "method": "playwright_dashboard_checkout",
    "registrant": "NICCOLO' CORSANI, Via Giardino Serristori 1, Firenze FI 50121, IT",
    "card": "saved card on file ending 6402 (exp 7/28)",
}, ensure_ascii=False)


def main():
    cap_eur, usd_to_eur = cf.load_cap()
    spend = cf.compute_month_spend_eur(usd_to_eur)
    mtd = spend["total_eur"]
    cost_eur = round(COST_USD * usd_to_eur, 2)
    projected = round(mtd + cost_eur, 2)
    print(f"cap=€{cap_eur}  month-to-date=€{mtd}  this op=€{cost_eur}  projected=€{projected}",
          flush=True)
    if projected > cap_eur:
        print(f"ABORT: would exceed cap (€{projected} > €{cap_eur})", file=sys.stderr)
        return 1
    if (cf.APPROVALS / "disabled").exists():
        print("ABORT: kill-switch present (approvals disabled)", file=sys.stderr)
        return 1

    approval_id = os.urandom(8).hex()
    for sub in ("pending", "approved", "rejected", "done", "failed", "expired"):
        (cf.APPROVALS / sub).mkdir(parents=True, exist_ok=True)
    pending = cf.APPROVALS / "pending" / f"{approval_id}.json"
    pending.write_text(json.dumps({
        "id": approval_id,
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "action": "api_call",
        "endpoint": ENDPOINT,
        "args": json.loads(BODY),
        "estimated_cost_usd": COST_USD,
        "estimated_cost_eur": cost_eur,
        "monthly_cap_eur": cap_eur,
        "month_to_date_eur": mtd,
    }, ensure_ascii=False))
    print(f"wrote {pending}", flush=True)

    notify = str(cf.CFG_DIR / "notify.py")
    res = subprocess.run([notify, approval_id, ENDPOINT, BODY],
                         capture_output=True, text=True)
    print(res.stdout.strip(), flush=True)
    if res.returncode != 0:
        print(f"notify.py FAILED: {res.stderr.strip()}", file=sys.stderr)
        pending.rename(cf.APPROVALS / "expired" / f"{approval_id}.json")
        return 1

    cf.log_activity({
        "action": "approval_requested", "id": approval_id,
        "endpoint": ENDPOINT, "status": "pending",
    }, source="domain-deploy")
    print(f"APPROVAL_ID={approval_id}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
