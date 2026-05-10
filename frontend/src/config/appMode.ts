/**
 * App Mode Configuration
 * 
 * Determines whether the app runs in:
 * - ONLINE: Full features with remote backend (AWS/localhost)
 * - OFFLINE: Limited features with embedded Python backend (Chaquopy)
 * 
 * The mode is determined at build time via environment variable.
 */

export type AppMode = 'online' | 'offline';

export interface FeatureFlags {
  flashcards: boolean;
  progress: boolean;
  wordsLibrary: boolean;
  grammarSentences: boolean;
  grammarValidation: boolean;
  textToSpeech: boolean;
}

const ONLINE_FEATURES: FeatureFlags = {
  flashcards: true,
  progress: true,
  wordsLibrary: true,
  grammarSentences: true,
  grammarValidation: true,
  textToSpeech: true,
};

const OFFLINE_FEATURES: FeatureFlags = {
  flashcards: true,
  progress: true,
  wordsLibrary: true,
  grammarSentences: true,
  grammarValidation: false,
  textToSpeech: false,
};

export const APP_MODE: AppMode = (import.meta.env.VITE_APP_MODE as AppMode) || 'online';

export const FEATURES: FeatureFlags = APP_MODE === 'offline' ? OFFLINE_FEATURES : ONLINE_FEATURES;
export const SHOW_DEVELOPER_TOOLS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEVELOPER_TOOLS === 'true';

// Use relative URLs in production (empty string), localhost for development
const getApiBaseUrl = (): string => {
  if (APP_MODE === 'offline') {
    // Android offline builds route relative /api calls through OfflineBackendPlugin.
    return (import.meta.env.VITE_OFFLINE_API_URL as string) || '';
  }
  // Check if we're running on a local dev host.
  if (
    typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
  ) {
    return (import.meta.env.VITE_API_URL as string) || 'http://localhost:8500';
  }
  // Production: use relative URLs (nginx proxies /api to backend)
  return (import.meta.env.VITE_API_URL as string) || '';
};

export const API_BASE_URL = getApiBaseUrl();

const parsedApiTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS);
export const API_REQUEST_TIMEOUT_MS = Number.isFinite(parsedApiTimeoutMs) && parsedApiTimeoutMs > 0
  ? parsedApiTimeoutMs
  : 4500;

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURES[feature];
}
