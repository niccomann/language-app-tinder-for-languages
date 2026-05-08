import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Brain, ChartNoAxesColumnIncreasing, Sparkles, Target } from 'lucide-react';
import type { AdaptiveFlashcard, UserProgress } from '../types';
import { Card } from './Card';
import { MascotReaction } from './MascotReaction';
import { ProgressBar } from './ProgressBar';
import { SwipeButtons } from './SwipeButtons';
import { AppScreen, GameSignalBadge, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import {
  MAX_VOCABULARY_SCAN_SWIPES,
  MIN_VOCABULARY_SCAN_SWIPES,
  buildVocabularyInsights,
  formatVocabularyCategory,
  type VocabularySignal,
} from './firstVocabularyOnboardingMeta';

type OnboardingPhase = 'scan' | 'analysis' | 'science';

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
  const [phase, setPhase] = useState<OnboardingPhase>('scan');
  const [signals, setSignals] = useState<VocabularySignal[]>([]);
  const [lastSwipeDirection, setLastSwipeDirection] = useState<'left' | 'right'>('right');
  const [reactionEventId, setReactionEventId] = useState(0);

  const insights = useMemo(() => buildVocabularyInsights(signals), [signals]);
  const remainingToMinimum = Math.max(0, MIN_VOCABULARY_SCAN_SWIPES - signals.length);
  const canPersonalize = signals.length >= MIN_VOCABULARY_SCAN_SWIPES;

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

  if (phase === 'analysis') {
    return (
      <AnimatedExplanationFrame
        mascotState="levelUp"
        mascotPersona="explorer"
        eventKey={reactionEventId}
        eyebrow="Analisi completata"
        title={`Conosci circa ${insights.knownEstimate} parole`}
        body="Personalizziamo il tuo apprendimento partendo dai segnali che hai appena creato."
        primaryActionLabel="Continua"
        onPrimaryAction={() => advanceWithMascot('science')}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <SignalSummaryTile icon={<Target size={18} />} label="Parole viste" value={signals.length} tone="indigo" />
          <SignalSummaryTile icon={<Sparkles size={18} />} label="Segnali forti" value={insights.knownEstimate} tone="emerald" />
          <SignalSummaryTile icon={<Brain size={18} />} label="Da ripetere" value={insights.reviewEstimate} tone="amber" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SurfacePanel padding="md" className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40">
            <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-200">Più forte su</p>
            <p className="mt-2 text-xl font-extrabold text-emerald-900 dark:text-emerald-100">{insights.strongCategory}</p>
          </SurfacePanel>
          <SurfacePanel padding="md" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
            <p className="text-xs font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-200">Da rinforzare</p>
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
        eyebrow="Sistema adattivo"
        title="La scienza lavora sotto"
        body="Ogni swipe diventa un segnale. Tu divertiti: il sistema misura miglioramenti, difficoltà, parole da ripetere e contesti più adatti."
        primaryActionLabel="Entra nel percorso"
        onPrimaryAction={onComplete}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <GameSignalBadge icon={<Brain size={14} />} label="Memory signals" tone="indigo" />
          <GameSignalBadge icon={<ChartNoAxesColumnIncreasing size={14} />} label="Progress science" tone="sky" />
          <GameSignalBadge icon={<Sparkles size={14} />} label="Adaptive path" tone="emerald" />
        </div>
      </AnimatedExplanationFrame>
    );
  }

  return (
    <AppScreen width="wide" contentClassName="min-h-dvh px-4 py-4">
      <main className="mx-auto grid w-full max-w-5xl gap-4 lg:min-h-[calc(100dvh-2rem)] lg:grid-cols-[minmax(300px,360px)_minmax(360px,440px)] lg:items-start lg:justify-center">
        <section className="space-y-3">
          <SurfacePanel padding="lg" className="border-indigo-100 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95">
            <div className="flex items-start gap-3">
              <MascotReaction
                state="idle"
                persona="coach"
                size="compact"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-500">First run</p>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950 dark:text-white">
                  Vocabulary Scan
                </h1>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                  Prima capiamo quali parole sai. Scorri a destra se la conosci, a sinistra se non la conosci.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <SignalSummaryTile icon={<Target size={17} />} label="Scan" value={signals.length} tone="indigo" compact />
              <SignalSummaryTile icon={<Sparkles size={17} />} label="Sai" value={insights.knownEstimate} tone="emerald" compact />
              <SignalSummaryTile icon={<Brain size={17} />} label="Rivedi" value={insights.reviewEstimate} tone="amber" compact />
            </div>

            <div className={`${UI_RADIUS.control} mt-5 border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70`}>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                {canPersonalize
                  ? 'Hai abbastanza segnali per creare il primo profilo.'
                  : `Ancora ${remainingToMinimum} swipe per stimare il primo vocabolario.`}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">
                A {MAX_VOCABULARY_SCAN_SWIPES} swipe passiamo automaticamente alla personalizzazione.
              </p>
            </div>

            {canPersonalize && (
              <button
                type="button"
                onClick={() => advanceWithMascot('analysis')}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} mt-5 flex min-h-12 w-full items-center justify-center gap-2 bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:bg-indigo-700`}
              >
                Personalizza il mio percorso
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
                <h2 className="text-2xl font-extrabold text-slate-900">Nessuna parola disponibile</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Entra nel percorso e ricarica il mazzo quando i dati sono pronti.
                </p>
                <button
                  type="button"
                  onClick={onComplete}
                  className={`${UI_RADIUS.control} mt-5 bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white`}
                >
                  Entra nel percorso
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
  mascotState: 'correct' | 'levelUp';
  mascotPersona: 'explorer' | 'robot';
  eventKey: number;
  eyebrow: string;
  title: string;
  body: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  children: ReactNode;
}

function AnimatedExplanationFrame({
  mascotState,
  mascotPersona,
  eventKey,
  eyebrow,
  title,
  body,
  primaryActionLabel,
  onPrimaryAction,
  children,
}: AnimatedExplanationFrameProps) {
  return (
    <AppScreen width="wide" contentClassName="flex min-h-dvh items-center px-4 py-6">
      <main className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(220px,300px)_minmax(420px,1fr)] lg:items-center">
        <div className="flex justify-center">
          <MascotReaction
            state={mascotState}
            persona={mascotPersona}
            eventKey={eventKey}
            className="max-w-[260px]"
          />
        </div>

        <SurfacePanel padding="lg" className="space-y-5 border-indigo-100 bg-white/95 dark:border-slate-700 dark:bg-slate-900/95">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-500">{eyebrow}</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-tight text-slate-950 dark:text-white">{title}</h1>
            <p className="mt-3 text-base font-semibold leading-7 text-slate-500 dark:text-slate-300">{body}</p>
          </div>

          {children}

          <button
            type="button"
            onClick={onPrimaryAction}
            className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-14 w-full items-center justify-center gap-3 bg-indigo-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg hover:bg-indigo-700`}
          >
            {primaryActionLabel}
            <ArrowRight size={18} />
          </button>
        </SurfacePanel>
      </main>
    </AppScreen>
  );
}

interface SignalSummaryTileProps {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'indigo' | 'emerald' | 'amber';
  compact?: boolean;
}

function SignalSummaryTile({ icon, label, value, tone, compact = false }: SignalSummaryTileProps) {
  const tones = {
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
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
