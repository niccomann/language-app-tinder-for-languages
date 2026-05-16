import { useEffect, useRef, useState } from 'react';
import { Flame, Sparkles, Target } from 'lucide-react';
import { useUser } from '../contexts/useUser';
import { TARGET_FLAGS } from '../i18n/languageMeta';
import type { TargetLanguage } from '../i18n/languageStorage';
import { api } from '../services/api';
import type { AdaptiveLearningSummary } from '../types';
import { UI_INTERACTION, UI_RADIUS } from './ui';

function initialFromName(name: string | null | undefined): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0].toUpperCase();
}

const PROFICIENCY_LABEL: Record<string, string> = {
  beginner: 'Principiante',
  a1_a2: 'A1–A2',
  b1_b2: 'B1–B2',
};

const TARGET_NAME: Record<string, string> = {
  de: 'Tedesco',
  it: 'Italiano',
  fr: 'Francese',
};

function isKnownTarget(code: string): code is TargetLanguage {
  return code in TARGET_FLAGS;
}

export function UserAvatar() {
  const { profile } = useUser();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AdaptiveLearningSummary | null>(null);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || !profile?.target_language) return;
    if (fetchedFor === profile.target_language) return;
    if (!isKnownTarget(profile.target_language)) return;
    const lang = profile.target_language;
    let cancelled = false;
    api
      .getAdaptiveLearningSummary(lang)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setFetchedFor(lang);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedFor(lang);
      });
    return () => {
      cancelled = true;
    };
  }, [open, profile?.target_language, fetchedFor]);

  if (!profile) return null;

  const initial = initialFromName(profile.display_name);
  const fullName = profile.display_name?.trim() || 'Utente';
  const targetFlag = isKnownTarget(profile.target_language)
    ? TARGET_FLAGS[profile.target_language]
    : null;
  const targetName = TARGET_NAME[profile.target_language] ?? profile.target_language;
  const proficiencyLabel = PROFICIENCY_LABEL[profile.proficiency_level] ?? profile.proficiency_level;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Profilo di ${fullName}`}
        aria-expanded={open}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-primary text-body-sm font-semibold text-on-primary ${UI_INTERACTION.fastTransition} hover:bg-primary-active`}
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-[75] mt-2 w-72 origin-top-right ${UI_RADIUS.surface} border border-hairline bg-canvas p-4 shadow-sm`}
        >
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-display-sm font-semibold text-on-primary"
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-body font-medium text-ink">{fullName}</div>
              {profile.age != null && (
                <div className="text-caption text-muted">{profile.age} anni</div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-hairline pt-3">
            <div className="flex items-center gap-2 text-body-sm text-ink">
              {targetFlag && <span className="text-lg leading-none" aria-hidden>{targetFlag}</span>}
              <span className="flex-1">{targetName}</span>
              <span className={`${UI_RADIUS.pill} bg-surface-card px-2 py-0.5 text-caption font-medium text-muted`}>
                {proficiencyLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-ink">
              <Target size={14} className="text-muted" aria-hidden />
              <span>{profile.daily_goal_minutes} min al giorno</span>
            </div>
            {summary && (
              <>
                <div className="flex items-center gap-2 text-body-sm text-ink">
                  <Sparkles size={14} className="text-primary" aria-hidden />
                  <span className="flex-1">Livello {summary.path_level}</span>
                  <span className="text-caption text-muted">{summary.path_xp} XP</span>
                </div>
                {summary.total_words_practiced > 0 && (
                  <div className="flex items-center gap-2 text-body-sm text-ink">
                    <Flame size={14} className="text-accent-amber" aria-hidden />
                    <span>
                      {summary.total_words_practiced} parole · {summary.words_mastered} padroneggiate
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
