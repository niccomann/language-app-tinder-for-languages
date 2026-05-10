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
          <SurfacePanel padding="md" className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40">
            <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-200">{onboardingCopy.analysis.strongestOn}</p>
            <p className="mt-2 text-xl font-extrabold text-emerald-900 dark:text-emerald-100">{insights.strongCategory}</p>
          </SurfacePanel>
          <SurfacePanel padding="md" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-xs font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-200">{onboardingCopy.analysis.needsReinforcement}</p>
            <p className="mt-2 text-xl font-extrabold text-amber-900 dark:text-amber-100">{insights.weakCategory}</p>
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
          <SurfacePanel padding="lg" className="border-indigo-100 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95">
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
              bubbleClassName="rounded-[1.75rem] border-indigo-100 bg-white p-4 shadow-sm ring-0 dark:border-slate-700 dark:bg-slate-800"
              bubbleContentClassName="min-h-[148px]"
              titleClassName="mt-2 min-h-[4.6rem] text-3xl font-extrabold leading-tight text-slate-950 dark:text-white"
              bodyClassName="mt-2 min-h-[4.5rem] text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300"
            />

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SignalSummaryTile icon={<Target size={17} />} label={onboardingCopy.scan.scanLabel} value={signals.length} tone="coral" compact />
              <SignalSummaryTile icon={<Sparkles size={17} />} label={onboardingCopy.scan.knownLabel} value={insights.knownEstimate} tone="success" compact />
              <SignalSummaryTile icon={<Brain size={17} />} label={onboardingCopy.scan.reviewLabel} value={insights.reviewEstimate} tone="amber" compact />
            </div>

            <div className={`${UI_RADIUS.control} mt-5 border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70`}>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                {canPersonalize
                  ? onboardingCopy.scan.readyMessage
                  : formatCopy(onboardingCopy.scan.remainingMessage, { remaining: remainingToMinimum })}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">
                {formatCopy(onboardingCopy.scan.autoAdvanceMessage, { maxSwipes: MAX_VOCABULARY_SCAN_SWIPES })}
              </p>
            </div>

            {canPersonalize && (
              <button
                type="button"
                onClick={() => advanceWithMascot('analysis')}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-indigo-700`}
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
                <div className={`overflow-hidden border border-gray-200 bg-white ${UI_RADIUS.surface} shadow-xl`}>
                  <div className="aspect-[4/3] bg-slate-100" />
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
              <SurfacePanel className="w-full border-dashed border-slate-300 bg-white/80 text-center" padding="lg">
                <h2 className="text-2xl font-extrabold text-slate-900">{onboardingCopy.scan.emptyTitle}</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {onboardingCopy.scan.emptyBody}
                </p>
                <button
                  type="button"
                  onClick={onComplete}
                  className={`${UI_RADIUS.control} mt-5 bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white`}
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
    <AppScreen width="full" className="bg-white dark:bg-slate-950" contentClassName="flex min-h-dvh items-center px-4 pb-28 pt-6 sm:py-6">
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
                className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-14 w-full items-center justify-center gap-3 bg-indigo-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg hover:bg-indigo-700`}
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
        <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-600 dark:text-indigo-200">
          {formatCopy(preferencesCopy.progressLabel, { current: questionIndex + 1, total: questions.length })}
        </p>
        <div className={`${UI_RADIUS.control} h-2 min-w-28 flex-1 overflow-hidden bg-slate-100 dark:bg-slate-800`}>
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <SurfacePanel padding="md" className="border-indigo-100 bg-indigo-50/70 dark:border-indigo-800 dark:bg-indigo-950/30">
        <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-600 dark:text-indigo-200">
          {currentQuestion.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight text-slate-950 dark:text-white">
          {currentQuestion.title}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
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
              className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} border px-4 py-3 text-left shadow-sm ${
                selected
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40'
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-extrabold">{option.label}</span>
                  <span className={`mt-1 block text-sm font-semibold leading-5 ${selected ? 'text-indigo-50' : 'text-slate-500 dark:text-slate-300'}`}>
                    {option.description}
                  </span>
                </span>
                {selected && (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-white">
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
          className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-12 items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800`}
        >
          <ArrowLeft size={17} />
          {preferencesCopy.backAction}
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!hasSelection}
          className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-12 items-center justify-center gap-2 bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700`}
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
    coral: 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
    amber: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
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
