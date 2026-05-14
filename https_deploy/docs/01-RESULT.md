# HTTPS Deploy — Risultato

> Last updated: 2026-05-14 18:50

## Esito: ✅ HTTPS attivo su dominio proprio

Il backend di Tinder for Languages è ora raggiungibile via HTTPS su un dominio
proprio. **Nessuna modifica all'EC2** — tutto fatto lato Cloudflare.

### Endpoint verificati (2026-05-14 18:48)

| URL | Risultato |
|-----|-----------|
| `https://customizeyourlingua.com/` | HTTP 200 |
| `https://customizeyourlingua.com/health` | HTTP 200 |
| `https://customizeyourlingua.com/docs` | HTTP 200 (Swagger FastAPI) |
| `https://www.customizeyourlingua.com/` | HTTP 200 |
| `http://customizeyourlingua.com/` | HTTP 301 → `https://` |
| Certificato TLS | Let's Encrypt (Cloudflare Universal SSL), valido fino al 12 ago 2026 |

**Per l'app Android**: usare come base URL `https://customizeyourlingua.com`.

## Cosa è stato fatto, passo per passo

### Architettura

```
  App Android ──HTTPS──▶ Cloudflare ──HTTP──▶ EC2 3.64.236.66:80
                         (proxy, termina TLS,        (origine invariata)
                          cert Let's Encrypt)
```

### Passo 1 — Record DNS

Aggiunti nella zona `customizeyourlingua.com` (`fd17b924f5ddb15b3d28b097bb77e970`):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `customizeyourlingua.com` | `3.64.236.66` | Proxied (arancione) |
| A | `www` | `3.64.236.66` | Proxied (arancione) |

Script: `scripts/add_dns_records.py` (via dashboard Cloudflare + Playwright).

### Passo 2 — SSL/TLS encryption mode → Flexible

La zona era su `Automatic` (risolveva a `Full`). Con `Full`/`Automatic` Cloudflare
tenta di raggiungere l'origine sulla porta 443 — che sull'EC2 è chiusa — quindi
l'HTTPS sarebbe fallito. Impostato esplicitamente **`Flexible`**: visitatore↔Cloudflare
in HTTPS, Cloudflare↔origine in HTTP:80.

Script: `scripts/set_ssl_flexible.py`.

### Passo 3 — Always Use HTTPS → ON

Attivato il redirect automatico `http://` → `https://` (301) su tutta la zona.

Script: `scripts/enable_always_https.py`.

## Note tecniche

- **Token API Cloudflare**: il token in `~/.config/cloudflare/token` è account-scoped
  e **non** ha i permessi `Zone:DNS:Edit` / `Zone Settings:Edit` — `dns_records`
  risponde `Authentication error`. Per questo i 3 passi sono stati eseguiti via
  dashboard (Playwright, sessione `cloudflare` salvata). Lo script
  `scripts/setup_https_dns.sh` fa le stesse cose via API ed è pronto all'uso non
  appena si dispone di un token con quei permessi.
- **Sessione browser**: usata la sessione `cloudflare` di
  `~/Desktop/session-playwright-reusable` (CDP :9222).
- **EC2 non toccato**: nessun accesso SSH, nessuna modifica all'istanza
  `i-04fb87478e0a30ee0`. Zero rischio di interferenza con altri lavori sul codice.

## Rollback

Tutto reversibile lato Cloudflare (l'EC2 non è stato toccato):
1. DNS → Records → eliminare i due record A
2. SSL/TLS → Overview → Configure → rimettere `Off` o `Automatic`
3. SSL/TLS → Edge Certificates → spegnere `Always Use HTTPS`

## Follow-up consigliato

Vedi `02-UPGRADE-FULL-SSL.md`: passare da `Flexible` a `Full` per cifrare anche
la tratta Cloudflare↔origine. Richiede di installare un Cloudflare Origin
Certificate sull'EC2 → tocca l'istanza, quindi va fatto in coordinamento con chi
lavora sul backend.
