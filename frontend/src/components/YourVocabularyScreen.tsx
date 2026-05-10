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
      card: 'border-success/20 bg-success/10',
      badge: 'bg-success text-on-primary',
      text: 'text-success',
      bar: 'bg-success',
      star: 'text-success fill-success',
    };
  }
  if (stars >= 3) {
    return {
      label: copy.yourVocabulary.learningLabel,
      card: 'border-accent-amber/20 bg-accent-amber/10',
      badge: 'bg-accent-amber text-on-primary',
      text: 'text-accent-amber',
      bar: 'bg-accent-amber',
      star: 'text-accent-amber fill-accent-amber',
    };
  }
  if (stars >= 1) {
    return {
      label: copy.yourVocabulary.weakLabel,
      card: 'border-warning/20 bg-warning/10',
      badge: 'bg-warning text-on-primary',
      text: 'text-warning',
      bar: 'bg-warning',
      star: 'text-warning fill-warning',
    };
  }
  return {
    label: copy.yourVocabulary.unknownLabel,
    card: 'border-error/20 bg-error/10',
    badge: 'bg-error text-on-primary',
    text: 'text-error',
    bar: 'bg-error',
    star: 'text-error/30',
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
            icon={<BookOpenCheck size={30} className="shrink-0 text-primary" />}
            onBack={onBack}
            density="compact"
          />

          <SurfacePanel padding="lg" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <VocabularyStatTile icon={<Trophy size={18} />} label={vocabularyCopy.strongStat} value={masteredCount} tone="success" />
              <VocabularyStatTile icon={<Target size={18} />} label={vocabularyCopy.learningStat} value={learningCount} tone="yellow" />
              <VocabularyStatTile icon={<CircleAlert size={18} />} label={vocabularyCopy.weakStat} value={weakCount} tone="error" />
            </div>

            <div className={`${UI_RADIUS.control} border border-hairline bg-surface-soft p-4`}>
              <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
                {vocabularyCopy.logicEyebrow}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-body">
                {vocabularyCopy.logicBody}
              </p>
            </div>

            <button
              type="button"
              onClick={onStartLearning}
              className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-extrabold text-on-primary hover:bg-primary-active`}
            >
              <ArrowDownAZ size={17} />
              {vocabularyCopy.continueAction}
            </button>
          </SurfacePanel>
        </section>

        <section className="space-y-3">
          {sortedWords.length === 0 ? (
            <SurfacePanel padding="lg" className="text-center">
              <BookOpenCheck size={34} className="mx-auto text-muted" />
              <h2 className="mt-3 text-2xl font-extrabold text-ink">{vocabularyCopy.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted">
                {vocabularyCopy.emptyBody}
              </p>
              <button
                type="button"
                onClick={onStartLearning}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} mt-5 inline-flex min-h-12 items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-extrabold text-on-primary hover:bg-primary-active`}
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
    <article className={`${UI_RADIUS.surface} border p-4 ${tone.card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${UI_RADIUS.pill} bg-canvas border border-hairline px-2.5 py-1 text-xs font-extrabold text-muted`}>
              #{rank}
            </span>
            <span className={`${UI_RADIUS.pill} px-2.5 py-1 text-xs font-extrabold ${tone.badge}`}>
              {tone.label}
            </span>
          </div>
          <h2 className={`mt-3 text-2xl font-extrabold ${tone.text}`}>{word.word}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
            <Clock3 size={15} />
            {word.times_seen} reviews · {accuracy}% correct
          </p>
        </div>

        <div className="text-right">
          <MasteryStars value={stars} />
          <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-muted">
            {copy.yourVocabulary.levelLabel} {word.knowledge_level}/10
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-soft">
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
            className={active ? 'text-accent-amber fill-accent-amber' : 'text-muted'}
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
    success: 'border-success/20 bg-success/10 text-success',
    yellow: 'border-accent-amber/20 bg-accent-amber/10 text-accent-amber',
    error: 'border-error/20 bg-error/10 text-error',
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
