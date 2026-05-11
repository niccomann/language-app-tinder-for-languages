const PREFIX = 'languageApp:explainerDismissed:';
const SUFFIX = ':v1';

export function explainerKey(key: string): string {
  return `${PREFIX}${key}${SUFFIX}`;
}

export function isExplainerDismissed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(explainerKey(key)) === 'true';
  } catch {
    return false;
  }
}

export function markExplainerDismissed(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(explainerKey(key), 'true');
  } catch {
    /* ignore quota errors */
  }
}
