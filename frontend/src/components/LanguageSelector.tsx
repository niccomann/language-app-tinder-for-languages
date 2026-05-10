import { useEffect, useState } from 'react';
import { useLanguage, type Language } from '../contexts/LanguageContext';

type LanguageInfo = { code: Language; label: string; flag: string };

const FALLBACK: LanguageInfo[] = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [options, setOptions] = useState<LanguageInfo[]>(FALLBACK);

  useEffect(() => {
    fetch('/api/languages')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: LanguageInfo[]) => {
        if (Array.isArray(data) && data.length > 0) setOptions(data);
      })
      .catch(() => {
        // keep FALLBACK silently
      });
  }, []);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
      {options.map((opt) => {
        const active = opt.code === language;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLanguage(opt.code as Language)}
            aria-pressed={active}
            title={opt.label}
            className={
              'flex items-center gap-1 rounded-full px-2 py-1 text-sm transition ' +
              (active
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700')
            }
          >
            <span className="text-base leading-none">{opt.flag}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
