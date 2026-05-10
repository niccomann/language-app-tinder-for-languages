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
              <div className={`${UI_RADIUS.pill} bg-surface-card px-3 py-2 text-caption font-medium text-ink border border-hairline`}>
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
            <SurfacePanel className="border-accent-amber bg-accent-amber/10" padding="md">
              <div className="flex items-start gap-3">
                <div className={`${UI_RADIUS.touchIcon} flex h-11 w-11 items-center justify-center bg-canvas text-accent-amber`}>
                  <Clock3 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">Welcome back</p>
                  <p className="mt-1 text-sm font-medium text-muted">
                    {learningSummary?.days_since_last_practice} days since the last German session. Review German Level to recalibrate the path.
                  </p>
                </div>
              </div>
            </SurfacePanel>
          )}

          <SurfacePanel padding="lg" className="space-y-5">
            <div>
              <p className="text-caption-uppercase tracking-[1.5px] text-muted uppercase">Daily Learning Snapshot</p>
              <h2 className="mt-2 font-display font-normal text-display-sm tracking-[-0.5px] text-ink">
                {getLearningTrendLabel(learningSummary)}
              </h2>
              <p className="mt-2 text-body-sm font-medium text-muted">
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
                <p className="text-caption-uppercase tracking-[1.5px] text-muted uppercase">Learning Diary</p>
                <h2 className="mt-2 font-display font-normal text-display-sm tracking-[-0.5px] text-ink">Current progress</h2>
              </div>
              <div className={`${UI_RADIUS.pill} bg-surface-card px-3 py-2 text-caption font-medium text-muted border border-hairline`}>
                {progress.cards_reviewed}/{totalCards || 0} today
              </div>
            </div>

            <div className="relative space-y-3">
              <div className="absolute bottom-8 left-6 top-8 w-0.5 bg-hairline" />
              {visibleMilestones.map((step) => {
                const index = LEARNING_PATH_MILESTONES.indexOf(step);
                const isComplete = pathLevel >= step.level;
                const isActive = index === activeMilestoneIndex;
                return (
                  <div key={step.title} className="relative flex gap-4">
                    <div className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} border ${
                      isComplete
                        ? 'border-hairline bg-success text-ink'
                        : isActive
                          ? 'border-hairline bg-primary text-on-primary'
                          : 'border-hairline bg-surface-card text-muted'
                    }`}>
                      {isComplete ? <Trophy size={20} /> : isActive ? <Flame size={20} /> : <Target size={18} />}
                    </div>
                    <div className={`${UI_RADIUS.control} flex-1 border px-4 py-3 ${
                      isActive
                        ? 'border-hairline bg-surface-card'
                        : 'border-hairline bg-canvas'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-body-sm font-semibold text-ink">{step.title}</h3>
                        <span className="text-caption font-medium text-muted">Level {step.level}</span>
                      </div>
                      <p className="mt-1 text-body-sm font-medium text-muted">{step.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <details className="mt-4 border-t border-hairline pt-4">
              <summary className="cursor-pointer text-body-sm font-semibold text-primary">
                Show full 400-level path
              </summary>
              <div className="mt-3 grid gap-2">
                {LEARNING_PATH_MILESTONES.map((step) => (
                  <div key={step.title} className={`${UI_RADIUS.control} border border-hairline bg-canvas px-4 py-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-body-sm font-semibold text-ink">{step.title}</h3>
                      <span className="text-caption font-medium text-muted">Level {step.level}</span>
                    </div>
                    <p className="mt-1 text-body-sm font-medium text-muted">{step.detail}</p>
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
      <div className={`${UI_RADIUS.control} border border-hairline bg-surface-card p-4`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-caption-uppercase tracking-[1.5px] text-muted uppercase">400-level path</p>
            <p className="mt-1 font-display font-normal text-display-sm tracking-[-0.5px] text-ink">
              Level {pathLevel}
              <span className="text-body-md text-muted">/{maxPathLevel}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption-uppercase tracking-[1.5px] text-muted uppercase">XP to next level</p>
            <p className="mt-1 font-display font-normal text-display-sm tracking-[-0.5px] text-ink">{xpToNextLevel}</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-cream-strong">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(0, Math.min(100, pathLevelProgress))}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onOpenMission(primaryMission)}
          aria-label={primaryMission.ctaLabel}
          className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex min-h-24 w-full flex-col items-start justify-between gap-4 bg-primary px-5 py-4 text-left text-on-primary`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className={`${UI_RADIUS.touchIcon} flex h-11 w-11 shrink-0 items-center justify-center bg-canvas/15`}>
              <Play size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-caption-uppercase tracking-[1.5px] text-on-primary/70 uppercase">{primaryMission.missionLabel}</span>
              <span className="mt-1 block font-sans font-semibold text-title-sm text-on-primary">{primaryMission.title}</span>
              <span className="mt-1 block text-body-sm font-medium leading-5 text-on-primary/80">{primaryMission.description}</span>
            </span>
          </span>
          <span className={`${UI_RADIUS.pill} bg-canvas px-3 py-2 text-caption font-medium text-primary`}>
            Continue
          </span>
        </button>

        {nextMission && (
          <button
            type="button"
            onClick={() => onOpenMission(nextMission)}
            aria-label={nextMission.ctaLabel}
            className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex min-h-24 w-full items-start gap-3 border border-hairline bg-surface-card p-4 text-left hover:bg-surface-cream-strong`}
          >
            <span className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-accent-teal text-ink`}>
              <Puzzle size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-caption-uppercase tracking-[1.5px] text-accent-teal uppercase">Next when ready</span>
              <span className="mt-1 block font-sans font-semibold text-body-md text-ink">{nextMission.title}</span>
              <span className="mt-1 block text-body-sm font-medium leading-5 text-muted">
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
      className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex min-h-20 w-full items-center gap-3 border border-hairline bg-canvas p-3 text-left hover:bg-surface-card`}
    >
      <span className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-ink text-canvas`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-body-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-caption font-medium leading-5 text-muted">{body}</span>
      </span>
    </button>
  );
}
