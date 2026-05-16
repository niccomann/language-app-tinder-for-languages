import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { useCopy } from '../i18n/languageContext';
import { UI_RADIUS } from './ui';

/**
 * Renders a small banner when the browser reports being offline.
 * Hidden as soon as connectivity returns. Tooling-free: relies only on
 * window.online/offline events which all evergreen browsers support.
 */
export function NetworkStatusBanner() {
  const copy = useCopy();
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto fixed left-1/2 top-3 z-[110] flex -translate-x-1/2 items-center gap-2 ${UI_RADIUS.pill} border border-accent-amber/60 bg-accent-amber/15 px-4 py-2 text-sm font-semibold text-ink shadow-sm`}
    >
      <CloudOff size={16} aria-hidden />
      <span>{copy.a11y.offlineBanner}</span>
    </div>
  );
}
