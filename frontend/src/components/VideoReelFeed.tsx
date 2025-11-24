import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { VideoReelItem } from './VideoReelItem';
import { useVideoFeed } from '../hooks/useVideoFeed';

interface VideoReelFeedProps {
  word: string;
  translation: string;
  language: string;
  onClose: () => void;
}

export function VideoReelFeed({ word, translation, language, onClose }: VideoReelFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const videoFeed = useVideoFeed({ word, translation, language });

  // Load videos on mount
  useEffect(() => {
    videoFeed.loadVideos();
  }, []);

  // Scroll to video by index
  const scrollToVideo = useCallback((index: number) => {
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      
      const targetScroll = index * container.clientHeight;
      
      setIsScrolling(true);
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      setTimeout(() => setIsScrolling(false), 500);
    }, 100);
  }, []);

  const handleScrollUp = useCallback(() => {
    if (videoFeed.currentIndex > 0) {
      const newIndex = videoFeed.currentIndex - 1;
      // Update index FIRST, then scroll
      videoFeed.goToPrevious();
      scrollToVideo(newIndex);
    }
  }, [videoFeed.currentIndex, scrollToVideo, videoFeed.goToPrevious]);

  const handleScrollDown = useCallback(() => {
    if (videoFeed.hasMore) {
      const newIndex = videoFeed.currentIndex + 1;
      // Update index FIRST, then scroll
      videoFeed.goToNext();
      scrollToVideo(newIndex);
    }
  }, [videoFeed.hasMore, videoFeed.currentIndex, scrollToVideo, videoFeed.goToNext]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleScrollUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleScrollDown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleScrollUp, handleScrollDown]);

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedUp: () => {
      if (!isScrolling) handleScrollDown();
    },
    onSwipedDown: () => {
      if (!isScrolling) handleScrollUp();
    },
    onSwipedRight: () => {
      onClose();
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  // Handle scroll snap - sync currentIndex with actual scroll position
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Don't interfere if we're programmatically scrolling
      if (isScrolling) return;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const itemHeight = container.clientHeight;
        const newIndex = Math.round(scrollTop / itemHeight);
        
        if (newIndex !== videoFeed.currentIndex && newIndex >= 0 && newIndex < videoFeed.videos.length) {
          if (newIndex > videoFeed.currentIndex) {
            videoFeed.goToNext();
          } else {
            videoFeed.goToPrevious();
          }
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [videoFeed.currentIndex, videoFeed.goToNext, videoFeed.goToPrevious, videoFeed.videos.length, isScrolling]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-3 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all shadow-lg"
        aria-label="Close reel"
      >
        <X size={24} />
      </button>

      {/* Word Info - Top */}
      <div className="absolute top-6 left-6 z-50 bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
        <h2 className="text-white font-bold text-xl">
          {word}
        </h2>
        <p className="text-gray-300 text-sm">
          {translation}
        </p>
      </div>

      {/* Navigation Hints */}
      {videoFeed.videos.length > 0 && (
        <>
          {videoFeed.currentIndex > 0 && (
            <button
              onClick={handleScrollUp}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[250px] z-40 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
              aria-label="Previous video"
            >
              <ChevronUp size={32} />
            </button>
          )}
          
          {videoFeed.hasMore && (
            <button
              onClick={handleScrollDown}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-[220px] z-40 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
              aria-label="Next video"
            >
              <ChevronDown size={32} />
            </button>
          )}
        </>
      )}

      {/* Video Counter */}
      {videoFeed.videos.length > 0 && (
        <div className="absolute bottom-6 right-6 z-50 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
          <p className="text-white text-sm font-medium">
            {videoFeed.currentIndex + 1} / {videoFeed.videos.length}
          </p>
        </div>
      )}

      {/* Loading State */}
      {videoFeed.loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-white animate-spin mx-auto" />
            <p className="text-white text-lg font-medium">Loading videos...</p>
            <p className="text-gray-400 text-sm">Finding the best content for "{word}"</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {videoFeed.error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center space-y-4 max-w-md px-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h3 className="text-white text-xl font-bold">Failed to load videos</h3>
            <p className="text-gray-400">{videoFeed.error}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Video Feed Container */}
      {!videoFeed.loading && !videoFeed.error && videoFeed.videos.length > 0 && (
        <div
          ref={containerRef}
          {...swipeHandlers}
          className="w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            overscrollBehavior: 'contain',
          }}
        >
          {videoFeed.videos.map((video, index) => (
            <VideoReelItem
              key={video.video_id}
              video={video}
              isActive={index === videoFeed.currentIndex}
            />
          ))}
        </div>
      )}

      {/* Instructions - Bottom Left */}
      <div className="absolute bottom-6 left-6 z-50 space-y-2 text-white/70 text-sm">
        <p>↕️ Swipe or scroll to navigate</p>
        <p>→ Swipe right to continue learning</p>
        <p>ESC to close</p>
      </div>

      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
