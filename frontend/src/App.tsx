import { lazy, Suspense, useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { GameGuideOverlay } from './components/GameGuideOverlay';
import { grammarPath, libraryWordPath, parseAppRoute } from './routes/appRoutes';
import { featureGuideRouteKey, resolveFeatureGuideForRoute } from './gamification/featureGuideManifest';

const CardStack = lazy(() => import('./components/CardStack').then((module) => ({ default: module.CardStack })));
const GrammarLab = lazy(() => import('./components/GrammarLab').then((module) => ({ default: module.GrammarLab })));
const WordsLibraryEnriched = lazy(() => import('./components/WordsLibraryEnriched').then((module) => ({ default: module.WordsLibraryEnriched })));

function App() {
  const [route, setRoute] = useState(() => parseAppRoute(window.location.pathname));
  const [routePath, setRoutePath] = useState(() => window.location.pathname);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setRoutePath(path);
    setRoute(parseAppRoute(path));
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(window.location.pathname);
      setRoute(parseAppRoute(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        const leftButton = document.querySelector('[aria-label="Don\'t know"]') as HTMLButtonElement;
        leftButton?.click();
      } else if (event.key === 'ArrowRight') {
        const rightButton = document.querySelector('[aria-label="Know"]') as HTMLButtonElement;
        rightButton?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeGuideId = resolveFeatureGuideForRoute(route);
  const activeGuideRouteKey = `${routePath}:${featureGuideRouteKey(route)}`;

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
        <div className="fixed bottom-4 right-4 z-40">
          <ThemeToggle />
        </div>
        <Suspense fallback={<RouteFallback />}>
          {route.screen === 'library' ? (
            <WordsLibraryEnriched
              onClose={() => navigateTo('/')}
              initialWordId={route.wordId}
              initialDetailTab={route.detailTab}
              filtersOpen={route.filtersOpen}
              onFiltersOpenChange={(open) => navigateTo(open ? '/library/filters' : '/library')}
              onWordOpen={(wordId) => navigateTo(libraryWordPath(wordId))}
              onWordClose={() => navigateTo('/library')}
              onWordTabChange={(wordId, tab) => navigateTo(libraryWordPath(wordId, tab))}
            />
          ) : route.screen === 'grammar' ? (
            <GrammarLab
              activeView={route.view}
              onViewChange={(view) => navigateTo(grammarPath(view))}
              onBack={() => navigateTo('/')}
            />
          ) : (
            <CardStack
              mode={route.mode}
              onOpenLearningPath={() => navigateTo('/')}
              onStartLearning={() => navigateTo('/learn')}
              onOpenLearningFilters={() => navigateTo('/learn/filters')}
              onOpenLearningSystem={() => navigateTo('/learn/system')}
              onStartGrammarPlacement={() => navigateTo('/placement/sentence')}
              onOpenLibrary={() => navigateTo('/library')}
              onOpenGrammarLab={() => navigateTo(grammarPath())}
            />
          )}
        </Suspense>
        <GameGuideOverlay guideId={activeGuideId} routeKey={activeGuideRouteKey} />
      </div>
    </ThemeProvider>
  );
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-300">
      Loading...
    </div>
  );
}

export default App;
