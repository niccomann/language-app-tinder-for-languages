import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  APP_URL,
  clearFirstVocabularyOnboardingDone,
  mockLearningApi,
} from './test-utils/appTestHelpers';

const localeDir = path.resolve(process.cwd(), 'src/i18n/locales');
const locales = ['en', 'it', 'fr'] as const;

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) => (
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  ));
}

test('static UI copy is available in JSON for English, Italian, and French', () => {
  const localeKeySets: Record<string, string[]> = {};

  for (const locale of locales) {
    const localePath = path.join(localeDir, `${locale}.json`);
    expect(fs.existsSync(localePath), `${locale}.json should exist`).toBe(true);

    const copy = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    localeKeySets[locale] = flattenKeys(copy).sort();

    expect(copy.onboarding.intro.title).toBeTruthy();
    expect(copy.onboarding.intro.primaryAction).toBeTruthy();
    expect(copy.onboarding.scan.title).toBeTruthy();
    expect(copy.onboarding.analysis.title).toContain('{{knownEstimate}}');
    expect(copy.featureGuides.sentenceGraphBuilder.title).toBeTruthy();
    expect(copy.featureFlow.composeSentence.title).toBeTruthy();
  }

  expect(localeKeySets.it).toEqual(localeKeySets.en);
  expect(localeKeySets.fr).toEqual(localeKeySets.en);
});

test('static UI copy can be switched from the URL locale', async ({ page }) => {
  await mockLearningApi(page);
  await clearFirstVocabularyOnboardingDone(page);
  await page.goto(`${APP_URL}/?locale=it`);

  const intro = page.getByTestId('vocabulary-intro');
  await expect(intro).toBeVisible({ timeout: 15000 });
  await expect(intro.getByText('Questa app parte dal vocabolario che conosci davvero.')).toBeVisible();
  await expect(intro.getByTestId('speech-step-indicator')).toHaveText('3 / 3', { timeout: 15000 });
  await expect(intro.getByTestId('streaming-speech-text')).toHaveAttribute('data-typing-state', 'complete', { timeout: 15000 });
  await expect(intro.getByRole('button', { name: 'Inizia la scansione' })).toBeVisible();
});
