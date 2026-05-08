export type LearningRouteMode = 'path' | 'session' | 'filters' | 'system' | 'grammar_placement';

export type GrammarView =
  | 'graph'
  | 'wordcloud'
  | 'builder'
  | 'funbuilder'
  | 'clusters'
  | 'dialects'
  | 'sunburst';

export type LibraryDetailTab =
  | 'overview'
  | 'examples'
  | 'etymology'
  | 'false_friends'
  | 'proverbs'
  | 'collocations'
  | 'dialects'
  | 'db_row';

export type RouteState =
  | { screen: 'learning'; mode: LearningRouteMode }
  | { screen: 'grammar'; view: GrammarView }
  | { screen: 'library'; filtersOpen: boolean; wordId?: number; detailTab?: LibraryDetailTab };

const GRAMMAR_SEGMENTS: Record<GrammarView, string> = {
  graph: 'graph',
  wordcloud: 'word-cloud',
  builder: 'build-sentence',
  funbuilder: 'compose-sentence',
  clusters: 'clusters',
  dialects: 'dialects',
  sunburst: 'hierarchy',
};

const LIBRARY_TAB_SEGMENTS: Record<LibraryDetailTab, string> = {
  overview: 'overview',
  examples: 'examples',
  etymology: 'etymology',
  false_friends: 'false-friends',
  proverbs: 'proverbs',
  collocations: 'collocations',
  dialects: 'dialects',
  db_row: 'db-row',
};

const grammarViewBySegment = invertRecord(GRAMMAR_SEGMENTS);
const libraryTabBySegment = invertRecord(LIBRARY_TAB_SEGMENTS);

export const DEFAULT_GRAMMAR_VIEW: GrammarView = 'graph';
export const DEFAULT_LIBRARY_TAB: LibraryDetailTab = 'overview';

export function parseAppRoute(pathname: string): RouteState {
  const parts = pathname.split('/').filter(Boolean);
  const [section, feature] = parts;

  if (section === 'learn') {
    if (feature === 'filters') return { screen: 'learning', mode: 'filters' };
    if (feature === 'system') return { screen: 'learning', mode: 'system' };
    return { screen: 'learning', mode: 'session' };
  }

  if (section === 'placement' && feature === 'sentence') {
    return { screen: 'learning', mode: 'grammar_placement' };
  }

  if (section === 'grammar') {
    return {
      screen: 'grammar',
      view: grammarViewBySegment[feature] ?? DEFAULT_GRAMMAR_VIEW,
    };
  }

  if (section === 'library') {
    if (feature === 'words') {
      const wordId = Number(parts[2]);
      const validWordId = Number.isFinite(wordId) ? wordId : undefined;
      return {
        screen: 'library',
        filtersOpen: false,
        wordId: validWordId,
        detailTab: validWordId ? libraryTabBySegment[parts[3]] ?? DEFAULT_LIBRARY_TAB : undefined,
      };
    }

    return {
      screen: 'library',
      filtersOpen: feature === 'filters',
    };
  }

  return { screen: 'learning', mode: 'path' };
}

export function grammarPath(view: GrammarView = DEFAULT_GRAMMAR_VIEW) {
  return `/grammar/${GRAMMAR_SEGMENTS[view]}`;
}

export function libraryWordPath(wordId: number, tab: LibraryDetailTab = DEFAULT_LIBRARY_TAB) {
  return `/library/words/${wordId}/${LIBRARY_TAB_SEGMENTS[tab]}`;
}

export function routeStatePath(route: RouteState) {
  if (route.screen === 'learning') {
    if (route.mode === 'path') return '/';
    if (route.mode === 'filters') return '/learn/filters';
    if (route.mode === 'system') return '/learn/system';
    if (route.mode === 'grammar_placement') return '/placement/sentence';
    return '/learn';
  }

  if (route.screen === 'grammar') {
    return grammarPath(route.view);
  }

  if (route.wordId) {
    return libraryWordPath(route.wordId, route.detailTab);
  }

  return route.filtersOpen ? '/library/filters' : '/library';
}

function invertRecord<T extends string>(record: Record<T, string>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [value, key]),
  ) as Record<string, T>;
}
