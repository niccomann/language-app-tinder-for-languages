import type { VideoData } from '../../../types';
import { API_BASE_URL } from '../../../config/appMode';

const isDeprecatedYoutubeEnabled = () => false;

export const videoApi = {
  async searchVideo(word: string, translation: string, language: string = 'de'): Promise<VideoData> {
    if (!isDeprecatedYoutubeEnabled()) {
      throw new Error('YouTube videos are deprecated and not available in the main app flow');
    }
    
    const response = await fetch(`${API_BASE_URL}/videos/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        word,
        translation,
        language,
      }),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No video found for word: ${word}`);
      }
      throw new Error('Failed to search video');
    }
    
    return response.json();
  },
};
