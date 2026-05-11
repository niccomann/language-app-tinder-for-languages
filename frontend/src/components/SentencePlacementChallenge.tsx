import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, RotateCcw, Sparkles, Star, Trophy } from 'lucide-react';
import { api } from '../services/api';
import { readSavedLearningPreferenceProfile } from '../learning/preferenceProfile';
import type { SentenceChallenge } from '../types';
import { GameSignalBadge, LoadingSpinner, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import type { MascotReactionState } from '../gamification/mascotManifest';
import { reportClientError } from '../utils/clientError';
import { MascotSpeechCallout } from './MascotSpeechCallout';
import type { StreamingSpeechStep } from './StreamingSpeechBubble';
import { useTargetLanguage } from '../i18n/languageContext';

interface PlacementOption {
  id: string;
  label: string;
}

type AnswerStatus = 'idle' | 'correct' | 'wrong';

export function SentencePlacementChallenge() {
  const language = useTargetLanguage();
  const [challenges, setChallenges] = useState<SentenceChallenge[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [status, setStatus] = useState<AnswerStatus>('idle');
  const [reactionEventId, setReactionEventId] = useState(0);

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        setLoading(true);
        const preferenceProfile = readSavedLearningPreferenceProfile();
        const sentenceChallenges = await api.getSentenceChallenges({
          language,
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
        <h2 className="text-2xl font-semibold text-ink">
          No sentence challenges yet
        </h2>
        <p className="mt-2 text-sm font-semibold text-muted">
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
      <SurfacePanel padding="lg" className="border-hairline bg-canvas">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-error">
              Sentence placement
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-ink">
              Translate this sentence
            </h2>
            <p className="mt-2 text-sm font-semibold text-muted">
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
              bubbleClassName="rounded-[1.75rem] border-hairline bg-surface-card p-4 ring-0"
              bubbleContentClassName="min-h-[156px]"
              titleClassName="mt-2 min-h-[4.2rem] text-2xl font-semibold leading-snug text-ink"
              bodyClassName="mt-2 min-h-[3.2rem] text-sm font-semibold leading-6 text-muted"
            />

            <div className={`${UI_RADIUS.surface} min-h-36 border border-dashed border-hairline bg-canvas p-4`}>
              <div className="flex min-h-24 flex-wrap items-start gap-2">
                {selectedOptions.length === 0 ? (
                  <div className="flex min-h-20 w-full items-center justify-center text-sm font-semibold text-muted">
                    Your answer appears here
                  </div>
                ) : (
                  selectedOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleRemoveSelected(option.id)}
                      className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} min-h-11 border border-hairline bg-canvas px-4 py-2 text-base font-semibold text-ink hover:border-primary hover:bg-surface-soft`}
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

      <div className="flex flex-wrap justify-center gap-2 border-y border-hairline py-4">
        {placementOptions.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              data-testid="placement-word-option"
              onClick={() => handleSelectOption(option)}
              disabled={isSelected || status === 'correct'}
              className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} min-h-12 border px-4 py-2 text-base font-semibold ${
                isSelected
                  ? 'border-hairline bg-surface-soft text-muted'
                  : 'border-hairline bg-canvas text-ink hover:border-primary hover:bg-surface-soft'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className={`sticky bottom-0 -mx-1 border-t p-4 sm:-mx-4 ${
        status === 'correct'
          ? 'border-success/30 bg-success/10'
          : status === 'wrong'
            ? 'border-error/30 bg-error/10'
            : 'border-hairline bg-canvas'
      }`}>
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-8">
            {status === 'correct' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-lg font-semibold text-success">
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
                <div className="flex items-center gap-2 text-lg font-semibold text-error">
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
              <p className="text-sm font-semibold text-muted">
                Choose from a small set of useful and distracting words.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {selectedOptionIds.length > 0 && status !== 'correct' && (
              <button
                type="button"
                onClick={handleReset}
                className={`${UI_RADIUS.control} flex min-h-12 items-center gap-2 border border-hairline bg-canvas px-4 py-2 text-sm font-semibold text-body hover:bg-surface-soft`}
              >
                <RotateCcw size={17} />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={status === 'correct' ? handleContinue : handleCheck}
              disabled={!canCheck}
              className={`${UI_RADIUS.control} min-h-12 min-w-36 px-6 py-2 text-sm font-semibold text-on-primary ${
                !canCheck
                  ? 'cursor-not-allowed bg-primary-disabled'
                  : status === 'correct'
                    ? 'bg-success hover:opacity-90'
                    : 'bg-primary hover:bg-primary-active'
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
