import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCopy } from '../../i18n/staticCopy';

vi.mock('../../i18n/languageContext', async () => {
  const actual = await vi.importActual<typeof import('../../i18n/staticCopy')>('../../i18n/staticCopy');
  return {
    useCopy: () => actual.getStaticCopy('en'),
  };
});

import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('navigates to movie recommendations from the bottom nav', () => {
    const onNavigate = vi.fn();

    render(<BottomNav pathname="/" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Films' }));

    expect(onNavigate).toHaveBeenCalledWith('/movie-recommendations');
  });

  it('marks movie recommendations active on its route', () => {
    render(<BottomNav pathname="/movie-recommendations" onNavigate={() => {}} />);

    expect(screen.getByRole('button', { name: 'Films' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: getStaticCopy('en').bottomNav.path }).getAttribute('aria-current')).toBeNull();
  });
});
