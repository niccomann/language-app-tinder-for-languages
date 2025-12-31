import { useState, useEffect } from 'react';
import { TrendingUp, Star, Zap, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface ConfidenceBadgeProps {
  word: string;
  language?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable confidence badge component.
 * Shows how well the user knows a word (confidence score).
 */
export function ConfidenceBadge({ 
  word, 
  language = 'de',
  showLabel = true,
  size = 'md',
  className = ''
}: ConfidenceBadgeProps) {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await api.getWordStatistics(word, language);
        setScore(stats.confidence_score);
      } catch {
        setScore(0);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [word, language]);

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border bg-gray-100 text-gray-400 border-gray-200 ${sizeClasses[size]} ${className} animate-pulse`}>
        <Sparkles size={iconSizes[size]} />
        <span className="font-semibold">-</span>
      </span>
    );
  }

  const getConfig = (score: number) => {
    if (score >= 10) return { 
      color: 'bg-green-100 text-green-700 border-green-200', 
      label: 'Mastered',
      icon: Star,
    };
    if (score >= 5) return { 
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
      label: 'Learning',
      icon: TrendingUp,
    };
    if (score >= 1) return { 
      color: 'bg-orange-100 text-orange-700 border-orange-200', 
      label: 'Practicing',
      icon: Zap,
    };
    return { 
      color: 'bg-gray-100 text-gray-500 border-gray-200', 
      label: 'New',
      icon: Sparkles,
    };
  };

  const config = getConfig(score || 0);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${config.color} ${sizeClasses[size]} ${className}`}>
      <Icon size={iconSizes[size]} />
      <span className="font-semibold">{score}</span>
      {showLabel && <span className="opacity-75">· {config.label}</span>}
    </span>
  );
}
