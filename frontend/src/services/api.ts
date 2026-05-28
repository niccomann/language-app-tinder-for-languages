import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AdaptiveFlashcard, AdaptiveLearningSummary, Flashcard, UserProgress, FlashcardWithProgress, GrammarSentence, GrammarNode, SentenceChallenge, MatchPair, WordSentences, TTSResponse, TTSCheckResponse, ValidateSentenceRequest, ValidateSentenceResponse, LibraryFilters, LibraryStats, FlashcardDetail, DialectWord, WordDbRow, WordStatistics, PathMissionsResponse, ImportKnownResult, MovieRecommendation } from '../types';
import { API_BASE_URL, API_REQUEST_TIMEOUT_MS, APP_MODE, isFeatureEnabled } from '../config/appMode';
import type { LearningPreferenceProfile } from '../learning/preferenceProfile';
import type { TargetLanguage } from '../i18n/languageStorage';
import { getOrCreateUserId } from './userIdentity';
import { sessionUserId, type AuthSession } from './authSession';

interface OfflineBackendPlugin {
  request(options: {
    method: string;
    path: string;
    body?: string;
  }): Promise<{
    status?: number;
    body?: string;
  }>;
}

const OfflineBackend = registerPlugin<OfflineBackendPlugin>('OfflineBackend');

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) {
    return input;
  }
  const rawUrl = typeof input === 'string' ? input : input.url;
  const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return new URL(rawUrl, baseUrl);
}

function shouldUseOfflineBackend(input: RequestInfo | URL): boolean {
  if (APP_MODE !== 'offline' || Capacitor.getPlatform() === 'web') {
    return false;
  }
  const url = requestUrl(input);
  return url.pathname.startsWith('/api/');
}

async function fetchFromOfflineBackend(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const url = requestUrl(input);
  const method = (init.method ?? 'GET').toUpperCase();
  const body = typeof init.body === 'string' ? init.body : undefined;
  const response = await OfflineBackend.request({
    method,
    path: `${url.pathname}${url.search}`,
    body,
  });

  return new Response(response.body ?? '{}', {
    status: response.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

let cachedUserId: string | null = null;
let userIdPromise: Promise<string> | null = null;

async function resolveUserId(): Promise<string> {
  // A signed-in account overrides the anonymous id so data follows the account.
  const accountUserId = sessionUserId();
  if (accountUserId) return accountUserId;
  if (cachedUserId) return cachedUserId;
  if (!userIdPromise) {
    userIdPromise = getOrCreateUserId().then((id) => {
      cachedUserId = id;
      return id;
    });
  }
  return userIdPromise;
}

// AI-backed endpoints (TTS, LLM validation, adaptive generation) routinely
// take 5-20s on cold cache. Use a higher ceiling than the default fast-API
// timeout to avoid spurious "Request timed out" errors in production.
const SLOW_AI_TIMEOUT_MS = 30000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = API_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (shouldUseOfflineBackend(input)) {
      // TODO: pass X-User-Id to OfflineBackend (requires extending the plugin contract).
      return await fetchFromOfflineBackend(input, init);
    }

    const userId = await resolveUserId();
    const mergedHeaders = new Headers(init.headers || {});
    if (!mergedHeaders.has('X-User-Id')) {
      mergedHeaders.set('X-User-Id', userId);
    }
    const finalInit: RequestInit = { ...init, headers: mergedHeaders, signal: controller.signal };

    return await fetch(input, finalInit);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function appendLearningPreferenceProfile(
  queryParams: URLSearchParams,
  learningPreferenceProfile?: LearningPreferenceProfile | null,
) {
  learningPreferenceProfile?.domains.forEach((domain) => queryParams.append('profile_domain', domain));
  learningPreferenceProfile?.tones.forEach((tone) => queryParams.append('profile_tone', tone));
  learningPreferenceProfile?.wordStyles.forEach((wordStyle) => queryParams.append('profile_word_style', wordStyle));
  learningPreferenceProfile?.preferredPartsOfSpeech.forEach((partOfSpeech) => {
    queryParams.append('profile_part_of_speech', partOfSpeech);
  });
  if (learningPreferenceProfile?.semanticDiversityMode) {
    queryParams.append('profile_semantic_diversity', learningPreferenceProfile.semanticDiversityMode);
  }
}

// Single POST to the TTS endpoint. The backend resolves cache vs. generation and
// uses `language` to steer pronunciation. Callers decide whether to feature-gate
// (word audio stays available offline via the native plugin; narration does not).
async function postSpeech(text: string, language: string, voice: string): Promise<TTSResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/tts/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, voice }),
  }, SLOW_AI_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error('Failed to generate speech');
  }

  return response.json();
}

export const api = {
  async getFlashcards(params?: {
    language?: string;
    category?: string;
    limit?: number;
  }): Promise<Flashcard[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.language) queryParams.append('language', params.language);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const url = `${API_BASE_URL}/api/cards${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch flashcards');
    }
    
    return response.json();
  },

  async getAdaptiveFlashcards(params?: {
    language?: string;
    selectedCategories?: string[];
    learningPreferenceProfile?: LearningPreferenceProfile | null;
    limit?: number;
    maxCefrLevel?: string;
  }): Promise<AdaptiveFlashcard[]> {
    const learningPreferenceProfile = params?.learningPreferenceProfile;
    if (learningPreferenceProfile) {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/cards/adaptive/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: params?.language,
          selected_categories: params?.selectedCategories ?? [],
          profile: learningPreferenceProfile,
          limit: params?.limit ?? 50,
          max_cefr_level: params?.maxCefrLevel,
        }),
      }, SLOW_AI_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error('Failed to fetch adaptive flashcards');
      }

      return response.json();
    }

    const queryParams = new URLSearchParams();

    if (params?.language) queryParams.append('language', params.language);
    params?.selectedCategories?.forEach((category) => queryParams.append('category', category));
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.maxCefrLevel) queryParams.append('max_cefr_level', params.maxCefrLevel);

    const url = `${API_BASE_URL}/api/cards/adaptive${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error('Failed to fetch adaptive flashcards');
    }

    return response.json();
  },

  async getAdaptiveLearningSummary(language: TargetLanguage): Promise<AdaptiveLearningSummary> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/statistics/adaptive-summary?language=${language}`);

    if (!response.ok) {
      throw new Error('Failed to fetch adaptive learning summary');
    }

    return response.json();
  },

  async getPathMissions(language: TargetLanguage): Promise<PathMissionsResponse> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/missions/path?language=${language}`);

    if (!response.ok) {
      throw new Error('Failed to fetch path missions');
    }

    return response.json();
  },

  async completePathMission(missionId: string, language: TargetLanguage): Promise<PathMissionsResponse> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/missions/path/${encodeURIComponent(missionId)}/complete?language=${language}`,
      { method: 'POST' },
    );

    if (!response.ok) {
      throw new Error('Failed to complete path mission');
    }

    return response.json();
  },

  async getAllWordStatistics(language: TargetLanguage): Promise<WordStatistics[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/statistics/all?language=${language}`);

    if (!response.ok) {
      throw new Error('Failed to fetch vocabulary statistics');
    }

    return response.json();
  },

  async recordProgress(cardId: number, known: boolean, userId?: string): Promise<UserProgress> {
    const body: { card_id: string; known: boolean; user_id?: string } = {
      card_id: String(cardId),
      known,
    };
    if (userId) {
      body.user_id = userId;
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error('Failed to record progress');
    }
    
    return response.json();
  },

  async getProgress(userId?: string): Promise<UserProgress> {
    const url = userId
      ? `${API_BASE_URL}/api/progress?user_id=${encodeURIComponent(userId)}`
      : `${API_BASE_URL}/api/progress`;
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch progress');
    }
    
    return response.json();
  },

  async resetProgress(userId?: string): Promise<void> {
    const url = userId
      ? `${API_BASE_URL}/api/progress/reset?user_id=${encodeURIComponent(userId)}`
      : `${API_BASE_URL}/api/progress/reset`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset progress');
    }
  },

  // Word/flashcard audio (target language). Not feature-gated: stays available
  // offline via the native plugin serving pre-generated DB cache.
  async speakText(text: string, language: TargetLanguage, voice: string = 'nova'): Promise<TTSResponse> {
    return postSpeech(text, language, voice);
  },

  // Narration of animated explanation text (source locale).
  async speakNarration(text: string, language: string, voice: string = 'nova'): Promise<TTSResponse> {
    if (!isFeatureEnabled('textToSpeech')) {
      throw new Error('Text-to-speech is not available in offline mode');
    }
    return postSpeech(text, language, voice);
  },

  async getGrammarSentences(): Promise<GrammarSentence[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/grammar/sentences`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch grammar sentences');
    }
    
    return response.json();
  },

  async generateSpeech(text: string, language: TargetLanguage, voice: string = 'nova'): Promise<TTSResponse> {
    if (!isFeatureEnabled('textToSpeech')) {
      throw new Error('Text-to-speech is not available in offline mode');
    }
    return postSpeech(text, language, voice);
  },

  async checkAudioExists(texts: string[], language?: TargetLanguage, voice: string = 'nova'): Promise<TTSCheckResponse> {
    if (!isFeatureEnabled('textToSpeech')) {
      return { results: Object.fromEntries(texts.map((text) => [text, false])) };
    }
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/tts/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts, language, voice }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to check audio cache');
    }
    
    return response.json();
  },

  async getAvailableNodes(params?: number | {
    limit?: number;
    learningPreferenceProfile?: LearningPreferenceProfile | null;
  }): Promise<GrammarNode[]> {
    const queryParams = new URLSearchParams();
    const limit = typeof params === 'number' ? params : params?.limit ?? 360;
    queryParams.append('limit', limit.toString());
    if (typeof params !== 'number') {
      appendLearningPreferenceProfile(queryParams, params?.learningPreferenceProfile);
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/grammar/available-nodes?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch available nodes');
    }
    
    return response.json();
  },

  async getSentenceChallenges(params?: {
    language?: string;
    difficulty?: string;
    limit?: number;
    learningPreferenceProfile?: LearningPreferenceProfile | null;
  }): Promise<SentenceChallenge[]> {
    const queryParams = new URLSearchParams();
    if (params?.language) queryParams.append('language', params.language);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    appendLearningPreferenceProfile(queryParams, params?.learningPreferenceProfile);

    const url = `${API_BASE_URL}/api/grammar/sentence-challenges${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error('Failed to fetch sentence challenges');
    }

    return response.json();
  },

  async getMatchPairs(params: {
    target: string;
    base: string;
    limit?: number;
    maxCefrLevel?: string;
  }): Promise<MatchPair[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('target', params.target);
    queryParams.append('base', params.base);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.maxCefrLevel) queryParams.append('max_cefr_level', params.maxCefrLevel);

    const url = `${API_BASE_URL}/api/games/match-pairs?${queryParams.toString()}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error('Failed to fetch match pairs');
    }

    return response.json();
  },

  async getSentencePractice(params: {
    target: string;
    level?: string;
    limit?: number;
  }): Promise<number[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('target', params.target);
    if (params.level) queryParams.append('level', params.level);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const url = `${API_BASE_URL}/api/games/sentence-practice?${queryParams.toString()}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error('Failed to fetch sentence practice words');
    }

    return response.json();
  },

  async getWordImage(id: number): Promise<string | null> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/games/word-image?id=${id}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.image_base64 ?? null;
  },

  async getExampleSentences(params: {
    ids: number[];
    level?: string;
    perWord?: number;
  }): Promise<WordSentences[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('ids', params.ids.join(','));
    if (params.level) queryParams.append('level', params.level);
    if (params.perWord) queryParams.append('per_word', params.perWord.toString());

    const url = `${API_BASE_URL}/api/games/example-sentences?${queryParams.toString()}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error('Failed to fetch example sentences');
    }

    return response.json();
  },

  async validateSentence(request: ValidateSentenceRequest): Promise<ValidateSentenceResponse> {
    if (!isFeatureEnabled('grammarValidation')) {
      return {
        status: 'yellow',
        sentence: '',
        grammar_correct: false,
        semantic_correct: false,
        explanation: 'Grammar validation is not available in offline mode',
        suggestion: undefined,
      };
    }
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/grammar/validate-sentence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }, SLOW_AI_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error('Failed to validate sentence');
    }

    return response.json();
  },

  async getLibraryFilters(language?: string): Promise<LibraryFilters> {
    const queryParams = new URLSearchParams();
    if (language) queryParams.append('language', language);
    
    const url = `${API_BASE_URL}/api/library/filters${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch library filters');
    }
    
    return response.json();
  },

  async getLibraryStats(language?: string): Promise<LibraryStats> {
    const queryParams = new URLSearchParams();
    if (language) queryParams.append('language', language);
    
    const url = `${API_BASE_URL}/api/library/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch library stats');
    }
    
    return response.json();
  },

  async getLibraryWords(params?: {
    language?: string;
    search?: string;
    category?: string;
    cefr_level?: string;
    frequency_band?: string;
    register?: string;
    gender?: string;
    part_of_speech?: string;
    is_compound?: boolean;
    word_formation?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<FlashcardWithProgress[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.language) queryParams.append('language', params.language);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.cefr_level) queryParams.append('cefr_level', params.cefr_level);
    if (params?.frequency_band) queryParams.append('frequency_band', params.frequency_band);
    if (params?.register) queryParams.append('register', params.register);
    if (params?.gender) queryParams.append('gender', params.gender);
    if (params?.part_of_speech) queryParams.append('part_of_speech', params.part_of_speech);
    if (params?.is_compound !== undefined) queryParams.append('is_compound', String(params.is_compound));
    if (params?.word_formation) queryParams.append('word_formation', params.word_formation);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));
    
    const url = `${API_BASE_URL}/api/library/words${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch library words');
    }
    
    return response.json();
  },

  async getWordDetail(wordId: number): Promise<FlashcardDetail> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/library/words/${wordId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch word detail');
    }
    
    return response.json();
  },

  async getWordDbRow(wordId: number): Promise<WordDbRow> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/library/words/${wordId}/db-row`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch word database row');
    }
    
    return response.json();
  },

  async getDialectWords(language: TargetLanguage): Promise<DialectWord[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/library/dialects?language=${language}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch dialect words');
    }
    
    return response.json();
  },

  async updateWordStatistics(word: string, correct: boolean, language: TargetLanguage): Promise<{
    word: string;
    new_confidence_score: number;
    knowledge_level: number;
    times_seen: number;
    times_correct: number;
    times_incorrect: number;
  }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/statistics/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language, correct }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update word statistics');
    }
    
    return response.json();
  },

  async getWordStatistics(word: string, language: TargetLanguage): Promise<{
    word: string;
    language: string;
    confidence_score: number;
    knowledge_level: number;
    times_seen: number;
    times_correct: number;
    times_incorrect: number;
    last_practiced: string | null;
  }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/statistics/word/${encodeURIComponent(word)}?language=${language}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch word statistics');
    }
    
    return response.json();
  },

  async submitFeedback(payload: {
    message: string;
    sentiment?: 'like' | 'dislike' | 'neutral';
    source_url?: string;
    app_version?: string;
    nickname?: string;
    age?: number;
    profession?: 'artist' | 'humanist' | 'scientific' | 'technical' | 'student' | 'other';
    gender?: 'woman' | 'man' | 'other' | 'undisclosed';
    native_language?: 'it' | 'en' | 'es' | 'de' | 'fr' | 'pt' | 'other';
    target_level?: 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'none';
    learning_motivation?: string;
  }): Promise<{ id: string; created_at: number }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Failed to submit feedback (${response.status}) ${detail}`);
    }
    return response.json();
  },

  async loginWithGoogle(idToken: string): Promise<AuthSession> {
    // Pass the current anonymous id so a brand-new account adopts this device's
    // existing progress.
    const currentUserId = await getOrCreateUserId();
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken, current_user_id: currentUserId }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Login failed (${response.status}) ${detail}`);
    }
    const data = await response.json();
    return {
      canonicalUserId: data.canonical_user_id,
      email: data.email,
      isOwner: data.is_owner === true,
    };
  },

  async importKnownWords(language: TargetLanguage, text: string): Promise<ImportKnownResult> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/vocabulary/import-known`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, text }),
    }, SLOW_AI_TIMEOUT_MS);
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Import failed (${response.status}) ${detail}`);
    }
    return response.json();
  },

  async getMovieRecommendations(language: TargetLanguage, limit = 20): Promise<MovieRecommendation[]> {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/movies/recommendations?language=${language}&limit=${limit}`,
      { method: 'GET' },
    );
    if (!response.ok) {
      throw new Error(`Failed to load recommendations (${response.status})`);
    }
    return response.json();
  },

};
