/**
 * SoraVideoModal Component
 * Displays AI-generated videos from Sora when user doesn't know a word
 */

import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { SoraJobStatus } from '../types';
import { API_BASE_URL } from '../config/appMode';

interface SoraVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
  word: string;
  translation: string;
  onVideoReady?: (videoUrl: string) => void;
}

export function SoraVideoModal({
  isOpen,
  onClose,
  jobId,
  word,
  translation,
  onVideoReady,
}: SoraVideoModalProps) {
  const [status, setStatus] = useState<SoraJobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen || !jobId) {
      setStatus(null);
      setLoading(true);
      setError(null);
      setProgress(0);
      return;
    }

    let pollInterval: NodeJS.Timeout;
    let progressInterval: NodeJS.Timeout;

    const pollJobStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sora/status/${jobId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check video status');
        }

        const data: SoraJobStatus = await response.json();
        setStatus(data);

        if (data.status === 'completed' && data.video_url) {
          setLoading(false);
          setProgress(100);
          clearInterval(pollInterval);
          clearInterval(progressInterval);
          onVideoReady?.(data.video_url);
        } else if (data.status === 'failed') {
          setLoading(false);
          setError(data.error || 'Video generation failed');
          clearInterval(pollInterval);
          clearInterval(progressInterval);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        clearInterval(pollInterval);
        clearInterval(progressInterval);
      }
    };

    // Start polling
    pollJobStatus();
    pollInterval = setInterval(pollJobStatus, 5000);

    // Simulate progress (since we don't have real progress from API)
    progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 5;
      });
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(progressInterval);
    };
  }, [isOpen, jobId, onVideoReady]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white mb-2">
            {word} <span className="text-gray-400">({translation})</span>
          </h2>
          <p className="text-gray-400 text-sm">
            Generating AI video to help you learn...
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading && (
            <div className="flex flex-col items-center justify-center space-y-6 py-12">
              <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
              
              <div className="text-center space-y-2">
                <p className="text-white text-lg font-medium">
                  Creating your video...
                </p>
                <p className="text-gray-400 text-sm">
                  This may take a few minutes
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-md">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-gray-500 text-xs mt-2">
                  {Math.round(progress)}%
                </p>
              </div>

              {/* Status message */}
              {status && (
                <p className="text-gray-500 text-sm">
                  Status: {status.status}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <AlertCircle className="w-16 h-16 text-red-500" />
              <div className="text-center space-y-2">
                <p className="text-white text-lg font-medium">
                  Failed to generate video
                </p>
                <p className="text-gray-400 text-sm max-w-md">
                  {error}
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors whitespace-nowrap min-w-fit"
              >
                Close
              </button>
            </div>
          )}

          {!loading && !error && status?.video_url && (
            <div className="space-y-4">
              <video
                src={status.video_url}
                controls
                autoPlay
                loop
                className="w-full rounded-lg shadow-lg"
                style={{ maxHeight: '60vh' }}
              >
                Your browser does not support video playback.
              </video>

              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>Duration: {status.duration}s</span>
                <span>Resolution: {status.resolution}</span>
              </div>

              <button
                onClick={onClose}
                className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium whitespace-nowrap"
              >
                Continue Learning
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
