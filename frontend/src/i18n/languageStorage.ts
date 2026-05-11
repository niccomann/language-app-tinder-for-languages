export type TargetLanguage = 'de' | 'it' | 'fr';
export type SourceLocale = 'en' | 'it' | 'fr';

export const TARGET_STORAGE_KEY = 'languageApp:targetLanguage:v1';
export const SOURCE_STORAGE_KEY = 'languageApp:sourceLocale:v1';
export const LEGACY_LOCALE_KEY = 'languageApp:locale:v1';

const TARGETS: readonly TargetLanguage[] = ['de', 'it', 'fr'];
const SOURCES: readonly SourceLocale[] = ['en', 'it', 'fr'];

export function isTargetLanguage(value: unknown): value is TargetLanguage {
  return typeof value === 'string' && (TARGETS as readonly string[]).includes(value);
}

export function isSourceLocale(value: unknown): value is SourceLocale {
  return typeof value === 'string' && (SOURCES as readonly string[]).includes(value);
}

function safeRead(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage può fallire in modalità privata: lasciamo il valore in memoria al chiamante.
  }
}

function safeRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readStoredTarget(): TargetLanguage | null {
  const raw = safeRead(TARGET_STORAGE_KEY);
  return isTargetLanguage(raw) ? raw : null;
}

export function readStoredSource(): SourceLocale | null {
  const direct = safeRead(SOURCE_STORAGE_KEY);
  if (isSourceLocale(direct)) return direct;
  // Migrazione one-shot dalla vecchia chiave.
  const legacy = safeRead(LEGACY_LOCALE_KEY);
  if (isSourceLocale(legacy)) {
    safeWrite(SOURCE_STORAGE_KEY, legacy);
    safeRemove(LEGACY_LOCALE_KEY);
    return legacy;
  }
  return null;
}

export function writeStoredTarget(value: TargetLanguage): void {
  safeWrite(TARGET_STORAGE_KEY, value);
}

export function writeStoredSource(value: SourceLocale): void {
  safeWrite(SOURCE_STORAGE_KEY, value);
}

export function clearStoredLanguage(): void {
  safeRemove(TARGET_STORAGE_KEY);
  safeRemove(SOURCE_STORAGE_KEY);
  safeRemove(LEGACY_LOCALE_KEY);
}
