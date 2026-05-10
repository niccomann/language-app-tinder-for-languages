import { useState, type ReactNode } from 'react';
import type { MascotPersona, MascotReactionState } from '../gamification/mascotManifest';
import { MascotReaction } from './MascotReaction';
import { StreamingSpeechBubble, type StreamingSpeechStep } from './StreamingSpeechBubble';

interface MascotSpeechCalloutProps {
  steps: StreamingSpeechStep[];
  reactionState: MascotReactionState;
  restingState?: MascotReactionState;
  persona?: MascotPersona | 'auto';
  eventKey?: number;
  playbackKey?: string | number;
  size?: 'default' | 'compact';
  testId?: string;
  className?: string;
  mascotClassName?: string;
  bubbleClassName?: string;
  bubbleContentClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  showStepIndicator?: boolean;
  stream?: boolean;
  children?: ReactNode;
}

export function MascotSpeechCallout({
  steps,
  reactionState,
  restingState = 'idle',
  persona = 'auto',
  eventKey = 0,
  playbackKey = eventKey,
  size = 'default',
  testId,
  className = '',
  mascotClassName = '',
  bubbleClassName = '',
  bubbleContentClassName = 'min-h-[150px]',
  titleClassName = 'mt-2 min-h-[3.2rem] text-2xl font-semibold leading-tight text-ink',
  bodyClassName = 'mt-2 min-h-[3.2rem] text-sm font-semibold leading-6 text-muted',
  showStepIndicator = false,
  stream = true,
  children,
}: MascotSpeechCalloutProps) {
  const [speechState, setSpeechState] = useState({ playbackKey, stepIndex: 0, isTyping: stream });
  const activeSpeechState = speechState.playbackKey === playbackKey
    ? speechState
    : { playbackKey, stepIndex: 0, isTyping: stream };
  const isSpeaking = stream && activeSpeechState.isTyping;
  const activeReactionState = isSpeaking ? reactionState : restingState;

  return (
    <section
      data-testid={testId}
      className={`grid gap-4 lg:grid-cols-[minmax(96px,180px)_minmax(0,1fr)] lg:items-center ${className}`}
    >
      <MascotReaction
        state={activeReactionState}
        persona={persona}
        eventKey={eventKey + activeSpeechState.stepIndex}
        size={size}
        speaking={isSpeaking}
        className={mascotClassName}
      />

      <StreamingSpeechBubble
        key={playbackKey}
        steps={steps}
        playbackKey={playbackKey}
        stream={stream}
        showStepIndicator={showStepIndicator}
        contentClassName={bubbleContentClassName}
        titleClassName={titleClassName}
        bodyClassName={bodyClassName}
        className={bubbleClassName}
        onStepChange={(stepIndex) => setSpeechState((current) => (
          current.playbackKey === playbackKey && current.stepIndex === stepIndex
            ? current
            : { playbackKey, stepIndex, isTyping: current.playbackKey === playbackKey ? current.isTyping : stream }
        ))}
        onTypingChange={(isTyping) => setSpeechState((current) => (
          current.playbackKey === playbackKey && current.isTyping === isTyping
            ? current
            : { playbackKey, stepIndex: current.playbackKey === playbackKey ? current.stepIndex : 0, isTyping }
        ))}
      >
        {children}
      </StreamingSpeechBubble>
    </section>
  );
}
