import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Video {
  video_id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
}

interface VideoReelProps {
  word: string;
  translation: string;
  language: string;
  onClose: () => void;
}

export function VideoReel({ word, translation, language, onClose }: VideoReelProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerStates, setPlayerStates] = useState<{ [key: string]: number }>({});
  const [playersReady, setPlayersReady] = useState(0);
  const [hasPlayed, setHasPlayed] = useState<{ [key: string]: boolean }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<{ [key: string]: any }>({});

  console.log('🎬 VideoReel render - currentIndex:', currentIndex, 'videos:', videos.length);

  // Load videos
  useEffect(() => {
    console.log('📥 Loading videos for:', word);
    
    fetch('http://localhost:8000/videos/search-multiple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, translation, language, limit: 8 }),
    })
      .then(res => res.json())
      .then(data => {
        console.log('✅ Videos loaded:', data.videos.length);
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error loading videos:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [word, translation, language]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    console.log('🔧 Initializing YouTube IFrame API');
    
    if (window.YT) {
      console.log('✅ YouTube API already loaded');
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      console.log('✅ YouTube IFrame API ready');
    };
  }, []);

  // Create YouTube players when videos are loaded
  useEffect(() => {
    if (!videos.length || !window.YT?.Player) return;

    console.log('🎥 Creating YouTube players for', videos.length, 'videos');

    // Wait a bit for DOM to be ready
    const timer = setTimeout(() => {
      videos.forEach((video, index) => {
        const playerId = `player-${video.video_id}`;
        
        if (playerRefs.current[playerId]) {
          console.log(`⏭️  Player already exists for ${video.video_id}`);
          return;
        }

        // Check if div exists
        const div = document.getElementById(playerId);
        if (!div) {
          console.log(`❌ Div not found for ${playerId}`);
          return;
        }

        console.log(`🆕 Creating player ${index + 1}/${videos.length}: ${video.video_id}`);

      try {
        const player = new window.YT.Player(playerId, {
          videoId: video.video_id,
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              console.log(`✅ Player ready: ${video.video_id} (index ${index})`);
              playerRefs.current[playerId] = event.target;
              
              // Track ready players
              setPlayersReady(prev => {
                const newCount = prev + 1;
                console.log(`📊 Players ready: ${newCount}/${videos.length}`);
                return newCount;
              });
              
              // Auto-play first video
              if (index === 0) {
                console.log('▶️  Auto-playing first video');
                setTimeout(() => {
                  event.target.playVideo();
                }, 500);
              }
            },
            onStateChange: (event: any) => {
              const states: any = {
                '-1': 'unstarted',
                '0': 'ended',
                '1': 'playing',
                '2': 'paused',
                '3': 'buffering',
                '5': 'cued'
              };
              const state = event.data;
              console.log(`🎬 Player state changed: ${video.video_id} → ${states[state] || state}`);
              
              // Update state
              setPlayerStates(prev => ({
                ...prev,
                [playerId]: state
              }));
              
              // Track if video has ever played
              if (state === 1) { // playing
                setHasPlayed(prev => ({
                  ...prev,
                  [playerId]: true
                }));
              }
              
              // If video ended and it's the current one, go to next
              if (state === 0 && index === currentIndex) {
                console.log('📹 Video ended, moving to next');
                if (index < videos.length - 1) {
                  setTimeout(() => setCurrentIndex(index + 1), 500);
                }
              }
            },
          },
        });
        } catch (error) {
          console.error(`❌ Error creating player for ${video.video_id}:`, error);
        }
      });
    }, 500); // Wait 500ms for DOM

    return () => clearTimeout(timer);
  }, [videos]);

  // Control playback when currentIndex changes
  useEffect(() => {
    if (!videos.length) return;

    console.log(`\n🔄 Index changed to ${currentIndex}`);
    console.log(`   Current video: ${videos[currentIndex]?.video_id}`);

    // Wait a bit for players to be ready
    const timer = setTimeout(() => {
      videos.forEach((video, index) => {
        const playerId = `player-${video.video_id}`;
        const player = playerRefs.current[playerId];

        if (!player) {
          console.log(`   ⚠️  Player not ready yet: ${video.video_id}`);
          return;
        }

        try {
          if (index === currentIndex) {
            console.log(`   ▶️  PLAY: ${video.video_id} (index ${index})`);
            const state = player.getPlayerState();
            console.log(`      Current state: ${state}`);
            
            if (state !== 1) { // Not playing
              player.playVideo();
              console.log(`      Play command sent`);
            }
          } else {
            console.log(`   ⏸️  PAUSE: ${video.video_id} (index ${index})`);
            const state = player.getPlayerState();
            
            if (state === 1) { // Playing
              player.pauseVideo();
              console.log(`      Pause command sent`);
            }
          }
        } catch (error) {
          console.error(`   ❌ Error controlling ${video.video_id}:`, error);
        }
      });
    }, 500); // Wait 500ms for scroll to complete

    return () => clearTimeout(timer);
  }, [currentIndex, videos]);

  // Sync currentIndex with scroll position
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const viewportHeight = window.innerHeight;
        const newIndex = Math.round(scrollTop / viewportHeight);
        
        console.log(`📜 Scroll detected: scrollTop=${scrollTop}, newIndex=${newIndex}`);
        
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
          console.log(`   Updating index: ${currentIndex} → ${newIndex}`);
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log(`⌨️  Key pressed: ${e.key}`);
      
      if (e.key === 'Escape') {
        console.log('🚪 Closing reel');
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < videos.length - 1) {
          console.log(`⬇️  Moving from ${currentIndex} to ${currentIndex + 1}`);
          const newIndex = currentIndex + 1;
          setCurrentIndex(newIndex);
          
          // Scroll to next video
          if (containerRef.current) {
            const targetScroll = newIndex * window.innerHeight;
            containerRef.current.scrollTo({
              top: targetScroll,
              behavior: 'smooth',
            });
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          console.log(`⬆️  Moving from ${currentIndex} to ${currentIndex - 1}`);
          const newIndex = currentIndex - 1;
          setCurrentIndex(newIndex);
          
          // Scroll to previous video
          if (containerRef.current) {
            const targetScroll = newIndex * window.innerHeight;
            containerRef.current.scrollTo({
              top: targetScroll,
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
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-red-500 text-xl mb-4">Error loading videos</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-black rounded-full font-semibold"
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
      <div className="absolute top-6 left-6 z-50 bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-3">
        <h2 className="text-white font-bold text-xl">{word}</h2>
        <p className="text-gray-300 text-sm">{translation}</p>
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
        {videos.map((video, index) => {
          const playerId = `player-${video.video_id}`;
          const playerState = playerStates[playerId];
          const isActive = index === currentIndex;
          const isPlaying = playerState === 1; // 1 = playing
          const isBuffering = playerState === 3 || playerState === -1;
          const videoHasPlayed = hasPlayed[playerId];
          
          // Show thumbnail when:
          // - Not active at all, OR
          // - Active BUT video hasn't started playing yet
          // This prevents white screen while video loads
          const showThumbnail = !isActive || (isActive && !isPlaying);
          
          
          return (
            <div
              key={video.video_id}
              className="relative w-full h-full flex-shrink-0 snap-start snap-always"
              style={{ backgroundColor: '#000' }}
            >
              {/* Thumbnail - Show when not active OR when loading */}
              {showThumbnail && (
                <div
                  className="absolute inset-0 bg-cover bg-center bg-black"
                  style={{ 
                    backgroundImage: `url(${video.thumbnail})`,
                    zIndex: 10,
                  }}
                >
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      {isBuffering && isActive ? (
                        <>
                          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-white text-sm font-medium">Loading...</p>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                            <div className="w-0 h-0 border-l-[20px] border-l-white border-y-[12px] border-y-transparent ml-1" />
                          </div>
                          <p className="text-white text-sm font-medium">Scroll to play</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* YouTube Player - Always rendered, visibility controlled */}
              <div
                className="absolute inset-0"
                style={{
                  visibility: isActive ? 'visible' : 'hidden',
                  zIndex: 20,
                }}
              >
                <div id={playerId} className="w-full h-full" />
              </div>

              {/* Video Info */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-30">
                <h3 className="text-white font-bold text-lg mb-2">{video.title}</h3>
                <p className="text-gray-300 text-sm">{video.channel} • {video.duration}s</p>
              </div>
            </div>
          );
        })}
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

// Declare YouTube API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
