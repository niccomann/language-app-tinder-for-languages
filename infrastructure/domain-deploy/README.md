# domain-deploy

> Last updated: 2026-05-14 19:10

Registrazione del dominio **`customizeyourlingua.com`** su Cloudflare.

## Esito: ✅ dominio registrato

- Registrato il 2026-05-14, scadenza 2027-05-14, auto-renew attivo, WHOIS privacy attiva
- Registrar: Cloudflare · costo $10.46/anno (≈ €9.62)

## Come è andata (note utili per il futuro)

1. **L'API Cloudflare NON registra domini nuovi.** `POST /accounts/{id}/registrar/domains/{name}`
   risponde `404 Page not found`. L'API permette solo di *controllare* la disponibilità
   (`/registrar/domains/{name}/check`) e gestire domini già posseduti. La registrazione
   di un dominio nuovo si fa **solo dalla dashboard web**.
2. Per questo l'acquisto è stato fatto via dashboard (sessione browser `cloudflare`
   in `~/Desktop/session-playwright-reusable`), mantenendo però il gate di
   approvazione: `05_request_approval.py` crea la richiesta e invia la mail HTML;
   l'acquisto procede solo dopo l'approvazione.
3. La spesa è registrata nel sistema di cap mensile (`~/.config/cloudflare/approvals/done/`).

## File

| File | Cosa fa |
|------|---------|
| `scripts/05_request_approval.py` | Crea una richiesta di approvazione pagamento + invia la mail HTML, usando il sistema gate in `~/.config/cloudflare` (`cf_common`). Riutilizzabile per pagamenti futuri: cambiare `DOMAIN`/`COST_USD`/`ENDPOINT` in cima al file. |

Gli script di esplorazione della dashboard (ispezione UI di checkout/pagamento)
usati una tantum durante l'acquisto sono stati rimossi: erano usa-e-getta e il
dominio è ormai registrato.

## Collegato

Dopo la registrazione, il dominio è stato collegato al backend con HTTPS — vedi
`../../https_deploy/`.
