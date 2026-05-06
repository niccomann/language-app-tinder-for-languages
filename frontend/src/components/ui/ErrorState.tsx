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
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center ${UI_RADIUS.touchIcon} bg-amber-100 text-amber-700`}>
        <AlertTriangle size={28} />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`px-6 py-2 bg-indigo-600 text-white ${UI_RADIUS.control} hover:bg-indigo-700 transition-colors`}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
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
