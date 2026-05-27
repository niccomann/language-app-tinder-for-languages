import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCopy } from '../../i18n/staticCopy';
import { ThemeProvider } from '../../contexts/ThemeContext';

vi.mock('../../i18n/languageContext', async () => {
  const actual = await vi.importActual<typeof import('../../i18n/staticCopy')>('../../i18n/staticCopy');
  return {
    useCopy: () => actual.getStaticCopy('en'),
  };
});

import { AppHeaderMenu } from './AppHeaderMenu';

const copy = getStaticCopy('en');

describe('AppHeaderMenu', () => {
  it('navigates to movie recommendations from the menu', () => {
    const onNavigate = vi.fn();
    render(
      <ThemeProvider>
        <AppHeaderMenu onNavigate={onNavigate} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: copy.a11y.appMenu }));
    fireEvent.click(screen.getByRole('button', { name: copy.movieRecommendations.menuLabel }));

    expect(onNavigate).toHaveBeenCalledWith('/movie-recommendations');
  });
});
