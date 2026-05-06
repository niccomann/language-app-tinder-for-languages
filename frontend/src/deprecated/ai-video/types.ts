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
