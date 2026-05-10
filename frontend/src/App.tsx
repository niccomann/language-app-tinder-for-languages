import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { BookOpen, Code2, Compass, Home, Sparkles } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { UI_INTERACTION, UI_RADIUS } from './components/ui';
import { GameGuideOverlay } from './components/GameGuideOverlay';
import { grammarPath, libraryWordPath, parseAppRoute, type RouteState } from './routes/appRoutes';
import { featureGuideRouteKey, resolveFeatureGuideForRoute } from './gamification/featureGuideResolver';
import { APP_MODE, SHOW_DEVELOPER_TOOLS } from './config/appMode';
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
  navigateTo: (path: string) => void;
  productNavigationHidden: boolean;
}

interface ProductNavItem {
  label: string;
  path: string;
  icon: ReactNode;
  active: boolean;
}

function AppChrome({ route, navigateTo, productNavigationHidden }: AppChromeProps) {
  const developerButtonActive = route.screen === 'developer';
  const navItems: ProductNavItem[] = [
    {
      label: 'Path',
      path: '/',
      icon: <Home size={18} />,
      active: route.screen === 'learning' && route.mode === 'path',
    },
    {
      label: 'Learn',
      path: '/learn',
      icon: <BookOpen size={18} />,
      active: route.screen === 'learning' && route.mode === 'session',
    },
    {
      label: 'Review',
      path: '/review',
      icon: <Sparkles size={18} />,
      active: route.screen === 'library' || (route.screen === 'learning' && ['review', 'vocabulary', 'filters', 'system'].includes(route.mode)),
    },
    {
      label: 'Explore',
      path: '/explore',
      icon: <Compass size={18} />,
      active: route.screen === 'grammar' || (route.screen === 'learning' && ['explore', 'grammar_placement'].includes(route.mode)),
    },
  ];

  return (
    <>
      {!productNavigationHidden && (
        <nav
          aria-label="Product navigation"
          className={`fixed inset-x-3 bottom-3 z-[60] border border-hairline bg-canvas p-1 md:bottom-auto md:left-4 md:right-auto md:top-4 ${UI_RADIUS.control}`}
        >
          <div className="grid grid-cols-4 gap-1 md:flex md:items-center">
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigateTo(item.path)}
                aria-current={item.active ? 'page' : undefined}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-medium leading-none md:min-h-11 md:flex-row md:px-3 md:text-nav-link ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${UI_INTERACTION.press} ${
                  item.active
                    ? 'bg-ink text-canvas'
                    : 'text-muted hover:bg-surface-card hover:text-ink'
                }`}
              >
                {item.icon}
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="fixed right-3 top-3 z-[70] flex items-center gap-2 sm:right-4 sm:top-4">
        {SHOW_DEVELOPER_TOOLS && (
          <button
            type="button"
            onClick={() => navigateTo('/developer')}
            className={`flex min-h-10 items-center gap-2 px-3 py-2 ${UI_RADIUS.control} font-medium ${UI_INTERACTION.transition} ${UI_INTERACTION.iconLift} ${UI_INTERACTION.press} ${
              developerButtonActive
                ? 'bg-ink text-canvas hover:bg-body-strong'
                : 'bg-canvas text-ink border border-hairline hover:bg-surface-card'
            }`}
            aria-current={developerButtonActive ? 'page' : undefined}
            aria-label="Developer"
          >
            <Code2 size={18} />
            <span className="hidden text-sm sm:inline">Sviluppatore</span>
          </button>
        )}
        <span className={`hidden min-h-10 items-center border border-hairline bg-canvas px-3 text-caption font-medium text-muted sm:flex ${UI_RADIUS.control}`}>
          {APP_MODE === 'offline' ? 'Offline' : 'Online'}
        </span>
        <ThemeToggle />
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
