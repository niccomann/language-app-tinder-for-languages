/**
 * ConfettiEffect - Celebration particles
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, createContext, useContext } from 'react';

interface ConfettiItem {
  id: string;
  x: number;
  y: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
  size: number;
  rotation: number;
}

interface ConfettiContextType {
  triggerConfetti: (x?: number, y?: number) => void;
}

const ConfettiContext = createContext<ConfettiContextType | null>(null);

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error('useConfetti must be used within ConfettiProvider');
  }
  return context;
};

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#f97316'];

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [confetti, setConfetti] = useState<ConfettiItem[]>([]);

  const triggerConfetti = useCallback((x?: number, y?: number) => {
    const originX = x ?? window.innerWidth / 2;
    const originY = y ?? window.innerHeight / 2;
    
    const newConfetti: ConfettiItem[] = Array.from({ length: 50 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      x: originX,
      y: originY,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] as 'circle' | 'square' | 'triangle',
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
    }));

    setConfetti(prev => [...prev, ...newConfetti]);

    // Cleanup after animation
    setTimeout(() => {
      setConfetti(prev => prev.filter(c => !newConfetti.find(nc => nc.id === c.id)));
    }, 3000);
  }, []);

  return (
    <ConfettiContext.Provider value={{ triggerConfetti }}>
      {children}
      <ConfettiOverlay items={confetti} />
    </ConfettiContext.Provider>
  );
}

function ConfettiOverlay({ items }: { items: ConfettiItem[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      {items.map((item) => (
        <ConfettiParticle key={item.id} item={item} />
      ))}
    </div>
  );
}

function ConfettiParticle({ item }: { item: ConfettiItem }) {
  const randomX = (Math.random() - 0.5) * 600;
  const randomY = Math.random() * -400 - 100;
  const randomRotation = Math.random() * 720 - 360;

  return (
    <motion.div
      initial={{ 
        x: item.x, 
        y: item.y, 
        rotate: 0, 
        scale: 0,
        opacity: 1,
      }}
      animate={{ 
        x: item.x + randomX, 
        y: item.y + randomY + 500,
        rotate: randomRotation,
        scale: 1,
        opacity: 0,
      }}
      transition={{ 
        duration: 2 + Math.random(),
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="absolute"
      style={{
        width: item.size,
        height: item.size,
        backgroundColor: item.shape === 'circle' ? item.color : 'transparent',
        borderRadius: item.shape === 'circle' ? '50%' : item.shape === 'square' ? '2px' : '0',
        border: item.shape === 'triangle' ? `none` : 'none',
        borderLeft: item.shape === 'triangle' ? `${item.size / 2}px solid transparent` : undefined,
        borderRight: item.shape === 'triangle' ? `${item.size / 2}px solid transparent` : undefined,
        borderBottom: item.shape === 'triangle' ? `${item.size}px solid ${item.color}` : undefined,
      }}
    />
  );
}

// Simple firework burst effect
export function FireworkBurst({ x, y, color = '#f59e0b' }: { x: number; y: number; color?: string }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    angle: (i / 20) * Math.PI * 2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[9997]">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x, y, scale: 1, opacity: 1 }}
          animate={{ 
            x: x + Math.cos(p.angle) * 100,
            y: y + Math.sin(p.angle) * 100,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
