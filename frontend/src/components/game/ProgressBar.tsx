import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export function ProgressBar({ current, total, className = '' }: ProgressBarProps) {
  const { isDark } = useTheme();
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={`w-full ${className}`}>
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target size={14} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
          <span className={`text-xs font-black uppercase tracking-wider ${
            isDark ? 'text-slate-500' : 'text-gray-500'
          }`}>
            Quest Progress
          </span>
        </div>
        <span className={`text-xs font-black ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {current}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className={`relative h-3 rounded-full overflow-hidden ${
        isDark ? 'bg-slate-800' : 'bg-gray-200'
      }`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 8px,
                rgba(255,255,255,0.1) 8px,
                rgba(255,255,255,0.1) 16px
              )`,
            }}
          />
        </div>

        {/* Progress fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: isDark 
              ? 'linear-gradient(90deg, #06b6d4, #22d3ee)'
              : 'linear-gradient(90deg, #0891b2, #06b6d4)',
            boxShadow: isDark ? '0 0 10px #06b6d480' : '0 0 8px #06b6d460',
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 w-1/2"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            }}
          />
        </motion.div>

        {/* Milestone markers */}
        {[25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className="absolute top-0 bottom-0 w-0.5 bg-black/20"
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>
    </div>
  );
}
