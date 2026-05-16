import { useState, useEffect } from 'react';
import { TrendingUp, Star, Zap, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { UI_RADIUS } from './ui';
import { useTargetLanguage } from '../i18n/languageContext';
import type { TargetLanguage } from '../i18n/languageStorage';

interface ConfidenceBadgeProps {
  word: string;
  language?: TargetLanguage;
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
  language: languageProp,
  showLabel = true,
  size = 'md',
  className = ''
}: ConfidenceBadgeProps) {
  const contextLanguage = useTargetLanguage();
  const language = languageProp ?? contextLanguage;
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
    let cancelled = false;
    const loadStats = async () => {
      try {
        const stats = await api.getWordStatistics(word, language);
        if (cancelled) return;
        setScore(stats.confidence_score);
      } catch {
        // Treat both "word never seen" and network errors as 0;
        // the badge stays informative without a separate error UI.
        if (!cancelled) setScore(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [word, language]);

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-1 ${UI_RADIUS.pill} border bg-surface-card text-muted-soft border-hairline ${sizeClasses[size]} ${className}`}>
        <Sparkles size={iconSizes[size]} />
        <span className="font-medium">-</span>
      </span>
    );
  }

  const getConfig = (score: number) => {
    if (score >= 10) return {
      color: 'bg-success text-ink border-transparent',
      label: 'Mastered',
      icon: Star,
    };
    if (score >= 5) return {
      color: 'bg-accent-amber text-ink border-hairline',
      label: 'Learning',
      icon: TrendingUp,
    };
    if (score >= 1) return {
      color: 'bg-surface-card text-body-strong border-hairline',
      label: 'Practicing',
      icon: Zap,
    };
    return {
      color: 'bg-surface-card text-muted border-hairline',
      label: 'New',
      icon: Sparkles,
    };
  };

  const config = getConfig(score || 0);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${UI_RADIUS.pill} border ${config.color} ${sizeClasses[size]} ${className}`}>
      <Icon size={iconSizes[size]} />
      <span className="font-medium">{score}</span>
      {showLabel && <span className="opacity-75">· {config.label}</span>}
    </span>
  );
}
