# https_deploy

> Last updated: 2026-05-14 18:55

Setup HTTPS per il backend di **Tinder for Languages** su dominio proprio.

**Esito:** ✅ `https://customizeyourlingua.com` attivo e funzionante — vedi
`docs/01-RESULT.md`.

## Struttura

| Percorso | Contenuto |
|----------|-----------|
| `docs/00-RUNBOOK.md` | Ricognizione iniziale + piano |
| `docs/01-RESULT.md` | **Cosa è stato fatto, passo per passo, + verifiche** |
| `docs/02-UPGRADE-FULL-SSL.md` | Follow-up: passare da Flexible a Full SSL |
| `scripts/add_dns_records.py` | Crea i record A `@` e `www` → EC2 (proxied) |
| `scripts/set_ssl_flexible.py` | Imposta SSL/TLS mode → Flexible |
| `scripts/enable_always_https.py` | Attiva Always Use HTTPS (redirect 301) |
| `scripts/setup_https_dns.sh` | Alternativa via API (richiede token con permessi DNS) |

## In breve

Il backend era **già deployato** su AWS EC2 (`3.64.236.66:80`, HTTP). Mancava solo
l'HTTPS. Risolto interamente lato Cloudflare — DNS proxied + SSL Flexible + redirect
HTTPS — **senza toccare l'EC2**.

Gli script Playwright usano la sessione `cloudflare` salvata in
`~/Desktop/session-playwright-reusable` (CDP :9222). Prerequisito:
`./launch.sh cloudflare`.
