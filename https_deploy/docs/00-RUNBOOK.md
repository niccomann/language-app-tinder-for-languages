# HTTPS Deploy — Runbook

> Last updated: 2026-05-14 18:55

Obiettivo: servire il backend di **Tinder for Languages** via HTTPS su un dominio
proprio, per l'app Android.

## Situazione di partenza (ricognizione 2026-05-14)

| Cosa | Stato |
|------|-------|
| Backend | **Già deployato e attivo** su AWS EC2 |
| Istanza EC2 | `i-04fb87478e0a30ee0` — `language-app-prod`, `t4g.small`, eu-central-1c |
| IP pubblico | `3.64.236.66` |
| Porta 80 (HTTP) | ✅ risponde — FastAPI (`/`, `/health`, `/docs`, `/openapi.json` → 200) |
| Porta 443 (HTTPS) | ❌ niente |
| Dominio | `customizeyourlingua.com` registrato su Cloudflare (14 mag 2026) |
| Zona Cloudflare | ✅ già attiva — `fd17b924f5ddb15b3d28b097bb77e970` |
| SSH key istanza | `~/.ssh/language-app-key-20260507132327.pem` (presente, non serve per questo task) |

**Conclusione:** non serve provisionare nulla. Manca solo collegare il dominio
all'IP e attivare l'HTTPS. Il lavoro è interamente lato Cloudflare → **zero
modifiche all'EC2**, nessun rischio di interferenza con l'altro agente che lavora
sul codice dell'app.

## Strategia HTTPS

Cloudflare come reverse proxy TLS davanti all'origine:

```
  App Android ──HTTPS──▶ Cloudflare ──HTTP──▶ EC2 3.64.236.66:80
                         (termina TLS,
                          cert gratuito)
```

- Record DNS `A` per `@` e `www` → `3.64.236.66`, **proxied** (nuvola arancione)
- SSL mode **Flexible**: visitatore↔Cloudflare in HTTPS, Cloudflare↔origine in HTTP
  (l'origine oggi serve solo HTTP:80; nessun certificato da installare sull'EC2)
- "Always Use HTTPS" attivo → redirect automatico da http a https

### Perché Flexible e non Full

`Full`/`Full (strict)` cifrano anche la tratta Cloudflare↔origine, ma richiedono
un certificato sull'EC2 (porta 443 + nginx/uvicorn TLS) → modifica all'istanza in
esecuzione. Per non toccare il deploy dell'altro agente partiamo **Flexible** (HTTPS
funzionante subito, rischio zero) e l'upgrade a `Full` è documentato come step
successivo opzionale in `02-UPGRADE-FULL-SSL.md`.

## Passi

1. `scripts/setup_https_dns.sh` — crea i record A proxied + imposta SSL Flexible +
   Always Use HTTPS (via API Cloudflare, idempotente)
2. Attendere il provisioning dello Universal SSL di Cloudflare (di solito 1-15 min)
3. Verifica: `https://customizeyourlingua.com/health` → 200
4. Esito registrato in `01-RESULT.md`

## Rollback

Tutto reversibile lato Cloudflare: eliminare i record DNS della zona e rimettere
SSL su `Off`. L'EC2 non viene toccato, quindi non c'è nulla da annullare lì.
