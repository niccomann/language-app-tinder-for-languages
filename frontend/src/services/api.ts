import type { Flashcard, UserProgress, FlashcardWithProgress, GrammarSentence, GrammarNode, TTSResponse, TTSCheckResponse, ValidateSentenceRequest, ValidateSentenceResponse, LibraryFilters, LibraryStats, FlashcardDetail, DialectWord } from '../types';
import { API_BASE_URL, isFeatureEnabled } from '../config/appMode';

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
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch flashcards');
    }
    
    return response.json();
  },

  async recordProgress(cardId: number, known: boolean): Promise<UserProgress> {
    const response = await fetch(`${API_BASE_URL}/api/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        card_id: String(cardId),
        known,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to record progress');
    }
    
    return response.json();
  },

  async getProgress(): Promise<UserProgress> {
    const response = await fetch(`${API_BASE_URL}/api/progress`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch progress');
    }
    
    return response.json();
  },

  async resetProgress(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/progress/reset`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset progress');
    }
  },

  async speakText(text: string, language: string = 'de'): Promise<TTSResponse> {
    const response = await fetch(`${API_BASE_URL}/api/tts/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }
    
    return response.json();
  },

  async getWordsLibrary(params?: {
    status?: 'known' | 'unknown' | 'all';
    language?: string;
    category?: string;
    search?: string;
  }): Promise<FlashcardWithProgress[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.status) queryParams.append('status', params.status);
    if (params?.language) queryParams.append('language', params.language);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    
    const url = `${API_BASE_URL}/api/words/library${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch words library');
    }
    
    return response.json();
  },

  async getGrammarSentences(): Promise<GrammarSentence[]> {
    const response = await fetch(`${API_BASE_URL}/api/grammar/sentences`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch grammar sentences');
    }
    
    return response.json();
  },

  async generateSpeech(text: string, language: string = 'de', voice: string = 'nova'): Promise<TTSResponse> {
    if (!isFeatureEnabled('textToSpeech')) {
      throw new Error('Text-to-speech is not available in offline mode');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/tts/speak`, {
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

  async checkAudioExists(texts: string[], language: string = 'de', voice: string = 'nova'): Promise<TTSCheckResponse> {
    if (!isFeatureEnabled('textToSpeech')) {
      return { results: texts.map(() => ({ exists: false })) };
    }
    
    const response = await fetch(`${API_BASE_URL}/api/tts/check`, {
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

  async getAvailableNodes(): Promise<GrammarNode[]> {
    const response = await fetch(`${API_BASE_URL}/api/grammar/available-nodes`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch available nodes');
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
        suggestion: null,
      };
    }
    
    const response = await fetch(`${API_BASE_URL}/api/grammar/validate-sentence`, {
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
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch library filters');
    }
    
    return response.json();
  },

  async getLibraryStats(language?: string): Promise<LibraryStats> {
    const queryParams = new URLSearchParams();
    if (language) queryParams.append('language', language);
    
    const url = `${API_BASE_URL}/api/library/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url);
    
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
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch library words');
    }
    
    return response.json();
  },

  async getWordDetail(wordId: number): Promise<FlashcardDetail> {
    const response = await fetch(`${API_BASE_URL}/api/library/words/${wordId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch word detail');
    }
    
    return response.json();
  },

  async getDialectWords(language: string = 'de'): Promise<DialectWord[]> {
    const response = await fetch(`${API_BASE_URL}/api/library/dialects?language=${language}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch dialect words');
    }
    
    return response.json();
  },

  async updateWordStatistics(word: string, correct: boolean, language: string = 'de'): Promise<{
    word: string;
    new_confidence_score: number;
    times_seen: number;
    times_correct: number;
    times_incorrect: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/statistics/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language, correct }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update word statistics');
    }
    
    return response.json();
  },

  async getWordStatistics(word: string, language: string = 'de'): Promise<{
    word: string;
    language: string;
    confidence_score: number;
    times_seen: number;
    times_correct: number;
    times_incorrect: number;
    last_practiced: string | null;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/statistics/word/${encodeURIComponent(word)}?language=${language}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch word statistics');
    }
    
    return response.json();
  },

  async getStatisticsSummary(language: string = 'de'): Promise<{
    total_words_practiced: number;
    average_confidence: number;
    words_mastered: number;
    words_learning: number;
    words_struggling: number;
    total_practice_sessions: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/statistics/summary?language=${language}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch statistics summary');
    }
    
    return response.json();
  },
};
