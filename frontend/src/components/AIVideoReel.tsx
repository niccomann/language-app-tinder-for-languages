/**
 * AIVideoReel Component
 * TikTok-style vertical reel for AI-generated videos
 */

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { soraService } from '../services/sora';
import type { SoraJobStatus } from '../types';

interface AIVideo {
  job_id: string;
  video_url: string;
  status: string;
  duration?: number;
  resolution?: string;
}

interface AIVideoReelProps {
  word: string;
  translation: string;
  language: string;
  onClose: () => void;
  videoCount?: number;
}

export function AIVideoReel({ 
  word, 
  translation, 
  language, 
  onClose,
  videoCount = 3 
}: AIVideoReelProps) {
  const [videos, setVideos] = useState<AIVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{ [key: string]: number }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Generate multiple AI videos
  useEffect(() => {
    const generateVideos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Start generation for multiple videos
        const jobPromises = Array.from({ length: videoCount }, async (_, index) => {
          try {
            const response = await soraService.generateVideo({
              word,
              translation,
              language,
              duration: 5,
              model: 'sora-2'
            });
            
            return {
              job_id: response.job_id,
              status: response.status,
              index
            };
          } catch (error) {
            console.error(`Failed to start video generation ${index + 1}:`, error);
            return null;
          }
        });

        const jobs = await Promise.all(jobPromises);
        const validJobs = jobs.filter(job => job !== null);

        if (validJobs.length === 0) {
          throw new Error('Failed to start any video generation');
        }

        // Poll for completion of all videos
        const pollPromises = validJobs.map(async (job) => {
          if (!job) return null;
          
          try {
            // Poll with progress updates
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max
            
            while (attempts < maxAttempts) {
              const status: SoraJobStatus = await soraService.getJobStatus(job.job_id);
              
              // Update progress
              const progress = Math.min(95, (attempts / maxAttempts) * 100);
              setGenerationProgress(prev => ({
                ...prev,
                [job.job_id]: progress
              }));

              if (status.status === 'completed' && status.video_url) {
                setGenerationProgress(prev => ({
                  ...prev,
                  [job.job_id]: 100
                }));
                
                return {
                  job_id: job.job_id,
                  video_url: status.video_url,
                  status: 'completed',
                  duration: status.duration,
                  resolution: status.resolution
                };
              }

              if (status.status === 'failed') {
                console.error(`Video generation failed for job ${job.job_id}`);
                return null;
              }

              await new Promise(resolve => setTimeout(resolve, 5000));
              attempts++;
            }

            return null;
          } catch (error) {
            console.error(`Error polling job ${job.job_id}:`, error);
            return null;
          }
        });

        const completedVideos = await Promise.all(pollPromises);
        const validVideos = completedVideos.filter(v => v !== null) as AIVideo[];

        if (validVideos.length === 0) {
          throw new Error('No videos were generated successfully');
        }

        setVideos(validVideos);
        setLoading(false);
      } catch (err) {
        console.error('Error generating AI videos:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate videos');
        setLoading(false);
      }
    };

    generateVideos();
  }, [word, translation, language, videoCount]);

  // Sync currentIndex with scroll position
  useEffect(() => {
    if (!containerRef.current || videos.length === 0) return;

    const container = containerRef.current;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const viewportHeight = window.innerHeight;
        const newIndex = Math.round(scrollTop / viewportHeight);
        
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
          setCurrentIndex(newIndex);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentIndex, videos.length]);

  // Control video playback
  useEffect(() => {
    if (videos.length === 0) return;

    videos.forEach((video, index) => {
      const videoElement = videoRefs.current[video.job_id];
      if (!videoElement) return;

      if (index === currentIndex) {
        videoElement.play().catch(() => {});
      } else {
        videoElement.pause();
      }
    });
  }, [currentIndex, videos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < videos.length - 1) {
          const newIndex = currentIndex + 1;
          setCurrentIndex(newIndex);
          
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: newIndex * window.innerHeight,
              behavior: 'smooth',
            });
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          setCurrentIndex(newIndex);
          
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: newIndex * window.innerHeight,
              behavior: 'smooth',
            });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length, onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-6" />
          <h3 className="text-white text-2xl font-bold mb-4">
            Generating AI Videos
          </h3>
          <p className="text-gray-400 mb-6">
            Creating {videoCount} personalized videos for "{word}"...
          </p>
          <p className="text-gray-500 text-sm">
            This may take a few minutes
          </p>
          
          {/* Progress indicators */}
          <div className="mt-8 space-y-3">
            {Object.entries(generationProgress).map(([jobId, progress], index) => (
              <div key={jobId} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Video {index + 1}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-white text-xl font-bold mb-2">
            Generation Failed
          </h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all shadow-lg"
      >
        <X size={24} />
      </button>

      {/* Word Info */}
      <div className="absolute top-6 left-6 z-50 bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-sm rounded-2xl px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <div>
            <h2 className="text-white font-bold text-xl">{word}</h2>
            <p className="text-white/90 text-sm">{translation}</p>
          </div>
        </div>
      </div>

      {/* Video Counter */}
      <div className="absolute bottom-6 right-6 z-50 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
        <p className="text-white text-sm font-medium">
          {currentIndex + 1} / {videos.length}
        </p>
      </div>

      {/* Video Container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {videos.map((video, index) => (
          <div
            key={video.job_id}
            className="relative w-full h-full flex-shrink-0 snap-start snap-always flex items-center justify-center"
            style={{ backgroundColor: '#000' }}
          >
            <video
              ref={el => videoRefs.current[video.job_id] = el}
              src={video.video_url}
              className="w-full h-full object-contain"
              loop
              playsInline
              controls
            />

            {/* Video Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-30">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-purple-600/80 rounded-full text-white text-xs font-semibold">
                  AI Generated
                </span>
                {video.resolution && (
                  <span className="px-3 py-1 bg-black/50 rounded-full text-white text-xs">
                    {video.resolution}
                  </span>
                )}
              </div>
              <h3 className="text-white font-bold text-lg">
                {word} - {translation}
              </h3>
              {video.duration && (
                <p className="text-gray-300 text-sm">{video.duration}s</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 z-50 text-white/70 text-sm space-y-1">
        <p>↕️ Arrow keys to navigate</p>
        <p>ESC to close</p>
      </div>

      <style>{`
        .overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
