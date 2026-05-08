import en from './locales/en.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };
import it from './locales/it.json' with { type: 'json' };

export type Locale = 'en' | 'it' | 'fr';
export type StaticCopy = typeof en;
export const LOCALE_STORAGE_KEY = 'languageApp:locale:v1';

export const staticCopyByLocale = {
  en,
  it,
  fr,
} satisfies Record<Locale, StaticCopy>;

const supportedLocales = Object.keys(staticCopyByLocale) as Locale[];

function isSupportedLocale(locale: string | null | undefined): locale is Locale {
  return Boolean(locale && supportedLocales.includes(locale as Locale));
}

function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;

  try {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isSupportedLocale(storedLocale) ? storedLocale : null;
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Locale persistence should never block app startup.
  }
}

export function resolveActiveLocale(): Locale {
  if (typeof window !== 'undefined') {
    const requestedLocale = new URLSearchParams(window.location.search).get('locale');
    if (isSupportedLocale(requestedLocale)) {
      persistLocale(requestedLocale);
      return requestedLocale;
    }
  }

  const storedLocale = readStoredLocale();
  if (storedLocale) return storedLocale;

  const configuredLocale = import.meta.env?.VITE_APP_LOCALE as string | undefined;
  if (isSupportedLocale(configuredLocale)) return configuredLocale;

  return 'en';
}

export const activeLocale: Locale = resolveActiveLocale();
export const copy = staticCopyByLocale[activeLocale];

export function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}
