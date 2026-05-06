/**
 * VideoSourceSelector Component
 * Modal for choosing between YouTube videos or AI-generated videos
 */

import { Youtube, Sparkles, X } from 'lucide-react';

interface VideoSourceSelectorProps {
  isOpen: boolean;
  word: string;
  translation: string;
  onSelectYouTube: () => void;
  onSelectAI: () => void;
  onClose: () => void;
}

export function VideoSourceSelector({
  isOpen,
  word,
  translation,
  onSelectYouTube,
  onSelectAI,
  onClose,
}: VideoSourceSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl mx-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="p-8 text-center border-b border-white/10">
          <h2 className="text-3xl font-bold text-white mb-2">
            Choose Video Source
          </h2>
          <p className="text-gray-400 text-lg">
            Learning: <span className="text-white font-semibold">{word}</span> ({translation})
          </p>
        </div>

        {/* Options */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* YouTube Option */}
          <button
            onClick={onSelectYouTube}
            className="group relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
          >
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="p-4 bg-white/20 rounded-full">
                <Youtube className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">YouTube Videos</h3>
              <p className="text-white/90 text-sm text-center">
                Watch educational videos from real teachers and content creators
              </p>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <span className="px-3 py-1 bg-white/20 rounded-full">Fast</span>
                <span className="px-3 py-1 bg-white/20 rounded-full">8 Videos</span>
              </div>
            </div>
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/0 via-red-400/20 to-red-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </button>

          {/* AI Generated Option */}
          <button
            onClick={onSelectAI}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95"
          >
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="p-4 bg-white/20 rounded-full">
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">AI Generated</h3>
              <p className="text-white/90 text-sm text-center">
                Custom videos generated with AI specifically for this word
              </p>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <span className="px-3 py-1 bg-white/20 rounded-full">Personalized</span>
                <span className="px-3 py-1 bg-white/20 rounded-full">High Quality</span>
              </div>
            </div>
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-8 pb-6 text-center">
          <p className="text-gray-500 text-sm">
            You can always close and continue learning with ESC
          </p>
        </div>
      </div>
    </div>
  );
}
