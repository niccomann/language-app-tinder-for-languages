import { UI_RADIUS } from './geometry';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

const sizeClasses = {
  small: 'h-8 w-8 border-2',
  medium: 'h-12 w-12 border-b-2',
  large: 'h-16 w-16 border-4',
};

export function LoadingSpinner({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false
}: LoadingSpinnerProps) {
  const content = (
    <div className="text-center">
      <div className={`${sizeClasses[size]} border-primary/20 border-t-primary ${UI_RADIUS.pill} animate-spin mx-auto mb-4`} />
      {message && <p className="text-muted font-sans text-body-md">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-canvas flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      {content}
    </div>
  );
}
