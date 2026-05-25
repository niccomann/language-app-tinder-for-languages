import { useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppScreen } from './AppScreen';
import { UI_INTERACTION, UI_RADIUS } from './geometry';
import { buildSpeechSteps } from './introSpeech';
import { MascotReaction } from '../MascotReaction';
import { StreamingSpeechBubble } from '../StreamingSpeechBubble';
import { useCopy } from '../../i18n/languageContext';

interface ToolIntroGateProps {
  /** Kept for API compatibility; the intro now plays every time, no persistence. */
  storageKey?: string;
  title: string;
  /** Explanation lines, spoken one by one by the mascot before the feature starts. */
  steps: string[];
  startLabel?: string;
  mascotPersona?: 'coach' | 'explorer' | 'robot';
  children: ReactNode;
}

/**
 * Plays an animated, mascot-narrated explanation BEFORE the feature, every time.
 * The character speaks the steps (typewriter + TTS audio), then a "continue" button
 * reveals the feature. Keeps the feature view itself free of any instructional text.
 */
export function ToolIntroGate({
  title,
  steps,
  startLabel,
  mascotPersona = 'explorer',
  children,
}: ToolIntroGateProps) {
  const copy = useCopy();
  const [showIntro, setShowIntro] = useState(true);
  const [speech, setSpeech] = useState({ stepIndex: 0, isTyping: true });

  const startFeature = () => setShowIntro(false);

  if (!showIntro) return <>{children}</>;

  const speechSteps = buildSpeechSteps(title, steps);

  return (
    <AppScreen
      width="compact"
      className="bg-canvas"
      contentClassName="flex min-h-dvh items-center px-4 pb-28 pt-6 sm:py-6"
    >
      <main className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-6 pt-14 lg:pt-0">
        <div className="flex justify-center">
          <MascotReaction
            state={speech.isTyping ? 'levelUp' : 'idle'}
            persona={mascotPersona}
            eventKey={speech.stepIndex}
            speaking={speech.isTyping}
            className="max-w-[260px]"
          />
        </div>

        <StreamingSpeechBubble
          steps={speechSteps}
          manualStepControl={speechSteps.length > 1}
          skipSpeechLabel={copy.onboarding.animation.skipAction}
          nextStepLabel={copy.onboarding.animation.nextPageAction}
          onStepChange={(stepIndex) =>
            setSpeech((c) => (c.stepIndex === stepIndex ? c : { ...c, stepIndex }))
          }
          onTypingChange={(isTyping) =>
            setSpeech((c) => (c.isTyping === isTyping ? c : { ...c, isTyping }))
          }
        >
          <button
            type="button"
            onClick={startFeature}
            className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex min-h-14 w-full items-center justify-center gap-3 bg-primary px-5 py-4 text-sm font-semibold text-on-primary hover:bg-primary-active`}
          >
            {startLabel ?? copy.common.continue}
            <ArrowRight size={18} />
          </button>
        </StreamingSpeechBubble>
      </main>
    </AppScreen>
  );
}
