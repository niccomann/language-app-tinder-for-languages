import { useLanguage } from '../i18n/languageContext';
import type { SourceLocale, TargetLanguage } from '../i18n/languageStorage';

const TARGET_INFO: Record<TargetLanguage, { flag: string; label: string }> = {
  de: { flag: '🇩🇪', label: 'Deutsch' },
  it: { flag: '🇮🇹', label: 'Italiano' },
  fr: { flag: '🇫🇷', label: 'Français' },
};

const SOURCE_INFO: Record<SourceLocale, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English' },
  it: { flag: '🇮🇹', label: 'Italiano' },
  fr: { flag: '🇫🇷', label: 'Français' },
};

export function LanguageBadge() {
  const { targetLanguage, sourceLocale } = useLanguage();
  if (!targetLanguage || !sourceLocale) return null;
  const t = TARGET_INFO[targetLanguage];
  const s = SOURCE_INFO[sourceLocale];
  return (
    <div className="mx-auto mt-2 max-w-fit rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      Stai imparando {t.flag} {t.label} da {s.flag} {s.label}
    </div>
  );
}
