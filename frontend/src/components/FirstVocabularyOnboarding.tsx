import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Brain, ChartNoAxesColumnIncreasing, CheckCircle2, Sparkles, Target } from 'lucide-react';
import type { AdaptiveFlashcard, UserProgress } from '../types';
import { Card } from './Card';
import { MascotReaction } from './MascotReaction';
import { MascotSpeechCallout } from './MascotSpeechCallout';
import { ProgressBar } from './ProgressBar';
import { SwipeButtons } from './SwipeButtons';
import { AppScreen, GameSignalBadge, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import { copy, formatCopy } from '../i18n/staticCopy';
import { StreamingSpeechBubble, type StreamingSpeechStep } from './StreamingSpeechBubble';
import {
  MAX_VOCABULARY_SCAN_SWIPES,
  MIN_VOCABULARY_SCAN_SWIPES,
  readOnboardingPreferences,
  saveOnboardingPreferences,
  buildVocabularyInsights,
  formatVocabularyCategory,
  type OnboardingPreferenceAnswers,
  type VocabularySignal,
} from './firstVocabularyOnboardingMeta';
import {
  getAnswerOptionIds,
  hasAnsweredQuestion,
  isQuestionMultiSelect,
  toggleAnswerOption,
} from './onboardingPreferenceMeta';

type OnboardingPhase = 'intro' | 'preferences' | 'scan' | 'analysis' | 'science';
type PreferenceCopy = typeof copy.onboarding.preferences;

interface FirstVocabularyOnboardingProps {
  currentCard: AdaptiveFlashcard | null;
  nextCard: AdaptiveFlashcard | null;
  progress: UserProgress;
  totalCards: number;
  onSwipe: (direction: 'left' | 'right') => void;
  onComplete: () => void;
}

export function FirstVocabularyOnboarding({
  currentCard,
  nextCard,
  progress,
  totalCards,
  onSwipe,
  onComplete,
}: FirstVocabularyOnboardingProps) {
  const [phase, setPhase] = useState<OnboardingPhase>('intro');
  const [signals, setSignals] = useState<VocabularySignal[]>([]);
  const [preferenceAnswers, setPreferenceAnswers] = useState<OnboardingPreferenceAnswers>(() => readOnboardingPreferences());
  const [lastSwipeDirection, setLastSwipeDirection] = useState<'left' | 'right'>('right');
  const [reactionEventId, setReactionEventId] = useState(0);

  const insights = useMemo(() => buildVocabularyInsights(signals), [signals]);
  const remainingToMinimum = Math.max(0, MIN_VOCABULARY_SCAN_SWIPES - signals.length);
  const canPersonalize = signals.length >= MIN_VOCABULARY_SCAN_SWIPES;
  const onboardingCopy = copy.onboarding;

  const advanceWithMascot = (nextPhase: OnboardingPhase) => {
    setPhase(nextPhase);
    setReactionEventId((current) => current + 1);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentCard || phase !== 'scan') return;

    const nextSignals = [
      ...signals,
      {
        word: currentCard.word,
        category: formatVocabularyCategory(currentCard.category),
        known: direction === 'right',
      },
    ];

    setLastSwipeDirection(direction);
    setSignals(nextSignals);
    onSwipe(direction);

    if (nextSignals.length >= MAX_VOCABULARY_SCAN_SWIPES) {
      advanceWithMascot('analysis');
    }
  };

  if (phase === 'intro') {
    return (
      <AnimatedExplanationFrame
        dataTestId="vocabulary-intro"
        mascotState="levelUp"
        mascotPersona="coach"
        eventKey={1}
        eyebrow={onboardingCopy.intro.eyebrow}
        title={onboardingCopy.intro.title}
        body={onboardingCopy.intro.body}
        speechSteps={onboardingCopy.intro.speechSteps}
        primaryActionLabel={onboardingCopy.intro.primaryAction}
        onPrimaryAction={() => advanceWithMascot('preferences')}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <GameSignalBadge icon={<Target size={14} />} label={onboardingCopy.intro.knownSignal} tone="success" />
          <GameSignalBadge icon={<Brain size={14} />} label={onboardingCopy.intro.unknownSignal} tone="amber" />
          <GameSignalBadge icon={<Sparkles size={14} />} label={onboardingCopy.intro.wordLevelSignal} tone="coral" />
        </div>
      </AnimatedExplanationFrame>
    );
  }

  if (phase === 'preferences') {
    return (
      <AnimatedExplanationFrame
        dataTestId="vocabulary-preferences"
        mascotState="levelUp"
        mascotPersona="coach"
        eventKey={reactionEventId}
        eyebrow={onboardingCopy.preferences.eyebrow}
        title={onboardingCopy.preferences.title}
        body={onboardingCopy.preferences.body}
      >
        <PreferenceQuestionnaire
          preferencesCopy={onboardingCopy.preferences}
          initialAnswers={preferenceAnswers}
          onBack={() => advanceWithMascot('intro')}
          onComplete={(answers) => {
            setPreferenceAnswers(answers);
            saveOnboardingPreferences(answers);
            advanceWithMascot('scan');
          }}
        />
      </AnimatedExplanationFrame>
    );
  }

  if (phase === 'analysis') {
    return (
      <AnimatedExplanationFrame
        mascotState="levelUp"
        mascotPersona="explorer"
        eventKey={reactionEventId}
        eyebrow={onboardingCopy.analysis.eyebrow}
        title={formatCopy(onboardingCopy.analysis.title, { knownEstimate: insights.knownEstimate })}
        body={onboardingCopy.analysis.body}
        primaryActionLabel={onboardingCopy.analysis.primaryAction}
        onPrimaryAction={() => advanceWithMascot('science')}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <SignalSummaryTile icon={<Target size={18} />} label={onboardingCopy.analysis.wordsSeen} value={signals.length} tone="coral" />
          <SignalSummaryTile icon={<Sparkles size={18} />} label={onboardingCopy.analysis.strongSignals} value={insights.knownEstimate} tone="success" />
          <SignalSummaryTile icon={<Brain size={18} />} label={onboardingCopy.analysis.toReview} value={insights.reviewEstimate} tone="amber" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SurfacePanel padding="md" className="border-success/20 bg-success/10">
            <p className="text-xs font-extrabold uppercase tracking-wide text-success">{onboardingCopy.analysis.strongestOn}</p>
            <p className="mt-2 text-xl font-extrabold text-ink">{insights.strongCategory}</p>
          </SurfacePanel>
          <SurfacePanel padding="md" className="border-accent-amber/20 bg-accent-amber/10">
            <p className="text-xs font-extrabold uppercase tracking-wide text-accent-amber">{onboardingCopy.analysis.needsReinforcement}</p>
            <p className="mt-2 text-xl font-extrabold text-ink">{insights.weakCategory}</p>
          </SurfacePanel>
        </div>
      </AnimatedExplanationFrame>
    );
  }

  if (phase === 'science') {
    return (
      <AnimatedExplanationFrame
        mascotState="correct"
        mascotPersona="robot"
        eventKey={reactionEventId}
        eyebrow={onboardingCopy.science.eyebrow}
        title={onboardingCopy.science.title}
        body={onboardingCopy.science.body}
        primaryActionLabel={onboardingCopy.science.primaryAction}
        onPrimaryAction={onComplete}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <GameSignalBadge icon={<Brain size={14} />} label={onboardingCopy.science.memorySignals} tone="coral" />
          <GameSignalBadge icon={<ChartNoAxesColumnIncreasing size={14} />} label={onboardingCopy.science.progressScience} tone="teal" />
          <GameSignalBadge icon={<Sparkles size={14} />} label={onboardingCopy.science.adaptivePath} tone="success" />
        </div>
      </AnimatedExplanationFrame>
    );
  }

  return (
    <AppScreen width="wide" contentClassName="min-h-dvh px-4 py-4">
      <main className="mx-auto grid w-full max-w-5xl gap-4 lg:min-h-[calc(100dvh-2rem)] lg:grid-cols-[minmax(300px,360px)_minmax(360px,440px)] lg:items-start lg:justify-center">
        <section className="space-y-3">
          <SurfacePanel padding="lg" className="border-hairline bg-canvas">
            <MascotSpeechCallout
              testId="vocabulary-scan-bubble"
              steps={[{
                eyebrow: onboardingCopy.scan.eyebrow,
                title: onboardingCopy.scan.title,
                body: onboardingCopy.scan.instructions,
              }]}
              reactionState="levelUp"
              restingState="idle"
              persona="coach"
              size="compact"
              className="lg:grid-cols-[minmax(72px,96px)_minmax(0,1fr)]"
              mascotClassName="shrink-0"
              bubbleClassName="rounded-[1.75rem] border-hairline bg-canvas p-4 ring-0"
              bubbleContentClassName="min-h-[148px]"
              titleClassName="mt-2 min-h-[4.6rem] text-3xl font-extrabold leading-tight text-ink"
              bodyClassName="mt-2 min-h-[4.5rem] text-sm font-semibold leading-6 text-muted"
            />

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SignalSummaryTile icon={<Target size={17} />} label={onboardingCopy.scan.scanLabel} value={signals.length} tone="coral" compact />
              <SignalSummaryTile icon={<Sparkles size={17} />} label={onboardingCopy.scan.knownLabel} value={insights.knownEstimate} tone="success" compact />
              <SignalSummaryTile icon={<Brain size={17} />} label={onboardingCopy.scan.reviewLabel} value={insights.reviewEstimate} tone="amber" compact />
            </div>

            <div className={`${UI_RADIUS.control} mt-5 border border-hairline bg-surface-soft p-4`}>
              <p className="text-sm font-extrabold text-ink">
                {canPersonalize
                  ? onboardingCopy.scan.readyMessage
                  : formatCopy(onboardingCopy.scan.remainingMessage, { remaining: remainingToMinimum })}
              </p>
              <p className="mt-1 text-sm font-medium text-muted">
                {formatCopy(onboardingCopy.scan.autoAdvanceMessage, { maxSwipes: MAX_VOCABULARY_SCAN_SWIPES })}
              </p>
            </div>

            {canPersonalize && (
              <button
                type="button"
                onClick={() => advanceWithMascot('analysis')}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-extrabold text-on-primary hover:bg-primary-active`}
              >
                {onboardingCopy.scan.personalizeAction}
                <ArrowRight size={17} />
              </button>
            )}
          </SurfacePanel>
        </section>

        <section className="flex min-h-0 flex-col gap-3">
          <div className="relative flex min-h-[520px] items-start justify-center">
            {nextCard && (
              <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 w-full scale-90 opacity-20 blur-sm">
                <div className={`overflow-hidden border border-hairline bg-canvas ${UI_RADIUS.surface}`}>
                  <div className="aspect-[4/3] bg-surface-soft" />
                </div>
              </div>
            )}

            {currentCard ? (
              <Card
                key={currentCard.id}
                flashcard={currentCard}
                onSwipe={handleSwipe}
                swipeDirection={lastSwipeDirection}
              />
            ) : (
              <SurfacePanel className="w-full border-dashed border-hairline bg-canvas text-center" padding="lg">
                <h2 className="text-2xl font-extrabold text-ink">{onboardingCopy.scan.emptyTitle}</h2>
                <p className="mt-2 text-sm font-medium text-muted">
                  {onboardingCopy.scan.emptyBody}
                </p>
                <button
                  type="button"
                  onClick={onComplete}
                  className={`${UI_RADIUS.control} mt-5 bg-primary px-5 py-3 text-sm font-extrabold text-on-primary`}
                >
                  {onboardingCopy.scan.emptyAction}
                </button>
              </SurfacePanel>
            )}
          </div>

          <SwipeButtons onSwipe={handleSwipe} disabled={!currentCard} />
          <ProgressBar progress={progress} totalCards={totalCards} />
        </section>
      </main>
    </AppScreen>
  );
}

interface AnimatedExplanationFrameProps {
  dataTestId?: string;
  mascotState: 'correct' | 'levelUp';
  mascotPersona: 'coach' | 'explorer' | 'robot';
  eventKey: number;
  eyebrow: string;
  title: string;
  body: string;
  speechSteps?: StreamingSpeechStep[];
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  children: ReactNode;
}

function AnimatedExplanationFrame({
  dataTestId,
  mascotState,
  mascotPersona,
  eventKey,
  eyebrow,
  title,
  body,
  speechSteps,
  primaryActionLabel,
  onPrimaryAction,
  children,
}: AnimatedExplanationFrameProps) {
  const steps = useMemo<StreamingSpeechStep[]>(() => (
    speechSteps?.length
      ? speechSteps
      : [{ eyebrow, title, body }]
  ), [body, eyebrow, speechSteps, title]);
  const [speechState, setSpeechState] = useState({ stepIndex: 0, isTyping: true });

  return (
    <AppScreen width="full" className="bg-canvas" contentClassName="flex min-h-dvh items-center px-4 pb-28 pt-6 sm:py-6">
      <main data-testid={dataTestId} className="relative mx-auto grid w-full max-w-5xl gap-5 pt-14 lg:grid-cols-[minmax(220px,300px)_minmax(420px,1fr)] lg:items-center lg:pt-0">
        <div className="flex justify-center">
          <MascotReaction
            state={speechState.isTyping ? mascotState : 'idle'}
            persona={mascotPersona}
            eventKey={eventKey + speechState.stepIndex}
            speaking={speechState.isTyping}
            className="max-w-[260px]"
          />
        </div>

        <StreamingSpeechBubble
          steps={steps}
          manualStepControl={steps.length > 1}
          skipSpeechLabel={copy.onboarding.animation.skipAction}
          nextStepLabel={copy.onboarding.animation.nextPageAction}
          onStepChange={(stepIndex) => setSpeechState((current) => (
            current.stepIndex === stepIndex ? current : { ...current, stepIndex }
          ))}
          onTypingChange={(isTyping) => setSpeechState((current) => (
            current.isTyping === isTyping ? current : { ...current, isTyping }
          ))}
        >
          <div className="space-y-5">
            {children}

            {primaryActionLabel && onPrimaryAction && (
              <button
                type="button"
                onClick={onPrimaryAction}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-14 w-full items-center justify-center gap-3 bg-primary px-5 py-4 text-sm font-extrabold text-on-primary hover:bg-primary-active`}
              >
                {primaryActionLabel}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </StreamingSpeechBubble>
      </main>
    </AppScreen>
  );
}

interface PreferenceQuestionnaireProps {
  preferencesCopy: PreferenceCopy;
  initialAnswers: OnboardingPreferenceAnswers;
  onBack: () => void;
  onComplete: (answers: OnboardingPreferenceAnswers) => void;
}

function PreferenceQuestionnaire({
  preferencesCopy,
  initialAnswers,
  onBack,
  onComplete,
}: PreferenceQuestionnaireProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingPreferenceAnswers>(initialAnswers);
  const questions = preferencesCopy.questions;
  const currentQuestion = questions[questionIndex];
  const isMultiSelectQuestion = isQuestionMultiSelect(currentQuestion);
  const currentAnswer = answers[currentQuestion.id];
  const selectedOptionIds = getAnswerOptionIds(currentAnswer);
  const hasSelection = hasAnsweredQuestion(currentAnswer);
  const isLastQuestion = questionIndex === questions.length - 1;

  const selectOption = (optionId: string) => {
    setAnswers((current) => toggleAnswerOption(current, currentQuestion.id, optionId, isMultiSelectQuestion));
  };

  const goNext = () => {
    if (!hasSelection) return;
    if (isLastQuestion) {
      onComplete(answers);
      return;
    }
    setQuestionIndex((current) => current + 1);
  };

  const goBack = () => {
    if (questionIndex === 0) {
      onBack();
      return;
    }
    setQuestionIndex((current) => current - 1);
  };

  return (
    <section className="space-y-5" data-testid="onboarding-preference-questionnaire">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
          {formatCopy(preferencesCopy.progressLabel, { current: questionIndex + 1, total: questions.length })}
        </p>
        <div className={`${UI_RADIUS.control} h-2 min-w-28 flex-1 overflow-hidden bg-surface-soft`}>
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <SurfacePanel padding="md" className="border-hairline bg-surface-soft">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">
          {currentQuestion.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight text-ink">
          {currentQuestion.title}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-body">
          {currentQuestion.body}
        </p>
      </SurfacePanel>

      <div className="grid gap-3">
        {currentQuestion.options.map((option) => {
          const selected = selectedOptionIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => selectOption(option.id)}
              className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} border px-4 py-3 text-left ${
                selected
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-hairline bg-canvas text-ink hover:border-primary hover:bg-surface-soft'
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-extrabold">{option.label}</span>
                  <span className={`mt-1 block text-sm font-semibold leading-5 ${selected ? 'text-on-primary/80' : 'text-muted'}`}>
                    {option.description}
                  </span>
                </span>
                {selected && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-on-primary">
                    <CheckCircle2 size={17} />
                    {preferencesCopy.selectedLabel}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <button
          type="button"
          onClick={goBack}
          className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-12 items-center justify-center gap-2 border border-hairline bg-canvas px-4 py-3 text-sm font-extrabold text-body hover:bg-surface-soft`}
        >
          <ArrowLeft size={17} />
          {preferencesCopy.backAction}
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!hasSelection}
          className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-12 items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-extrabold text-on-primary hover:bg-primary-active disabled:cursor-not-allowed disabled:bg-primary-disabled`}
        >
          {isLastQuestion ? preferencesCopy.finishAction : preferencesCopy.nextAction}
          <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}

interface SignalSummaryTileProps {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'coral' | 'success' | 'amber';
  compact?: boolean;
}

function SignalSummaryTile({ icon, label, value, tone, compact = false }: SignalSummaryTileProps) {
  const tones = {
    coral: 'border-hairline bg-surface-soft text-primary',
    success: 'border-success/20 bg-success/10 text-success',
    amber: 'border-accent-amber/20 bg-accent-amber/10 text-accent-amber',
  };

  return (
    <div className={`${UI_RADIUS.control} border ${tones[tone]} ${compact ? 'px-3 py-2' : 'p-4'}`}>
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <p className={`${compact ? 'mt-1 text-2xl' : 'mt-3 text-4xl'} font-extrabold`}>{value}</p>
    </div>
  );
}
