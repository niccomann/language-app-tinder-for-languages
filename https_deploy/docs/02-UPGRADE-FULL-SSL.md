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

## ✅ FATTO (2026-05-14 22:25)

Eseguito, ma con un approccio diverso da quello sopra — più sicuro per il
resto del sistema:

- **No Origin Certificate** — la Cloudflare Origin CA API ha risposto `1016
  User is not authorized` col token disponibile. Usato invece un **cert
  self-signed** (valido 10 anni) — la modalità **Full** (non "Full strict")
  lo accetta. La tratta Cloudflare↔origine è comunque **cifrata**; "Full
  strict" aggiungerebbe solo l'autenticazione dell'origine.
- **No modifiche a `language-frontend` né a `deploy_to_ec2.sh`** — invece di
  toccare l'nginx del frontend, è stato aggiunto un **container dedicato
  `https-proxy`** (`nginx:alpine`) che termina il TLS su :443 e fa da reverse
  proxy a `language-frontend:80`. Config in `https_deploy/https-proxy.conf`,
  cert+key in `/home/ec2-user/https-proxy/ssl/` sull'EC2. Usa il `resolver`
  Docker per non cachare l'IP del frontend.
- **Porta 443 aperta** nel SG `sg-032f76424400a35a7` (`0.0.0.0/0`, come la 80).
- **Zona Cloudflare → Full** via `scripts/set_ssl_full.py` (dashboard Playwright).
- **Verificato**: `https://customizeyourlingua.com` → 200, `/api/*` → 200,
  E2E 13/13. La tratta App↔Cloudflare↔EC2 è ora cifrata end-to-end.

### Ricreare il container https-proxy (se serve)
```bash
# self-signed cert (CN=customizeyourlingua.com, SAN wildcard), 10 anni:
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout origin.key -out origin.pem -subj "/CN=customizeyourlingua.com" \
  -addext "subjectAltName=DNS:customizeyourlingua.com,DNS:*.customizeyourlingua.com"
# sull'EC2: cert+key in /home/ec2-user/https-proxy/ssl/, conf montata, poi:
docker run -d --name https-proxy --network language-app --restart unless-stopped \
  -p 443:443 \
  -v /home/ec2-user/https-proxy/ssl:/etc/nginx/ssl:ro \
  -v /home/ec2-user/https-proxy/https-proxy.conf:/etc/nginx/conf.d/https-proxy.conf:ro \
  nginx:alpine
```

### Ripristino a Flexible (se serve)
`scripts/set_ssl_flexible.py` (dashboard Playwright) — l'EC2 continua a servire
anche la :80, quindi Flexible torna a funzionare subito.

### Stato checklist
- [x] "Origin certificate" — self-signed (Origin CA API non autorizzata)
- [x] Certificato installato sull'EC2 (`https-proxy` container) + porta 443 aperta
- [x] Zona passata a Full
- [ ] Porta 80 chiusa nel SG — lasciata aperta di proposito (verificare prima
  che Cloudflare non la usi mai)
- [ ] (Opzionale futuro) Origin Certificate vero + Full (strict) — se si ottiene
  un token con permessi Origin CA, o via dashboard
