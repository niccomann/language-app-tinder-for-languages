import { describe, it, expect } from 'vitest';
import { buildSpeechSteps } from './introSpeech';

describe('buildSpeechSteps', () => {
  it('puts the title on the first step only and each line in the body', () => {
    const result = buildSpeechSteps('Title', ['a', 'b', 'c']);
    expect(result).toEqual([
      { eyebrow: '', title: 'Title', body: 'a' },
      { eyebrow: '', title: '', body: 'b' },
      { eyebrow: '', title: '', body: 'c' },
    ]);
  });

  it('returns an empty array for no steps', () => {
    expect(buildSpeechSteps('Title', [])).toEqual([]);
  });

  it('keeps a single step with its title', () => {
    expect(buildSpeechSteps('Only', ['x'])).toEqual([{ eyebrow: '', title: 'Only', body: 'x' }]);
  });
});
