import { expect, test } from '@playwright/test';
import { featureGuideIds } from './src/gamification/featureGuideIds';
import { resolveFeatureGuideForRoute } from './src/gamification/featureGuideResolver';
import { featureFlowItems } from './src/gamification/featureFlowRegistry';
import { parseAppRoute } from './src/routes/appRoutes';

test('guided feature flow centralizes the route to guide mapping', () => {
  for (const item of featureFlowItems) {
    expect(featureGuideIds, `${item.id} guide should exist`).toContain(item.guideId);
    expect(resolveFeatureGuideForRoute(parseAppRoute(item.route))).toBe(item.guideId);
  }
});
