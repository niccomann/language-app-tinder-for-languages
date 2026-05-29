# Movie Recommender Algorithm

## Current State

The movie recommender ranks films by comparing the learner's known vocabulary
against validated subtitle text.

There is no artificial minimum subtitle length in the recommendation route.
If a validated subtitle row exists, it can be ranked.
Films with no known-word overlap are still returned with `score = 0`, so the
UI can show the full available catalogue as a ranked list instead of hiding
zero-match candidates.

Current local data:

- `movies`: 104
- `subtitles`: 104
- `validated_subtitles`: 104
- subtitle source: OpenSubtitles REST metadata/downloads for German subtitles
- reproducible corpus input: `backend/app/data/movie_manifest_de.json`
- current raw subtitle word count range: 1,893 to 20,964 words
- average raw subtitle word count: about 7,801 words
- reusable importer: `backend/scripts/import_opensubtitles_movies.py`

The current UI shows:

- `Match`: distinct subtitle vocabulary coverage after lexical normalization.
- `Distinct match`: known distinct subtitle words divided by total distinct
  subtitle words after tokenization, stopword removal, and normalization.
- `Your vocabulary`: total distinct known learner words used as the query.
- `Distinct subtitle words`: denominator used by the percentage.
- `Total subtitle words`: raw subtitle word occurrences before matcher filtering.
- `You already know`: the number of unique known words shared between the
  learner vocabulary and the subtitle document after lexical normalization.
- `sample_known_words`: a short sample of shared words.

Example:

```text
Forrest Gump
Match: 10%
Distinct match: 100 / 1000
Your vocabulary: 400
Distinct subtitle words: 1000
Total subtitle words: 7000
You already know: 13
```

This means 100 normalized distinct subtitle words match words the learner
knows, out of 1000 normalized distinct subtitle words. The percentage uses
distinct vocabulary, not repeated occurrences. `Total subtitle words` is context
for the size of the subtitle corpus and is not the score denominator.

## Current Backend Flow

1. The frontend sends `X-User-Id`.
2. `/api/movies/recommendations` requires `X-User-Id`.
3. `extract_user_vocab()` reads `user_word_statistics` for that user/language.
4. Words with positive confidence become weighted vocabulary:

```text
weight = log(1 + times_seen) * (confidence_score / 100)
```

5. The recommender tokenizes subtitle text and applies lexical normalization.
   - Flashcard `plural_form` maps plurals back to the dictionary word.
   - `verb_conjugations` maps known conjugated forms back to the infinitive
     when the table is available.
   - Conservative language rules handle common suffixes such as Italian
     infinitives and participles (`andare` / `andato`).
   - This is alias/stemming based matching, not a full grammatical
     lemmatizer.
6. It computes:

```text
shared_vocab_count = distinct subtitle words whose normalized form is known
subtitle_unique_word_count = all distinct normalized subtitle words
subtitle_token_count = raw subtitle word occurrences before matcher filtering
score = shared_vocab_count / subtitle_unique_word_count
```

7. BM25/TF-IDF is still computed as an internal tie-breaker when coverage is
   equal, but it is not displayed as the percentage.
8. It returns:

- `imdb_id`
- `title`
- `year`
- `score` (coverage ratio from 0 to 1)
- `user_vocab_count`
- `shared_vocab_count`
- `subtitle_unique_word_count`
- `subtitle_token_count`
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

## Production Data Pipeline

`backend/app.db` is intentionally ignored by Git, so local subtitle rows are not
deployed automatically. Production or staging must either receive a WAL-safe DB
backup or run the importer against its own database.

Default German corpus manifest:

```text
backend/app/data/movie_manifest_de.json
```

Local SQLite importer command from the `backend` directory:

```bash
OPENSUBTITLES_USER_AGENT="customizeyourlingua/1.0 contact@example.com" \
OPENSUBTITLES_REQUEST_DELAY_SECONDS=1.0 \
OPENSUBTITLES_MIN_WORD_COUNT=1000 \
python scripts/import_opensubtitles_movies.py \
  --db app.db \
  --manifest app/data/movie_manifest_de.json \
  --language de
```

Postgres/prod importer command from inside the backend container or an
environment with the app DB variables configured:

```bash
OPENSUBTITLES_USER_AGENT="customizeyourlingua/1.0 contact@example.com" \
OPENSUBTITLES_REQUEST_DELAY_SECONDS=1.0 \
OPENSUBTITLES_MIN_WORD_COUNT=1000 \
python scripts/import_opensubtitles_movies.py \
  --app-database \
  --manifest app/data/movie_manifest_de.json \
  --language de
```

Runtime configuration:

- `OPENSUBTITLES_REST_BASE_URL`: defaults to `https://rest.opensubtitles.org/search`.
- `OPENSUBTITLES_USER_AGENT`: should identify the app/operator in production.
- `OPENSUBTITLES_MIN_WORD_COUNT`: rejects tiny or malformed subtitles.
- `OPENSUBTITLES_REQUEST_DELAY_SECONDS`: delay between movie imports.
- `OPENSUBTITLES_REQUEST_TIMEOUT_SECONDS`: search request timeout.
- `OPENSUBTITLES_DOWNLOAD_TIMEOUT_SECONDS`: subtitle download timeout.
- `OPENSUBTITLES_REQUEST_RETRY_COUNT`: retry count for transient HTTP errors
  such as 429 or 5xx responses.
- `OPENSUBTITLES_REQUEST_RETRY_DELAY_SECONDS`: delay between transient HTTP
  retries.
- `MOVIE_RECOMMENDER_CACHE_TTL_SECONDS`: recommendation index cache TTL.
- `MOVIE_RECOMMENDER_ADMIN_TOKEN`: required for cache reset.

After importing into a running backend, reset the recommender cache:

```bash
curl -X POST "$BASE/api/movies/recommendations/cache/reset" \
  -H "X-Admin-Token: $MOVIE_RECOMMENDER_ADMIN_TOKEN"
```

Before running production imports, confirm the current OpenSubtitles terms/API
requirements and keep an audit trail of subtitle source/license metadata.

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
- `Your vocabulary`: total distinct known words in the learner query.
- `Distinct subtitle words`: total distinct normalized words in the subtitle.
- `Total subtitle words`: raw word occurrences in the subtitle text.
- `Known words`: unique known lemmas in the film.
- `Why this film?`: expandable explanation.

Suggested card fields:

```text
Forrest Gump
Match: 18%
Distinct match: 42 / 233
Your vocabulary: 400
Distinct subtitle words: 233
Total subtitle words: 7000
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
  "user_vocab_count": 400,
  "shared_vocab_count": 13,
  "subtitle_unique_word_count": 233,
  "subtitle_token_count": 7000,
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

- Keep returning `score`, `user_vocab_count`, `shared_vocab_count`,
  `subtitle_unique_word_count`, `subtitle_token_count`, and
  `sample_known_words`.
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
