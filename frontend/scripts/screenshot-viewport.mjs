#!/usr/bin/env node
/**
 * Viewport-only screenshots (no fullPage) so they fit in image-read APIs.
 * Usage: node scripts/screenshot-viewport.mjs [round]
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP_URL = process.env.APP_URL ?? 'https://customizeyourlingua.com';
const round = process.argv[2] ?? 'rv1';
const outDir = resolve(process.cwd(), 'screenshots', round);

const SEED_UUID = '11111111-2222-4333-8444-555555555555';

const ROUTES = [
  { path: '/', name: '00-path-home' },
  { path: '/path/full', name: '01-path-full' },
  { path: '/path/stats', name: '02-path-stats' },
  { path: '/path/diary', name: '03-path-diary' },
  { path: '/path/next', name: '04-path-next' },
  { path: '/learn', name: '05-learn-session' },
  { path: '/learn/filters', name: '06-learn-filters' },
  { path: '/vocabulary', name: '07-vocabulary' },
  { path: '/review', name: '08-review' },
  { path: '/explore', name: '09-explore' },
  { path: '/library', name: '10-library' },
  { path: '/library/stats', name: '11-library-stats' },
  { path: '/grammar', name: '12-grammar-hub' },
  { path: '/grammar/word-cloud', name: '13-grammar-wordcloud' },
  { path: '/grammar/clusters', name: '14-grammar-clusters' },
  { path: '/grammar/compose-sentence', name: '15-grammar-funbuilder' },
  { path: '/grammar/hierarchy', name: '16-grammar-hierarchy' },
  { path: '/grammar/dialects', name: '17-grammar-dialects' },
];

const VP = { id: 'mobile', width: 414, height: 896 };

async function ensureDir(p) { if (!existsSync(p)) await mkdir(p, { recursive: true }); }

async function run() {
  await ensureDir(outDir);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: VP.width, height: VP.height },
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  });

  await ctx.addInitScript((uuid) => {
    window.localStorage.setItem('languageApp:userId:v1', uuid);
    window.localStorage.setItem('languageApp:targetLanguage:v1', 'de');
    window.localStorage.setItem('languageApp:sourceLocale:v1', 'it');
    window.localStorage.setItem('languageApp:firstVocabularyOnboardingDone:v1', 'true');
    const guides = ['vocabularyScan','learningPath','learningFilters','learningSystem',
      'sentencePlacement','library','grammarGraph','wordCloud',
      'sentenceGraphBuilder','sentenceComposer','clusters','dialects','hierarchy'];
    for (const g of guides) {
      window.localStorage.setItem(`languageApp:featureGuideSeen:${g}`, 'true');
    }
  }, SEED_UUID);

  await ctx.route(/.*\/api\/users\/[^/?]+$/, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user_id: SEED_UUID,
        display_name: 'Niccolò',
        age: 31,
        target_language: 'de',
        proficiency_level: 'a1_a2',
        daily_goal_minutes: 10,
        onboarding_completed: true,
      }),
    });
  });

  const page = await ctx.newPage();

  for (const r of ROUTES) {
    try {
      await page.goto(`${APP_URL}${r.path}`, { waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      await page.goto(`${APP_URL}${r.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    }
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(outDir, `${r.name}.png`), fullPage: false });
    console.log(`✓ ${r.path}`);
  }

  await ctx.close();
  await browser.close();
  console.log(`Done. Screenshots in ${outDir}`);
}

run().catch((err) => { console.error(err); process.exit(1); });
