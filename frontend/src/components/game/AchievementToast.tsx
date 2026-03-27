/**
 * AchievementToast - Notification when unlocking achievements
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, createContext, useContext, useEffect } from 'react';
import { RARITY_COLORS } from '../../utils/gamification';
import type { Achievement } from '../../utils/gamification';
import { X, Trophy } from 'lucide-react';

interface ToastItem {
  id: string;
  achievement: Achievement;
}

interface AchievementToastContextType {
  showAchievement: (achievement: Achievement) => void;
}

const AchievementToastContext = createContext<AchievementToastContextType | null>(null);

export const useAchievementToast = () => {
  const context = useContext(AchievementToastContext);
  if (!context) {
    throw new Error('useAchievementToast must be used within AchievementToastProvider');
  }
  return context;
};

export function AchievementToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showAchievement = useCallback((achievement: Achievement) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, achievement }]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AchievementToastContext.Provider value={{ showAchievement }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <AchievementToast 
              key={toast.id} 
              item={toast} 
              onClose={() => removeToast(toast.id)} 
            />
          ))}
        </AnimatePresence>
      </div>
    </AchievementToastContext.Provider>
  );
}

function AchievementToast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { achievement } = item;
  const colors = RARITY_COLORS[achievement.rarity];

  useEffect(() => {
    const timer = setTimeout(onClose, 5500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ x: 400, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 400, opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative overflow-hidden"
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-2xl blur-xl opacity-50"
        style={{ backgroundColor: colors.glow }}
      />

      {/* Main card */}
      <div 
        className="relative bg-slate-900 border-2 rounded-2xl p-4 pr-12 min-w-[320px]"
        style={{ borderColor: colors.bg }}
      >
        {/* Shimmer animation */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />

        {/* Rarity badge */}
        <div 
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
          style={{ backgroundColor: colors.bg }}
        >
          {achievement.rarity}
        </div>

        {/* Content */}
        <div className="flex items-center gap-4">
          {/* Icon container */}
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            style={{ 
              backgroundColor: `${colors.bg}30`,
              border: `2px solid ${colors.bg}`,
              boxShadow: `0 0 20px ${colors.glow}50`,
            }}
          >
            {achievement.icon}
          </motion.div>

          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Trophy size={14} className="fill-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider">Achievement Unlocked!</span>
            </div>
            <h3 className="text-white font-bold text-lg">{achievement.name}</h3>
            <p className="text-slate-400 text-sm">{achievement.description}</p>
          </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 6, ease: 'linear' }}
          className="absolute bottom-0 left-0 h-1 rounded-b-2xl"
          style={{ backgroundColor: colors.bg }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
