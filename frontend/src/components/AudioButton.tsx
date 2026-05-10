import { Volume2, Loader2 } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { UI_INTERACTION, UI_RADIUS } from './ui';

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
      ? 'bg-primary text-on-primary'
      : 'bg-canvas border border-hairline text-ink hover:bg-surface-card',
    ghost: isActive
      ? 'bg-canvas/30 text-ink'
      : 'bg-canvas/20 text-ink hover:bg-canvas/30',
    accent: isActive
      ? 'bg-primary text-on-primary'
      : 'bg-surface-card text-ink hover:bg-surface-cream-strong',
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
      className={`${UI_RADIUS.touchIcon} ${UI_INTERACTION.fastTransition} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title={`Play "${text}"`}
    >
      {isLoadingText(text) ? (
        <Loader2 size={iconSizes[size]} className="animate-spin" />
      ) : (
        <Volume2 size={iconSizes[size]} />
      )}
    </button>
  );
}
