import { expect, test } from '@playwright/test';
import {
  APP_URL,
  clearUserIdentity,
  mockUserApi,
  seedLanguageSettings,
  seedUserId,
  USER_ID_STORAGE_KEY,
  type MockUserProfile,
} from './test-utils/appTestHelpers';

const SEED_UUID = '00000000-0000-4000-8000-000000000001';

const COMPLETED_PROFILE: MockUserProfile = {
  user_id: SEED_UUID,
  display_name: 'Niccolo',
  age: 31,
  target_language: 'de',
  proficiency_level: 'beginner',
  daily_goal_minutes: 10,
  onboarding_completed: true,
};

test.describe('Onboarding wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Capture browser console errors so failures are debuggable.
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('[browser console error]', msg.text());
      }
    });
    // Pin the source locale to Italian so the i18n strings asserted below
    // ("Inizia", "Indietro", "Salvataggio fallito") are deterministic
    // regardless of the CI machine's default browser locale.
    await seedLanguageSettings(page, 'de', 'it');
  });

  test('fresh user (no userId, GET 404) sees the welcome step', async ({ page }) => {
    await clearUserIdentity(page);
    await mockUserApi(page, null);
    await page.goto(APP_URL);

    await expect(page.getByRole('heading', { name: 'Ciao! Sono il tuo coach.' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Inizia' })).toBeVisible();
    await expect(page.getByText('Nessun account richiesto')).toBeVisible();
  });

  test('happy path: walks all 5 steps and POSTs the expected payload', async ({ page }) => {
    test.setTimeout(45000);
    await clearUserIdentity(page);
    const { posts } = await mockUserApi(page, null);
    await page.goto(APP_URL);

    // Step 1: Welcome → Inizia
    await page.getByRole('button', { name: 'Inizia' }).click();

    // Step 2: Language → pick Italiano to verify the field is sent correctly
    await expect(page.getByRole('heading', { name: 'Cosa vuoi imparare?' })).toBeVisible();
    await page.getByRole('button', { name: /Italiano/ }).click();

    // Step 3: Level — prompt should adapt to italiano
    await expect(page.getByRole('heading', { name: 'Quanto italiano sai già?' })).toBeVisible();
    await page.getByRole('button', { name: /Conosco qualcosa/ }).click();

    // Step 4: Daily goal
    await expect(page.getByRole('heading', { name: 'Quanto tempo al giorno?' })).toBeVisible();
    await page.getByRole('button', { name: /15 min/ }).click();

    // Step 5: Identity
    await expect(page.getByRole('heading', { name: 'Come ti chiami?' })).toBeVisible();
    await page.getByPlaceholder('Il tuo nome').fill('Niccolo');
    await page.getByPlaceholder('Età (opzionale)').fill('31');
    await page.getByRole('button', { name: 'Continua' }).click();

    // Wizard fires POST /api/users then onComplete → wizard unmounts.
    await expect.poll(() => posts.length, { timeout: 15000 }).toBeGreaterThanOrEqual(1);
    const payload = posts[0] as Record<string, unknown>;
    expect(payload.display_name).toBe('Niccolo');
    expect(payload.age).toBe(31);
    expect(payload.target_language).toBe('it');
    expect(payload.proficiency_level).toBe('a1_a2');
    expect(payload.daily_goal_minutes).toBe(15);
    expect(typeof payload.user_id).toBe('string');
    expect((payload.user_id as string).length).toBeGreaterThan(0);

    // userId is also now persisted on the device
    const storedId = await page.evaluate((key) => window.localStorage.getItem(key), USER_ID_STORAGE_KEY);
    expect(storedId).toBe(payload.user_id);
  });

  test('identity step rejects empty name', async ({ page }) => {
    await clearUserIdentity(page);
    await mockUserApi(page, null);
    await page.goto(APP_URL);

    await page.getByRole('button', { name: 'Inizia' }).click();
    await page.getByRole('button', { name: /Tedesco/ }).click();
    await page.getByRole('button', { name: /Principiante/ }).click();
    await page.getByRole('button', { name: /10 min/ }).click();

    await page.getByRole('button', { name: 'Continua' }).click();
    await expect(page.getByText(/Il nome deve avere fra 1 e 40 caratteri/)).toBeVisible();
  });

  test('identity step rejects invalid age', async ({ page }) => {
    await clearUserIdentity(page);
    await mockUserApi(page, null);
    await page.goto(APP_URL);

    await page.getByRole('button', { name: 'Inizia' }).click();
    await page.getByRole('button', { name: /Tedesco/ }).click();
    await page.getByRole('button', { name: /Principiante/ }).click();
    await page.getByRole('button', { name: /10 min/ }).click();
    await page.getByPlaceholder('Il tuo nome').fill('Nico');
    await page.getByPlaceholder('Età (opzionale)').fill('3');
    await page.getByRole('button', { name: 'Continua' }).click();

    await expect(page.getByText(/Età non valida/)).toBeVisible();
  });

  test('back button returns to previous step', async ({ page }) => {
    await clearUserIdentity(page);
    await mockUserApi(page, null);
    await page.goto(APP_URL);

    await page.getByRole('button', { name: 'Inizia' }).click();
    await page.getByRole('button', { name: /Tedesco/ }).click();
    await expect(page.getByRole('heading', { name: /Quanto tedesco sai già/ })).toBeVisible();

    await page.getByRole('button', { name: 'Indietro' }).click();
    await expect(page.getByRole('heading', { name: 'Cosa vuoi imparare?' })).toBeVisible();
  });

  test('returning user with completed profile bypasses the wizard', async ({ page }) => {
    await seedUserId(page, SEED_UUID);
    await mockUserApi(page, COMPLETED_PROFILE);
    await page.goto(APP_URL);

    // Wizard heading must NOT appear; existing app should load instead.
    await expect(page.getByRole('heading', { name: 'Ciao! Sono il tuo coach.' })).toHaveCount(0);

    // Wait a beat to ensure the gate has resolved.
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: 'Inizia' })).toHaveCount(0);
  });

  test('backend down on POST shows the error banner', async ({ page }) => {
    await clearUserIdentity(page);
    // Mock GET 404, but make POST fail with a network error.
    await page.route('**/api/users', async (route) => {
      if (route.request().method() === 'POST') {
        await route.abort('failed');
        return;
      }
      await route.fallback();
    });
    await page.route(/.*\/api\/users\/[^/?]+$/, async (route) => {
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{"detail":"not found"}' });
    });
    await page.goto(APP_URL);

    await page.getByRole('button', { name: 'Inizia' }).click();
    await page.getByRole('button', { name: /Tedesco/ }).click();
    await page.getByRole('button', { name: /Principiante/ }).click();
    await page.getByRole('button', { name: /10 min/ }).click();
    await page.getByPlaceholder('Il tuo nome').fill('Nico');
    await page.getByPlaceholder('Età (opzionale)').fill('30');
    await page.getByRole('button', { name: 'Continua' }).click();

    // Error banner shows the prefix "Salvataggio fallito:"
    await expect(page.getByRole('alert')).toContainText('Salvataggio fallito:');
  });
});
