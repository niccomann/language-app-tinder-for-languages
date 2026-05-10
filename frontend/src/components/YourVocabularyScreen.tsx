import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownAZ, BookOpenCheck, CircleAlert, Clock3, Star, Target, Trophy } from 'lucide-react';
import type { WordStatistics } from '../types';
import { api } from '../services/api';
import { copy } from '../i18n/staticCopy';
import { AppScreen, ErrorState, LoadingSpinner, ScreenHeader, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import { reportClientError } from '../utils/clientError';

function sortVocabularyByMastery(words: WordStatistics[]) {
  return [...words].sort((left, right) => (
    right.knowledge_level - left.knowledge_level
    || right.confidence_score - left.confidence_score
    || right.times_seen - left.times_seen
    || left.word.localeCompare(right.word)
  ));
}

function getVocabularyMasteryStars(word: WordStatistics) {
  if (word.confidence_score <= 0) return 0;
  return Math.max(1, Math.min(5, Math.ceil(word.knowledge_level / 2)));
}

function getVocabularyTone(word: WordStatistics) {
  const stars = getVocabularyMasteryStars(word);
  if (stars >= 5) {
    return {
      label: copy.yourVocabulary.masteredLabel,
      card: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/35',
      badge: 'bg-emerald-600 text-white',
      text: 'text-emerald-800 dark:text-emerald-100',
      bar: 'bg-emerald-500',
      star: 'text-emerald-600 fill-emerald-500 dark:text-emerald-200 dark:fill-emerald-300',
    };
  }
  if (stars >= 3) {
    return {
      label: copy.yourVocabulary.learningLabel,
      card: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/35',
      badge: 'bg-yellow-500 text-slate-950',
      text: 'text-yellow-900 dark:text-yellow-100',
      bar: 'bg-yellow-500',
      star: 'text-yellow-600 fill-yellow-500 dark:text-yellow-200 dark:fill-yellow-300',
    };
  }
  if (stars >= 1) {
    return {
      label: copy.yourVocabulary.weakLabel,
      card: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/35',
      badge: 'bg-orange-500 text-white',
      text: 'text-orange-900 dark:text-orange-100',
      bar: 'bg-orange-500',
      star: 'text-orange-600 fill-orange-500 dark:text-orange-200 dark:fill-orange-300',
    };
  }
  return {
    label: copy.yourVocabulary.unknownLabel,
    card: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/35',
    badge: 'bg-red-600 text-white',
    text: 'text-red-900 dark:text-red-100',
    bar: 'bg-red-500',
    star: 'text-red-300 dark:text-red-700',
  };
}

interface YourVocabularyScreenProps {
  onBack: () => void;
  onStartLearning: () => void;
}

export function YourVocabularyScreen({
  onBack,
  onStartLearning,
}: YourVocabularyScreenProps) {
  const [words, setWords] = useState<WordStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const vocabularyCopy = copy.yourVocabulary;

  useEffect(() => {
    let cancelled = false;

    async function loadVocabulary() {
      try {
        setLoading(true);
        setError(null);
        const statistics = await api.getAllWordStatistics('de');
        if (!cancelled) {
          setWords(statistics);
        }
      } catch (err) {
        reportClientError('Failed to load user vocabulary:', err);
        if (!cancelled) {
          setError(vocabularyCopy.errorMessage);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVocabulary();

    return () => {
      cancelled = true;
    };
  }, [vocabularyCopy.errorMessage]);

  const sortedWords = useMemo(() => sortVocabularyByMastery(words), [words]);
  const masteredCount = words.filter((word) => getVocabularyMasteryStars(word) >= 5).length;
  const learningCount = words.filter((word) => {
    const stars = getVocabularyMasteryStars(word);
    return stars >= 3 && stars < 5;
  }).length;
  const weakCount = words.filter((word) => getVocabularyMasteryStars(word) < 3).length;

  if (loading) {
    return <LoadingSpinner message={vocabularyCopy.loadingMessage} />;
  }

  if (error) {
    return (
      <ErrorState
        title={vocabularyCopy.errorTitle}
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <AppScreen width="wide" contentClassName="min-h-dvh px-4 py-4">
      <main className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(420px,1fr)]">
        <section className="space-y-3">
          <ScreenHeader
            title={vocabularyCopy.title}
            subtitle={vocabularyCopy.subtitle}
            icon={<BookOpenCheck size={30} className="shrink-0 text-indigo-600" />}
            onBack={onBack}
            density="compact"
          />

          <SurfacePanel padding="lg" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <VocabularyStatTile icon={<Trophy size={18} />} label={vocabularyCopy.strongStat} value={masteredCount} tone="success" />
              <VocabularyStatTile icon={<Target size={18} />} label={vocabularyCopy.learningStat} value={learningCount} tone="yellow" />
              <VocabularyStatTile icon={<CircleAlert size={18} />} label={vocabularyCopy.weakStat} value={weakCount} tone="error" />
            </div>

            <div className={`${UI_RADIUS.control} border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/40`}>
              <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-600 dark:text-indigo-200">
                {vocabularyCopy.logicEyebrow}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-indigo-950 dark:text-indigo-100">
                {vocabularyCopy.logicBody}
              </p>
            </div>

            <button
              type="button"
              onClick={onStartLearning}
              className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-12 w-full items-center justify-center gap-2 bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-indigo-700`}
            >
              <ArrowDownAZ size={17} />
              {vocabularyCopy.continueAction}
            </button>
          </SurfacePanel>
        </section>

        <section className="space-y-3">
          {sortedWords.length === 0 ? (
            <SurfacePanel padding="lg" className="text-center">
              <BookOpenCheck size={34} className="mx-auto text-slate-400" />
              <h2 className="mt-3 text-2xl font-extrabold text-slate-950 dark:text-white">{vocabularyCopy.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                {vocabularyCopy.emptyBody}
              </p>
              <button
                type="button"
                onClick={onStartLearning}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} mt-5 inline-flex min-h-12 items-center justify-center gap-2 bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-indigo-700`}
              >
                {vocabularyCopy.emptyAction}
              </button>
            </SurfacePanel>
          ) : (
            sortedWords.map((word, index) => (
              <VocabularyRow
                key={`${word.language}:${word.word}`}
                word={word}
                rank={index + 1}
              />
            ))
          )}
        </section>
      </main>
    </AppScreen>
  );
}

function VocabularyRow({
  word,
  rank,
}: {
  word: WordStatistics;
  rank: number;
}) {
  const stars = getVocabularyMasteryStars(word);
  const tone = getVocabularyTone(word);
  const accuracy = word.times_seen > 0 ? Math.round((word.times_correct / word.times_seen) * 100) : 0;

  return (
    <article className={`${UI_RADIUS.surface} border p-4 shadow-sm ${tone.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${UI_RADIUS.pill} bg-white px-2.5 py-1 text-xs font-extrabold text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300`}>
              #{rank}
            </span>
            <span className={`${UI_RADIUS.pill} px-2.5 py-1 text-xs font-extrabold ${tone.badge}`}>
              {tone.label}
            </span>
          </div>
          <h2 className={`mt-3 text-2xl font-extrabold ${tone.text}`}>{word.word}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
            <Clock3 size={15} />
            {word.times_seen} reviews · {accuracy}% correct
          </p>
        </div>

        <div className="text-right">
          <MasteryStars value={stars} />
          <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            {copy.yourVocabulary.levelLabel} {word.knowledge_level}/10
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900/70">
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${Math.max(0, Math.min(100, word.confidence_score))}%` }}
        />
      </div>
    </article>
  );
}

function MasteryStars({ value }: { value: number }) {
  return (
    <div className="flex items-center justify-end gap-1" aria-label={`${value} mastery stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const active = index < value;
        return (
          <Star
            key={index}
            size={18}
            className={active ? 'text-yellow-500 fill-yellow-400' : 'text-slate-300 dark:text-slate-600'}
          />
        );
      })}
    </div>
  );
}

function VocabularyStatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'success' | 'yellow' | 'error';
}) {
  const classes = {
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
    yellow: 'border-yellow-100 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100',
    error: 'border-red-100 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100',
  };

  return (
    <div className={`${UI_RADIUS.control} border p-3 ${classes[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
