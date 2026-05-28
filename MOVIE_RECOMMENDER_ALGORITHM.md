# Movie Recommender Algorithm

## Current State

The movie recommender ranks films by comparing the learner's known vocabulary
against validated subtitle text.

Current local smoke data:

- `movies`: 3
- `subtitles`: 3
- `validated_subtitles`: 3

The current UI shows:

- `Match`: distinct subtitle vocabulary coverage after lexical normalization.
- `Distinct match`: known distinct subtitle words divided by total distinct
  subtitle words after tokenization, stopword removal, and normalization.
- `Distinct subtitle words`: denominator used by the percentage.
- `You already know`: the number of unique known words shared between the
  learner vocabulary and the subtitle document after lexical normalization.
- `sample_known_words`: a short sample of shared words.

Example:

```text
Forrest Gump
Match: 10%
Distinct match: 100 / 1000
Distinct subtitle words: 1000
You already know: 13
```

This means 100 normalized distinct subtitle words match words the learner
knows, out of 1000 normalized distinct subtitle words. The percentage uses
distinct vocabulary, not repeated occurrences.

## Current Backend Flow

1. The frontend sends `X-User-Id`.
2. `/api/movies/recommendations` requires `X-User-Id`.
3. `extract_user_vocab()` reads `user_word_statistics` for that user/language.
4. Words with positive confidence become weighted vocabulary:

```text
weight = log(1 + times_seen) * (confidence_score / 100)
```

5. The recommender tokenizes subtitle text and normalizes word forms.
   - Flashcard `plural_form` maps plurals back to the dictionary word.
   - `verb_conjugations` maps known conjugated forms back to the infinitive
     when the table is available.
   - Conservative language rules handle common suffixes such as Italian
     infinitives and participles (`andare` / `andato`).
6. It computes:

```text
shared_vocab_count = distinct subtitle words whose normalized form is known
subtitle_unique_word_count = all distinct normalized subtitle words
score = shared_vocab_count / subtitle_unique_word_count
```

7. BM25/TF-IDF is still computed as an internal tie-breaker when coverage is
   equal, but it is not displayed as the percentage.
8. It returns:

- `imdb_id`
- `title`
- `year`
- `score` (coverage ratio from 0 to 1)
- `shared_vocab_count`
- `subtitle_unique_word_count`
- `sample_known_words`

## Current Limitation

The current matching is lexical, but still heuristic. It handles known
dictionary aliases, German conjugation rows, plural forms, and common suffix
patterns; it is not yet a full morphological parser.

This now works for common forms:

```text
Known word: andare
Subtitle words: andato, andai, andremo, andrò
Expected: forms normalize toward andare
```

German example:

```text
Known word: gehen
Subtitle words: gehe, gehst, geht, ging, gegangen
Expected: forms normalize toward gehen when verb_conjugations has the rows
```

The local SQLite database has a German `verb_conjugations` table with 11760
forms. The recommender uses it when present.

## Desired Algorithm

The recommender should compare normalized lexical units, not raw text tokens.

### Vocabulary Normalization

For every known learner word:

1. Keep the canonical flashcard word.
2. Normalize casing.
3. Map conjugated forms back to the canonical lemma when data exists.
4. Keep a reverse map so the UI can explain which subtitle forms matched.

Example:

```text
lemma: gehen
matched subtitle forms: gehe, geht, gegangen
```

### Subtitle Normalization

For each subtitle document:

1. Tokenize the subtitle.
2. Remove stopwords.
3. Normalize each token to a lemma/canonical word when possible.
4. Keep counts:

```text
lemma -> total occurrences
lemma -> matched surface forms
```

Example:

```json
{
  "gehen": {
    "occurrences": 12,
    "forms": ["gehe", "geht", "ging", "gegangen"]
  }
}
```

### Ranking Inputs

The ranking should use three signals:

1. `lexical_overlap`
   - How many known lemmas occur in the film.
   - Weighted by learner confidence and practice count.

2. `subtitle_coverage`
   - How much of the distinct subtitle vocabulary is covered by the learner's
     known vocabulary.
   - This is closer to "how understandable is this film?"

3. `retrieval_score`
   - BM25/TF-IDF similarity for ranking among candidate films.
   - Useful, but should not be presented as comprehension.

Future score shape if we later separate display coverage from ranking:

```text
internal_rank_score =
  0.45 * lexical_overlap_score +
  0.35 * subtitle_coverage_score +
  0.20 * retrieval_score
```

This can be tuned after real corpus testing.

## Frontend Explainability

The frontend should not only show "Match".

Each movie card should show:

- `Match`: estimated subtitle vocabulary coverage.
- `Distinct match`: known distinct subtitle words divided by total distinct
  subtitle words.
- `Distinct subtitle words`: total distinct normalized words in the subtitle.
- `Known words`: unique known lemmas in the film.
- `Why this film?`: expandable explanation.

Suggested card fields:

```text
Forrest Gump
Match: 18%
Distinct match: 42 / 233
Distinct subtitle words: 233
Known words: 13

Why this film?
- Strong overlap with your family/home vocabulary.
- 13 known lemmas appear in the subtitles.
- Your strongest matches: Freund, Familie, Haus, Herz.
```

Expanded debug/detail view:

```text
Known lemma   Subtitle forms              Occurrences   Your confidence
gehen         gehe, geht, gegangen        12            80
Haus          Haus, Hause                 7             36
Freund        Freund, Freunde             5             36
```

## API Contract Proposal

Extend `MovieRecommendationOut`:

```json
{
  "imdb_id": "tt0109830",
  "title": "Forrest Gump",
  "year": 1994,
  "score": 0.18,
  "shared_vocab_count": 13,
  "subtitle_unique_word_count": 233,
  "sample_known_words": ["freund", "familie"],
  "matched_words": [
    {
      "lemma": "gehen",
      "forms": ["gehe", "geht", "gegangen"],
      "occurrences": 12,
      "confidence_score": 80,
      "times_seen": 6
    }
  ]
}
```

## Next Implementation Steps

### Phase 1: Normalizer Hardening

- Extract the lexical normalization logic into a dedicated service.
- Keep loading German conjugation forms from `verb_conjugations`.
- Keep building the `surface_form -> lemma` map from flashcard plurals and
  conjugation rows.
- Add better language-specific lemmatizers when available.
- Add tests for:
  - `gehen` matching `gehe`, `geht`, `ging`, `gegangen`.
  - exact noun matches still working.
  - unknown user returning no recommendations.

### Phase 2: Explainable Recommendation Output

- Keep returning `score`, `shared_vocab_count`,
  `subtitle_unique_word_count`, and `sample_known_words`.
- Add optional `matched_words` rows when the UI needs per-lemma details.
- Add route tests for the expanded contract.

### Phase 3: Frontend Detail UI

- Keep `Match` as subtitle coverage.
- Keep `Matched words` as the visible numerator / denominator.
- Add expandable "Why this film?" section.
- Show matched lemma rows with subtitle forms and occurrences.

### Phase 4: Real Corpus

- Replace local smoke seed with real validated subtitle ingestion.
- Validate that cache build time and memory are acceptable.
- Add corpus statistics:
  - number of films indexed;
  - number of subtitle documents;
  - languages available;
  - last ingestion timestamp.

## Open Decisions

1. Confidence threshold:
   - Recommended: include words with `confidence_score >= 30`.
   - Current local fix: include words with `confidence_score > 0`.

2. Meaning of "Coverage":
   - Current display: known distinct subtitle words / total distinct subtitle
     words.
   - Unique known lemmas remain available as `shared_vocab_count`.

3. Multi-language lemmatization:
   - German can use existing `verb_conjugations`.
   - Italian/French/English need either conjugation tables, a lemmatizer
     dependency, or generated inflection dictionaries.

4. UI depth:
   - Compact cards for learners.
   - Expanded debug panel for us while tuning the algorithm.
