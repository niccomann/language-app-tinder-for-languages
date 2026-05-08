import { useEffect, useMemo, useState, type ReactNode } from 'react';

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
  onStepChange?: (stepIndex: number) => void;
  onTypingChange?: (isTyping: boolean) => void;
}

export function StreamingSpeechBubble({
  steps,
  children,
  className = '',
  contentClassName = 'min-h-[250px] sm:min-h-[220px]',
  eyebrowClassName = 'text-xs font-extrabold uppercase tracking-wide text-indigo-500',
  titleClassName = 'mt-2 min-h-[5.8rem] text-4xl font-extrabold leading-tight text-slate-950 dark:text-white',
  bodyClassName = 'mt-3 min-h-[6.75rem] text-base font-semibold leading-7 text-slate-500 dark:text-slate-300',
  playbackKey = 0,
  showStepIndicator,
  stream = true,
  onStepChange,
  onTypingChange,
}: StreamingSpeechBubbleProps) {
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
    if (!shouldStreamSpeech || isTyping || isFinalSpeechStep) return undefined;

    const nextStepTimer = window.setTimeout(() => {
      setSpeechPlayback((current) => ({
        stepIndex: Math.min(current.stepIndex + 1, normalizedSteps.length - 1),
        visibleCharacters: 0,
      }));
    }, SPEECH_STEP_PAUSE_MS);

    return () => window.clearTimeout(nextStepTimer);
  }, [isFinalSpeechStep, isTyping, normalizedSteps.length, shouldStreamSpeech]);

  return (
    <section
      data-testid="mascot-speech-bubble"
      data-speech-step-index={activeStepIndex + 1}
      data-speech-step-total={normalizedSteps.length}
      className={`relative space-y-5 rounded-[2rem] border-2 border-indigo-100 bg-white/95 p-5 shadow-2xl shadow-indigo-100/70 ring-4 ring-indigo-50/80 dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/30 dark:ring-slate-800/70 sm:p-6 lg:rounded-[2.5rem] ${className}`}
    >
      <span
        data-testid="speech-bubble-tail"
        aria-hidden="true"
        className="pointer-events-none absolute -top-4 left-1/2 flex h-10 w-16 -translate-x-1/2 items-end justify-center gap-1 lg:-left-10 lg:top-1/2 lg:h-16 lg:w-10 lg:-translate-y-1/2 lg:translate-x-0 lg:flex-col"
      >
        <span className="h-3 w-3 rounded-full border-2 border-indigo-100 bg-white dark:border-slate-700 dark:bg-slate-900" />
        <span className="h-5 w-5 rounded-full border-2 border-indigo-100 bg-white dark:border-slate-700 dark:bg-slate-900" />
        <span className="h-7 w-7 rounded-full border-2 border-indigo-100 bg-white dark:border-slate-700 dark:bg-slate-900" />
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
          {shouldShowStepIndicator && (
            <p
              data-testid="speech-step-indicator"
              className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-100"
            >
              {activeStepIndex + 1} / {normalizedSteps.length}
            </p>
          )}
        </div>
        <h1 className={titleClassName}>
          {visibleTitle}
          {isTyping && visibleCharacters <= activeStep.title.length && (
            <span data-testid="typing-cursor" className="ml-1 inline-block h-9 w-1 translate-y-1 animate-pulse rounded-full bg-indigo-500" />
          )}
        </h1>
        <p className={bodyClassName}>
          {visibleBody}
          {isTyping && visibleCharacters > activeStep.title.length && (
            <span data-testid="typing-cursor" className="ml-1 inline-block h-5 w-1 translate-y-1 animate-pulse rounded-full bg-indigo-500" />
          )}
        </p>
      </div>

      {showInteractiveContent && children}
    </section>
  );
}
