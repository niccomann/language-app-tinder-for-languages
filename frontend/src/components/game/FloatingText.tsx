/**
 * FloatingText - XP gain and feedback text that floats up
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';

interface FloatingTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface FloatingTextControllerProps {
  children: React.ReactNode;
}

interface FloatingTextContextType {
  showFloatingText: (text: string, x: number, y: number, color?: string, icon?: string, size?: 'sm' | 'md' | 'lg') => void;
}

import { createContext, useContext, ReactNode } from 'react';

const FloatingTextContext = createContext<FloatingTextContextType | null>(null);

export const useFloatingText = () => {
  const context = useContext(FloatingTextContext);
  if (!context) {
    throw new Error('useFloatingText must be used within FloatingTextProvider');
  }
  return context;
};

export function FloatingTextProvider({ children }: FloatingTextControllerProps) {
  const [items, setItems] = useState<FloatingTextItem[]>([]);

  const showFloatingText = useCallback((
    text: string, 
    x: number, 
    y: number, 
    color: string = '#22c55e',
    icon?: string,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems(prev => [...prev, { id, text, x, y, color, icon, size }]);

    // Auto remove after animation
    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== id));
    }, 1500);
  }, []);

  return (
    <FloatingTextContext.Provider value={{ showFloatingText }}>
      {children}
      <FloatingTextOverlay items={items} />
    </FloatingTextContext.Provider>
  );
}

function FloatingTextOverlay({ items }: { items: FloatingTextItem[] }) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ 
              opacity: 1, 
              y: item.y, 
              x: item.x, 
              scale: 0.5,
            }}
            animate={{ 
              opacity: 0, 
              y: item.y - 150, 
              x: item.x + (Math.random() - 0.5) * 50,
              scale: 1.2,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute font-black uppercase tracking-wider"
            style={{ color: item.color }}
          >
            <div className={`flex items-center gap-1 ${sizeClasses[item.size || 'md']}`}>
              {item.icon && <span className="filter drop-shadow-lg">{item.icon}</span>}
              <span 
                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                style={{ 
                  textShadow: `0 0 20px ${item.color}80`,
                }}
              >
                {item.text}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Predefined floating text helpers
export const useXpPopup = () => {
  const { showFloatingText } = useFloatingText();

  const showXp = useCallback((amount: number, x: number, y: number, combo: number = 0) => {
    const multiplier = combo >= 10 ? 2.5 : combo >= 7 ? 2 : combo >= 5 ? 1.5 : combo >= 3 ? 1.25 : 1;
    const finalAmount = Math.round(amount * multiplier);
    const isBonus = multiplier > 1;

    showFloatingText(
      `+${finalAmount} XP`,
      x,
      y,
      isBonus ? '#f97316' : '#22c55e',
      isBonus ? '🔥' : '✨',
      isBonus ? 'lg' : 'md'
    );

    if (isBonus) {
      setTimeout(() => {
        showFloatingText(
          `${multiplier}x COMBO!`,
          x,
          y + 50,
          '#fbbf24',
          '⚡',
          'sm'
        );
      }, 200);
    }
  }, [showFloatingText]);

  return { showXp };
};
