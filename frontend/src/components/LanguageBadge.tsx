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
    <div className="flex justify-center pt-3">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-soft px-3 py-1 text-caption font-medium text-muted">
        <span>Imparando</span>
        <span className="text-base leading-none">{t.flag}</span>
        <span className="text-ink">{t.label}</span>
        <span>da</span>
        <span className="text-base leading-none">{s.flag}</span>
        <span className="text-ink">{s.label}</span>
      </div>
    </div>
  );
}
