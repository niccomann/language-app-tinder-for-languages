import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SwipeButtonsProps {
  onLeft: () => void;
  onRight: () => void;
  disabled?: boolean;
}

export function SwipeButtons({ onLeft, onRight, disabled = false }: SwipeButtonsProps) {
  const { isDark } = useTheme();

  return (
    <div className="flex items-center justify-center gap-6 mt-8">
      {/* NOPE button */}
      <motion.button
        onClick={onLeft}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        className={`
          group relative p-6 rounded-full transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isDark 
            ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500' 
            : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
          }
        `}
        style={{
          boxShadow: `0 0 30px rgba(239, 68, 68, 0.5)`,
          border: '3px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        
        <X 
          size={36} 
          className="relative text-white drop-shadow-lg" 
          strokeWidth={3}
        />
        
        {/* Label */}
        <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-black uppercase tracking-wider whitespace-nowrap ${
          isDark ? 'text-red-400' : 'text-red-600'
        }`}>
          LEARN
        </span>
      </motion.button>

      {/* Divider */}
      <div className={`w-16 h-0.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`} />

      {/* LIKE button */}
      <motion.button
        onClick={onRight}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        className={`
          group relative p-6 rounded-full transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isDark 
            ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500' 
            : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
          }
        `}
        style={{
          boxShadow: `0 0 30px rgba(34, 197, 94, 0.5)`,
          border: '3px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        
        <Check 
          size={36} 
          className="relative text-white drop-shadow-lg" 
          strokeWidth={3}
        />
        
        {/* Label */}
        <span className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm font-black uppercase tracking-wider whitespace-nowrap ${
          isDark ? 'text-green-400' : 'text-green-600'
        }`}>
          KNOW!
        </span>
      </motion.button>
    </div>
  );
}
