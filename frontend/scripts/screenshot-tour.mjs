#!/usr/bin/env node
/**
 * Screenshot tour: visit every main route of the deployed app in both
 * mobile and desktop viewports, dump PNGs into screenshots/<round>/.
 *
 * Usage:
 *   node scripts/screenshot-tour.mjs [round]
 *   APP_URL=https://customizeyourlingua.com node scripts/screenshot-tour.mjs r1
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP_URL = process.env.APP_URL ?? 'https://customizeyourlingua.com';
const round = process.argv[2] ?? 'r1';
const outDir = resolve(process.cwd(), 'screenshots', round);

// Seed identity so the wizard does not intercept on every page.
const SEED_UUID = '11111111-2222-4333-8444-555555555555';
const SEED_LANG_TARGET = 'de';
const SEED_LANG_SOURCE = 'it';

const ROUTES = [
  { path: '/', name: '00-root-path-home' },
  { path: '/path/full', name: '01-path-full' },
  { path: '/path/stats', name: '02-path-stats' },
  { path: '/path/diary', name: '03-path-diary' },
  { path: '/path/next', name: '04-path-next' },
  { path: '/learn', name: '05-learn-session' },
  { path: '/learn/filters', name: '06-learn-filters' },
  { path: '/learn/system', name: '07-learn-system' },
  { path: '/vocabulary', name: '08-vocabulary' },
  { path: '/review', name: '09-review-hub' },
  { path: '/explore', name: '10-explore-hub' },
  { path: '/explore/grammar', name: '11-explore-grammar' },
  { path: '/explore/map', name: '12-explore-map' },
  { path: '/library', name: '13-library' },
  { path: '/library/stats', name: '14-library-stats' },
  { path: '/library/filters', name: '15-library-filters' },
  { path: '/grammar', name: '16-grammar-hub' },
  { path: '/grammar/graph', name: '17-grammar-graph' },
  { path: '/grammar/word-cloud', name: '18-grammar-wordcloud' },
  { path: '/grammar/clusters', name: '19-grammar-clusters' },
  { path: '/grammar/build-sentence', name: '20-grammar-builder' },
  { path: '/grammar/compose-sentence', name: '21-grammar-funbuilder' },
  { path: '/grammar/dialects', name: '22-grammar-dialects' },
  { path: '/grammar/hierarchy', name: '23-grammar-hierarchy' },
  { path: '/placement/sentence', name: '24-placement-sentence' },
  { path: '/developer', name: '25-developer' },
];

const VIEWPORTS = [
  { id: 'mobile', width: 414, height: 896, scale: 2 },
  { id: 'desktop', width: 1440, height: 900, scale: 1 },
];

async function ensureDir(p) { if (!existsSync(p)) await mkdir(p, { recursive: true }); }

async function run() {
  await ensureDir(outDir);
  const browser = await chromium.launch({ headless: true });

  const issues = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.scale,
      userAgent:
        vp.id === 'mobile'
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
          : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    });

    // Seed localStorage BEFORE navigation so the app does not show onboarding.
    await ctx.addInitScript(
      ({ uuidKey, uuid, tKey, tVal, sKey, sVal, guidePrefix }) => {
        window.localStorage.setItem(uuidKey, uuid);
        window.localStorage.setItem(tKey, tVal);
        window.localStorage.setItem(sKey, sVal);
        // Suppress feature guides modal so screens render their real state.
        const guides = [
          'vocabularyScan', 'learningPath', 'learningFilters', 'learningSystem',
          'sentencePlacement', 'library', 'grammarGraph', 'wordCloud',
          'sentenceGraphBuilder', 'sentenceComposer', 'clusters', 'dialects',
          'hierarchy',
        ];
        for (const g of guides) {
          window.localStorage.setItem(`${guidePrefix}${g}`, 'true');
        }
        // Suppress first-vocabulary onboarding overlay.
        window.localStorage.setItem('languageApp:firstVocabularyOnboardingDone:v1', 'true');
      },
      {
        uuidKey: 'languageApp:userId:v1',
        uuid: SEED_UUID,
        tKey: 'languageApp:targetLanguage:v1',
        tVal: SEED_LANG_TARGET,
        sKey: 'languageApp:sourceLocale:v1',
        sVal: SEED_LANG_SOURCE,
        guidePrefix: 'languageApp:featureGuideSeen:',
      },
    );

    // Intercept the user-profile GET so the wizard never intercepts the page;
    // the screenshot tour cares about every screen rendering at all, not about
    // exercising a real account.
    await ctx.route(/.*\/api\/users\/[^/?]+$/, async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: SEED_UUID,
          display_name: 'Niccolò',
          age: 31,
          target_language: SEED_LANG_TARGET,
          proficiency_level: 'a1_a2',
          daily_goal_minutes: 10,
          onboarding_completed: true,
        }),
      });
    });

    const page = await ctx.newPage();

    page.on('pageerror', (err) => issues.push({ vp: vp.id, kind: 'pageerror', msg: err.message }));
    page.on('console', (msg) => {
      if (msg.type() === 'error') issues.push({ vp: vp.id, kind: 'console.error', msg: msg.text() });
    });

    for (const r of ROUTES) {
      const url = `${APP_URL}${r.path}`;
      const filename = `${r.name}_${vp.id}.png`;
      const out = join(outDir, filename);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      } catch (err) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      }

      // Give animations a moment to settle.
      await page.waitForTimeout(800);

      // Catch horizontal overflow.
      const overflow = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
      }));
      if (overflow.scrollW - overflow.clientW > 2) {
        issues.push({
          vp: vp.id,
          kind: 'horizontal-overflow',
          route: r.path,
          extraPx: overflow.scrollW - overflow.clientW,
        });
      }

      await page.screenshot({ path: out, fullPage: true });
      console.log(`✓ ${vp.id} ${r.path}`);
    }

    await ctx.close();
  }

  await browser.close();

  const report = {
    appUrl: APP_URL,
    round,
    capturedAt: new Date().toISOString(),
    issues,
  };
  await writeFile(join(outDir, '_report.json'), JSON.stringify(report, null, 2));
  console.log(`\nDone. ${issues.length} runtime issue(s). Screenshots in ${outDir}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
