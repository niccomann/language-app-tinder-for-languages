/**
 * XpBar - Game-style experience bar with level indicator
 */
import { motion } from 'framer-motion';
import { calculateLevel, getXpForNextLevel, Level } from '../../utils/gamification';

interface XpBarProps {
  xp: number;
  showLevel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'neon' | 'golden';
}

const sizes = {
  sm: { bar: 'h-2', text: 'text-xs', icon: 'text-lg' },
  md: { bar: 'h-4', text: 'text-sm', icon: 'text-2xl' },
  lg: { bar: 'h-6', text: 'text-base', icon: 'text-3xl' },
};

const variants = {
  default: {
    bg: 'bg-slate-800',
    fill: 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]',
  },
  neon: {
    bg: 'bg-slate-900 border border-cyan-500/30',
    fill: 'bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.6)]',
  },
  golden: {
    bg: 'bg-slate-900 border border-amber-500/30',
    fill: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.6)]',
  },
};

export function XpBar({ xp, showLevel = true, size = 'md', variant = 'neon' }: XpBarProps) {
  const level = calculateLevel(xp);
  const { current, required, progress } = getXpForNextLevel(xp);
  const style = sizes[size];
  const theme = variants[variant];

  return (
    <div className="w-full">
      {showLevel && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1"
            >
              <span className={`${style.icon} filter drop-shadow-lg`}>{level.icon}</span>
              <span
                className={`${style.text} font-black uppercase tracking-wider`}
                style={{ color: level.color }}
              >
                {level.title}
              </span>
            </motion.div>
            <span className="text-slate-500 text-xs">LVL {level.level}</span>
          </div>
          <div className={`${style.text} font-bold text-slate-400`}>
            <span className="text-white">{current}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span>{required} XP</span>
          </div>
        </div>
      )}

      <div className={`relative ${theme.bg} rounded-full overflow-hidden ${style.bar}`}>
        {/* Background grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.1) 10px,
              rgba(255,255,255,0.1) 11px
            )`,
          }}
        />

        {/* Fill bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className={`absolute inset-y-0 left-0 ${theme.fill} ${theme.glow}`}
        >
          {/* Shimmer effect */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
          />
        </motion.div>

        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-bold text-white/80 drop-shadow-md`}>
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function LevelBadge({ level, size = 'md' }: { level: Level; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-1 rounded-full font-black uppercase ${sizes[size]}`}
      style={{
        backgroundColor: `${level.color}20`,
        color: level.color,
        border: `2px solid ${level.color}`,
        boxShadow: `0 0 15px ${level.color}40`,
      }}
    >
      <span>{level.icon}</span>
      <span>{level.title}</span>
    </motion.div>
  );
}
