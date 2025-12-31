# TODO - Tinder for Languages

## ✅ Implementato: Session Tracking + Infografiche

### Funzionalità Nano Banana Pro (Gemini Image Generation)

Il sistema traccia tutte le interazioni utente durante una sessione di apprendimento e genera automaticamente un'infografica riassuntiva alla fine.

#### Come funziona:

1. **Inizio Sessione**
   - `POST /api/tracking/session/start` - Crea una nuova sessione di tracking
   - Salva: user_id, device_type, app_version, timestamp

2. **Durante la Sessione** - Ogni azione viene tracciata:
   - `swipe_right` - Parola conosciuta
   - `swipe_left` - Parola non conosciuta
   - `play_audio` - Ascolto pronuncia
   - `sentence_build_complete` - Frase costruita
   - `sentence_validated` - Frase validata con AI
   - `word_view` - Dettaglio parola visualizzato
   - `video_play` / `video_complete` - Video guardati

3. **Fine Sessione**
   - `POST /api/tracking/session/end` - Chiude la sessione
   - Calcola: durata, totale azioni, accuracy, parole imparate vs da ripassare

4. **Generazione Infografica** (Nano Banana Pro)
   - `POST /api/infographics/from-session` - Genera immagine dalla sessione
   - Usa **Gemini Nano Banana Pro** (`gemini-2.0-flash-exp-image-generation`)
   - Stile: handwritten/schoolteacher aesthetic
   - Output: Base64 PNG

#### Dati raccolti per l'infografica:

| Dato | Descrizione |
|------|-------------|
| `duration_minutes` | Durata sessione |
| `total_swipes` | Totale swipe effettuati |
| `correct_swipes` | Swipe corretti (parole conosciute) |
| `accuracy_percent` | Percentuale accuratezza |
| `words_learned` | Lista parole con confidence >= 70% |
| `words_to_practice` | Lista parole con confidence < 70% |
| `sentences_built` | Numero frasi costruite |
| `videos_watched` | Video completati |
| `language_facts` | Fatti linguistici mostrati |

#### File di riferimento:

- `backend/app/services/tracking_service.py` - Logica tracking
- `backend/app/services/gemini_image.py` - Generazione immagini
- `backend/app/routes/tracking.py` - API endpoints tracking
- `backend/app/routes/infographics.py` - API endpoints infografiche
- `backend/app/database/tracking_models.py` - Modelli DB tracking
- `backend/tracking.db` - Database SQLite per tracking

---

## 🔜 TODO Future

### Miglioramenti Infografiche
- [ ] Aggiungere grafico a torta delle categorie praticate
- [ ] Includere streak giornaliero
- [ ] Confronto con sessioni precedenti
- [ ] Export PDF dell'infografica

### Tracking Avanzato
- [ ] Tempo medio per parola
- [ ] Heatmap orari di studio
- [ ] Analisi pattern di errori
- [ ] Suggerimenti personalizzati basati su debolezze

### Gamification
- [ ] Badge per milestone (10, 50, 100 parole)
- [ ] Leaderboard settimanale
- [ ] Sfide giornaliere

---

## 📝 Note Tecniche

### Database Separati
- **PostgreSQL** (`localhost:5433`) - Dati principali (flashcards, progress)
- **SQLite** (`tracking.db`) - Tracking sessioni (separato per performance)

### Principio Caching
Tutto ciò che viene generato (audio TTS, immagini infografiche) viene salvato nel DB per evitare chiamate API ripetute.
