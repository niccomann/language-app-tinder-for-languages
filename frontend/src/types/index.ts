export interface Flashcard {
  id: number;
  word: string;
  translation: string;
  image_url: string;
  language: string;
  difficulty?: string;
  category?: string;
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

export interface SoraVideoGenerationRequest {
  word: string;
  translation: string;
  language?: string;
  category?: string;
  model?: string;
  duration?: number;
  resolution?: string;
}

export interface SoraVideoGenerationResponse {
  job_id: string;
  status: string;
  word: string;
  translation: string;
  model: string;
  message: string;
}

export interface SoraJobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  video_url?: string;
  duration?: number;
  resolution?: string;
  error?: string;
}
