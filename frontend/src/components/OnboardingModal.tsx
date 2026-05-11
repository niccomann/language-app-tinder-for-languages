import { useState } from 'react';
import { useLanguage } from '../i18n/languageContext';
import type { SourceLocale, TargetLanguage } from '../i18n/languageStorage';

const TARGET_OPTIONS: Array<{ code: TargetLanguage; flag: string; label: string }> = [
  { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

const SOURCE_OPTIONS: Array<{ code: SourceLocale; flag: string; label: string }> = [
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
];

interface OnboardingModalProps {
  initialTarget?: TargetLanguage | null;
  initialSource?: SourceLocale | null;
  onClose?: () => void;
}

export function OnboardingModal({ initialTarget, initialSource, onClose }: OnboardingModalProps) {
  const { setTarget, setSource } = useLanguage();
  const [target, setTargetLocal] = useState<TargetLanguage | null>(initialTarget ?? null);
  const [source, setSourceLocal] = useState<SourceLocale | null>(initialSource ?? null);

  const sourceConflict = (code: SourceLocale) => target !== null && (code as string) === (target as string);

  const canSubmit = target !== null && source !== null && !sourceConflict(source);

  const handleSubmit = () => {
    if (!canSubmit || !target || !source) return;
    // Scrivere PRIMA source (evita reload con stato inconsistente, poiché setTarget fa reload).
    setSource(source);
    // setSource fa reload immediato; la riga sotto scrive comunque in localStorage prima che il reload effettivo avvenga.
    setTarget(target);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h1 className="text-2xl font-bold mb-1">Benvenuto 👋</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Scegli la lingua che vuoi imparare e quella da cui parti.</p>

        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Quale lingua vuoi imparare?</h2>
          <div className="grid grid-cols-3 gap-2">
            {TARGET_OPTIONS.map((opt) => {
              const selected = target === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    setTargetLocal(opt.code);
                    if (source && (opt.code as string) === (source as string)) {
                      setSourceLocal(null);
                    }
                  }}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-slate-200 hover:border-slate-400 dark:border-slate-700'
                  }`}
                  aria-pressed={selected}
                >
                  <span className="text-3xl">{opt.flag}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Da quale lingua parti?</h2>
          <div className="grid grid-cols-3 gap-2">
            {SOURCE_OPTIONS.map((opt) => {
              const selected = source === opt.code;
              const disabled = sourceConflict(opt.code);
              return (
                <button
                  key={opt.code}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSourceLocal(opt.code)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition ${
                    disabled
                      ? 'border-slate-200 opacity-40 cursor-not-allowed dark:border-slate-800'
                      : selected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                        : 'border-slate-200 hover:border-slate-400 dark:border-slate-700'
                  }`}
                  aria-pressed={selected}
                  aria-disabled={disabled}
                  title={disabled ? 'Non puoi partire dalla stessa lingua che vuoi imparare' : undefined}
                >
                  <span className="text-3xl">{opt.flag}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Inizia
        </button>
      </div>
    </div>
  );
}
