import type { StreamingSpeechStep } from '../StreamingSpeechBubble';

/**
 * Maps plain explanation lines into speech-bubble steps: the title rides on the
 * first step only, every line becomes the spoken body.
 */
export function buildSpeechSteps(title: string, steps: string[]): StreamingSpeechStep[] {
  return steps.map((line, i) => ({
    eyebrow: '',
    title: i === 0 ? title : '',
    body: line,
  }));
}
