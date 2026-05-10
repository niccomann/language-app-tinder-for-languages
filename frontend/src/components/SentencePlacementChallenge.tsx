import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, RotateCcw, Sparkles, Star, Trophy } from 'lucide-react';
import { api } from '../services/api';
import { readSavedLearningPreferenceProfile } from '../learning/preferenceProfile';
import type { SentenceChallenge } from '../types';
import { GameSignalBadge, LoadingSpinner, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import { useTheme } from '../contexts/useTheme';
import type { MascotReactionState } from '../gamification/mascotManifest';
import { reportClientError } from '../utils/clientError';
import { MascotSpeechCallout } from './MascotSpeechCallout';
import type { StreamingSpeechStep } from './StreamingSpeechBubble';

interface PlacementOption {
  id: string;
  label: string;
}

type AnswerStatus = 'idle' | 'correct' | 'wrong';

export function SentencePlacementChallenge() {
  const [challenges, setChallenges] = useState<SentenceChallenge[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [status, setStatus] = useState<AnswerStatus>('idle');
  const [reactionEventId, setReactionEventId] = useState(0);
  const { isDark } = useTheme();

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        setLoading(true);
        const preferenceProfile = readSavedLearningPreferenceProfile();
        const sentenceChallenges = await api.getSentenceChallenges({
          language: 'de',
          limit: 20,
          learningPreferenceProfile: preferenceProfile,
        });
        setChallenges(sentenceChallenges);
      } catch (error) {
        reportClientError('Failed to load sentence placement challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChallenges();
  }, []);

  const challenge = challenges[currentChallengeIndex];
  const placementOptions = useMemo(() => (
    challenge?.option_tokens.map((token, index) => ({
      id: `${challenge.id}-${index}-${token}`,
      label: token,
    })) ?? []
  ), [challenge]);
  const selectedOptions = selectedOptionIds
    .map((id) => placementOptions.find((option) => option.id === id))
    .filter((option): option is PlacementOption => Boolean(option));
  const selectedLabels = selectedOptions.map((option) => option.label);
  const canCheck = selectedOptionIds.length > 0;
  const reactionState: MascotReactionState = status === 'correct'
    ? 'correct'
    : status === 'wrong'
      ? 'wrong'
      : 'idle';
  const calloutReactionState: MascotReactionState = status === 'idle' ? 'levelUp' : reactionState;
  const calloutRestingState: MascotReactionState = status === 'idle' ? 'idle' : reactionState;
  const calloutSteps = useMemo<StreamingSpeechStep[]>(() => {
    if (!challenge) return [];

    if (status === 'correct') {
      return [{
        eyebrow: 'Sentence solved',
        title: 'Good job.',
        body: 'That order matches the ground truth. Your grammar signal gets stronger for the next challenge.',
      }];
    }

    if (status === 'wrong') {
      return [{
        eyebrow: 'Try again',
        title: 'Not quite yet.',
        body: 'Adjust the word order and check again. The app keeps the retry lightweight.',
      }];
    }

    return [{
      eyebrow: 'Prompt',
      title: challenge.prompt,
      body: 'Choose the word tiles below, then check your sentence.',
    }];
  }, [challenge, status]);

  const handleSelectOption = (option: PlacementOption) => {
    if (status === 'correct' || selectedOptionIds.includes(option.id)) return;
    setSelectedOptionIds((current) => [...current, option.id]);
    setStatus('idle');
  };

  const handleRemoveSelected = (optionId: string) => {
    if (status === 'correct') return;
    setSelectedOptionIds((current) => current.filter((id) => id !== optionId));
    setStatus('idle');
  };

  const handleCheck = () => {
    if (!challenge) return;
    const answer = selectedLabels.join(' ');
    const expected = challenge.correct_tokens.join(' ');
    setStatus(answer === expected ? 'correct' : 'wrong');
    setReactionEventId((current) => current + 1);
  };

  const handleReset = () => {
    setSelectedOptionIds([]);
    setStatus('idle');
  };

  const handleContinue = () => {
    setSelectedOptionIds([]);
    setStatus('idle');
    setCurrentChallengeIndex((current) => (
      challenges.length === 0 ? 0 : (current + 1) % challenges.length
    ));
  };

  if (loading) {
    return <LoadingSpinner message="Loading sentence challenge..." />;
  }

  if (!challenge) {
    return (
      <SurfacePanel padding="lg" className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
          No sentence challenges yet
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
          Add ground-truth challenges to the database to enable instant sentence placement.
        </p>
      </SurfacePanel>
    );
  }

  return (
    <section
      data-testid="sentence-placement-challenge"
      className="mx-auto flex min-h-[680px] w-full max-w-5xl flex-col gap-4 px-1 py-2 sm:px-4"
    >
      <SurfacePanel padding="lg" className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-red-500">
              Sentence placement
            </p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950 dark:text-white">
              Translate this sentence
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
              Tap the words in the right order.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <GameSignalBadge icon={<Star size={14} />} label="Quest" tone="amber" />
              <GameSignalBadge icon={<Sparkles size={14} />} label="Combo" tone="teal" />
              <GameSignalBadge
                icon={<Trophy size={14} />}
                label={status === 'correct' ? 'XP unlocked' : 'XP ready'}
                tone="success"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(390px,560px)_minmax(0,1fr)] lg:items-center">
            <MascotSpeechCallout
              testId={status === 'idle' ? 'sentence-prompt-bubble' : 'sentence-feedback-bubble'}
              steps={calloutSteps}
              reactionState={calloutReactionState}
              restingState={calloutRestingState}
              persona={status === 'idle' ? 'coach' : 'auto'}
              eventKey={reactionEventId}
              playbackKey={`${challenge.id}-${status}-${reactionEventId}`}
              className="lg:grid-cols-[minmax(110px,160px)_minmax(0,1fr)]"
              mascotClassName="mx-auto lg:mx-0"
              bubbleClassName="rounded-[1.75rem] border-slate-200 bg-slate-50 p-4 shadow-sm ring-0 dark:border-slate-700 dark:bg-slate-800/70"
              bubbleContentClassName="min-h-[156px]"
              titleClassName="mt-2 min-h-[4.2rem] text-2xl font-extrabold leading-snug text-slate-950 dark:text-white"
              bodyClassName="mt-2 min-h-[3.2rem] text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300"
            />

            <div className={`${UI_RADIUS.surface} min-h-36 border-2 border-dashed border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/40`}>
              <div className="flex min-h-24 flex-wrap items-start gap-2">
                {selectedOptions.length === 0 ? (
                  <div className="flex min-h-20 w-full items-center justify-center text-sm font-semibold text-slate-400 dark:text-slate-500">
                    Your answer appears here
                  </div>
                ) : (
                  selectedOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleRemoveSelected(option.id)}
                      className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${UI_INTERACTION.press} min-h-11 border border-slate-200 bg-white px-4 py-2 text-base font-bold text-slate-800 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`}
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </SurfacePanel>

      <div className="flex flex-wrap justify-center gap-2 border-y border-slate-200 py-4 dark:border-slate-700">
        {placementOptions.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              data-testid="placement-word-option"
              onClick={() => handleSelectOption(option)}
              disabled={isSelected || status === 'correct'}
              className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} min-h-12 border px-4 py-2 text-base font-extrabold shadow-sm ${
                isSelected
                  ? 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className={`sticky bottom-0 -mx-1 border-t p-4 sm:-mx-4 ${
        status === 'correct'
          ? 'border-emerald-200 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950'
          : status === 'wrong'
            ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950'
            : 'border-slate-200 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95'
      }`}>
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-8">
            {status === 'correct' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-lg font-extrabold text-emerald-700 dark:text-emerald-200">
                  <CheckCircle2 size={24} />
                  Good job.
                </div>
                <div className="flex flex-wrap gap-2">
                  <GameSignalBadge icon={<Trophy size={14} />} label="XP reward" tone="success" />
                  <GameSignalBadge icon={<Sparkles size={14} />} label="Combo" tone="teal" />
                </div>
              </div>
            )}
            {status === 'wrong' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-lg font-extrabold text-rose-700 dark:text-rose-200">
                  <AlertCircle size={24} />
                  Not quite. Adjust the order and try again.
                </div>
                <div className="flex flex-wrap gap-2">
                  <GameSignalBadge icon={<Star size={14} />} label="Retry quest" tone="error" />
                  <GameSignalBadge icon={<Sparkles size={14} />} label="Combo saved" tone="amber" />
                </div>
              </div>
            )}
            {status === 'idle' && (
              <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Choose from a small set of useful and distracting words.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {selectedOptionIds.length > 0 && status !== 'correct' && (
              <button
                type="button"
                onClick={handleReset}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.press} flex min-h-12 items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`}
              >
                <RotateCcw size={17} />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={status === 'correct' ? handleContinue : handleCheck}
              disabled={!canCheck}
              className={`${UI_RADIUS.control} ${UI_INTERACTION.press} min-h-12 min-w-36 px-6 py-2 text-sm font-extrabold text-white shadow-lg ${
                !canCheck
                  ? 'cursor-not-allowed bg-slate-300 dark:bg-slate-700'
                  : status === 'correct'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {status === 'correct' ? <ArrowRight size={17} /> : <Sparkles size={17} />}
                {status === 'correct' ? 'Continue' : 'Check'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
