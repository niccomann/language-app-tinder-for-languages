import type { SourceLocale, TargetLanguage } from './languageStorage';

/** Ordered list of target languages — must match the data in the backend. */
export const TARGET_LANGUAGES: readonly TargetLanguage[] = ['de', 'it', 'fr'];

/** Ordered list of source locales — must match a JSON locale file under `./locales/`. */
export const SOURCE_LOCALES: readonly SourceLocale[] = ['en', 'it', 'fr', 'es', 'de', 'pt'];

/** Emoji flags shown next to target-language labels. */
export const TARGET_FLAGS: Record<TargetLanguage, string> = {
  de: '🇩🇪',
  it: '🇮🇹',
  fr: '🇫🇷',
};

/** Emoji flags shown next to source-language labels. */
export const SOURCE_FLAGS: Record<SourceLocale, string> = {
  en: '🇬🇧',
  it: '🇮🇹',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  pt: '🇵🇹',
};
