import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'test-*.spec.ts',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_APP_URL ?? 'http://127.0.0.1:5173',
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
});
