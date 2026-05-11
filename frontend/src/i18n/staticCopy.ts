import en from './locales/en.json' with { type: 'json' };
import fr from './locales/fr.json' with { type: 'json' };
import it from './locales/it.json' with { type: 'json' };
import es from './locales/es.json' with { type: 'json' };
import de from './locales/de.json' with { type: 'json' };
import pt from './locales/pt.json' with { type: 'json' };
import { isSourceLocale, readStoredSource, type SourceLocale } from './languageStorage';

export type StaticCopy = typeof en;

const staticCopyByLocale = {
  en,
  it,
  fr,
  es,
  de,
  pt,
} satisfies Record<SourceLocale, StaticCopy>;

export function getStaticCopy(locale: SourceLocale): StaticCopy {
  return staticCopyByLocale[locale];
}

function resolveModuleLocale(): SourceLocale {
  if (typeof window !== 'undefined') {
    const requested = new URLSearchParams(window.location.search).get('locale');
    if (isSourceLocale(requested)) {
      try { window.localStorage.setItem('languageApp:sourceLocale:v1', requested); } catch { /* ignore */ }
      return requested;
    }
  }
  return readStoredSource() ?? 'en';
}

// Backward-compat for module-scope consumers (registries built at import time).
// On locale change LanguageProvider reloads the page, so this constant stays fresh.
export const copy: StaticCopy = staticCopyByLocale[resolveModuleLocale()];

export function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}
