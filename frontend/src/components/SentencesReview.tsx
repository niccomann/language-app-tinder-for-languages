import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, Volume2 } from 'lucide-react';
import { api } from '../services/api';
import type { CefrLevel, WordSentences } from '../types';
import { CEFR_LEVELS } from '../types';
import { useCopy, useLanguage } from '../i18n/languageContext';
import type { TargetLanguage } from '../i18n/languageStorage';
import { reportClientError } from '../utils/clientError';
import { EASE_OUT_EXPO } from '../utils/animations';
import { getImageSrc } from '../utils/imageHelper';
import { LoadingSpinner, UI_INTERACTION, UI_RADIUS } from './ui';
import { usePathDifficulty } from '../hooks/usePathDifficulty';

const SENTENCE_WORD_CAP = 30;

// Each level pairs a playback rate with the pause inserted before the next
// sentence, so "slower" both reads slower and waits longer between sentences.
const SPEED_LEVELS = [
  { rate: 0.75, gapMs: 1500, label: '0.75×' },
  { rate: 1, gapMs: 900, label: '1×' },
  { rate: 1.25, gapMs: 500, label: '1.25×' },
  { rate: 1.5, gapMs: 250, label: '1.5×' },
];
const DEFAULT_SPEED_INDEX = 1;

function splitWords(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean);
}

// TTS gives no per-word timestamps, so we approximate karaoke timing: spread the
// audio duration across words proportional to their length, then map the audio's
// progress fraction to the word being spoken right now.
function activeWordForFraction(words: string[], fraction: number): number {
  if (words.length === 0) return -1;
  const lengths = words.map((w) => Math.max(1, w.length));
  const total = lengths.reduce((sum, len) => sum + len, 0);
  let acc = 0;
  for (let i = 0; i < words.length; i += 1) {
    acc += lengths[i];
    if (fraction <= acc / total) return i;
  }
  return words.length - 1;
}

interface SentenceItem {
  key: string;
  id: number;
  word: string;
  sentence: string;
  translation?: string | null;
}

interface SentencesReviewProps {
  wordIds: number[];
  target: TargetLanguage;
  onBack: () => void;
  level?: CefrLevel;
  onLevelChange?: (level: CefrLevel) => void;
  availableLevels?: CefrLevel[];
}

/**
 * Standalone "listen to sentences" feature (Review hub). Picks the learner's
 * best-known words that have a real sentence at the chosen CEFR level, then
 * reuses SentencesReview. The level selector lets the learner switch difficulty.
 */
export function SentencePracticeScreen({ onBack }: { onBack: () => void }) {
  const copy = useCopy();
  const { targetLanguage } = useLanguage();
  const pathDifficulty = usePathDifficulty();
  const [manualLevel, setManualLevel] = useState<CefrLevel | null>(null);
  const [ids, setIds] = useState<number[] | null>(null);
  const level = manualLevel && pathDifficulty.unlockedCefrLevels.includes(manualLevel)
    ? manualLevel
    : pathDifficulty.currentCefrLevel;

  // Refetches on level change and replaces the word set in place, so the player
  // (and its level pills) stay mounted instead of flashing a full-screen spinner.
  useEffect(() => {
    if (!targetLanguage) return undefined;
    let cancelled = false;
    api
      .getSentencePractice({ target: targetLanguage, level, limit: SENTENCE_WORD_CAP })
      .then((result) => {
        if (!cancelled) setIds(result);
      })
      .catch((error) => {
        if (cancelled) return;
        reportClientError('Failed to load sentence practice:', error);
        setIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [targetLanguage, level]);

  if (!targetLanguage) return null;
  if (ids === null) return <LoadingSpinner message={copy.wordMatch.sentencesLoading} />;
  return (
    <SentencesReview
      wordIds={ids}
      target={targetLanguage}
      level={level}
      onLevelChange={setManualLevel}
      availableLevels={pathDifficulty.unlockedCefrLevels}
      onBack={onBack}
    />
  );
}

export function SentencesReview({ wordIds, target, onBack, level, onLevelChange, availableLevels = CEFR_LEVELS }: SentencesReviewProps) {
  const copy = useCopy();
  const [data, setData] = useState<WordSentences[] | null>(() => (wordIds.length === 0 ? [] : null));
  // A monotonic counter, not a boolean: it bumps after every (re)load's audio
  // prefetch so the play effect re-fires on a level switch too, not just once.
  const [ready, setReady] = useState<number>(() => (wordIds.length === 0 ? 1 : 0));
  const [index, setIndex] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);
  const [activeWord, setActiveWord] = useState(-1);
  const [images, setImages] = useState<Record<number, string | null>>({});
  const requestedImagesRef = useRef<Set<number>>(new Set());
  const audiosRef = useRef<Record<string, string>>({});
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const speedRef = useRef(DEFAULT_SPEED_INDEX);
  const lastWordRef = useRef(-1);
  const rafRef = useRef(0);

  const items = useMemo<SentenceItem[]>(() => {
    if (!data) return [];
    const flat: SentenceItem[] = [];
    data.slice(0, SENTENCE_WORD_CAP).forEach((word) => {
      word.sentences.forEach((s, si) => {
        flat.push({ key: `${word.id}-${level ?? 'x'}-${si}`, id: word.id, word: word.word, sentence: s.sentence, translation: s.translation });
      });
    });
    return flat;
  }, [data, level]);

  // Key the fetch on the id contents, not the array identity, so a parent
  // re-render with a fresh `wordIds` array doesn't refetch + re-prefetch audio.
  const idsKey = wordIds.join(',');
  useEffect(() => {
    if (wordIds.length === 0) return undefined;
    let cancelled = false;
    api
      .getExampleSentences({ ids: wordIds, level, perWord: 1 })
      .then(async (result) => {
        if (cancelled) return;
        setData(result);
        setIndex(0);
        setActiveWord(-1);
        const toFetch = result
          .slice(0, SENTENCE_WORD_CAP)
          .flatMap((word) => word.sentences.map((s, si) => ({ key: `${word.id}-${level ?? 'x'}-${si}`, sentence: s.sentence })));
        await Promise.allSettled(
          toFetch.map(async (entry) => {
            try {
              const res = await api.speakText(entry.sentence, target);
              audiosRef.current[entry.key] = res.audio_base64;
            } catch {
              /* a missing audio just gets skipped during playback */
            }
          }),
        );
        if (!cancelled) setReady((r) => r + 1);
      })
      .catch((error) => {
        if (cancelled) return;
        reportClientError('Failed to load example sentences:', error);
        setData([]);
        setReady((r) => r + 1);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, target, level]);

  // Keep the live audio's rate in sync when the user changes speed mid-sentence.
  useEffect(() => {
    speedRef.current = speedIndex;
    if (audioElRef.current) audioElRef.current.playbackRate = SPEED_LEVELS[speedIndex].rate;
  }, [speedIndex]);

  // Play the current slide's audio and auto-advance after a speed-dependent gap.
  // Re-runs on slide change (manual nav) and replay (playToken). The user reached
  // this screen via a tap, so autoplay is allowed.
  useEffect(() => {
    if (!ready || index < 0 || index >= items.length) return undefined;
    audioElRef.current?.pause();
    const uri = audiosRef.current[items[index].key];
    if (!uri) return undefined;
    const el = new Audio(uri);
    audioElRef.current = el;
    el.playbackRate = SPEED_LEVELS[speedRef.current].rate;
    const words = splitWords(items[index].sentence);
    lastWordRef.current = -1;
    // Karaoke: follow audio progress and enlarge the word being spoken.
    const tick = () => {
      const duration = el.duration;
      if (duration && Number.isFinite(duration) && duration > 0) {
        const wordIndex = activeWordForFraction(words, el.currentTime / duration);
        if (wordIndex !== lastWordRef.current) {
          lastWordRef.current = wordIndex;
          setActiveWord(wordIndex);
        }
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    el.onplay = () => {
      rafRef.current = window.requestAnimationFrame(tick);
    };
    el.onended = () => {
      window.cancelAnimationFrame(rafRef.current);
      advanceTimerRef.current = window.setTimeout(() => {
        setIndex((i) => (i < items.length - 1 ? i + 1 : i));
      }, SPEED_LEVELS[speedRef.current].gapMs);
    };
    void el.play().catch(() => {});
    return () => {
      window.cancelAnimationFrame(rafRef.current);
      el.pause();
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, [ready, index, items, playToken]);

  // Lazy-load the main word's image for the current and next slide only
  // (images are ~100KB each, so we don't prefetch the whole list).
  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    [items[index], items[index + 1]]
      .filter((it): it is SentenceItem => Boolean(it))
      .forEach((it) => {
        if (requestedImagesRef.current.has(it.id)) return;
        requestedImagesRef.current.add(it.id);
        api
          .getWordImage(it.id)
          .then((uri) => {
            if (!cancelled) setImages((prev) => ({ ...prev, [it.id]: uri }));
          })
          .catch(() => {
            if (!cancelled) setImages((prev) => ({ ...prev, [it.id]: null }));
          });
      });
    return () => {
      cancelled = true;
    };
  }, [ready, index, items]);

  if (data === null) {
    return <LoadingSpinner message={copy.wordMatch.sentencesLoading} />;
  }

  const current = items[index];
  const imageSrc = current ? getImageSrc(images[current.id] ?? undefined) : '';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-canvas">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={copy.a11y.goBack}
          className={`flex h-10 w-10 items-center justify-center ${UI_RADIUS.touchIcon} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <span className="text-sm font-semibold text-muted">
              {index + 1} / {items.length}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSpeedIndex((i) => Math.max(0, i - 1))}
              disabled={speedIndex === 0}
              aria-label={copy.wordMatch.slower}
              className={`flex h-8 w-8 items-center justify-center ${UI_RADIUS.touchIcon} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card disabled:opacity-40`}
            >
              <Minus size={15} />
            </button>
            <span className="min-w-[44px] text-center text-xs font-semibold text-muted">
              {SPEED_LEVELS[speedIndex].label}
            </span>
            <button
              type="button"
              onClick={() => setSpeedIndex((i) => Math.min(SPEED_LEVELS.length - 1, i + 1))}
              disabled={speedIndex === SPEED_LEVELS.length - 1}
              aria-label={copy.wordMatch.faster}
              className={`flex h-8 w-8 items-center justify-center ${UI_RADIUS.touchIcon} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card disabled:opacity-40`}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      {onLevelChange && (
        <div className="flex items-center justify-center gap-2 px-4 pb-1">
          {availableLevels.map((lvl) => {
            const active = lvl === level;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => onLevelChange(lvl)}
                aria-pressed={active}
                className={`min-w-[44px] rounded-full px-3 py-1.5 text-sm font-bold ${UI_INTERACTION.fastTransition} ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'border border-hairline bg-canvas text-muted hover:bg-surface-card'
                }`}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-base font-semibold text-muted">{copy.wordMatch.noSentences}</p>
        </div>
      ) : (
        <>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.key}
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -80, opacity: 0 }}
                transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}
                className="flex w-full max-w-2xl flex-col items-center gap-6 text-center"
              >
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt=""
                    className={`h-28 w-28 ${UI_RADIUS.hero} object-contain sm:h-40 sm:w-40`}
                  />
                )}
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">{current.word}</p>
                <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-3xl font-semibold leading-snug text-ink sm:text-4xl">
                  {splitWords(current.sentence).map((word, i) => (
                    <span
                      key={i}
                      className={`inline-block origin-center transition-all duration-200 ${
                        i === activeWord ? 'scale-125 font-bold text-primary' : ''
                      }`}
                    >
                      {word}
                    </span>
                  ))}
                </p>
                {current.translation && (
                  <p className="text-lg font-medium text-muted">{current.translation}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-4 px-6 pb-10 pt-4">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              aria-label={copy.wordMatch.previousSentence}
              className={`flex h-12 w-12 items-center justify-center ${UI_RADIUS.touchIcon} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card disabled:opacity-40`}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => setPlayToken((t) => t + 1)}
              aria-label={copy.wordMatch.listenSentences}
              className={`flex h-14 w-14 items-center justify-center ${UI_RADIUS.touchIcon} bg-primary text-on-primary ${UI_INTERACTION.transition} hover:bg-primary-active`}
            >
              <Volume2 size={24} />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
              disabled={index === items.length - 1}
              aria-label={copy.wordMatch.nextSentence}
              className={`flex h-12 w-12 items-center justify-center ${UI_RADIUS.touchIcon} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card disabled:opacity-40`}
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
