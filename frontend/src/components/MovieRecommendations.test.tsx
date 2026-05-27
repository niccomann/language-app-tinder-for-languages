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
  score: 0.87,
  shared_vocab_count: 3,
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
    screen.getByText('87%');
    screen.getByText('3');
    screen.getByText('famiglia');
    screen.getByText('tempo');
    screen.getByText('vendetta lunga lunga lunga');
    screen.getByText(movieCopy.noPoster);
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
