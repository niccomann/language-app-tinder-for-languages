# Database Information

## 1. PostgreSQL (Main Database)

Database principale per flashcards, progress, grammar.

| Campo | Valore |
|-------|--------|
| **Host** | `localhost` |
| **Port** | `5433` |
| **Database** | `tinder_languages_db` |
| **User** | `tinder_user` |
| **Password** | `tinder_password` |
| **Schema** | `public` |

### Connessione

```bash
# CLI
psql -h localhost -p 5433 -U tinder_user -d tinder_languages_db

# Connection string
postgresql://tinder_user:tinder_password@localhost:5433/tinder_languages_db
```

### Docker

```bash
# Start
docker-compose up -d

# Check status
docker ps | grep postgres
```

### Tabelle principali
- `flashcard` - Parole e traduzioni
- `user_progress` - Progresso utente per parola
- `user_word_statistics` - Statistiche confidence
- `grammar_sentence` - Frasi per grammar lab
- `audio_cache` - Cache TTS audio

---

## 2. SQLite - Tracking Database

Database separato per tracciare le interazioni utente (per infografiche).

| Campo | Valore |
|-------|--------|
| **File** | `backend/tracking.db` |
| **Engine** | SQLite 3 |

### Connessione

```bash
# CLI
sqlite3 backend/tracking.db

# Comandi utili
.tables          # Lista tabelle
.schema          # Schema completo
.mode column     # Output formattato
.headers on      # Mostra headers
```

### GUI Tools
- **DB Browser for SQLite**: `brew install --cask db-browser-for-sqlite`
- **TablePlus**: `brew install --cask tableplus`

### Tabelle
- `tracking_sessions` - Sessioni di apprendimento
- `tracking_actions` - Singole azioni utente
- `tracking_word_stats` - Statistiche parole per sessione
- `tracking_language_facts` - Fatti linguistici mostrati

---

## 3. SQLite - App Database (Fallback)

Usato quando PostgreSQL non è disponibile (es. deploy AWS con SQLite).

| Campo | Valore |
|-------|--------|
| **File** | `backend/app.db` |
| **Engine** | SQLite 3 |

### Connessione

```bash
sqlite3 backend/app.db
```

---

## Tools Consigliati

| Tool | Comando Install | Supporta |
|------|-----------------|----------|
| **TablePlus** | `brew install --cask tableplus` | PostgreSQL, SQLite |
| **DBeaver** | `brew install --cask dbeaver-community` | Tutti |
| **DB Browser** | `brew install --cask db-browser-for-sqlite` | SQLite |
| **pgAdmin** | `brew install --cask pgadmin4` | PostgreSQL |

---

## Query Utili

### PostgreSQL - Flashcards

```sql
-- Conta flashcards
SELECT COUNT(*) FROM flashcard;

-- Parole con audio
SELECT word, translation FROM flashcard WHERE audio_base64 IS NOT NULL;

-- Progress utente
SELECT f.word, up.confidence 
FROM user_progress up 
JOIN flashcard f ON f.id = up.flashcard_id;
```

### SQLite - Tracking

```sql
-- Sessioni attive
SELECT * FROM tracking_sessions WHERE status = 'active';

-- Azioni recenti
SELECT action_type, word, timestamp 
FROM tracking_actions 
ORDER BY timestamp DESC 
LIMIT 20;

-- Statistiche parole per sessione
SELECT word, times_correct, times_incorrect, session_confidence 
FROM tracking_word_stats 
WHERE session_id = 1;
```
