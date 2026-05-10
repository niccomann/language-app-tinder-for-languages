# Preference-Driven Learning Filter

## Product Goal

The onboarding questionnaire must become a real learning filter, not only an introductory explanation.
If a learner says they care about technology, friendly conversation, and modern vocabulary, the first word scan
and the later exercises should mostly draw from that profile.

The core product promise is: learners should not spend unnecessary mental effort on words they are unlikely to use.
The app should screen interests early, then use that profile together with adaptive mastery signals.

## Current State

- Onboarding preferences are saved in local storage under `languageApp:onboardingPreferences:v1`.
- The Tinder-style vocabulary scan and learning deck currently load cards through category filters.
- `/api/cards/adaptive` currently accepts repeated `category` filters.
- The database already exposes useful metadata such as `category`, `thematic_domain`, `part_of_speech`,
  `language_register`, `frequency_band`, and `cefr_level`.
- The adaptive system already prioritizes weak/new words versus mastered words.

## Recommended Architecture

Create a central `LearningPreferenceProfile` that normalizes raw questionnaire answers into semantic fields:

```ts
{
  domains: ["technology", "travel"],
  tones: ["friendly", "casual"],
  wordStyles: ["modern"],
  preferredPartsOfSpeech: ["noun", "verb", "adverb"],
  difficultyMode: "adaptive",
  semanticDiversityMode: "wide",
  exerciseBias: ["vocabulary", "sentence_building"]
}
```

Raw question ids such as `question-1` and `question-2` should not leak into the learning session.
The rest of the app should consume the normalized profile.

## Filtering Strategy

Use a soft filter, not a hard filter.

- Around 70-80% of content should come from the selected domains and style.
- Around 15-20% should be functional language needed to build real sentences: articles, pronouns,
  prepositions, auxiliaries, conjunctions, common adverbs.
- Around 5-10% should be exploration outside the selected profile, so the learner is not trapped in a narrow topic.

This keeps the app personalized while still teaching usable language.

## Semantic Distance Preference

The onboarding should ask whether the learner wants semantically distant words first, especially for verbs and
high-utility vocabulary. The product reason is cognitive load: beginners who want to talk with people may benefit more
from learning words that unlock different concepts than from learning many near-synonyms early. For example, learning
two verbs that mean almost the same thing can increase memory friction without increasing expressive range very much.

The normalized profile should carry this as `semanticDiversityMode`:

- `wide`: prefer semantically distant words, reduce near-synonyms, and maximize concept coverage.
- `balanced`: mix broad concept coverage with some useful precision.
- `precise`: allow closer synonyms and nuanced alternatives earlier.

The first implementation can capture and send this preference. A later selector can enforce it with semantic similarity
over embeddings by clustering candidate words and down-weighting items whose embedding cosine similarity is too close to
words already selected for the same session. This should be a soft diversity penalty, not a hard block, because some
near-synonyms are genuinely useful once the learner has enough vocabulary coverage.

## Backend Shape

Extend adaptive card selection beyond `category`.

Preferred API shape:

```http
POST /api/cards/adaptive/query
```

Request:

```json
{
  "language": "de",
  "profile": {
    "domains": ["technology"],
    "tones": ["friendly"],
    "wordStyles": ["modern"],
    "semanticDiversityMode": "wide"
  },
  "limit": 80
}
```

The backend should use metadata in this order:

1. Match `thematic_domain` and `category` against selected domains.
2. Match `language_register` against selected tone where data exists.
3. Match `frequency_band` and `cefr_level` for difficulty.
4. Preserve functional words even if they do not match the selected domain.
5. If `semanticDiversityMode` is `wide`, down-weight near-synonyms after semantic similarity data is available.
6. Sort the remaining candidates using the existing adaptive learning score.

## Frontend Shape

Create a preference policy module that:

- reads saved onboarding preferences;
- normalizes them into `LearningPreferenceProfile`;
- exposes a short human-readable summary for the UI;
- sends the profile to adaptive card and sentence endpoints.

The vocabulary scan should use this profile immediately. If the learner selected technology, the first scan should
start with technology-relevant words, plus enough functional words to make future sentence exercises useful.

## Feature Impact

- Vocabulary Scan: first cards are preference-driven.
- Learning Deck: adaptive cards are selected inside the preferred domain mix.
- Sentence Builder: word bank and target sentences should prefer the selected domains and tone.
- Your Vocabulary: can show active profile chips and mastery by selected domain.
- Learning Path: mission order can bias toward preferred exercise types.
- Semantic Diversity: the first scan can collect whether the learner wants broad concept coverage or synonym precision.

## Fallback Rules

If a selected domain has too few words:

1. use close categories or thematic domains;
2. add functional high-frequency words;
3. add neighboring domains;
4. clearly keep the app usable instead of showing an empty deck.

## Testing Plan

- Static tests for the preference profile normalizer.
- Backend tests for adaptive query filtering by domain and category.
- Backend tests proving functional words remain available.
- Frontend tests proving multi-select preferences are sent to adaptive card loading.
- Playwright test for selecting Technology and seeing technology-skewed scan words.

## Implementation Phases

1. Normalize onboarding answers into `LearningPreferenceProfile`.
2. Extend adaptive card query to accept semantic profile filters.
3. Wire the vocabulary scan and deck to the profile.
4. Extend sentence exercises to use the same profile.
5. Add UI profile chips and fallback messaging.
6. Add embedding-backed semantic similarity penalties for `semanticDiversityMode`.
