import { useState } from 'react';
import { useCopy, useLanguage } from '../i18n/languageContext';
import type { TargetLanguage } from '../i18n/languageStorage';
import { UI_INTERACTION, UI_RADIUS } from './ui';

const TARGET_SHORT: Record<TargetLanguage, string> = { de: 'DE', it: 'IT', fr: 'FR' };
const TARGET_FLAGS: Record<TargetLanguage, string> = { de: '🇩🇪', it: '🇮🇹', fr: '🇫🇷' };

interface LanguageSwitcherProps {
  onOpenSourceModal: () => void;
}

export function LanguageSwitcher({ onOpenSourceModal }: LanguageSwitcherProps) {
  const { targetLanguage, sourceLocale, setTarget, reset } = useLanguage();
  const copy = useCopy();
  const [open, setOpen] = useState(false);

  if (!targetLanguage) return null;

  const targets: TargetLanguage[] = ['de', 'it', 'fr'];
  const currentShort = TARGET_SHORT[targetLanguage];
  const currentFlag = TARGET_FLAGS[targetLanguage];

  const triggerClass = `inline-flex h-10 items-center gap-1.5 px-3 ${UI_RADIUS.control} border border-hairline bg-canvas text-body-sm font-medium text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={copy.languageSwitcher.triggerAriaLabel}
      >
        <span className="text-base leading-none">{currentFlag}</span>
        <span>{currentShort}</span>
        <span className="text-caption text-muted">▾</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80]"
            aria-label={copy.common.close}
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute right-0 top-full mt-2 z-[90] w-60 ${UI_RADIUS.surface} border border-hairline bg-canvas p-2 shadow-sm`}
            role="menu"
          >
            <div className="px-2 py-1 text-caption-uppercase font-medium uppercase tracking-[1.5px] text-muted">
              {copy.languageSwitcher.imParo}
            </div>
            {targets.map((code) => {
              const disabled = (code as string) === (sourceLocale as string);
              const active = code === targetLanguage;
              const fullName = copy.targetLanguageNames[code];
              return (
                <button
                  key={code}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false);
                    if (!disabled && !active) setTarget(code);
                  }}
                  className={`flex w-full items-center gap-2 px-2 py-2 text-left text-body-sm ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${
                    active ? 'bg-surface-card font-medium text-ink' : 'text-ink hover:bg-surface-card'
                  } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                  role="menuitem"
                >
                  <span className="text-lg leading-none">{TARGET_FLAGS[code]}</span>
                  <span className="capitalize">{fullName}</span>
                  {active && <span className="ml-auto text-primary">✓</span>}
                </button>
              );
            })}
            <div className="my-1 border-t border-hairline" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenSourceModal();
              }}
              className={`flex w-full items-center gap-2 px-2 py-2 text-left text-body-sm text-ink ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
              role="menuitem"
            >
              {copy.languageSwitcher.changeSourceLanguage}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className={`flex w-full items-center gap-2 px-2 py-2 text-left text-body-sm text-error ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
              role="menuitem"
            >
              {copy.languageSwitcher.resetOnboarding}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
