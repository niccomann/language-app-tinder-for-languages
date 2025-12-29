# Integration Spec: Rich Flashcard Data from language_info_extraction

## Context

Il progetto `language_info_extraction` estrae informazioni linguistiche avanzate dal web usando AI (GPT-4) e le salva in un database SQLite. Questi dati vengono sincronizzati verso PostgreSQL del progetto `tinder-for-languages` tramite lo script `sync_to_tinder.py`.

**Attualmente il sync trasferisce solo i campi base:**
- `word` → `word`
- `translation_en` → `translation`
- `semantic_field` → `category`
- `cefr_level` → `difficulty`

**Ma il database sorgente contiene MOLTI più dati strutturati che possono arricchire l'esperienza utente.**

---

## Dati Disponibili per Ogni Parola

### 1. Classificazione Base
| Campo | Tipo | Esempio | Uso UI |
|-------|------|---------|--------|
| `cefr_level` | A1/A2/B1/B2/C1/C2 | "A1" | Badge livello, filtro difficoltà |
| `frequency_band` | very_common/common/moderate/rare/archaic | "very_common" | Indicatore frequenza d'uso |
| `register` | formal/informal/neutral/colloquial/vulgar/literary | "neutral" | Badge registro linguistico |
| `thematic_domain` | animals/food/nature/abstract/etc. | "animals" | Filtro per categoria tematica |

### 2. Informazioni Grammaticali
| Campo | Tipo | Esempio | Uso UI |
|-------|------|---------|--------|
| `part_of_speech` | noun/verb/adj/adv/etc. | "noun" | Icona tipo parola |
| `gender` | masculine/feminine/neuter | "masculine" | Badge der/die/das |
| `plural_form` | string | "Hunde" | Mostrare plurale |
| `is_compound` | boolean | true/false | Badge "parola composta" |
| `word_formation` | simple/compound/derived/prefix/suffix | "compound" | Info morfologica |

### 3. Etimologia (tabella `etymologies`)
| Campo | Tipo | Esempio |
|-------|------|---------|
| `origin_language` | string | "Proto-Germanic" |
| `origin_word` | string | "*hunđa" |
| `etymology_text` | string | "Derived from Proto-Germanic..." |
| `language_family` | germanic/romance/slavic/etc. | "germanic" |
| `time_period` | string | "Middle Ages" |

### 4. Esempi (tabella `example_sentences`)
| Campo | Tipo | Esempio |
|-------|------|---------|
| `sentence` | string | "Der Hund bellt laut." |
| `translation` | string | "The dog barks loudly." |
| `difficulty_level` | A1-C2 | "A1" |
| `context_type` | everyday/business/academic | "spoken" |

### 5. Collocazioni (tabella `collocations`)
| Campo | Tipo | Esempio |
|-------|------|---------|
| `collocate_word` | string | "Hundehalter" |
| `collocation_type` | verb_noun/adj_noun/etc. | "noun+noun" |
| `example_phrase` | string | "Der Hundehalter..." |
| `frequency` | string | "common" |

### 6. False Friends (tabella `false_friends`)
| Campo | Tipo | Esempio |
|-------|------|---------|
| `target_language` | string | "en" |
| `similar_word` | string | "hundred" |
| `similar_word_meaning` | string | "a number equal to 100" |
| `confusion_level` | critical/high/medium/low | "medium" |

### 7. Proverbi/Idiomi (tabella `proverbs`)
| Campo | Tipo | Esempio |
|-------|------|---------|
| `expression` | string | "Der Hund bellt, die Karawane zieht weiter" |
| `figurative_meaning` | string | "Criticism does not stop progress" |
| `expression_type` | proverb/idiom/saying | "proverb" |

### 8. Varianti Dialettali (tabella `dialect_variants`)
| Campo | Tipo | Esempio |
|-------|------|---------|
| `region` | string | "Bavaria" |
| `dialect_name` | string | "Bavarian" |
| `variant_word` | string | "Hund" |
| `usage_notes` | string | "Softer 'u' pronunciation" |

---

## Esempio Dati Reali Estratti

```json
{
  "word": "Weltanschauung",
  "translation_en": "worldview",
  "cefr_level": "C1",
  "frequency_band": "common",
  "register": "formal",
  "thematic_domain": "abstract",
  "word_formation": "compound",
  "is_compound": true,
  "gender": "feminine",
  "part_of_speech": "noun"
}
```

```json
{
  "word": "Hund",
  "translation_en": "dog",
  "cefr_level": "A1",
  "frequency_band": "very_common",
  "register": "neutral",
  "thematic_domain": "animals",
  "word_formation": "simple",
  "is_compound": false,
  "gender": "masculine",
  "etymology": {
    "origin_language": "Proto-Germanic",
    "origin_word": "*hunđa"
  },
  "examples": [
    {"sentence": "Der Hund bellt laut.", "translation": "The dog barks loudly."}
  ],
  "false_friends": [
    {"target_language": "en", "similar_word": "hundred", "confusion_level": "medium"}
  ],
  "proverbs": [
    {"expression": "Der Hund bellt, die Karawane zieht weiter."}
  ]
}
```

---

## Suggerimenti per UI Arricchita

### 1. Card Flashcard Migliorata
```
┌─────────────────────────────────────┐
│  🐕 Hund                      A1    │  ← cefr_level badge
│  ─────────────────────────────────  │
│  der Hund (m.)           ⭐⭐⭐⭐⭐   │  ← gender + frequency
│  → dog                              │
│                                     │
│  📝 "Der Hund bellt laut."          │  ← example sentence
│                                     │
│  ⚠️ False friend: "hundred" (EN)    │  ← false friend warning
│                                     │
│  🏷️ animals · neutral · simple      │  ← tags
└─────────────────────────────────────┘
```

### 2. Nuovi Filtri
- **Per livello CEFR**: A1, A2, B1, B2, C1, C2
- **Per frequenza**: very_common → rare
- **Per registro**: formal, informal, neutral
- **Per tipo**: simple, compound, derived
- **Per genere**: der (m.), die (f.), das (n.)

### 3. Vista Dettaglio Parola
- Tab "Etimologia" con origin_language e storia
- Tab "Esempi" con frasi d'uso
- Tab "Attenzione" con false friends
- Tab "Idiomi" con proverbi correlati
- Tab "Dialetti" con varianti regionali

### 4. Gamification
- Badge "Parole composte padroneggiate"
- Badge "Livello C1 sbloccato"
- Statistiche per categoria tematica
- Progress bar per ogni dominio

---

## Schema Database PostgreSQL da Estendere

Per sfruttare tutti i dati, estendere la tabella `flashcards`:

```sql
ALTER TABLE flashcards ADD COLUMN cefr_level VARCHAR(2);
ALTER TABLE flashcards ADD COLUMN frequency_band VARCHAR(20);
ALTER TABLE flashcards ADD COLUMN register VARCHAR(20);
ALTER TABLE flashcards ADD COLUMN gender VARCHAR(10);
ALTER TABLE flashcards ADD COLUMN plural_form VARCHAR(100);
ALTER TABLE flashcards ADD COLUMN is_compound BOOLEAN DEFAULT FALSE;
ALTER TABLE flashcards ADD COLUMN word_formation VARCHAR(20);
ALTER TABLE flashcards ADD COLUMN part_of_speech VARCHAR(20);

-- Oppure creare tabelle relazionate per etymologies, examples, etc.
```

---

## Connessione Database Sorgente

Il database SQLite sorgente si trova in:
```
/Users/nicco/Desktop/language_info_extraction/language_knowledge.db
```

Lo script di sync è in:
```
/Users/nicco/Desktop/language_info_extraction/scripts/sync_to_tinder.py
```

Per estendere il sync con i nuovi campi, modificare il mapping nello script.

---

## API Disponibili (language_info_extraction)

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `GET /api/words` | GET | Lista tutte le parole |
| `GET /api/words/{id}` | GET | Dettaglio parola con tutte le relazioni |
| `POST /api/extract` | POST | Estrai nuova parola `{"word": "...", "language": "de"}` |
| `GET /api/stats` | GET | Statistiche database |

Backend su `http://localhost:8000`
