#!/usr/bin/env bash
# Point customizeyourlingua.com at the existing EC2 backend and turn on HTTPS,
# entirely on the Cloudflare side. Idempotent: safe to re-run.
#
# Does NOT touch the EC2 instance.
#
# Requires: ~/.config/cloudflare/token  (Cloudflare API token with Zone:DNS edit
# and Zone Settings edit on the customizeyourlingua.com zone).

set -euo pipefail

ZONE_NAME="customizeyourlingua.com"
ORIGIN_IP="3.64.236.66"          # EC2 i-04fb87478e0a30ee0 (language-app-prod)
TOKEN="$(cat "$HOME/.config/cloudflare/token")"
API="https://api.cloudflare.com/client/v4"

cf() {  # cf <METHOD> <PATH> [JSON_BODY]
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      --data "$body"
  else
    curl -sS -X "$method" "$API$path" -H "Authorization: Bearer $TOKEN"
  fi
}

jget() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

echo "==> resolving zone id for $ZONE_NAME"
ZONE_ID="$(cf GET "/zones?name=$ZONE_NAME" | jget "['result'][0]['id']")"
echo "    zone_id=$ZONE_ID"

# --- A records for @ and www, proxied -------------------------------------
upsert_a_record() {
  local name="$1"
  echo "==> A record: $name -> $ORIGIN_IP (proxied)"
  local existing
  existing="$(cf GET "/zones/$ZONE_ID/dns_records?type=A&name=$name" \
    | python3 -c "import sys,json; r=json.load(sys.stdin)['result']; print(r[0]['id'] if r else '')")"
  local payload
  payload="$(python3 -c "import json; print(json.dumps({'type':'A','name':'$name','content':'$ORIGIN_IP','proxied':True,'ttl':1}))")"
  if [[ -n "$existing" ]]; then
    cf PUT "/zones/$ZONE_ID/dns_records/$existing" "$payload" \
      | jget "['success']" | sed 's/^/    updated: /'
  else
    cf POST "/zones/$ZONE_ID/dns_records" "$payload" \
      | jget "['success']" | sed 's/^/    created: /'
  fi
}
upsert_a_record "$ZONE_NAME"
upsert_a_record "www.$ZONE_NAME"

# --- SSL mode = flexible --------------------------------------------------
echo "==> SSL mode -> flexible"
cf PATCH "/zones/$ZONE_ID/settings/ssl" '{"value":"flexible"}' \
  | jget "['result']['value']" | sed 's/^/    ssl=/'

# --- Always Use HTTPS = on ------------------------------------------------
echo "==> Always Use HTTPS -> on"
cf PATCH "/zones/$ZONE_ID/settings/always_use_https" '{"value":"on"}' \
  | jget "['result']['value']" | sed 's/^/    always_use_https=/'

# --- show resulting records ----------------------------------------------
echo "==> current DNS records"
cf GET "/zones/$ZONE_ID/dns_records" | python3 -c "
import sys,json
for r in json.load(sys.stdin)['result']:
    print(f\"    {r['type']:5} {r['name']:35} -> {r['content']:18} proxied={r.get('proxied')}\")
"
echo "done."
