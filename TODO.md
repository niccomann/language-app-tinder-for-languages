# TODO: Sentence Builder - Composizione Frasi con Validazione LLM 🧩

## Obiettivo
Creare una modalità interattiva nel Grammar Lab dove l'utente può **collegare manualmente nodi** per comporre frasi in tedesco, con un **LLM che valida** la correttezza grammaticale e semantica in tempo reale.

---

## Funzionalità Richieste

### 1. Modalità Costruzione Frase
- Nuova view/tab nel Grammar Lab: "Build Sentence" o "Sentence Builder"
- Pool di nodi disponibili (soggetti, verbi, oggetti, complementi)
- Drag & drop o click per collegare nodi
- Area di lavoro dove costruire la frase

### 2. Collegamento Nodi
- Click su nodo A → click su nodo B = crea collegamento
- Visualizzazione frecce/linee tra nodi collegati
- Possibilità di rimuovere collegamenti
- Ordine dei nodi determina la struttura della frase

### 3. Validazione LLM (3 Livelli)
| Colore | Significato | Esempio |
|--------|-------------|---------|
| 🟢 Verde | Grammaticalmente E semanticamente corretto | "Der Hund frisst das Futter" (Il cane mangia il cibo) |
| 🟡 Giallo | Grammaticalmente corretto, semanticamente strano | "Der Hund frisst die Kartoffeln" (Il cane mangia le patate) |
| 🔴 Rosso | Grammaticalmente sbagliato | "Der Hund Kartoffeln frisst" (ordine sbagliato) |

### 4. Feedback Visivo
- Nodi e collegamenti si colorano in base al risultato
- Messaggio esplicativo dell'LLM (perché è giusto/sbagliato)
- Suggerimenti per correggere (se giallo/rosso)

---

## Implementazione Tecnica

### Backend (Python/FastAPI)

#### Nuovo Endpoint
```
POST /api/grammar/validate-sentence
Body: {
  "nodes": [
    {"id": "1", "label": "Der Hund", "type": "subject"},
    {"id": "2", "label": "frisst", "type": "verb"},
    {"id": "3", "label": "die Kartoffeln", "type": "object"}
  ],
  "connections": [
    {"from": "1", "to": "2"},
    {"from": "2", "to": "3"}
  ],
  "language": "de"
}

Response: {
  "status": "yellow",  // "green" | "yellow" | "red"
  "sentence": "Der Hund frisst die Kartoffeln",
  "grammar_correct": true,
  "semantic_correct": false,
  "explanation": "La frase è grammaticalmente corretta, ma semanticamente insolita: i cani normalmente non mangiano patate.",
  "suggestion": "Prova con 'das Futter' (il cibo) o 'die Wurst' (la salsiccia)"
}
```

#### File da creare/modificare
- [ ] `backend/app/services/sentence_validator.py` - Servizio validazione con LLM
- [ ] `backend/app/routes/grammar.py` - Aggiungere endpoint validazione
- [ ] `backend/app/models/grammar.py` - Modelli Pydantic per request/response

#### Prompt LLM per Validazione
```python
VALIDATION_PROMPT = """
Sei un esperto di grammatica tedesca. Analizza la seguente frase costruita dall'utente:

Frase: {sentence}
Nodi collegati: {nodes}

Valuta:
1. GRAMMATICA: La struttura della frase è corretta? (ordine parole, casi, declinazioni)
2. SEMANTICA: La frase ha senso nel mondo reale?

Rispondi in JSON:
{
  "grammar_correct": true/false,
  "semantic_correct": true/false,
  "explanation": "spiegazione in italiano",
  "suggestion": "suggerimento per migliorare (se necessario)"
}

Esempi:
- "Der Hund frisst das Futter" → grammar: true, semantic: true (verde)
- "Der Hund frisst die Kartoffeln" → grammar: true, semantic: false (giallo)
- "Der Hund Kartoffeln frisst" → grammar: false, semantic: false (rosso)
"""
```

---

### Frontend (React/TypeScript)

#### Componenti da creare
- [ ] `SentenceBuilder.tsx` - Componente principale
- [ ] `NodePool.tsx` - Pool di nodi disponibili
- [ ] `BuildArea.tsx` - Area di costruzione frase
- [ ] `ValidationResult.tsx` - Mostra risultato validazione

#### Stato del Componente
```typescript
interface SentenceBuilderState {
  availableNodes: GrammarNode[];
  selectedNodes: GrammarNode[];
  connections: Connection[];
  validationResult: ValidationResult | null;
  isValidating: boolean;
}

interface Connection {
  fromId: string;
  toId: string;
}

interface ValidationResult {
  status: 'green' | 'yellow' | 'red';
  sentence: string;
  grammarCorrect: boolean;
  semanticCorrect: boolean;
  explanation: string;
  suggestion?: string;
}
```

#### UI Mockup
```
┌─────────────────────────────────────────────────────────────┐
│  ← Grammar Lab 🧪          [Sentence Graph] [Build Sentence]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 Available Nodes:                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │ Der  │ │ Die  │ │ Das  │ │ Hund │ │ Katze│ ...          │
│  │ Hund │ │ Frau │ │ Kind │ │frisst│ │ liest│              │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔨 Build Area:                                             │
│                                                             │
│     ┌──────┐      ┌──────┐      ┌──────────┐               │
│     │ Der  │ ───► │frisst│ ───► │   die    │               │
│     │ Hund │      │      │      │Kartoffeln│               │
│     └──────┘      └──────┘      └──────────┘               │
│                                                             │
│  Frase: "Der Hund frisst die Kartoffeln"                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🟡 GIALLO - Grammaticalmente corretto, semanticamente no  │
│                                                             │
│  "La frase è corretta grammaticalmente, ma i cani          │
│   normalmente non mangiano patate."                         │
│                                                             │
│  💡 Suggerimento: Prova con "das Futter" o "die Wurst"     │
│                                                             │
│  [🔄 Reset] [✓ Valida Frase] [🔊 Ascolta]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Fasi di Sviluppo

### Fase 1: Backend - Servizio Validazione ✅
1. [x] Creare `backend/app/services/sentence_validator.py`
2. [x] Implementare chiamata OpenAI con prompt di validazione
3. [x] Aggiungere endpoint in `grammar.py`
4. [x] Testare con curl/Postman

### Fase 2: Frontend - UI Base ✅
5. [x] Creare componente `SentenceBuilder.tsx`
6. [x] Implementare pool di nodi disponibili
7. [x] Implementare area di costruzione (click to select)
8. [x] Visualizzare collegamenti tra nodi

### Fase 3: Frontend - Validazione ✅
9. [x] Chiamata API per validazione
10. [x] Colorazione nodi/collegamenti (verde/giallo/rosso)
11. [x] Mostrare spiegazione e suggerimenti
12. [x] Animazioni feedback

### Fase 4: Miglioramenti
13. [x] Integrazione audio TTS per ascoltare la frase costruita
14. [ ] Salvataggio frasi corrette nel profilo utente
15. [ ] Gamification: punti per frasi corrette
16. [ ] Livelli di difficoltà (più nodi, casi più complessi)

---

## Costi Stimati (OpenAI)

| Operazione | Token stimati | Costo |
|------------|---------------|-------|
| Validazione singola frase | ~500 token | ~$0.001 |
| 100 validazioni/giorno | ~50K token | ~$0.10 |

**Nota**: Considerare caching per frasi già validate (come per TTS)

---

## Considerazioni UX

### Interazione
- **Click-to-connect**: Click su nodo A, poi click su nodo B per collegare
- **Drag & drop**: Trascina nodo nell'area di costruzione
- **Auto-validazione**: Valida automaticamente dopo 2 secondi di inattività
- **Validazione manuale**: Pulsante "Valida" per controllo esplicito

### Feedback
- Animazione smooth quando cambia colore
- Suono diverso per verde/giallo/rosso
- Confetti per frase perfetta (verde) 🎉

### Accessibilità
- Colori + icone (non solo colori)
- ✓ per verde, ⚠ per giallo, ✗ per rosso
- Spiegazioni testuali sempre visibili

---

## Domande Aperte

1. **Pool nodi**: Da dove vengono i nodi disponibili?
   - Opzione A: Set predefinito per ogni lezione
   - Opzione B: Tutti i nodi delle flashcard studiate
   - Opzione C: Generati dinamicamente dall'LLM

2. **Complessità**: Quanti nodi massimo per frase?
   - MVP: 3-4 nodi (soggetto + verbo + oggetto)
   - Avanzato: 5+ nodi (con complementi, avverbi)

3. **Lingua spiegazioni**: Italiano o tedesco?
   - Suggerimento: Italiano per principianti, opzione tedesco per avanzati

4. **Caching validazioni**: Salvare risultati in DB?
   - Pro: Risparmio costi, risposta istantanea
   - Contro: Frasi identiche rare

---

**Creato**: 24 Dicembre 2025
**Stato**: ✅ **IMPLEMENTATO** - 24 Dicembre 2025






---

# TODO: Mappa Dialetti Regionali 🗺️

## Obiettivo
Creare una visualizzazione interattiva con una **mappa della Germania** che mostra come le parole vengono pronunciate/dette nei vari **dialetti regionali** (Bavarese, Sassone, Svevo, Berliner, etc.).

---

## Funzionalità Richieste

### 1. Mappa Interattiva
- Mappa della Germania divisa per regioni dialettali
- Click su una regione per sentire la pronuncia locale
- Colori diversi per evidenziare le differenze

### 2. Varianti Dialettali
| Regione | Dialetto | Esempio: "Brötchen" (panino) |
|---------|----------|------------------------------|
| Bayern | Bavarese | Semmel |
| Sachsen | Sassone | Bemme |
| Schwaben | Svevo | Weckle |
| Berlin | Berlinese | Schrippe |
| Köln | Coloniese | Röggelchen |
| Hamburg | Basso tedesco | Rundstück |

### 3. Integrazione con Parole
- Quando clicco su una parola nel Grammar Lab → apro vista mappa
- Mostro le varianti dialettali della parola selezionata
- Audio TTS per ogni variante (se disponibile)

---

## Implementazione Tecnica

### Dati Dialetti
```typescript
interface DialectVariant {
  region: string;
  dialect: string;
  variant: string;
  pronunciation?: string;
  audioUrl?: string;
}

interface WordDialects {
  standardGerman: string;
  variants: DialectVariant[];
}

// Esempio dati
const DIALECT_DATA: Record<string, WordDialects> = {
  "Brötchen": {
    standardGerman: "Brötchen",
    variants: [
      { region: "Bayern", dialect: "Bavarese", variant: "Semmel" },
      { region: "Sachsen", dialect: "Sassone", variant: "Bemme" },
      { region: "Berlin", dialect: "Berlinese", variant: "Schrippe" },
      // ...
    ]
  }
};
```

### Componenti Frontend
- [ ] `DialectMap.tsx` - Mappa interattiva SVG della Germania
- [ ] `RegionTooltip.tsx` - Tooltip con variante dialettale
- [ ] `DialectPlayer.tsx` - Player audio per pronuncia

### Fasi di Sviluppo
1. [ ] Creare mappa SVG della Germania con regioni cliccabili
2. [ ] Raccogliere dati dialettali per parole comuni (10-20 parole iniziali)
3. [ ] Implementare visualizzazione con hover/click
4. [ ] Aggiungere audio TTS per varianti (opzionale)
5. [ ] Integrare nel Grammar Lab come nuova view

---

## Parole Esempio da Implementare

| Hochdeutsch | Significato | Ha varianti dialettali |
|-------------|-------------|------------------------|
| Brötchen | Panino | ✅ Molte varianti |
| Kartoffel | Patata | ✅ Erdapfel (Bavaria) |
| Junge | Ragazzo | ✅ Bub (Sud) |
| Mädchen | Ragazza | ✅ Mädel, Dirndl |
| sprechen | Parlare | ✅ schwätzen (Svevo) |
| schauen | Guardare | ✅ gucken, lugen |
| lecker | Buono/gustoso | ✅ schmackhaft, gschmackig |

---

**Creato**: 24 Dicembre 2025
**Stato**: 📝 IDEA - Da implementare

---

[24.12.25, 16:48:21] Nicc: Force calamita d3 aggrega nodi se aggettivi, composti, difficoltà, altro
[24.12.25, 16:50:02] Nicc: Semantica : cibo colori ecc
[24.12.25, 16:50:19] Nicc: Gerarchia
[24.12.25, 18:05:20] Nicc: Raggruppa per similarità delle lettere che compongono parola
[24.12.25, 18:06:41] Nicc: Per etimologia
[24.12.25, 18:14:22] Nicc: Crea un gioco che si basa su calamita repelsione o attrazione dopamina geomag
[24.12.25, 18:15:34] Nicc: Componi cluster da solo con repulsione o generalo con algoritmo
[24.12.25, 18:16:25] Nicc: Lancia nodi stile gioco palla canestro
---

# TODO: Matchmaking Vocabolario (Language Tandem) 🤝

## Obiettivo
Mettere in connessione utenti che hanno un **livello di vocabolario simile** o complementare, per facilitare conversazioni reali (Tandem) basate sulle parole che entrambi conoscono.

---

## Funzionalità Richieste

### 1. Sistema Utenti (Prerequisito)
- Introduzione concetto di **Profilo Utente** (attualmente l'app è single-user).
- Login/Registrazione semplice (o anonima con ID persistente).
- Salvataggio progressi legato all'utente.

### 2. Calcolo Similarità Vocabolario
- Algoritmo per confrontare le parole conosciute ("known" = true) tra due utenti.
- **Punteggio di Similarità** (0-100%): Quanto i due vocabolari si sovrappongono.
- **Punteggio di Complementarità**: Utile per correggersi a vicenda (uno sa parole che l'altro non sa).

### 3. Matchmaking UI
- Bottone "Trova Tandem Partner".
- Lista utenti compatibili (es. "Marco conosce il 90% delle tue parole").
- Visualizzazione parole in comune ("Entrambi conoscete: Mela, Cane, Correre").

### 4. Conversation Starters
- Generazione suggerimenti di conversazione basati ESCLUSIVAMENTE sulle parole comuni.
- Esempio: Se entrambi sanno "Mela" e "Mangiare", suggertisci: "Ti piace mangiare le mele?"

---

## Implementazione Tecnica

### Backend
- [ ] Creare modello `UserEntity`.
- [ ] Aggiornare `UserProgressEntity` con `user_id`.
- [ ] Endpoint `POST /api/matchmaking/find`:
  - Input: User ID corrente.
  - Logica: Query su DB per trovare utenti con sovrapposizione set parole.
  - Algoritmo: Indice di Jaccard (Intersezione / Unione) sulle parole conosciute.

### Frontend
- [ ] Schermata "Community" o "Tandem".
- [ ] Card profilo utente con grafico sovrapposizione (Diagramma di Venn).
- [ ] Chat room o link esterno per contatto.

---

**Stato**: 📝 IDEA - Da implementare
