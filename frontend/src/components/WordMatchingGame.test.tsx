import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getStaticCopy } from '../i18n/staticCopy';

const { getMatchPairs, getAdaptiveLearningSummary, speakText, getExampleSentences, getWordImage } = vi.hoisted(() => ({
  getMatchPairs: vi.fn(),
  getAdaptiveLearningSummary: vi.fn(),
  speakText: vi.fn(),
  getExampleSentences: vi.fn(),
  getWordImage: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: { getMatchPairs, getAdaptiveLearningSummary, speakText, getExampleSentences, getWordImage } }));

vi.mock('../i18n/languageContext', async () => {
  const actual = await vi.importActual<typeof import('../i18n/staticCopy')>('../i18n/staticCopy');
  return {
    useLanguage: () => ({ sourceLocale: 'it', targetLanguage: 'de' }),
    useTargetLanguage: () => 'de',
    useCopy: () => actual.getStaticCopy('en'),
  };
});

import { WordMatchingGame } from './WordMatchingGame';

const copy = getStaticCopy('en').wordMatch;

const PAIRS = [
  { id: 1, base_word: 'cane', target_word: 'Hund' },
  { id: 2, base_word: 'gatto', target_word: 'Katze' },
  { id: 3, base_word: 'casa', target_word: 'Haus' },
  { id: 4, base_word: 'libro', target_word: 'Buch' },
];

const clickWord = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const matchPair = (baseWord: string, targetWord: string) => {
  clickWord(baseWord);
  clickWord(targetWord);
};

beforeEach(() => {
  getMatchPairs.mockReset();
  getAdaptiveLearningSummary.mockReset().mockResolvedValue({ path_level: 7 });
  speakText.mockReset().mockResolvedValue({ audio_base64: '', cached: true });
  getExampleSentences.mockReset().mockResolvedValue([]);
  getWordImage.mockReset().mockResolvedValue(null);
});

describe('WordMatchingGame', () => {
  it('requests pairs for the resolved base/target language pair', async () => {
    getMatchPairs.mockResolvedValue(PAIRS);
    render(<WordMatchingGame onBack={() => {}} />);
    await screen.findByRole('button', { name: 'cane' });
    expect(getMatchPairs).toHaveBeenCalledWith(expect.objectContaining({ base: 'it', target: 'de', maxCefrLevel: 'A1' }));
  });

  it('locks a correct match green and shows retry on a wrong one', async () => {
    getMatchPairs.mockResolvedValue(PAIRS);
    render(<WordMatchingGame onBack={() => {}} />);
    await screen.findByRole('button', { name: 'cane' });

    // Wrong: cane (base) paired with the wrong translation.
    clickWord('cane');
    clickWord('Katze');
    screen.getByText(copy.wrong); // throws if the retry message is missing
    expect((screen.getByRole('button', { name: 'cane' }) as HTMLButtonElement).disabled).toBe(false);

    // The base stays selected, so the correct translation completes the pair.
    clickWord('Hund');
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Hund' }) as HTMLButtonElement).disabled).toBe(true),
    );
    expect((screen.getByRole('button', { name: 'cane' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the score screen once every pair is solved', async () => {
    getMatchPairs.mockResolvedValue(PAIRS);
    render(<WordMatchingGame onBack={() => {}} />);
    await screen.findByRole('button', { name: 'cane' });

    matchPair('cane', 'Hund');
    matchPair('gatto', 'Katze');
    matchPair('casa', 'Haus');
    matchPair('libro', 'Buch');

    await screen.findByText(copy.finishedTitle);
    screen.getByText('100%'); // throws if the perfect-accuracy score is missing
  });

  it('tells the user when there are not enough words for a round', async () => {
    getMatchPairs.mockResolvedValue(PAIRS.slice(0, 2));
    render(<WordMatchingGame onBack={() => {}} />);
    await screen.findByText(copy.notEnoughTitle);
  });

  it('reveals example sentences for the played words after the game', async () => {
    getMatchPairs.mockResolvedValue(PAIRS);
    getExampleSentences.mockResolvedValue([
      { id: 1, word: 'Hund', sentences: [{ sentence: 'Der Hund schläft.', translation: 'The dog is sleeping.' }] },
    ]);
    render(<WordMatchingGame onBack={() => {}} />);
    await screen.findByRole('button', { name: 'cane' });

    matchPair('cane', 'Hund');
    matchPair('gatto', 'Katze');
    matchPair('casa', 'Haus');
    matchPair('libro', 'Buch');

    fireEvent.click(await screen.findByRole('button', { name: copy.listenSentences }));

    // The sentence renders one <span> per word (for the karaoke highlight), so
    // assert on a unique word rather than the full string.
    await screen.findByText('schläft.');
    expect(getExampleSentences).toHaveBeenCalledWith(
      expect.objectContaining({ ids: [1, 2, 3, 4] }),
    );
  });
});
