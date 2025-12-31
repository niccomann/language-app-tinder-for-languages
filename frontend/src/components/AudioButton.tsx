import { Volume2, Loader2 } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

interface AudioButtonProps {
  text: string;
  language?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'accent';
  className?: string;
}

/**
 * Reusable audio button component.
 * Can be placed anywhere to enable TTS for any text.
 */
export function AudioButton({ 
  text, 
  language = 'de', 
  size = 'md',
  variant = 'default',
  className = ''
}: AudioButtonProps) {
  const { playAudio, isPlayingText, isLoadingText } = useAudio();
  
  const isActive = isPlayingText(text) || isLoadingText(text);
  
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };
  
  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
  };
  
  const variantClasses = {
    default: isActive 
      ? 'bg-indigo-500 text-white' 
      : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
    ghost: isActive
      ? 'bg-white/30 text-white'
      : 'bg-white/20 text-white hover:bg-white/30',
    accent: isActive
      ? 'bg-purple-500 text-white animate-pulse'
      : 'bg-purple-100 text-purple-600 hover:bg-purple-200',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playAudio(text, language);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isActive}
      className={`rounded-full transition-all ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title={`Play "${text}"`}
    >
      {isLoadingText(text) ? (
        <Loader2 size={iconSizes[size]} className="animate-spin" />
      ) : (
        <Volume2 size={iconSizes[size]} className={isPlayingText(text) ? 'animate-pulse' : ''} />
      )}
    </button>
  );
}
