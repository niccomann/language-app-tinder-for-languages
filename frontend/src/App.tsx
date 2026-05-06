import { lazy, Suspense, useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ui/ThemeToggle';

const CardStack = lazy(() => import('./components/CardStack').then((module) => ({ default: module.CardStack })));
const GrammarLab = lazy(() => import('./components/GrammarLab').then((module) => ({ default: module.GrammarLab })));
const WordsLibraryEnriched = lazy(() => import('./components/WordsLibraryEnriched').then((module) => ({ default: module.WordsLibraryEnriched })));

type RouteState =
  | { screen: 'home' }
  | { screen: 'grammar' }
  | { screen: 'library'; wordId?: number; detailTab?: 'overview' | 'db_row' };

function parseRoute(pathname: string): RouteState {
  const parts = pathname.split('/').filter(Boolean);

  if (parts[0] === 'grammar') {
    return { screen: 'grammar' };
  }

  if (parts[0] === 'library') {
    const wordId = parts[1] === 'words' ? Number(parts[2]) : undefined;
    const validWordId = Number.isFinite(wordId) ? wordId : undefined;
    return {
      screen: 'library',
      wordId: validWordId,
      detailTab: parts[3] === 'db-row' ? 'db_row' : validWordId ? 'overview' : undefined,
    };
  }

  return { screen: 'home' };
}

function App() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute(window.location.pathname));

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setRoute(parseRoute(path));
  };

  useEffect(() => {
    const handlePopState = () => setRoute(parseRoute(window.location.pathname));
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
              onWordOpen={(wordId) => navigateTo(`/library/words/${wordId}`)}
              onWordClose={() => navigateTo('/library')}
            />
          ) : route.screen === 'grammar' ? (
            <GrammarLab onBack={() => navigateTo('/')} />
          ) : (
            <CardStack
              onOpenLibrary={() => navigateTo('/library')}
              onOpenGrammarLab={() => navigateTo('/grammar')}
            />
          )}
        </Suspense>
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
