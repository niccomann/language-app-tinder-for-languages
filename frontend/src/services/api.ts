import type { Flashcard, UserProgress } from '../types';

const API_BASE_URL = 'http://localhost:8000';

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
};
