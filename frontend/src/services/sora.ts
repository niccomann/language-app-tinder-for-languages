/**
 * Sora AI Video Generation Service
 * Handles communication with the backend Sora API
 */

import type { 
  SoraVideoGenerationRequest, 
  SoraVideoGenerationResponse, 
  SoraJobStatus 
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

class SoraService {
  /**
   * Initiate video generation for a flashcard word
   */
  async generateVideo(
    request: SoraVideoGenerationRequest
  ): Promise<SoraVideoGenerationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/sora/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate video');
    }

    return response.json();
  }

  /**
   * Check the status of a video generation job
   */
  async getJobStatus(jobId: string): Promise<SoraJobStatus> {
    const response = await fetch(`${API_BASE_URL}/api/sora/status/${jobId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get job status');
    }

    return response.json();
  }

  /**
   * Generate video and wait for completion (blocking call)
   * This will wait up to the specified timeout for the video to be ready
   */
  async generateVideoAndWait(
    request: SoraVideoGenerationRequest,
    timeout: number = 300
  ): Promise<SoraJobStatus> {
    const response = await fetch(
      `${API_BASE_URL}/api/sora/generate-and-wait?timeout=${timeout}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate video');
    }

    return response.json();
  }

  /**
   * Poll for job completion with custom interval
   * Returns a promise that resolves when the video is ready or fails
   */
  async pollUntilComplete(
    jobId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<SoraJobStatus> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Video generation failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Video generation timed out');
  }

  /**
   * Check if Sora service is healthy and configured
   */
  async checkHealth(): Promise<{ status: string; api_key_configured: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/sora/health`);
    return response.json();
  }
}

export const soraService = new SoraService();
