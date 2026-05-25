import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, MessagesSquare, RotateCcw, Trophy } from 'lucide-react';
import { api } from '../services/api';
import type { MatchPair } from '../types';
import { useAudio } from '../hooks/useAudio';
import { useCopy, useLanguage } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';
import type { TargetLanguage } from '../i18n/languageStorage';
import { reportClientError } from '../utils/clientError';
import { LoadingSpinner, ScreenHeader, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import { SentencesReview } from './SentencesReview';
import { usePathDifficulty } from '../hooks/usePathDifficulty';

type CellState = 'matched' | 'wrong' | 'selected' | 'default';

const CELL_CLASSES: Record<CellState, string> = {
  matched: 'border-success bg-success/10 text-success',
  wrong: 'border-error bg-error/10 text-error',
  selected: 'border-primary bg-primary/10 text-ink ring-2 ring-primary',
  default: 'border-hairline bg-canvas text-ink hover:border-primary hover:bg-surface-soft',
};

const ROUND_SIZE = 4;
const MAX_ROUNDS = 5;
const SESSION_PAIRS = ROUND_SIZE * MAX_ROUNDS;
const ROUND_OPTIONS = [1, 3, 5];
const WRONG_FLASH_MS = 700;
const ROUND_ADVANCE_MS = 650;

type Side = 'base' | 'target';
type Feedback = 'idle' | 'correct' | 'wrong';

interface Selection {
  side: Side;
  id: number;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function WordMatchingGame({ onBack }: { onBack: () => void }) {
  const { sourceLocale, targetLanguage } = useLanguage();

  if (!targetLanguage) return null;

  const base = sourceLocale ?? 'en';

  return <MatchBoard base={base} target={targetLanguage} onBack={onBack} />;
}

interface MatchBoardProps {
  base: string;
  target: TargetLanguage;
  onBack: () => void;
}

function MatchBoard({ base, target, onBack }: MatchBoardProps) {
  const copy = useCopy();
  const pathDifficulty = usePathDifficulty();
  const { playAudio } = useAudio();
  const advanceTimerRef = useRef<number | null>(null);
  const wrongTimerRef = useRef<number | null>(null);
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadKey, setLoadKey] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(() => new Set());
  const [wrongCell, setWrongCell] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [mistakenIds, setMistakenIds] = useState<Set<number>>(() => new Set());
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showSentences, setShowSentences] = useState(false);
  const [targetRounds, setTargetRounds] = useState(1);

  useEffect(() => {
    let cancelled = false;
    api
      .getMatchPairs({
        target,
        base,
        limit: SESSION_PAIRS,
        maxCefrLevel: pathDifficulty.currentCefrLevel,
      })
      .then((result) => {
        if (cancelled) return;
        setPairs(result);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        reportClientError('Failed to load match pairs:', error);
        setPairs([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target, base, loadKey, pathDifficulty.currentCefrLevel]);

  const availableRounds = Math.min(MAX_ROUNDS, Math.floor(pairs.length / ROUND_SIZE));
  const usableRounds = Math.min(targetRounds, availableRounds);
  const roundPairs = useMemo(
    () => pairs.slice(roundIndex * ROUND_SIZE, roundIndex * ROUND_SIZE + ROUND_SIZE),
    [pairs, roundIndex],
  );
  const baseOrder = useMemo(() => shuffle(roundPairs), [roundPairs]);
  const targetOrder = useMemo(() => shuffle(roundPairs), [roundPairs]);

  useEffect(
    () => () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
      if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current);
    },
    [],
  );

  const handleSelect = (side: Side, id: number) => {
    if (matchedIds.has(id)) return;

    if (!selection || selection.side === side) {
      setSelection({ side, id });
      setFeedback('idle');
      setWrongCell(null);
      return;
    }

    if (selection.id === id) {
      const nextMatched = new Set(matchedIds);
      nextMatched.add(id);
      setMatchedIds(nextMatched);
      setSelection(null);
      setWrongCell(null);
      setFeedback('correct');
      const matchedPair = roundPairs.find((pair) => pair.id === id);
      if (matchedPair) void playAudio(matchedPair.target_word, target);

      if (roundPairs.every((pair) => nextMatched.has(pair.id))) {
        advanceTimerRef.current = window.setTimeout(() => {
          if (roundIndex + 1 >= usableRounds) {
            setFinished(true);
          } else {
            setRoundIndex((r) => r + 1);
            setFeedback('idle');
          }
        }, ROUND_ADVANCE_MS);
      }
      return;
    }

    const cellKey = `${side}-${id}`;
    setWrongCell(cellKey);
    setFeedback('wrong');
    setMistakes((m) => m + 1);
    setMistakenIds((prev) => {
      const next = new Set(prev);
      next.add(selection.id);
      return next;
    });
    wrongTimerRef.current = window.setTimeout(
      () => setWrongCell((c) => (c === cellKey ? null : c)),
      WRONG_FLASH_MS,
    );
  };

  const handleReplay = () => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current);
    setRoundIndex(0);
    setSelection(null);
    setMatchedIds(new Set());
    setMistakenIds(new Set());
    setMistakes(0);
    setWrongCell(null);
    setFeedback('idle');
    setFinished(false);
    setShowSentences(false);
    setLoading(true);
    setLoadKey((k) => k + 1);
  };

  if (loading) {
    return <LoadingSpinner message={copy.wordMatch.loading} />;
  }

  if (usableRounds === 0) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-1 py-2 sm:px-4">
        <ScreenHeader title={copy.wordMatch.title} onBack={onBack} />
        <SurfacePanel padding="lg" className="text-center">
          <h2 className="text-xl font-semibold text-ink">{copy.wordMatch.notEnoughTitle}</h2>
          <p className="mt-2 text-sm font-semibold text-muted">{copy.wordMatch.notEnoughBody}</p>
        </SurfacePanel>
      </section>
    );
  }

  if (finished) {
    const playedPairs = pairs.slice(0, usableRounds * ROUND_SIZE);

    if (showSentences) {
      return (
        <SentencesReview
          wordIds={playedPairs.map((pair) => pair.id)}
          target={target}
          level={pathDifficulty.currentCefrLevel}
          availableLevels={pathDifficulty.unlockedCefrLevels}
          onBack={() => setShowSentences(false)}
        />
      );
    }

    const firstTryCorrect = playedPairs.filter((pair) => !mistakenIds.has(pair.id)).length;
    const accuracy = Math.round((firstTryCorrect / playedPairs.length) * 100);
    return (
      <GameResults
        accuracy={accuracy}
        mistakes={mistakes}
        onListen={() => setShowSentences(true)}
        onReplay={handleReplay}
        onBack={onBack}
      />
    );
  }

  const cellState = (side: Side, id: number): CellState => {
    if (matchedIds.has(id)) return 'matched';
    if (wrongCell === `${side}-${id}`) return 'wrong';
    if (selection && selection.side === side && selection.id === id) return 'selected';
    return 'default';
  };

  const renderColumn = (side: Side, items: MatchPair[]) => (
    <div className="flex flex-1 flex-col gap-3">
      {items.map((pair) => {
        const state = cellState(side, pair.id);
        const label = side === 'base' ? pair.base_word : pair.target_word;
        return (
          <button
            key={`${side}-${pair.id}`}
            type="button"
            data-testid={`match-cell-${side}`}
            onClick={() => handleSelect(side, pair.id)}
            disabled={state === 'matched'}
            className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} flex min-h-14 items-center justify-center border px-3 py-3 text-center text-base font-semibold ${CELL_CLASSES[state]}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-1 py-2 sm:px-4">
      <ScreenHeader title={copy.wordMatch.title} subtitle={copy.wordMatch.subtitle} onBack={onBack} />

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {formatCopy(copy.wordMatch.round, { current: roundIndex + 1, total: usableRounds })}
        </span>
        <span
          className={`min-h-5 text-sm font-semibold ${
            feedback === 'correct' ? 'text-success' : feedback === 'wrong' ? 'text-error' : 'text-muted'
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback === 'correct'
            ? copy.wordMatch.correct
            : feedback === 'wrong'
              ? copy.wordMatch.wrong
              : copy.wordMatch.hint}
        </span>
      </div>

      {roundIndex === 0 && matchedIds.size === 0 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {copy.wordMatch.roundsLabel}
          </span>
          {ROUND_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTargetRounds(n)}
              className={`${UI_RADIUS.pill} ${UI_INTERACTION.fastTransition} min-h-8 min-w-9 border px-3 py-1 text-sm font-semibold ${
                targetRounds === n
                  ? 'border-primary bg-primary/10 text-ink'
                  : 'border-hairline bg-canvas text-muted hover:bg-surface-soft'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <SurfacePanel padding="md" className="border-hairline bg-canvas">
        <div className="mb-3 flex gap-3">
          <p className="flex-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            {copy.wordMatch.baseColumn}
          </p>
          <p className="flex-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            {copy.wordMatch.targetColumn}
          </p>
        </div>
        <div className="flex gap-3">
          {renderColumn('base', baseOrder)}
          {renderColumn('target', targetOrder)}
        </div>
      </SurfacePanel>

      {feedback === 'correct' && (
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 size={18} />
          {copy.wordMatch.correct}
        </div>
      )}
    </section>
  );
}

interface GameResultsProps {
  accuracy: number;
  mistakes: number;
  onListen: () => void;
  onReplay: () => void;
  onBack: () => void;
}

function GameResults({ accuracy, mistakes, onListen, onReplay, onBack }: GameResultsProps) {
  const copy = useCopy();
  const secondaryButton = `${UI_RADIUS.control} ${UI_INTERACTION.transition} flex min-h-12 flex-1 items-center justify-center gap-2 border border-hairline bg-canvas px-5 py-3 text-sm font-semibold text-body hover:bg-surface-soft`;
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-1 py-2 sm:px-4">
      <ScreenHeader title={copy.wordMatch.title} onBack={onBack} />
      <SurfacePanel padding="lg" className="flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <Trophy size={32} />
        </div>
        <h2 className="text-2xl font-semibold text-ink">{copy.wordMatch.finishedTitle}</h2>
        <div className="flex gap-8">
          <div>
            <p className="text-3xl font-semibold text-success">{accuracy}%</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {copy.wordMatch.accuracyLabel}
            </p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-ink">{mistakes}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {copy.wordMatch.mistakesLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onListen}
          className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-active`}
        >
          <MessagesSquare size={18} />
          {copy.wordMatch.listenSentences}
        </button>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onReplay} className={secondaryButton}>
            <RotateCcw size={18} />
            {copy.wordMatch.replay}
          </button>
          <button type="button" onClick={onBack} className={secondaryButton}>
            {copy.wordMatch.back}
          </button>
        </div>
      </SurfacePanel>
    </section>
  );
}
