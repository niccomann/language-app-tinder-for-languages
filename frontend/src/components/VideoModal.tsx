import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { VideoData } from '../types';

interface VideoModalProps {
  video: VideoData;
  onClose: () => void;
}

export const VideoModal = ({ video, onClose }: VideoModalProps) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md h-[80vh] bg-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
          aria-label="Close video"
        >
          <X size={24} />
        </button>

        {/* Video info header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black to-transparent">
          <h3 className="text-white font-semibold text-sm line-clamp-2 mb-1">
            {video.title}
          </h3>
          <p className="text-gray-300 text-xs">
            {video.channel} · {video.duration}s
          </p>
        </div>

        {/* YouTube embed */}
        <div className="w-full h-full">
          <iframe
            src={video.embed_url}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Tap to close hint */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-white text-xs opacity-70">
            Tap anywhere to close
          </p>
        </div>
      </div>
    </div>
  );
};
