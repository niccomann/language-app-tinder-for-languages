import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface XpDisplayProps {
  xp: number;
  className?: string;
}

export function XpDisplay({ xp, className = '' }: XpDisplayProps) {
  const { isDark } = useTheme();

  return (
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`flex items-center gap-2 ${className}`}
    >
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, #06b6d420, #22d3ee20)'
            : 'linear-gradient(135deg, #06b6d430, #22d3ee30)',
          border: `1px solid ${isDark ? '#06b6d440' : '#06b6d450'}`,
          boxShadow: isDark ? '0 0 10px #06b6d430' : '0 0 8px #06b6d420',
        }}
      >
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Zap size={16} className="text-cyan-400 fill-cyan-400" />
        </motion.div>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={xp}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            {xp.toLocaleString()}
          </motion.span>
        </AnimatePresence>
        <span className="text-xs font-bold text-cyan-400 uppercase">XP</span>
      </div>
    </motion.div>
  );
}
