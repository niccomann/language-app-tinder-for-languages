# Sistema di Raccomandazione Video YouTube

**Status**: 🎯 Feature Proposta  
**Priority**: Alta  
**Complessità**: Media-Alta  
**Versione Target**: 2.0.0

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Obiettivi](#obiettivi)
3. [Architettura](#architettura)
4. [Algoritmi](#algoritmi)
5. [Modello Dati](#modello-dati)
6. [Implementazione](#implementazione)
7. [Roadmap](#roadmap)

> **🔥 IMPLEMENTAZIONE AVANZATA**: Per l'implementazione con **Reti Neurali e PyTorch**, vedi [NEURAL_RECOMMENDATION_PYTORCH.md](./NEURAL_RECOMMENDATION_PYTORCH.md)

---

## 🎯 Panoramica

### Situazione Attuale
Quando l'utente swipe left (non conosce una parola), il sistema:
- Cerca video su YouTube con query predefinite
- Restituisce il primo video rilevante < 60 secondi
- **Non tiene traccia** delle preferenze dell'utente
- **Non impara** dai comportamenti passati

### Proposta
Implementare un **sistema di raccomandazione autonomo** che:
- Apprende dalle interazioni dell'utente con i video
- Personalizza i suggerimenti in base al profilo di apprendimento
- Migliora continuamente la qualità dei video proposti
- Considera contesto, difficoltà, e stile di apprendimento

---

## 🎯 Obiettivi

### Obiettivi Primari
1. **Personalizzazione**: Video adatti al livello e stile dell'utente
2. **Apprendimento Continuo**: Il sistema migliora con ogni interazione
3. **Rilevanza**: Video sempre pertinenti alla parola e contesto
4. **Engagement**: Aumentare tempo di visualizzazione e retention

### Metriche di Successo
- **Completion Rate**: % video guardati fino alla fine (target: >70%)
- **Learning Effectiveness**: % parole apprese dopo video (target: >60%)
- **User Satisfaction**: Rating medio video (target: >4/5)
- **Diversity**: Numero canali diversi mostrati (target: >20)

---

## 🏗️ Architettura

### Componenti del Sistema

```
USER INTERACTION
(Swipe Left → Video → Feedback)
         ↓
RECOMMENDATION ENGINE
├── Content-Based Filtering
├── Collaborative Filtering  
└── Hybrid Model
         ↓
DATA LAYER
├── User Profile
├── Video Metadata
└── Interaction History
```

### Flusso di Raccomandazione

```
1. User swipes left on "Hund"
2. System retrieves:
   - User learning profile
   - Previous interactions
   - Word context (category, difficulty)
3. Recommendation Engine:
   - Searches YouTube (10-20 candidates)
   - Scores each video
   - Selects best match
4. Returns top-ranked video
5. Tracks interaction (watch time, completion, feedback)
```

---

## 🧠 Algoritmi di Raccomandazione

### 1. Content-Based Filtering

Raccomanda video simili a quelli apprezzati in passato.

**Features Considerate**:
- **Video**: titolo, descrizione, canale, durata, qualità
- **Educational**: sottotitoli, engagement (likes/views)
- **Context**: categoria parola, difficoltà, lingua

**Scoring Formula**:
```python
content_score = (
    0.30 * relevance_score +    # Rilevanza per la parola
    0.20 * quality_score +      # Qualità (likes, views)
    0.20 * duration_score +     # Preferenza durata
    0.15 * channel_score +      # Affidabilità canale
    0.15 * subtitle_score       # Presenza sottotitoli
)
```

### 2. Collaborative Filtering

"Utenti simili a te hanno apprezzato questi video"

**Approccio**:
- **User-Based**: Trova utenti con pattern simili
- **Item-Based**: Trova video guardati insieme

**Similarity Metrics**:
- Categorie preferite
- Livello difficoltà
- Tempo visualizzazione medio
- Velocità apprendimento

### 3. Hybrid Model (Raccomandato)

Combinazione dei due approcci:

```python
final_score = (
    0.6 * content_based_score +
    0.4 * collaborative_score
)

# Boost factors:
+ 0.10 if trusted_channel
+ 0.05 if has_subtitles
+ 0.05 if duration < 45s
- 0.10 if user_skipped_similar_before
```

### 4. Contextual Bandits

Esplora nuovi video mentre sfrutta quelli noti.

**Algoritmo**: Epsilon-Greedy
```python
if random() < epsilon:
    return random_good_video()  # Exploration
else:
    return highest_scored_video()  # Exploitation

# epsilon: 0.2 → 0.05 nel tempo
```

**Vantaggi**:
- Evita "filter bubble"
- Scopre nuovi canali
- Si adatta rapidamente

---

## 💾 Modello Dati

### Nuove Tabelle

#### 1. `video_metadata`
```sql
CREATE TABLE video_metadata (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    channel_id VARCHAR(50) NOT NULL,
    channel_title VARCHAR(255) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    view_count BIGINT,
    like_count INTEGER,
    has_subtitles BOOLEAN DEFAULT FALSE,
    quality_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `video_interactions`
```sql
CREATE TABLE video_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    video_id VARCHAR(20) NOT NULL,
    flashcard_id INTEGER NOT NULL,
    word VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    
    shown_at TIMESTAMP DEFAULT NOW(),
    watch_duration_seconds INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    skipped BOOLEAN DEFAULT FALSE,
    helped_learn BOOLEAN,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(id)
);
```

#### 3. `user_learning_profile`
```sql
CREATE TABLE user_learning_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    
    preferred_video_duration INTEGER DEFAULT 45,
    preferred_channels TEXT[],
    learning_style VARCHAR(50),
    
    average_watch_time INTEGER,
    completion_rate FLOAT,
    learning_speed VARCHAR(20),
    
    category_preferences JSONB,
    exploration_rate FLOAT DEFAULT 0.15,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. `video_word_associations`
```sql
CREATE TABLE video_word_associations (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(20) NOT NULL,
    word VARCHAR(100) NOT NULL,
    language VARCHAR(10) NOT NULL,
    
    relevance_score FLOAT DEFAULT 0.0,
    times_shown INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    
    UNIQUE(video_id, word, language)
);
```

---

## 🛠️ Implementazione

### Fase 1: Backend Service

Creare `backend/app/services/recommendation_service.py`:

**Funzioni Principali**:
- `get_recommended_video()` - Ottiene video raccomandato
- `calculate_video_score()` - Calcola score ibrido
- `track_video_interaction()` - Traccia interazione utente
- `update_user_profile()` - Aggiorna profilo apprendimento

**Algoritmo Core**:
```python
async def get_recommended_video(word, translation, flashcard_id):
    # 1. Recupera profilo utente
    user_profile = get_user_profile()
    
    # 2. Cerca candidati YouTube (10-20 video)
    candidates = fetch_youtube_candidates(word, translation)
    
    # 3. Score ogni video
    scored = []
    for video in candidates:
        score = calculate_hybrid_score(video, word, user_profile)
        scored.append((video, score))
    
    # 4. Epsilon-greedy selection
    if random() < exploration_rate:
        return random.choice(scored[:5])  # Top 5
    else:
        return max(scored, key=lambda x: x[1])  # Best
```

### Fase 2: API Endpoints

Aggiungere a `backend/app/routes/videos.py`:

```python
@router.post("/videos/search-recommended")
async def search_recommended_video(request: VideoRequest):
    """Cerca video usando recommendation system"""
    video = await recommendation_service.get_recommended_video(
        word=request.word,
        translation=request.translation,
        flashcard_id=request.flashcard_id
    )
    return VideoResponse(**video)

@router.post("/videos/track-interaction")
async def track_interaction(
    video_id: str,
    flashcard_id: int,
    watch_duration: int,
    completed: bool,
    skipped: bool,
    helped_learn: bool
):
    """Traccia interazione utente-video"""
    await recommendation_service.track_interaction(...)
    return {"message": "Tracked"}
```

### Fase 3: Frontend Integration

Creare `frontend/src/services/recommendation.ts`:

```typescript
class RecommendationService {
  async getRecommendedVideo(word: string, translation: string) {
    const response = await fetch('/videos/search-recommended', {
      method: 'POST',
      body: JSON.stringify({ word, translation })
    });
    return response.json();
  }
  
  async trackInteraction(interaction: VideoInteraction) {
    await fetch('/videos/track-interaction', {
      method: 'POST',
      body: JSON.stringify(interaction)
    });
  }
}
```

Aggiornare `VideoModal.tsx`:
```typescript
useEffect(() => {
  const startTime = Date.now();
  
  return () => {
    const watchDuration = (Date.now() - startTime) / 1000;
    recommendationService.trackInteraction({
      video_id: video.id,
      flashcard_id: flashcard.id,
      watch_duration: watchDuration,
      completed: watchDuration > video.duration * 0.8,
      skipped: watchDuration < 5
    });
  };
}, []);
```

### Fase 4: Analytics Dashboard (Opzionale)

Creare endpoint per visualizzare metriche:

```python
@router.get("/analytics/recommendations")
async def get_recommendation_analytics():
    return {
        "total_interactions": count_interactions(),
        "completion_rate": calculate_completion_rate(),
        "top_channels": get_top_channels(),
        "learning_effectiveness": calculate_effectiveness(),
        "user_preferences": get_user_preferences()
    }
```

---

## 📅 Roadmap di Sviluppo

### Sprint 1: Foundation (2 settimane)
- [ ] Creare tabelle database
- [ ] Implementare SQLModel entities
- [ ] Migration script
- [ ] Test database schema

### Sprint 2: Backend Core (3 settimane)
- [ ] Implementare `RecommendationService`
- [ ] Content-based filtering
- [ ] Collaborative filtering
- [ ] Hybrid scoring algorithm
- [ ] Unit tests

### Sprint 3: API & Integration (2 settimane)
- [ ] Nuovi endpoint API
- [ ] Integrazione con YouTube service esistente
- [ ] Tracking interactions
- [ ] API tests

### Sprint 4: Frontend (2 settimane)
- [ ] Recommendation service client
- [ ] Aggiornare VideoModal per tracking
- [ ] Feedback UI (rating, skip button)
- [ ] Analytics dashboard (opzionale)

### Sprint 5: Testing & Optimization (2 settimane)
- [ ] A/B testing (recommendation vs random)
- [ ] Performance optimization
- [ ] Tuning parametri algoritmo
- [ ] User acceptance testing

### Sprint 6: Deployment (1 settimana)
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Documentation finale
- [ ] Training materiali

**Totale**: ~12 settimane (3 mesi)

---

## 🔧 Configurazione

### Environment Variables

Aggiungere a `backend/.env`:
```bash
# Recommendation System
RECOMMENDATION_ENABLED=true
EXPLORATION_RATE=0.15
MIN_INTERACTIONS_FOR_CF=10
VIDEO_CACHE_TTL=3600
```

### Feature Flags

```python
# backend/app/core/config.py
class ServerSettings(BaseSettings):
    recommendation_enabled: bool = Field(default=True)
    exploration_rate: float = Field(default=0.15)
    min_interactions_for_cf: int = Field(default=10)
```

---

## 📊 Metriche & Monitoring

### KPIs da Tracciare

1. **Engagement**:
   - Completion rate
   - Average watch time
   - Skip rate

2. **Learning Effectiveness**:
   - % parole apprese dopo video
   - Retention rate (dopo 24h, 7 giorni)

3. **System Performance**:
   - Recommendation latency
   - Cache hit rate
   - API error rate

4. **Content Quality**:
   - Video rating distribution
   - Top performing channels
   - Category coverage

### Logging

```python
log.info(f"Recommendation: word={word}, score={score}, method={method}")
log.info(f"Interaction: video={video_id}, duration={duration}, completed={completed}")
log.info(f"Profile Update: user={user_id}, completion_rate={rate}")
```

---

## 🚀 Benefici Attesi

### Per l'Utente
- Video più rilevanti e di qualità
- Apprendimento più efficace
- Esperienza personalizzata
- Meno frustrazione (video inadatti)

### Per il Sistema
- Dati ricchi per miglioramenti futuri
- Identificazione canali di qualità
- Insights su pattern di apprendimento
- Base per features avanzate (spaced repetition, adaptive learning)

### Metriche Target
- **Completion Rate**: 50% → 75%
- **Learning Effectiveness**: 40% → 65%
- **User Satisfaction**: 3.5/5 → 4.5/5
- **Session Duration**: +30%

---

## 🔮 Future Enhancements

### Fase 2 (v2.1)
- **Deep Learning**: Modelli neurali per embedding video/parole
- **Multi-Modal**: Analisi audio/video per qualità
- **Real-time**: Aggiornamento modello in tempo reale

### Fase 3 (v2.2)
- **Social**: Condivisione video tra utenti
- **Community**: Rating e commenti
- **Curation**: Playlist curate da esperti

---

## 📚 Riferimenti

### Papers & Resources
- "Deep Neural Networks for YouTube Recommendations" (Google, 2016)
- "Collaborative Filtering for Implicit Feedback" (Hu et al., 2008)
- "Contextual Bandits for Recommendation" (Li et al., 2010)

### Tools & Libraries
- **scikit-learn**: Collaborative filtering
- **numpy**: Calcoli numerici
- **pandas**: Data analysis
- **Redis**: Caching (opzionale)

---

**Documento creato**: 2025-11-24  
**Autore**: AI Assistant  
**Versione**: 1.0  
**Status**: Proposta per Review
