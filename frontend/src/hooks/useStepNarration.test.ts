import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const { speakNarration } = vi.hoisted(() => ({ speakNarration: vi.fn() }));
vi.mock('../services/api', () => ({ api: { speakNarration } }));

import { useStepNarration } from './useStepNarration';

const playMock = vi.fn(() => Promise.resolve());
const pauseMock = vi.fn();
const ttsSpeakMock = vi.fn();
const ttsCancelMock = vi.fn();

let lastAudio: FakeAudio | null = null;

class FakeAudio {
  src: string;
  onended: (() => void) | null = null;
  play = playMock;
  pause = pauseMock;
  constructor(src: string) {
    this.src = src;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastAudio = this;
  }
}

class FakeUtterance {
  lang = '';
  constructor(public text: string) {}
}

beforeEach(() => {
  speakNarration.mockReset();
  playMock.mockReset().mockResolvedValue(undefined);
  pauseMock.mockReset();
  ttsSpeakMock.mockReset();
  ttsCancelMock.mockReset();
  vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);
  vi.stubGlobal('speechSynthesis', { speak: ttsSpeakMock, cancel: ttsCancelMock });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance as unknown as typeof SpeechSynthesisUtterance);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useStepNarration', () => {
  it('prefetches narration for every step in the chosen language', async () => {
    speakNarration.mockResolvedValue({ audio_base64: 'data:audio', cached: false });
    renderHook(() => useStepNarration(['one', 'two'], 'it', 0, true));
    await waitFor(() => expect(speakNarration).toHaveBeenCalledTimes(2));
    expect(speakNarration).toHaveBeenCalledWith('one', 'it');
    expect(speakNarration).toHaveBeenCalledWith('two', 'it');
  });

  it('plays the active step audio once it has loaded', async () => {
    speakNarration.mockResolvedValue({ audio_base64: 'data:audio', cached: false });
    renderHook(() => useStepNarration(['one'], 'it', 0, true));
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
  });

  it('stays silent and fetches nothing when disabled', async () => {
    speakNarration.mockResolvedValue({ audio_base64: 'x', cached: false });
    renderHook(() => useStepNarration(['one'], 'it', 0, false));
    await new Promise((r) => setTimeout(r, 30));
    expect(speakNarration).not.toHaveBeenCalled();
    expect(playMock).not.toHaveBeenCalled();
  });

  it('falls back to the browser voice when OpenAI TTS fails', async () => {
    speakNarration.mockRejectedValue(new Error('quota'));
    renderHook(() => useStepNarration(['one'], 'it', 0, true));
    await waitFor(() => expect(ttsSpeakMock).toHaveBeenCalledTimes(1));
    expect(playMock).not.toHaveBeenCalled(); // no OpenAI audio element
    const utterance = ttsSpeakMock.mock.calls[0][0];
    expect(utterance.text).toBe('one');
    expect(utterance.lang).toBe('it-IT');
  });

  it('stop() pauses playback', async () => {
    speakNarration.mockResolvedValue({ audio_base64: 'x', cached: false });
    const { result } = renderHook(() => useStepNarration(['one'], 'it', 0, true));
    await waitFor(() => expect(playMock).toHaveBeenCalled());
    result.current.stop();
    expect(pauseMock).toHaveBeenCalled();
  });

  it('replay() plays the current step on demand', async () => {
    speakNarration.mockResolvedValue({ audio_base64: 'x', cached: false });
    const { result } = renderHook(() => useStepNarration(['one'], 'it', 0, true));
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    act(() => result.current.replay());
    expect(playMock).toHaveBeenCalledTimes(2);
  });

  it('fires onEnded when the step audio finishes (drives auto-advance)', async () => {
    speakNarration.mockResolvedValue({ audio_base64: 'x', cached: false });
    const onEnded = vi.fn();
    renderHook(() => useStepNarration(['one'], 'it', 0, true, onEnded));
    await waitFor(() => expect(playMock).toHaveBeenCalled());
    act(() => {
      lastAudio?.onended?.();
    });
    expect(onEnded).toHaveBeenCalledWith(0);
  });

  it('waits for OpenAI audio instead of the robotic browser voice when a gesture beats the prefetch', async () => {
    let resolvePrefetch: (value: { audio_base64: string; cached: boolean }) => void = () => {};
    speakNarration.mockReturnValue(new Promise((resolve) => { resolvePrefetch = resolve; }));
    renderHook(() => useStepNarration(['one'], 'it', 0, true));

    // User gesture happens before the OpenAI audio has been fetched.
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    expect(ttsSpeakMock).not.toHaveBeenCalled(); // no robotic fallback
    expect(playMock).not.toHaveBeenCalled();

    // Once OpenAI audio arrives it plays (and still no browser voice).
    await act(async () => {
      resolvePrefetch({ audio_base64: 'data:audio', cached: false });
    });
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    expect(ttsSpeakMock).not.toHaveBeenCalled();
  });

  it('flags blocked on autoplay rejection and retries after a user gesture', async () => {
    speakNarration.mockResolvedValue({ audio_base64: 'x', cached: false });
    playMock.mockReset();
    playMock.mockRejectedValueOnce(new Error('blocked')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useStepNarration(['one'], 'it', 0, true));
    await waitFor(() => expect(result.current.blocked).toBe(true));
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));
  });
});
