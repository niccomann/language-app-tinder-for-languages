import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Volume2 } from 'lucide-react';
import { useStepNarration } from '../hooks/useStepNarration';
import { useLanguage } from '../i18n/languageContext';

export interface StreamingSpeechStep {
  eyebrow: string;
  title: string;
  body: string;
}

export const TYPEWRITER_INTERVAL_MS = 24;
export const TYPEWRITER_CHARS_PER_TICK = 2;
export const SPEECH_STEP_PAUSE_MS = 1000;

interface StreamingSpeechBubbleProps {
  steps: StreamingSpeechStep[];
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  playbackKey?: string | number;
  showStepIndicator?: boolean;
  stream?: boolean;
  manualStepControl?: boolean;
  skipSpeechLabel?: string;
  nextStepLabel?: string;
  /** Narrate each step's body via backend TTS (source-locale voice). On by default;
   *  set false for transient/high-frequency bubbles where audio would be noise. */
  narrate?: boolean;
  onStepChange?: (stepIndex: number) => void;
  onTypingChange?: (isTyping: boolean) => void;
}

export function StreamingSpeechBubble({
  steps,
  children,
  className = '',
  contentClassName = 'min-h-[250px] sm:min-h-[220px]',
  eyebrowClassName = 'text-xs font-semibold uppercase tracking-wide text-primary',
  titleClassName = 'mt-2 min-h-[5.8rem] text-4xl font-semibold leading-tight text-ink',
  bodyClassName = 'mt-3 min-h-[6.75rem] text-base font-semibold leading-7 text-muted',
  playbackKey = 0,
  showStepIndicator,
  stream = true,
  manualStepControl = false,
  skipSpeechLabel = 'Skip',
  nextStepLabel = 'Next page',
  narrate = true,
  onStepChange,
  onTypingChange,
}: StreamingSpeechBubbleProps) {
  const { sourceLocale } = useLanguage();
  const normalizedSteps = useMemo<StreamingSpeechStep[]>(() => (
    steps.length
      ? steps
      : [{ eyebrow: '', title: '', body: '' }]
  ), [steps]);
  const shouldStreamSpeech = stream;
  const shouldShowStepIndicator = showStepIndicator ?? normalizedSteps.length > 1;
  const [speechPlayback, setSpeechPlayback] = useState({ stepIndex: 0, visibleCharacters: 0 });
  const activeStepIndex = Math.min(speechPlayback.stepIndex, normalizedSteps.length - 1);
  const activeStep = normalizedSteps[activeStepIndex];

  const narration = useStepNarration(
    normalizedSteps.map((step) => step.body),
    sourceLocale ?? 'en',
    activeStepIndex,
    narrate,
    // When a step's narration finishes, flow on to the next step automatically.
    (idx) => {
      setSpeechPlayback((current) => {
        if (current.stepIndex !== idx) return current;
        const next = Math.min(idx + 1, normalizedSteps.length - 1);
        return next === current.stepIndex ? current : { stepIndex: next, visibleCharacters: 0 };
      });
    },
  );
  const fullSpeechText = `${activeStep.title}\n${activeStep.body}`;
  const visibleCharacters = shouldStreamSpeech
    ? Math.min(speechPlayback.visibleCharacters, fullSpeechText.length)
    : fullSpeechText.length;
  const visibleTitle = shouldStreamSpeech
    ? activeStep.title.slice(0, Math.min(visibleCharacters, activeStep.title.length))
    : activeStep.title;
  const visibleBody = shouldStreamSpeech
    ? activeStep.body.slice(0, Math.max(0, visibleCharacters - activeStep.title.length - 1))
    : activeStep.body;
  const isTyping = shouldStreamSpeech && visibleCharacters < fullSpeechText.length;
  const isFinalSpeechStep = activeStepIndex === normalizedSteps.length - 1;
  const showInteractiveContent = !shouldStreamSpeech || (isFinalSpeechStep && !isTyping);
  const showManualControls = manualStepControl && shouldStreamSpeech && normalizedSteps.length > 1;
  const showSkipSpeech = showManualControls && (isTyping || !isFinalSpeechStep);
  const showNextStep = showManualControls && !isTyping && !isFinalSpeechStep;

  const skipSpeech = () => {
    const finalStepIndex = normalizedSteps.length - 1;
    const finalStep = normalizedSteps[finalStepIndex];
    setSpeechPlayback({
      stepIndex: finalStepIndex,
      visibleCharacters: `${finalStep.title}\n${finalStep.body}`.length,
    });
  };

  const goToNextStep = () => {
    setSpeechPlayback((current) => ({
      stepIndex: Math.min(current.stepIndex + 1, normalizedSteps.length - 1),
      visibleCharacters: 0,
    }));
  };

  useEffect(() => {
    onTypingChange?.(isTyping);
  }, [isTyping, onTypingChange, playbackKey]);

  useEffect(() => {
    onStepChange?.(activeStepIndex);
  }, [activeStepIndex, onStepChange]);

  useEffect(() => {
    if (!shouldStreamSpeech || !isTyping) return undefined;

    const typingTimer = window.setTimeout(() => {
      setSpeechPlayback((current) => {
        if (current.stepIndex !== activeStepIndex) return current;

        return {
          ...current,
          visibleCharacters: Math.min(
            current.visibleCharacters + TYPEWRITER_CHARS_PER_TICK,
            fullSpeechText.length,
          ),
        };
      });
    }, TYPEWRITER_INTERVAL_MS);

    return () => window.clearTimeout(typingTimer);
  }, [activeStepIndex, fullSpeechText.length, isTyping, shouldStreamSpeech, visibleCharacters]);

  useEffect(() => {
    if (!shouldStreamSpeech || manualStepControl || isTyping || isFinalSpeechStep) return undefined;

    const nextStepTimer = window.setTimeout(() => {
      setSpeechPlayback((current) => ({
        stepIndex: Math.min(current.stepIndex + 1, normalizedSteps.length - 1),
        visibleCharacters: 0,
      }));
    }, SPEECH_STEP_PAUSE_MS);

    return () => window.clearTimeout(nextStepTimer);
  }, [isFinalSpeechStep, isTyping, manualStepControl, normalizedSteps.length, shouldStreamSpeech]);

  return (
    <section
      data-testid="mascot-speech-bubble"
      data-speech-step-index={activeStepIndex + 1}
      data-speech-step-total={normalizedSteps.length}
      className={`relative space-y-5 rounded-[2rem] border border-hairline bg-canvas p-5 sm:p-6 lg:rounded-[2.5rem] ${className}`}
    >
      <span
        data-testid="speech-bubble-tail"
        aria-hidden="true"
        className="pointer-events-none absolute -top-4 left-1/2 flex h-10 w-16 -translate-x-1/2 items-end justify-center gap-1 lg:-left-10 lg:top-1/2 lg:h-16 lg:w-10 lg:-translate-y-1/2 lg:translate-x-0 lg:flex-col"
      >
        <span className="h-3 w-3 rounded-full border border-hairline bg-canvas" />
        <span className="h-5 w-5 rounded-full border border-hairline bg-canvas" />
        <span className="h-7 w-7 rounded-full border border-hairline bg-canvas" />
      </span>

      <div
        data-testid="streaming-speech-text"
        data-typing-state={isTyping ? 'streaming' : 'complete'}
        data-typewriter-interval-ms={TYPEWRITER_INTERVAL_MS}
        aria-live="polite"
        className={contentClassName}
      >
        <div className="flex items-center justify-between gap-3">
          <p className={eyebrowClassName}>{activeStep.eyebrow}</p>
          <div className="flex shrink-0 items-center gap-2">
            {narrate && (
              <button
                type="button"
                onClick={narration.replay}
                aria-label="Listen"
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-primary transition hover:bg-surface-soft ${
                  narration.blocked ? 'animate-pulse border-primary bg-primary/10' : 'border-hairline bg-canvas'
                }`}
              >
                <Volume2 size={16} />
              </button>
            )}
            {showSkipSpeech && (
              <button
                type="button"
                onClick={skipSpeech}
                className="min-h-9 rounded-full border border-hairline bg-canvas px-3 py-1 text-xs font-semibold text-body transition hover:border-primary hover:bg-surface-soft"
              >
                {skipSpeechLabel}
              </button>
            )}
            {shouldShowStepIndicator && (
              <p
                data-testid="speech-step-indicator"
                className="rounded-full border border-hairline bg-surface-soft px-3 py-1 text-xs font-semibold text-primary"
              >
                {activeStepIndex + 1} / {normalizedSteps.length}
              </p>
            )}
          </div>
        </div>
        <h1 className={titleClassName}>
          {visibleTitle}
          {isTyping && visibleCharacters <= activeStep.title.length && (
            <span data-testid="typing-cursor" className="ml-1 inline-block h-9 w-1 translate-y-1 animate-pulse rounded-full bg-primary" />
          )}
        </h1>
        <p className={bodyClassName}>
          {visibleBody}
          {isTyping && visibleCharacters > activeStep.title.length && (
            <span data-testid="typing-cursor" className="ml-1 inline-block h-5 w-1 translate-y-1 animate-pulse rounded-full bg-primary" />
          )}
        </p>
      </div>

      {showNextStep && (
        <button
          type="button"
          onClick={goToNextStep}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-hairline bg-surface-soft px-5 py-3 text-sm font-semibold text-primary transition hover:bg-surface-cream-strong"
        >
          {nextStepLabel}
        </button>
      )}

      {showInteractiveContent && children}
    </section>
  );
}
