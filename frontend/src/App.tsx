import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { GameGuideOverlay } from './components/GameGuideOverlay';
import { AppHeaderMenu, BottomNav } from './components/scene';
import { grammarPath, libraryWordPath, parseAppRoute, type RouteState } from './routes/appRoutes';
import { featureGuideRouteKey, resolveFeatureGuideForRoute } from './gamification/featureGuideResolver';
import { readFirstVocabularyOnboardingDone } from './components/firstVocabularyOnboardingMeta';
import { LanguageProvider, useLanguage } from './i18n/languageContext';
import { OnboardingModal } from './components/OnboardingModal';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LanguageBadge } from './components/LanguageBadge';
import { UserAvatar } from './components/UserAvatar';
import { useUser } from './contexts/useUser';
import { OnboardingWizard } from './components/OnboardingWizard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { patchUser } from './services/userApi';

const CardStack = lazy(() => import('./components/CardStack').then((module) => ({ default: module.CardStack })));
const GrammarLab = lazy(() => import('./components/GrammarLab').then((module) => ({ default: module.GrammarLab })));
const GrammarHub = lazy(() => import('./components/GrammarHub').then((module) => ({ default: module.GrammarHub })));
const WordsLibraryEnriched = lazy(() => import('./components/WordsLibraryEnriched').then((module) => ({ default: module.WordsLibraryEnriched })));
const DeveloperChartsScreen = lazy(() => import('./components/DeveloperChartsScreen').then((module) => ({ default: module.DeveloperChartsScreen })));

function App() {
  return (
    <LanguageProvider>
      <AppWithLanguage />
    </LanguageProvider>
  );
}

// Page-transition key: animates every navigation between top-level views and
// sub-views (learn-path → session, grammar hub → graph, etc).
// Modal-like sub-states (filters, system panel, word detail) collapse into
// their parent key so they don't remount the underlying page — their own
// open/close animation already covers them.
function routeAnimationKey(route: RouteState): string {
  switch (route.screen) {
    case 'developer':
      return `developer:${route.chartSlug ?? 'home'}`;
    case 'library':
      return 'library';
    case 'grammar':
      return `grammar:${route.view}`;
    case 'learning':
      if (route.mode === 'filters' || route.mode === 'system') return 'learning:session';
      return `learning:${route.mode}`;
  }
}

function AppWithLanguage() {
  const { targetLanguage, sourceLocale } = useLanguage();
  const { status: userStatus, profile, userId, refreshProfile } = useUser();
  const [showSourceModal, setShowSourceModal] = useState(false);
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
    // Arrow-key swipe shortcuts only make sense in the learning deck.
    if (route.screen !== 'learning') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        const leftButton = document.querySelector('[data-swipe="left"]') as HTMLButtonElement | null;
        leftButton?.click();
      } else if (event.key === 'ArrowRight') {
        const rightButton = document.querySelector('[data-swipe="right"]') as HTMLButtonElement | null;
        rightButton?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [route.screen]);

  if (userStatus === 'loading') {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-canvas">
          <p className="text-body-sm font-medium text-muted">Loading…</p>
        </div>
      </ThemeProvider>
    );
  }

  if (profile === null) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-canvas">
          <OnboardingWizard onComplete={() => refreshProfile()} />
        </div>
      </ThemeProvider>
    );
  }

  const onboardingNeeded = !targetLanguage || !sourceLocale;

  const activeGuideId = route.screen === 'developer' ? null : resolveFeatureGuideForRoute(route);
  const activeGuideRouteKey = `${routePath}:${featureGuideRouteKey(route)}`;
  const productNavigationHidden =
    route.screen === 'learning'
    && route.mode.startsWith('path')
    && !firstVocabularyOnboardingDone;

  if (onboardingNeeded) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-canvas">
          <OnboardingModal initialTarget={targetLanguage} initialSource={sourceLocale} />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-canvas pb-28 transition-colors duration-300 md:pb-0">
        <AppChrome
          routePath={routePath}
          navigateTo={navigateTo}
          productNavigationHidden={productNavigationHidden}
          onOpenSourceModal={() => setShowSourceModal(true)}
        />
        <LanguageBadge onClick={() => setShowSourceModal(true)} />
        {/* ErrorBoundary inside the LanguageProvider so a chunk-load error or
            a render-time throw on one screen does not nuke the whole app —
            the user gets a friendly recovery card instead of a white page. */}
        <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeAnimationKey(route)}
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {route.screen === 'developer' ? (
                <DeveloperChartsScreen
                  onBack={() => navigateTo('/')}
                  chartSlug={route.chartSlug}
                  onNavigate={navigateTo}
                />
              ) : route.screen === 'library' ? (
                <WordsLibraryEnriched
                  onClose={() => navigateTo('/')}
                  initialWordId={route.wordId}
                  initialDetailTab={route.detailTab}
                  filtersOpen={route.filtersOpen}
                  statsOnly={route.statsOnly}
                  onFiltersOpenChange={(open) => navigateTo(open ? '/library/filters' : '/library')}
                  onOpenStats={() => navigateTo('/library/stats')}
                  onWordOpen={(wordId) => navigateTo(libraryWordPath(wordId))}
                  onWordClose={() => navigateTo('/library')}
                  onWordTabChange={(wordId, tab) => navigateTo(libraryWordPath(wordId, tab))}
                />
              ) : route.screen === 'grammar' ? (
                route.view === 'hub' ? (
                  <GrammarHub onNavigate={navigateTo} />
                ) : (
                  <GrammarLab
                    activeView={route.view}
                    onViewChange={(view) => navigateTo(grammarPath(view))}
                    onBack={() => navigateTo(grammarPath('hub'))}
                  />
                )
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
                  onFirstVocabularyOnboardingComplete={() => {
                    setFirstVocabularyOnboardingDone(true);
                    if (userId && profile && !profile.onboarding_completed) {
                      void patchUser(userId, { onboarding_completed: true })
                        .then(() => refreshProfile())
                        .catch((err) => console.error('patchUser onboarding_completed failed', err));
                    }
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Suspense>
        </ErrorBoundary>
        {activeGuideId ? <GameGuideOverlay guideId={activeGuideId} routeKey={activeGuideRouteKey} /> : null}
        {showSourceModal && (
          <OnboardingModal
            initialTarget={targetLanguage}
            initialSource={sourceLocale}
            onClose={() => setShowSourceModal(false)}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

interface AppChromeProps {
  routePath: string;
  navigateTo: (path: string) => void;
  productNavigationHidden: boolean;
  onOpenSourceModal: () => void;
}

function AppChrome({ routePath, navigateTo, productNavigationHidden, onOpenSourceModal }: AppChromeProps) {
  return (
    <>
      {!productNavigationHidden && <BottomNav pathname={routePath} onNavigate={navigateTo} />}
      <div className="fixed right-3 top-3 z-[70] flex items-center gap-2 sm:right-4 sm:top-4">
        <UserAvatar />
        <LanguageSwitcher onOpenSourceModal={onOpenSourceModal} />
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
