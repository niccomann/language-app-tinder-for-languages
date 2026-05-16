import type { TargetLanguage } from '../i18n/languageStorage';

export interface Flashcard {
  id: number;
  word: string;
  translation: string;
  image_url?: string;
  image_base64?: string;
  audio_base64?: string;
  language: TargetLanguage;
  difficulty?: string;
  category?: string;
}

export interface AdaptiveFlashcard extends Flashcard {
  cefr_level?: string;
  frequency_band?: string;
  register?: string;
  thematic_domain?: string;
  part_of_speech?: string;
  confidence_score: number;
  knowledge_level: number;
  times_seen: number;
  times_correct: number;
  times_incorrect: number;
  last_practiced?: string | null;
  selection_reason: 'struggling' | 'new' | 'learning' | 'review';
}

export type AdaptiveLearningTrend = 'new' | 'improving' | 'stable' | 'declining';

export interface AdaptiveLearningSummary {
  average_confidence: number;
  average_knowledge_level: number;
  total_words_practiced: number;
  total_practice_sessions: number;
  words_struggling: number;
  words_learning: number;
  words_mastered: number;
  path_xp: number;
  path_level: number;
  max_path_level: number;
  xp_to_next_level: number;
  path_level_progress: number;
  trend: AdaptiveLearningTrend;
  level_delta: number;
  last_practiced?: string | null;
  days_since_last_practice?: number | null;
  should_reengage: boolean;
}

export interface WordStatistics {
  word: string;
  language: string;
  confidence_score: number;
  knowledge_level: number;
  times_seen: number;
  times_correct: number;
  times_incorrect: number;
  last_practiced?: string | null;
}

export interface LearningFeedback {
  title: string;
  message: string;
  tone: 'level_up' | 'progress' | 'review';
}

export interface MilestoneEvent {
  count: number;
  id: number;
}

export interface FlashcardEnriched extends Flashcard {
  cefr_level?: string;
  frequency_band?: string;
  register?: string;
  thematic_domain?: string;
  part_of_speech?: string;
  gender?: string;
  plural_form?: string;
  is_compound?: boolean;
  word_formation?: string;
  image_coherence_score?: number;
  pronunciation_ipa?: string;
  example_sentence?: string;
  etymology_text?: string;
  visual_mnemonic?: string;
  memory_hook?: string;
  extra_data?: Record<string, unknown>;
}

export interface Etymology {
  id?: number;
  origin_language?: string;
  origin_word?: string;
  etymology_text?: string;
  language_family?: string;
  time_period?: string;
  extra_data?: Record<string, unknown>;
}

export interface ExampleSentence {
  id?: number;
  sentence: string;
  translation?: string;
  difficulty_level?: string;
  context_type?: string;
  extra_data?: Record<string, unknown>;
}

export interface FalseFriend {
  id?: number;
  target_language: string;
  similar_word: string;
  similar_word_meaning?: string;
  confusion_level?: string;
  extra_data?: Record<string, unknown>;
}

export interface Proverb {
  id?: number;
  expression: string;
  literal_meaning?: string;
  figurative_meaning?: string;
  expression_type?: string;
  extra_data?: Record<string, unknown>;
}

export interface Collocation {
  id?: number;
  collocate_word: string;
  collocation_type?: string;
  example_phrase?: string;
  frequency?: string;
  extra_data?: Record<string, unknown>;
}

export interface DialectVariant {
  id?: number;
  region: string;
  dialect_name?: string;
  variant_word: string;
  pronunciation?: string;
  usage_notes?: string;
  extra_data?: Record<string, unknown>;
}

export interface FlashcardDetail extends FlashcardEnriched {
  etymologies: Etymology[];
  examples: ExampleSentence[];
  false_friends: FalseFriend[];
  proverbs: Proverb[];
  collocations: Collocation[];
  dialect_variants: DialectVariant[];
}

export interface LibraryFilters {
  cefr_levels: string[];
  frequency_bands: string[];
  registers: string[];
  genders: string[];
  parts_of_speech: string[];
  word_formations: string[];
  categories: string[];
  thematic_domains: string[];
}

export interface LibraryStats {
  total_words: number;
  words_with_etymology: number;
  words_with_examples: number;
  words_with_false_friends: number;
  words_with_proverbs: number;
  by_cefr_level: Record<string, number>;
  by_gender: Record<string, number>;
  by_part_of_speech: Record<string, number>;
}

export interface UserProgress {
  cards_reviewed: number;
  known_count: number;
  unknown_count: number;
}

export interface SwipeDirection {
  direction: 'left' | 'right';
  cardId: number;
}

export interface VideoData {
  video_id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  embed_url: string;
}

export interface FlashcardWithProgress extends FlashcardEnriched {
  known?: boolean;
  review_count?: number;
  swipe_right_count?: number;
  swipe_left_count?: number;
  last_reviewed?: string;
}

export interface WordCloudItem {
  text: string;
  size: number;
  category?: string;
  translation?: string;
  swipe_right_count?: number;
  swipe_left_count?: number;
  review_count?: number;
  image_url?: string;
  image_base64?: string;
  cefr_level?: string;
  frequency_band?: string;
  gender?: string;
  part_of_speech?: string;
  register?: string;
  is_compound?: boolean;
  word_formation?: string;
  thematic_domain?: string;
}

export interface GrammarNodeMeta {
  case?: string;
  gender?: string;
  number?: string;
  tense?: string;
  mood?: string;
  person?: number;
  pronoun?: string;
}

export interface GrammarNode {
  id: string;
  label: string;
  type:
    | 'subject'
    | 'predicate'
    | 'object'
    | 'indirect_object'
    | 'direct_object'
    | 'adjective'
    | 'adverb'
    | 'preposition'
    | 'pronoun'
    | 'article'
    | 'conjunction';
  lemma?: string;
  surface_form?: string;
  part_of_speech?: string;
  translation?: string;
  source_word_id?: number;
  image_base64?: string;
  meta?: GrammarNodeMeta;
  x?: number;
  y?: number;
  cefr_level?: string;
  frequency_band?: string;
  register?: string;
  thematic_domain?: string;
  difficulty?: string;
  category?: string;
}

export interface GrammarEdge {
  source: string;
  target: string;
  label: string;
}

export interface GrammarSentence {
  id: string;
  german: string;
  english: string;
  nodes: GrammarNode[];
  edges: GrammarEdge[];
  difficulty: string;
}

export interface SentenceChallenge {
  id: number;
  language: string;
  prompt_language: string;
  target_language: string;
  prompt: string;
  correct_sentence: string;
  correct_tokens: string[];
  distractor_tokens: string[];
  option_tokens: string[];
  difficulty: string;
  grammar_focus?: string | null;
  cefr_level?: string | null;
  validation_mode: 'ground_truth';
}

export interface TTSResponse {
  audio_base64: string;
  cached: boolean;
}

export interface TTSCheckResponse {
  results: Record<string, boolean>;
}

export type ValidationStatus = 'green' | 'yellow' | 'red';

export interface NodeInfo {
  id: string;
  label: string;
  type: string;
}

export interface ConnectionInfo {
  from_id: string;
  to_id: string;
}

export interface ValidateSentenceRequest {
  nodes: NodeInfo[];
  connections: ConnectionInfo[];
  language?: string;
}

export interface ValidateSentenceResponse {
  status: ValidationStatus;
  sentence: string;
  grammar_correct: boolean;
  semantic_correct: boolean;
  explanation: string;
  suggestion?: string | null;
}

export interface DialectVariantData {
  region: string;
  regionId: string;
  dialect: string;
  variant: string;
  pronunciation?: string;
}

export interface DialectWord {
  standardGerman: string;
  translation: string;
  variants: DialectVariantData[];
}

export interface WordDbRow {
  flashcard: {
    id: number;
    word: string;
    language: string;
    translation: string;
  };
  word: Record<string, unknown>;
  media: Record<string, boolean | number>;
  related: Record<string, Record<string, unknown>[]>;
}
