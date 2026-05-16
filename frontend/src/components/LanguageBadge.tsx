import { useCopy, useLanguage } from '../i18n/languageContext';
import { SOURCE_FLAGS, TARGET_FLAGS } from '../i18n/languageMeta';

interface LanguageBadgeProps {
  onClick?: () => void;
}

export function LanguageBadge({ onClick }: LanguageBadgeProps = {}) {
  const { targetLanguage, sourceLocale } = useLanguage();
  const copy = useCopy();
  if (!targetLanguage || !sourceLocale) return null;
  const targetName = copy.targetLanguageNames[targetLanguage];
  const sourceName = copy.localeName;

  const content = (
    <>
      <span>{copy.languageBadge.learning}</span>
      <span className="text-base leading-none">{TARGET_FLAGS[targetLanguage]}</span>
      <span className="text-ink capitalize">{targetName}</span>
      <span>{copy.languageBadge.from}</span>
      <span className="text-base leading-none">{SOURCE_FLAGS[sourceLocale]}</span>
      <span className="text-ink">{sourceName}</span>
    </>
  );

  // Hidden on mobile: the AppChrome (top-right) already shows the flags via
  // LanguageSwitcher, and overlapping a centered badge with the fixed chrome
  // produced unreadable headers on narrow viewports.
  return (
    <div className="hidden justify-center pt-3 sm:flex">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-soft px-3 py-1 text-caption font-medium text-muted transition-colors hover:bg-surface-card hover:text-ink"
          title={copy.languageSwitcher.editBoth}
        >
          {content}
          <span className="text-muted-soft">·</span>
          <span className="text-primary">✏︎</span>
        </button>
      ) : (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-soft px-3 py-1 text-caption font-medium text-muted">
          {content}
        </div>
      )}
    </div>
  );
}
