import { useEffect, useRef } from 'react';
import type { VideoData } from '../types';

interface VideoReelItemProps {
  video: VideoData;
  isActive: boolean;
  onVideoEnd?: () => void;
}

export function VideoReelItem({ video, isActive, onVideoEnd }: VideoReelItemProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasPlayedRef = useRef(false);
  
  // Control video playback when isActive changes
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    
    const iframe = iframeRef.current;
    
    if (isActive && !hasPlayedRef.current) {
      // Play video when it becomes active
      console.log(`▶️  Playing video: ${video.video_id}`);
      hasPlayedRef.current = true;
      
      // Send play command multiple times to ensure it works
      const playCommands = [0, 100, 300, 500];
      playCommands.forEach(delay => {
        setTimeout(() => {
          iframe.contentWindow?.postMessage(
            '{"event":"command","func":"playVideo","args":""}',
            '*'
          );
        }, delay);
      });
    } else if (!isActive && hasPlayedRef.current) {
      // Pause video when it becomes inactive
      console.log(`⏸️  Pausing video: ${video.video_id}`);
      iframe.contentWindow?.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}',
        '*'
      );
    }
  }, [isActive, video.video_id]);
  
  // Reset hasPlayed when video changes
  useEffect(() => {
    hasPlayedRef.current = false;
  }, [video.video_id]);
  
  return (
    <div className="relative w-full h-full flex-shrink-0 snap-start snap-always">
      {/* Video Container - Always render iframe but control visibility */}
      <div className="absolute inset-0 bg-black">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${video.video_id}?enablejsapi=1&controls=1&modestbranding=1&rel=0&playsinline=1&mute=0`}
          title={video.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ display: isActive ? 'block' : 'none' }}
        />
        
        {/* Thumbnail overlay when not active */}
        {!isActive && (
          <div 
            className="absolute inset-0 w-full h-full flex items-center justify-center bg-cover bg-center"
            style={{ backgroundImage: `url(${video.thumbnail})` }}
          >
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                  <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1" />
                </div>
                <p className="text-white text-sm font-medium">Scroll to play</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Info Overlay - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="space-y-2">
          <h3 className="text-white font-bold text-lg line-clamp-2 drop-shadow-lg">
            {video.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <span className="font-medium">{video.channel}</span>
            <span>•</span>
            <span>{video.duration}s</span>
          </div>
        </div>
      </div>

      {/* Scroll Hint - Center */}
      {isActive && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="animate-bounce text-white/60 text-center">
            <div className="text-4xl mb-2">↓</div>
            <p className="text-sm font-medium">Swipe up for more</p>
          </div>
        </div>
      )}
    </div>
  );
}
