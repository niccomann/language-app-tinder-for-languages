import {
  readOnboardingPreferences,
  type OnboardingPreferenceAnswer,
  type OnboardingPreferenceAnswers,
} from '../components/firstVocabularyOnboardingMeta';

export type DifficultyMode = 'gentle' | 'normal' | 'ambitious' | 'adaptive';
export type SemanticDiversityMode = 'wide' | 'balanced' | 'precise';

export interface LearningPreferenceProfile {
  domains: string[];
  tones: string[];
  wordStyles: string[];
  preferredPartsOfSpeech: string[];
  difficultyMode: DifficultyMode;
  semanticDiversityMode: SemanticDiversityMode;
  exerciseBias: string[];
}

const DOMAIN_ALIASES: Record<string, string[]> = {
  travel: ['travel', 'transport', 'places', 'shopping', 'food', 'culinary'],
  work: ['work', 'business', 'administration', 'communication'],
  study: ['study', 'school', 'culture', 'history', 'language', 'learning'],
  technology: ['technology'],
};

const CONTEXT_DOMAIN_ALIASES: Record<string, string[]> = {
  'current-life': ['everyday', 'travel', 'technology', 'communication'],
  timeless: ['home', 'people', 'family', 'nature', 'objects', 'time'],
  'culture-history': ['culture', 'history', 'school', 'language'],
};

const GRAMMAR_PARTS_OF_SPEECH: Record<string, string[]> = {
  'function-words': ['article', 'pronoun', 'preposition', 'conjunction', 'adverb', 'particle'],
  verbs: ['verb'],
  'sentence-order': ['noun', 'verb', 'adverb', 'preposition', 'pronoun'],
  'all-grammar': ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'article', 'conjunction'],
};

const EXERCISE_BIAS_ALIASES: Record<string, string[]> = {
  speaking: ['spoken_recall', 'sentence_building'],
  reading: ['recognition', 'vocabulary'],
  listening: ['audio', 'recognition'],
  writing: ['sentence_building', 'production'],
  quick: ['vocabulary', 'recognition'],
  sentences: ['sentence_building'],
  visual: ['visual_memory'],
  mixed: ['vocabulary', 'sentence_building', 'visual_memory', 'review'],
};

function answerIds(answer: OnboardingPreferenceAnswer | undefined): string[] {
  if (!answer) return [];
  return Array.isArray(answer) ? answer : [answer];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function expandAnswerMap(selectedIds: string[], aliases: Record<string, string[]>) {
  return selectedIds.flatMap((id) => aliases[id] ?? [id]);
}

function normalizeDifficulty(answer: OnboardingPreferenceAnswer | undefined): DifficultyMode {
  const selected = answerIds(answer);
  if (selected.includes('gentle')) return 'gentle';
  if (selected.includes('ambitious')) return 'ambitious';
  if (selected.includes('normal')) return 'normal';
  return 'adaptive';
}

function normalizeSemanticDiversity(answer: OnboardingPreferenceAnswer | undefined): SemanticDiversityMode {
  const selected = answerIds(answer);
  if (selected.includes('wide-concepts')) return 'wide';
  if (selected.includes('precise-synonyms')) return 'precise';
  return 'balanced';
}

export function normalizeOnboardingPreferences(
  answers: OnboardingPreferenceAnswers,
): LearningPreferenceProfile {
  const wordStyles = unique([
    ...answerIds(answers["question-1"]),
    ...answerIds(answers["question-8"]),
  ]);
  const domains = unique([
    ...expandAnswerMap(answerIds(answers["question-2"]), DOMAIN_ALIASES),
    ...expandAnswerMap(answerIds(answers["question-8"]), CONTEXT_DOMAIN_ALIASES),
  ]);
  const tones = unique(answerIds(answers["question-3"]));
  const preferredPartsOfSpeech = unique(
    expandAnswerMap(answerIds(answers["question-7"]), GRAMMAR_PARTS_OF_SPEECH),
  );
  const exerciseBias = unique([
    ...expandAnswerMap(answerIds(answers["question-4"]), EXERCISE_BIAS_ALIASES),
    ...expandAnswerMap(answerIds(answers["question-5"]), EXERCISE_BIAS_ALIASES),
  ]);

  return {
    domains,
    tones,
    wordStyles,
    preferredPartsOfSpeech,
    difficultyMode: normalizeDifficulty(answers["question-6"]),
    semanticDiversityMode: normalizeSemanticDiversity(answers["question-11"]),
    exerciseBias,
  };
}

export function hasMeaningfulPreferenceProfile(profile: LearningPreferenceProfile) {
  return (
    profile.domains.length > 0
    || profile.tones.length > 0
    || profile.wordStyles.length > 0
    || profile.preferredPartsOfSpeech.length > 0
    || profile.exerciseBias.length > 0
    || profile.difficultyMode !== 'adaptive'
    || profile.semanticDiversityMode !== 'balanced'
  );
}

export function readSavedLearningPreferenceProfile(): LearningPreferenceProfile | null {
  const profile = normalizeOnboardingPreferences(readOnboardingPreferences());
  return hasMeaningfulPreferenceProfile(profile) ? profile : null;
}
