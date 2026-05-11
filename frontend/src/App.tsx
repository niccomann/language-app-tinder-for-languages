import { lazy, Suspense, useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { GameGuideOverlay } from './components/GameGuideOverlay';
import { AppHeaderMenu, BottomNav } from './components/scene';
import { grammarPath, libraryWordPath, parseAppRoute, type RouteState } from './routes/appRoutes';
import { featureGuideRouteKey, resolveFeatureGuideForRoute } from './gamification/featureGuideResolver';
import { readFirstVocabularyOnboardingDone } from './components/firstVocabularyOnboardingMeta';

const CardStack = lazy(() => import('./components/CardStack').then((module) => ({ default: module.CardStack })));
const GrammarLab = lazy(() => import('./components/GrammarLab').then((module) => ({ default: module.GrammarLab })));
const WordsLibraryEnriched = lazy(() => import('./components/WordsLibraryEnriched').then((module) => ({ default: module.WordsLibraryEnriched })));
const DeveloperChartsScreen = lazy(() => import('./components/DeveloperChartsScreen').then((module) => ({ default: module.DeveloperChartsScreen })));

function App() {
  const [route, setRoute] = useState(() => parseAppRoute(window.location.pathname));
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const [firstVocabularyOnboardingDone, setFirstVocabularyOnboardingDone] = useState(readFirstVocabularyOnboardingDone);

  const navigateTo = (path: string) => {
    const pathChanged = window.location.pathname !== path;
    if (pathChanged) {
      window.history.pushState({}, '', path);
    }
    setRoutePath(path);
    setRoute(parseAppRoute(path));
    if (pathChanged) {
      window.requestAnimationFrame(() => window.scrollTo({ left: 0, top: 0, behavior: 'auto' }));
    }
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

  const activeGuideId = route.screen === 'developer' ? null : resolveFeatureGuideForRoute(route);
  const activeGuideRouteKey = `${routePath}:${featureGuideRouteKey(route)}`;
  const productNavigationHidden = route.screen === 'learning' && route.mode === 'path' && !firstVocabularyOnboardingDone;

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-canvas pb-24 transition-colors duration-300 md:pb-0">
        <AppChrome
          route={route}
          routePath={routePath}
          navigateTo={navigateTo}
          productNavigationHidden={productNavigationHidden}
        />
        <Suspense fallback={<RouteFallback />}>
          {route.screen === 'developer' ? (
            <DeveloperChartsScreen onBack={() => navigateTo('/')} />
          ) : route.screen === 'library' ? (
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
              onOpenLibrary={() => navigateTo('/library')}
              onOpenGrammarLab={() => navigateTo(grammarPath())}
              onNavigateToFeature={navigateTo}
              onFirstVocabularyOnboardingComplete={() => setFirstVocabularyOnboardingDone(true)}
            />
          )}
        </Suspense>
        {activeGuideId ? <GameGuideOverlay guideId={activeGuideId} routeKey={activeGuideRouteKey} /> : null}
      </div>
    </ThemeProvider>
  );
}

interface AppChromeProps {
  route: RouteState;
  routePath: string;
  navigateTo: (path: string) => void;
  productNavigationHidden: boolean;
}

function AppChrome({ route, routePath, navigateTo, productNavigationHidden }: AppChromeProps) {
  void route;
  return (
    <>
      {!productNavigationHidden && <BottomNav pathname={routePath} onNavigate={navigateTo} />}
      <div className="fixed right-3 top-3 z-[70] flex items-center gap-2 sm:right-4 sm:top-4">
        <AppHeaderMenu onNavigate={navigateTo} />
      </div>
    </>
  );
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-body-sm font-medium text-muted">
      Loading...
    </div>
  );
}

export default App;
