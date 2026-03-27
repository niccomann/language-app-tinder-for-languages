import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'purple';

interface GameButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

const variantStyles: Record<ButtonVariant, { bg: string; hover: string; glow: string; border: string }> = {
  primary: {
    bg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    hover: 'hover:from-cyan-400 hover:to-blue-500',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]',
    border: 'border-cyan-400/30',
  },
  success: {
    bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    hover: 'hover:from-green-400 hover:to-emerald-500',
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
    border: 'border-green-400/30',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-500 to-rose-600',
    hover: 'hover:from-red-400 hover:to-rose-500',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
    border: 'border-red-400/30',
  },
  warning: {
    bg: 'bg-gradient-to-br from-orange-500 to-amber-600',
    hover: 'hover:from-orange-400 hover:to-amber-500',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
    border: 'border-orange-400/30',
  },
  info: {
    bg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    hover: 'hover:from-violet-400 hover:to-purple-500',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]',
    border: 'border-violet-400/30',
  },
  purple: {
    bg: 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
    hover: 'hover:from-fuchsia-400 hover:to-pink-500',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]',
    border: 'border-fuchsia-400/30',
  },
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function GameButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  className = '',
}: GameButtonProps) {
  const { isDark } = useTheme();
  const styles = variantStyles[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`
        relative group overflow-hidden
        ${styles.bg}
        ${!disabled ? styles.hover : ''}
        ${styles.glow}
        ${sizeStyles[size]}
        rounded-xl font-black uppercase tracking-wider
        text-white
        border-2 ${styles.border}
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      
      {/* Inner glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />

      {/* Content */}
      <span className="relative flex items-center justify-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        {children}
      </span>
    </motion.button>
  );
}
