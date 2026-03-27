import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface ComboCounterProps {
  combo: number;
  className?: string;
}

export function ComboCounter({ combo, className = '' }: ComboCounterProps) {
  const { isDark } = useTheme();

  if (combo < 2) return null;

  const intensity = Math.min(combo / 10, 1); // 0 to 1
  const hue = 30 + intensity * 30; // Orange to red

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        className={className}
      >
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-full font-black"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 100%, 50%)20, hsl(${hue}, 100%, 60%)30)`,
            border: `2px solid hsl(${hue}, 100%, 60%)`,
            boxShadow: `0 0 20px hsl(${hue}, 100%, 50%)60`,
          }}
        >
          <motion.span
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            className="text-2xl"
          >
            🔥
          </motion.span>
          <div className="flex flex-col">
            <span className="text-xs text-orange-200 uppercase tracking-wider">
              Combo
            </span>
            <span 
              className="text-xl"
              style={{ 
                color: '#fff',
                textShadow: `0 0 10px hsl(${hue}, 100%, 50%)`,
              }}
            >
              {combo}x
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
