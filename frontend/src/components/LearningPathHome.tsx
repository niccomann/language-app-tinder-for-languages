import type { ReactNode } from 'react';
import { BookOpen, BookOpenCheck, Clock3, Compass, Flame, Gauge, Play, Puzzle, ShieldCheck, Sparkles, Target, Trophy } from 'lucide-react';
import type { AdaptiveLearningSummary, UserProgress } from '../types';
import { AppScreen, GameSignalBadge, ScreenHeader, StatCard, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import {
  LEARNING_PATH_MILESTONES,
  getActiveMilestoneIndex,
  getLearningTrendLabel,
  getPathDisplayValues,
} from './learningPathMeta';
import {
  getFeatureFlowItemsByPhase,
  getPrimaryFeatureFlowItem,
  type FeatureFlowItem,
} from '../gamification/featureFlowRegistry';

interface LearningPathHomeProps {
  learningSummary: AdaptiveLearningSummary | null;
  progress: UserProgress;
  totalCards: number;
  categoriesCount: number;
  selectedCategoriesCount: number;
  onNavigateToFeature: (path: string) => void;
}

export function LearningPathHome({
  learningSummary,
  progress,
  totalCards,
  categoriesCount,
  selectedCategoriesCount,
  onNavigateToFeature,
}: LearningPathHomeProps) {
  const {
    averageMastery,
    pathLevel,
    maxPathLevel,
    xpToNextLevel,
    pathLevelProgress,
  } = getPathDisplayValues(learningSummary);
  const activeMilestoneIndex = getActiveMilestoneIndex(pathLevel);
  const visibleMilestones = LEARNING_PATH_MILESTONES.slice(
    Math.max(0, activeMilestoneIndex - 1),
    Math.min(LEARNING_PATH_MILESTONES.length, activeMilestoneIndex + 2),
  );
  const shouldReengage = Boolean(learningSummary?.should_reengage);
  const primaryMission = getPrimaryFeatureFlowItem();
  const upcomingMissions = getFeatureFlowItemsByPhase('upcoming');
  const nextMission = upcomingMissions[0];
  const handleOpenMission = (mission: FeatureFlowItem) => onNavigateToFeature(mission.route);

  return (
    <AppScreen width="wide" contentClassName="min-h-dvh px-4 pb-4 pt-24 md:pt-20">
      <main className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[minmax(460px,560px)_minmax(420px,1fr)]">
        <section className="space-y-3">
          <ScreenHeader
            title="German Learning Path"
            subtitle="A 400-level path from words you know, words you miss, and the mastery signals the system estimates for each word."
            density="compact"
            actions={(
              <div className={`${UI_RADIUS.pill} bg-white px-3 py-2 text-sm font-extrabold text-indigo-600 shadow-sm ring-1 ring-indigo-100 dark:bg-slate-800 dark:ring-slate-700`}>
                Level {pathLevel}/{maxPathLevel}
              </div>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <GameSignalBadge icon={<Sparkles size={14} />} label="Daily Quest" tone="amber" />
            <GameSignalBadge icon={<ShieldCheck size={14} />} label="Streak Shield" tone="teal" />
            <GameSignalBadge icon={<Trophy size={14} />} label="XP Bank" tone="success" />
          </div>

          {shouldReengage && (
            <SurfacePanel className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" padding="md">
              <div className="flex items-start gap-3">
                <div className={`${UI_RADIUS.touchIcon} flex h-11 w-11 items-center justify-center bg-white text-amber-700 dark:bg-white/10 dark:text-amber-100`}>
                  <Clock3 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-amber-900 dark:text-amber-100">Welcome back</p>
                  <p className="mt-1 text-sm font-semibold text-amber-800/80 dark:text-amber-100/80">
                    {learningSummary?.days_since_last_practice} days since the last German session. Review German Level to recalibrate the path.
                  </p>
                </div>
              </div>
            </SurfacePanel>
          )}

          <SurfacePanel padding="lg" className="space-y-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-500">Daily Learning Snapshot</p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950 dark:text-white">
                {getLearningTrendLabel(learningSummary)}
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-300">
                Your 400-level path updates from every swipe, then uses word mastery to choose easier or harder contexts.
              </p>
            </div>

            <PathFocusFlow
              primaryMission={primaryMission}
              nextMission={nextMission}
              pathLevel={pathLevel}
              maxPathLevel={maxPathLevel}
              xpToNextLevel={xpToNextLevel}
              pathLevelProgress={pathLevelProgress}
              selectedCategoriesCount={selectedCategoriesCount}
              categoriesCount={categoriesCount}
              onOpenMission={handleOpenMission}
              onOpenReview={() => onNavigateToFeature('/review')}
              onOpenExplore={() => onNavigateToFeature('/explore')}
            />

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Path Level" value={pathLevel} icon={<Gauge size={20} />} color="coral" />
              <StatCard label="Words" value={learningSummary?.total_words_practiced ?? 0} icon={<BookOpen size={20} />} color="coral-strong" />
              <StatCard label="Strong" value={learningSummary?.words_mastered ?? 0} icon={<Trophy size={20} />} color="success" />
              <StatCard label="Avg Mastery" value={Number(averageMastery.toFixed(1))} icon={<Target size={20} />} color="teal" />
            </div>

          </SurfacePanel>
        </section>

        <section className="space-y-3">
          <SurfacePanel padding="lg" className="relative overflow-hidden">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Learning Diary</p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">Current progress</h2>
              </div>
              <div className={`${UI_RADIUS.pill} bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600 dark:bg-slate-700 dark:text-slate-200`}>
                {progress.cards_reviewed}/{totalCards || 0} today
              </div>
            </div>

            <div className="relative space-y-3">
              <div className="absolute bottom-8 left-6 top-8 w-0.5 bg-slate-200 dark:bg-slate-700" />
              {visibleMilestones.map((step) => {
                const index = LEARNING_PATH_MILESTONES.indexOf(step);
                const isComplete = pathLevel >= step.level;
                const isActive = index === activeMilestoneIndex;
                return (
                  <div key={step.title} className="relative flex gap-4">
                    <div className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} border-2 ${
                      isComplete
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                        : isActive
                          ? 'border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800'
                    }`}>
                      {isComplete ? <Trophy size={20} /> : isActive ? <Flame size={20} /> : <Target size={18} />}
                    </div>
                    <div className={`${UI_RADIUS.control} flex-1 border px-4 py-3 ${
                      isActive
                        ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">{step.title}</h3>
                        <span className="text-xs font-extrabold text-slate-500 dark:text-slate-300">Level {step.level}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">{step.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <details className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <summary className="cursor-pointer text-sm font-extrabold text-indigo-600 dark:text-indigo-200">
                Show full 400-level path
              </summary>
              <div className="mt-3 grid gap-2">
                {LEARNING_PATH_MILESTONES.map((step) => (
                  <div key={step.title} className={`${UI_RADIUS.control} border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">{step.title}</h3>
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-300">Level {step.level}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">{step.detail}</p>
                  </div>
                ))}
              </div>
            </details>
          </SurfacePanel>
        </section>
      </main>
    </AppScreen>
  );
}

function PathFocusFlow({
  primaryMission,
  nextMission,
  pathLevel,
  maxPathLevel,
  xpToNextLevel,
  pathLevelProgress,
  selectedCategoriesCount,
  categoriesCount,
  onOpenMission,
  onOpenReview,
  onOpenExplore,
}: {
  primaryMission: FeatureFlowItem;
  nextMission?: FeatureFlowItem;
  pathLevel: number;
  maxPathLevel: number;
  xpToNextLevel: number;
  pathLevelProgress: number;
  selectedCategoriesCount: number;
  categoriesCount: number;
  onOpenMission: (mission: FeatureFlowItem) => void;
  onOpenReview: () => void;
  onOpenExplore: () => void;
}) {
  return (
    <div data-testid="path-focus-flow" className="space-y-4">
      <div className={`${UI_RADIUS.control} border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/40`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-500">400-level path</p>
            <p className="mt-1 text-3xl font-extrabold text-indigo-700 dark:text-indigo-100">
              Level {pathLevel}
              <span className="text-base text-indigo-500 dark:text-indigo-300">/{maxPathLevel}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">XP to next level</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{xpToNextLevel}</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white shadow-inner dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-indigo-600"
            style={{ width: `${Math.max(0, Math.min(100, pathLevelProgress))}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onOpenMission(primaryMission)}
          aria-label={primaryMission.ctaLabel}
          className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-24 w-full flex-col items-start justify-between gap-4 bg-indigo-600 px-5 py-4 text-left text-white shadow-lg hover:bg-indigo-700`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className={`${UI_RADIUS.touchIcon} flex h-11 w-11 shrink-0 items-center justify-center bg-white/15`}>
              <Play size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-extrabold uppercase tracking-wide text-indigo-100">{primaryMission.missionLabel}</span>
              <span className="mt-1 block text-xl font-extrabold">{primaryMission.title}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-indigo-50">{primaryMission.description}</span>
            </span>
          </span>
          <span className={`${UI_RADIUS.pill} bg-white px-3 py-2 text-xs font-extrabold text-indigo-700`}>
            Continue
          </span>
        </button>

        {nextMission && (
          <button
            type="button"
            onClick={() => onOpenMission(nextMission)}
            aria-label={nextMission.ctaLabel}
            className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-24 w-full items-start gap-3 border border-teal-200 bg-teal-50 p-4 text-left hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:hover:bg-teal-900/60`}
          >
            <span className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-teal-600 text-white`}>
              <Puzzle size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-extrabold uppercase tracking-wide text-teal-700 dark:text-teal-100">Next when ready</span>
              <span className="mt-1 block text-base font-extrabold text-slate-950 dark:text-white">{nextMission.title}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600 dark:text-slate-300">
                Compose sentences to check grammar, logic, and function words.
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <PathToolButton
          icon={<BookOpenCheck size={18} />}
          title="Review tools"
          body={`Your Vocabulary, Topic Deck, Word Library, and Learning System. Topics ${selectedCategoriesCount}/${categoriesCount || 0}.`}
          onOpen={onOpenReview}
        />
        <PathToolButton
          icon={<Compass size={18} />}
          title="Explore tools"
          body="Grammar training and language-map tools are available when the path asks for deeper work."
          onOpen={onOpenExplore}
        />
      </div>
    </div>
  );
}

function PathToolButton({
  icon,
  title,
  body,
  onOpen,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-20 w-full items-center gap-3 border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-700 dark:hover:bg-slate-800`}
    >
      <span className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-slate-900 text-white dark:bg-white dark:text-slate-950`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-slate-950 dark:text-white">{title}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500 dark:text-slate-300">{body}</span>
      </span>
    </button>
  );
}
