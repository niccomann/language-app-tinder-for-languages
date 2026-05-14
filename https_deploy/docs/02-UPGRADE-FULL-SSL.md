# Follow-up — Upgrade da Flexible a Full SSL

> Last updated: 2026-05-14 18:50

## Perché

Oggi la zona è in modalità **Flexible**: la tratta App↔Cloudflare è cifrata
(HTTPS), ma la tratta **Cloudflare↔EC2 è in HTTP** in chiaro su internet pubblico.
Per un backend che gestisce dati utenti è meglio cifrare anche quella tratta →
modalità **Full** (o **Full (strict)**).

Non è stato fatto ora perché richiede modifiche **sull'istanza EC2** in
esecuzione, e c'era un altro agente al lavoro sul backend: meglio coordinarsi.

## Cosa serve

L'origine (`3.64.236.66`) deve servire HTTPS sulla porta 443 con un certificato
che Cloudflare accetti. La via più semplice è un **Cloudflare Origin Certificate**
(gratuito, valido 15 anni, lo emette Cloudflare stesso).

## Procedura

### 1. Generare l'Origin Certificate (lato Cloudflare, nessun rischio)

Dashboard → `customizeyourlingua.com` → SSL/TLS → **Origin Server** →
*Create Certificate* → hostnames `customizeyourlingua.com, *.customizeyourlingua.com`
→ salvare il certificato (`.pem`) e la chiave privata (`.key`).

### 2. Installare il certificato sull'EC2 (tocca l'istanza — coordinarsi)

Sull'istanza `i-04fb87478e0a30ee0` (SSH key: `~/.ssh/language-app-key-20260507132327.pem`,
user tipicamente `ubuntu` o `ec2-user`):

- Copiare `cert.pem` e `key.key` sull'istanza (es. `/etc/ssl/cloudflare/`)
- Configurare il web server / reverse proxy davanti a FastAPI per ascoltare su
  443 con quel certificato. Dipende da come è servito oggi il backend:
  - se c'è **nginx** davanti → aggiungere un `server` block su 443 con
    `ssl_certificate` / `ssl_certificate_key`
  - se **uvicorn/gunicorn** serve diretto → avviarlo con `--ssl-certfile` /
    `--ssl-keyfile`, oppure (meglio) mettere nginx davanti
- Aprire la porta **443** nel security group `language-app-sg-20260507132327`
  (oggi è aperta solo la 80):
  ```
  aws ec2 authorize-security-group-ingress \
    --group-id sg-032f76424400a35a7 --protocol tcp --port 443 \
    --cidr 0.0.0.0/0 --region eu-central-1
  ```

### 3. Passare la zona a Full

Dashboard → SSL/TLS → Overview → Configure → **Custom → Full** (o Full (strict),
che con l'Origin Certificate funziona perché Cloudflare si fida della propria CA).
A quel punto si può anche **chiudere la porta 80** nel security group.

### 4. Verifica

```bash
curl -sI https://customizeyourlingua.com/health   # deve restare 200
```

## Stato attuale

- [ ] Origin Certificate generato
- [ ] Certificato installato sull'EC2 + porta 443 aperta
- [ ] Zona passata a Full
- [ ] Porta 80 chiusa nel security group
