# YouTube API Setup Guide

## Come ottenere la YouTube Data API v3 Key

### 1. Vai alla Google Cloud Console
https://console.cloud.google.com/

### 2. Crea un nuovo progetto (o seleziona uno esistente)
- Click su "Select a project" in alto
- Click su "NEW PROJECT"
- Nome: "Tinder for Languages" (o quello che preferisci)
- Click "CREATE"

### 3. Abilita YouTube Data API v3
- Nel menu laterale, vai su "APIs & Services" > "Library"
- Cerca "YouTube Data API v3"
- Click su "YouTube Data API v3"
- Click "ENABLE"

### 4. Crea le credenziali
- Nel menu laterale, vai su "APIs & Services" > "Credentials"
- Click "CREATE CREDENTIALS" > "API key"
- Copia la API key generata

### 5. (Opzionale ma consigliato) Restrizioni API Key
- Click sull'API key appena creata
- Sotto "API restrictions":
  - Seleziona "Restrict key"
  - Seleziona solo "YouTube Data API v3"
- Sotto "Application restrictions":
  - Seleziona "IP addresses" (per sviluppo locale)
  - Aggiungi `127.0.0.1` e `localhost`
- Click "SAVE"

### 6. Configura nel progetto
Aggiungi la key al file `.env`:

```bash
cd backend
nano .env  # o usa il tuo editor preferito
```

Aggiungi la riga:
```
YOUTUBE_API_KEY=la_tua_api_key_qui
```

### 7. Installa dipendenze
```bash
cd backend
source .venv/bin/activate
pip install httpx==0.27.0
```

### 8. Riavvia il backend
```bash
python3 -m app.main
```

## Limiti Gratuiti

- **10,000 unità al giorno** (quota gratuita)
- **1 ricerca video = 100 unità**
- **Quindi: ~100 ricerche al giorno gratis**

## Caching per Ridurre Chiamate

Per ottimizzare l'uso della quota:
- I risultati potrebbero essere cachati nel database
- Ogni parola tedesca avrà un video associato
- La ricerca viene fatta solo la prima volta

## Test

Una volta configurata, testa l'endpoint:

```bash
curl -X POST http://localhost:8000/videos/search \
  -H "Content-Type: application/json" \
  -d '{"word": "Hund", "translation": "dog", "language": "de"}'
```

Dovresti ricevere:
```json
{
  "video_id": "...",
  "title": "...",
  "thumbnail": "...",
  "duration": 45,
  "channel": "...",
  "embed_url": "https://www.youtube.com/embed/..."
}
```

## Troubleshooting

**Errore 403 - Forbidden**:
- Verifica che YouTube Data API v3 sia abilitata
- Controlla le restrizioni dell'API key

**Errore 400 - Bad Request**:
- Verifica che l'API key sia corretta
- Controlla i log del backend per dettagli

**Nessun video trovato (404)**:
- Normale per alcune parole rare
- Il sistema prova query multiple
- Considera di aggiungere video manualmente per parole comuni

## Link Utili

- [Google Cloud Console](https://console.cloud.google.com/)
- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
