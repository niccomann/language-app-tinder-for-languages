import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCopy } from '../i18n/staticCopy';

const { getMovieRecommendations } = vi.hoisted(() => ({
  getMovieRecommendations: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: { getMovieRecommendations },
}));

vi.mock('../i18n/languageContext', async () => {
  const actual = await vi.importActual<typeof import('../i18n/staticCopy')>('../i18n/staticCopy');
  return {
    useCopy: () => actual.getStaticCopy('en'),
    useTargetLanguage: () => 'de',
  };
});

import { MovieRecommendations } from './MovieRecommendations';

const movieCopy = getStaticCopy('en').movieRecommendations;

const recommendation = {
  imdb_id: 'tt0068646',
  title: 'The Godfather',
  year: 1972,
  score: 0.008696,
  shared_vocab_count: 3,
  subtitle_unique_word_count: 345,
  sample_known_words: ['famiglia', 'tempo', 'vendetta lunga lunga lunga'],
};

beforeEach(() => {
  getMovieRecommendations.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MovieRecommendations', () => {
  it('loads recommendations for the target language and renders match details', async () => {
    getMovieRecommendations.mockResolvedValue([recommendation]);

    render(<MovieRecommendations onBack={() => {}} />);

    screen.getByText(movieCopy.loading);
    await screen.findByText('The Godfather');

    expect(getMovieRecommendations).toHaveBeenCalledWith('de', 20);
    screen.getByText('1972');
    screen.getByText('0.87%');
    screen.getByText('3 / 345');
    screen.getByText('345');
    screen.getByText('3');
    screen.getByText('famiglia');
    screen.getByText('tempo');
    screen.getByText('vendetta lunga lunga lunga');
    screen.getByText(movieCopy.noPoster);
  });

  it('explains how the movie matching algorithm works', async () => {
    getMovieRecommendations.mockResolvedValue([recommendation]);

    render(<MovieRecommendations onBack={() => {}} />);

    await screen.findByText('The Godfather');

    screen.getByText('How matching works');
    screen.getByText('Match is the share of distinct subtitle vocabulary covered by words you know, after normalization.');
    screen.getByText('The displayed percent is distinct known subtitle words divided by total distinct subtitle words, so 100 known words out of 1000 distinct subtitle words is 10%.');
    screen.getByText('The matcher normalizes conjugations, plurals, and inflected forms before comparing text, so andare can match andato and Hund can match Hunde.');
  });

  it('shows the localized empty state when no movies are recommended', async () => {
    getMovieRecommendations.mockResolvedValue([]);

    render(<MovieRecommendations onBack={() => {}} />);

    await screen.findByText(movieCopy.empty);
  });

  it('shows an error and retries the request', async () => {
    getMovieRecommendations
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([recommendation]);

    render(<MovieRecommendations onBack={() => {}} />);

    await screen.findByText(movieCopy.errorTitle);
    fireEvent.click(screen.getByRole('button', { name: movieCopy.errorRetry }));

    await screen.findByText('The Godfather');
    expect(getMovieRecommendations).toHaveBeenCalledTimes(2);
  });

  it('calls onBack from the header back button', async () => {
    getMovieRecommendations.mockResolvedValue([]);
    const onBack = vi.fn();

    render(<MovieRecommendations onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: getStaticCopy('en').a11y.goBack }));

    expect(onBack).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getMovieRecommendations).toHaveBeenCalled());
  });
});
