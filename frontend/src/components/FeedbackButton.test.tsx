import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCopy } from '../i18n/staticCopy';

const { listFeedback, submitFeedback } = vi.hoisted(() => ({
  listFeedback: vi.fn(),
  submitFeedback: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: { listFeedback, submitFeedback },
}));

vi.mock('../i18n/languageContext', async () => {
  const actual = await vi.importActual<typeof import('../i18n/staticCopy')>('../i18n/staticCopy');
  return {
    useCopy: () => actual.getStaticCopy('en'),
  };
});

import { FeedbackButton } from './FeedbackButton';

const copy = getStaticCopy('en').feedbackForm;

function openFeedbackModal() {
  render(<FeedbackButton />);
  fireEvent.click(screen.getByLabelText(copy.openAria));
}

describe('FeedbackButton', () => {
  beforeEach(() => {
    listFeedback.mockReset();
    submitFeedback.mockReset();
    submitFeedback.mockResolvedValue({ id: 'saved-feedback', created_at: 1710000000000 });
  });

  it('loads and renders public feedback history with persona context', async () => {
    listFeedback.mockResolvedValue([
      {
        id: 'feedback-1',
        created_at: 1770000000000,
        created_at_iso: '2026-02-02T10:30:00+00:00',
        message: 'The movie recommendation chart is useful.',
        sentiment: 'like',
        source_url: 'https://customizeyourlingua.com/movie-recommendations',
        persona: {
          nickname: 'Nico',
          age: 29,
          profession: 'humanist',
          native_language: 'it',
          target_level: 'b1',
          learning_motivation: 'Learning through movies',
        },
      },
    ]);

    openFeedbackModal();
    fireEvent.click(await screen.findByRole('button', { name: copy.history.tabHistory }));

    await screen.findByText('The movie recommendation chart is useful.');
    screen.getByText('Like');
    screen.getByText('Page: /movie-recommendations');
    screen.getByText('Nickname: Nico');
    screen.getByText('Age: 29');
    screen.getByText('Profile: Humanities');
    screen.getByText('Native language: Italian');
    screen.getByText('Level: B1 - Intermediate');
    screen.getByText('Motivation: Learning through movies');
  });

  it('renders the public empty history state', async () => {
    listFeedback.mockResolvedValue([]);

    openFeedbackModal();
    fireEvent.click(await screen.findByRole('button', { name: copy.history.tabHistory }));

    await screen.findByText(copy.history.empty);
  });

  it('renders a history error without breaking the submission flow', async () => {
    listFeedback.mockRejectedValue(new Error('network'));

    openFeedbackModal();
    fireEvent.click(await screen.findByRole('button', { name: copy.history.tabHistory }));

    await screen.findByText(copy.history.errorTitle);
    fireEvent.click(screen.getByRole('button', { name: copy.history.tabWrite }));

    fireEvent.change(screen.getByPlaceholderText(copy.placeholder), {
      target: { value: 'History is broken but submit still works.' },
    });
    fireEvent.click(screen.getByRole('button', { name: copy.continueButton }));
    await screen.findByText(copy.persona.sectionHint);
  });

  it('submits feedback after the optional persona step', async () => {
    listFeedback.mockResolvedValue([]);

    openFeedbackModal();

    fireEvent.change(screen.getByPlaceholderText(copy.placeholder), {
      target: { value: 'I like the swipe flow.' },
    });
    fireEvent.click(screen.getByRole('button', { name: copy.continueButton }));
    await screen.findByText(copy.persona.sectionHint);
    fireEvent.click(screen.getByRole('button', { name: copy.skipButton }));

    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith(expect.objectContaining({
        message: 'I like the swipe flow.',
        sentiment: 'neutral',
      }));
    });
    await screen.findByText(copy.successMessage);
  });
});
