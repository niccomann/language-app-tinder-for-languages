import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AdaptiveFlashcard, AdaptiveLearningSummary, Flashcard, UserProgress, FlashcardWithProgress, GrammarSentence, GrammarNode, SentenceChallenge, TTSResponse, TTSCheckResponse, ValidateSentenceRequest, ValidateSentenceResponse, LibraryFilters, LibraryStats, FlashcardDetail, DialectWord, WordDbRow, WordStatistics } from '../types';
import { API_BASE_URL, API_REQUEST_TIMEOUT_MS, APP_MODE, isFeatureEnabled } from '../config/appMode';
import type { LearningPreferenceProfile } from '../learning/preferenceProfile';
import type { TargetLanguage } from '../i18n/languageStorage';

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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  try {
    if (shouldUseOfflineBackend(input)) {
      return await fetchFromOfflineBackend(input, init);
    }

    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${API_REQUEST_TIMEOUT_MS}ms`);
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch adaptive flashcards');
      }

      return response.json();
    }

    const queryParams = new URLSearchParams();

    if (params?.language) queryParams.append('language', params.language);
    params?.selectedCategories?.forEach((category) => queryParams.append('category', category));
    if (params?.limit) queryParams.append('limit', params.limit.toString());

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

  async getAllWordStatistics(language: TargetLanguage): Promise<WordStatistics[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/statistics/all?language=${language}`);

    if (!response.ok) {
      throw new Error('Failed to fetch vocabulary statistics');
    }

    return response.json();
  },

  async recordProgress(cardId: number, known: boolean, userId: string = 'default_user'): Promise<UserProgress> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_id: String(cardId),
        known,
        user_id: userId,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to record progress');
    }
    
    return response.json();
  },

  async getProgress(userId: string = 'default_user'): Promise<UserProgress> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/progress?user_id=${encodeURIComponent(userId)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch progress');
    }
    
    return response.json();
  },

  async resetProgress(userId: string = 'default_user'): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/progress/reset?user_id=${encodeURIComponent(userId)}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset progress');
    }
  },

  async speakText(text: string, language: TargetLanguage): Promise<TTSResponse> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/tts/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }
    
    return response.json();
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
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/tts/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, language, voice }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }
    
    return response.json();
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
    });
    
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

};
