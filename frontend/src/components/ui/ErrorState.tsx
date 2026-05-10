import { AlertTriangle } from 'lucide-react';
import { UI_RADIUS } from './geometry';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullScreen?: boolean;
}

export function ErrorState({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Try Again',
  fullScreen = false
}: ErrorStateProps) {
  const content = (
    <div className="text-center max-w-md p-6">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center ${UI_RADIUS.touchIcon} bg-surface-soft text-error`}>
        <AlertTriangle size={28} />
      </div>
      <h2 className="font-display font-normal text-display-sm text-ink mb-2">{title}</h2>
      <p className="font-sans text-body-md text-muted mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`px-6 py-2 bg-primary text-on-primary ${UI_RADIUS.control} hover:bg-primary-active transition-colors duration-150`}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-canvas flex items-center justify-center p-6">
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
