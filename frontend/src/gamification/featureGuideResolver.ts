import { routeStatePath, type RouteState } from '../routes/appRoutes';
import { featureFlowItems } from './featureFlowRegistry';
import type { FeatureGuideId } from './featureGuideIds';

const featureGuideByRoute = new Map<string, FeatureGuideId>(
  featureFlowItems.map((item) => [item.route, item.guideId]),
);

export function resolveFeatureGuideForRoute(route: RouteState): FeatureGuideId {
  if (route.screen === 'learning' && route.mode === 'path') {
    return 'learningPath';
  }

  const guideId = featureGuideByRoute.get(routeStatePath(route));
  if (guideId) return guideId;

  if (route.screen === 'library') return 'library';

  return 'learningPath';
}

export function featureGuideRouteKey(route: RouteState) {
  if (route.screen === 'learning') return `learning:${route.mode}`;
  if (route.screen === 'library') {
    return `library:${route.wordId ?? 'all'}:${route.detailTab ?? 'list'}:${route.filtersOpen ? 'filters' : 'browse'}`;
  }
  return `grammar:${route.view}`;
}
