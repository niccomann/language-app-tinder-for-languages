import { useState } from 'react';
import { useLanguage } from '../i18n/languageContext';
import type { TargetLanguage } from '../i18n/languageStorage';

const TARGETS: Array<{ code: TargetLanguage; flag: string; label: string }> = [
  { code: 'de', flag: '🇩🇪', label: 'DE' },
  { code: 'it', flag: '🇮🇹', label: 'IT' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
];

interface LanguageSwitcherProps {
  onOpenSourceModal: () => void;
}

export function LanguageSwitcher({ onOpenSourceModal }: LanguageSwitcherProps) {
  const { targetLanguage, sourceLocale, setTarget, reset } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!targetLanguage) return null;

  const current = TARGETS.find((t) => t.code === targetLanguage)!;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold shadow-sm border border-slate-200 hover:bg-white dark:bg-slate-800 dark:border-slate-700"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <span className="text-xs opacity-50">▾</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80]"
            aria-label="Chiudi menu lingua"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-[90] w-56 rounded-xl bg-white p-1 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700" role="menu">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Imparo</div>
            {TARGETS.map((t) => {
              const disabled = (t.code as string) === (sourceLocale as string);
              const active = t.code === targetLanguage;
              return (
                <button
                  key={t.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false);
                    if (!disabled && !active) setTarget(t.code);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    active ? 'bg-indigo-50 font-semibold dark:bg-indigo-950' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                  role="menuitem"
                >
                  <span className="text-lg">{t.flag}</span>
                  <span>{t.label === 'DE' ? 'Deutsch' : t.label === 'IT' ? 'Italiano' : 'Français'}</span>
                  {active && <span className="ml-auto text-indigo-600">✓</span>}
                </button>
              );
            })}
            <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenSourceModal();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              role="menuitem"
            >
              Cambia lingua di partenza
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              role="menuitem"
            >
              Reset onboarding
            </button>
          </div>
        </>
      )}
    </div>
  );
}
