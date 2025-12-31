import { useState, useEffect } from 'react';
import { Trophy, Brain, Target, Activity } from 'lucide-react';
import { api } from '../services/api';

interface StatsSummaryProps {
  language?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Reusable statistics summary component.
 * Shows overall learning progress with confidence metrics.
 */
export function StatsSummary({ 
  language = 'de',
  compact = false,
  className = ''
}: StatsSummaryProps) {
  const [stats, setStats] = useState<{
    total_words_practiced: number;
    average_confidence: number;
    words_mastered: number;
    words_learning: number;
    words_struggling: number;
    total_practice_sessions: number;
  } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getStatisticsSummary(language);
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats summary:', error);
      }
    };
    loadStats();
  }, [language]);

  if (!stats) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-4 text-sm ${className}`}>
        <span className="flex items-center gap-1 text-green-600">
          <Trophy size={14} /> {stats.words_mastered} mastered
        </span>
        <span className="flex items-center gap-1 text-yellow-600">
          <Brain size={14} /> {stats.words_learning} learning
        </span>
        <span className="flex items-center gap-1 text-gray-500">
          <Activity size={14} /> {stats.total_practice_sessions} sessions
        </span>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
        <div className="flex items-center gap-2 text-green-600 mb-1">
          <Trophy size={18} />
          <span className="text-sm font-medium">Mastered</span>
        </div>
        <div className="text-2xl font-bold text-green-700">{stats.words_mastered}</div>
        <div className="text-xs text-green-600/70">confidence ≥10</div>
      </div>
      
      <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
        <div className="flex items-center gap-2 text-yellow-600 mb-1">
          <Brain size={18} />
          <span className="text-sm font-medium">Learning</span>
        </div>
        <div className="text-2xl font-bold text-yellow-700">{stats.words_learning}</div>
        <div className="text-xs text-yellow-600/70">confidence 5-9</div>
      </div>
      
      <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
        <div className="flex items-center gap-2 text-orange-600 mb-1">
          <Target size={18} />
          <span className="text-sm font-medium">Struggling</span>
        </div>
        <div className="text-2xl font-bold text-orange-700">{stats.words_struggling}</div>
        <div className="text-xs text-orange-600/70">confidence &lt;5</div>
      </div>
      
      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-center gap-2 text-indigo-600 mb-1">
          <Activity size={18} />
          <span className="text-sm font-medium">Avg Confidence</span>
        </div>
        <div className="text-2xl font-bold text-indigo-700">{stats.average_confidence.toFixed(1)}</div>
        <div className="text-xs text-indigo-600/70">{stats.total_practice_sessions} sessions</div>
      </div>
    </div>
  );
}
