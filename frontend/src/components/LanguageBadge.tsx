import { useCopy, useLanguage } from '../i18n/languageContext';

const FLAGS_TARGET: Record<string, string> = { de: '🇩🇪', it: '🇮🇹', fr: '🇫🇷' };
const FLAGS_SOURCE: Record<string, string> = { en: '🇬🇧', it: '🇮🇹', fr: '🇫🇷' };

export function LanguageBadge() {
  const { targetLanguage, sourceLocale } = useLanguage();
  const copy = useCopy();
  if (!targetLanguage || !sourceLocale) return null;
  const targetName = copy.targetLanguageNames[targetLanguage];
  const sourceName = copy.localeName;
  return (
    <div className="flex justify-center pt-3">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-soft px-3 py-1 text-caption font-medium text-muted">
        <span>{copy.languageBadge.learning}</span>
        <span className="text-base leading-none">{FLAGS_TARGET[targetLanguage]}</span>
        <span className="text-ink capitalize">{targetName}</span>
        <span>{copy.languageBadge.from}</span>
        <span className="text-base leading-none">{FLAGS_SOURCE[sourceLocale]}</span>
        <span className="text-ink">{sourceName}</span>
      </div>
    </div>
  );
}
