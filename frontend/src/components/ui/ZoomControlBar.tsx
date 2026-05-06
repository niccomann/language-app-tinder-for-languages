/**
 * ZoomControlBar - Componente UI riutilizzabile per controlli zoom e fullscreen
 */
import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Focus, RotateCcw } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';
import { UI_ELEVATION, UI_INTERACTION, UI_RADIUS } from './geometry';

export interface ZoomControlBarProps {
  currentZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitToView?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showFitToView?: boolean;
  showZoomLevel?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ZoomControlBar({
  currentZoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onFitToView,
  isExpanded,
  onToggleExpand,
  showFitToView = true,
  showZoomLevel = true,
  position = 'top-left',
  variant = 'horizontal',
  size = 'md',
  className = '',
}: ZoomControlBarProps) {
  const { isDark } = useTheme();

  const positionClasses: Record<string, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const sizeClasses: Record<string, { button: string; icon: number }> = {
    sm: { button: 'p-1.5', icon: 16 },
    md: { button: 'p-2', icon: 18 },
    lg: { button: 'p-2.5', icon: 20 },
  };

  const containerClass = variant === 'horizontal' 
    ? 'flex items-center gap-1' 
    : 'flex flex-col gap-1';

  const buttonBase = `${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${UI_INTERACTION.iconLift} ${UI_INTERACTION.press} ${sizeClasses[size].button} ${
    isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-200 text-gray-700'
  }`;

  return (
    <div 
      className={`absolute ${positionClasses[position]} ${containerClass} p-1.5 ${UI_RADIUS.surface} backdrop-blur-sm ${UI_ELEVATION.floating} z-20 ${
        isDark ? 'bg-slate-800/90 border border-slate-700' : 'bg-white/90 border border-gray-200'
      } ${className}`}
    >
      <button 
        onClick={onZoomIn} 
        className={buttonBase}
        title="Zoom In"
      >
        <ZoomIn size={sizeClasses[size].icon} />
      </button>
      
      <button 
        onClick={onZoomOut} 
        className={buttonBase}
        title="Zoom Out"
      >
        <ZoomOut size={sizeClasses[size].icon} />
      </button>
      
      {showFitToView && onFitToView && (
        <button 
          onClick={onFitToView} 
          className={buttonBase}
          title="Adatta alla vista"
        >
          <Focus size={sizeClasses[size].icon} />
        </button>
      )}
      
      <button 
        onClick={onZoomReset} 
        className={buttonBase}
        title="Reset Zoom"
      >
        <RotateCcw size={sizeClasses[size].icon - 2} />
      </button>

      <div className={`w-px h-6 mx-1 ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
      
      <button 
        onClick={onToggleExpand} 
        className={`${buttonBase} ${isExpanded ? 'text-purple-500' : ''}`}
        title={isExpanded ? "Esci da fullscreen" : "Espandi a fullscreen"}
      >
        {isExpanded ? (
          <Minimize2 size={sizeClasses[size].icon} />
        ) : (
          <Maximize2 size={sizeClasses[size].icon} />
        )}
      </button>

      {showZoomLevel && (
        <div className={`px-2 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {Math.round(currentZoom * 100)}%
        </div>
      )}
    </div>
  );
}

export interface ExpandedViewWrapperProps {
  isExpanded: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ExpandedViewWrapper({ 
  isExpanded, 
  children, 
  className = '' 
}: ExpandedViewWrapperProps) {
  const { isDark } = useTheme();
  
  if (!isExpanded) {
    return <>{children}</>;
  }

  return (
    <div 
      className={`fixed inset-0 z-50 ${
        isDark 
          ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
          : 'bg-gradient-to-br from-gray-50 to-slate-100'
      } ${className}`}
    >
      {children}
    </div>
  );
}
