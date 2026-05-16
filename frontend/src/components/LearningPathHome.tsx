import type { ReactNode } from 'react';
import {
  BookOpen,
  BookOpenCheck,
  ChevronRight,
  Clock3,
  Compass,
  Flame,
  Gauge,
  Play,
  Puzzle,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import type { AdaptiveLearningSummary, UserProgress } from '../types';
import { GameSignalBadge, StatCard, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import { EYEBROW_CLASS, SceneShell } from './scene';
import {
  type LearningPathMilestone,
  getActiveMilestoneIndex,
  getLearningTrendLabel,
  getMilestones,
  getPathDisplayValues,
} from './learningPathMeta';
import {
  getFeatureFlowItemsByPhase,
  getPrimaryFeatureFlowItem,
} from '../gamification/featureFlowRegistry';
import { useCopy, useTargetLanguage } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';

import type { PathView } from '../routes/appRoutes';

interface LearningPathHomeProps {
  pathView: PathView;
  learningSummary: AdaptiveLearningSummary | null;
  progress: UserProgress;
  totalCards: number;
  onNavigateToFeature: (path: string) => void;
}

export function LearningPathHome({
  pathView,
  learningSummary,
  progress,
  totalCards,
  onNavigateToFeature,
}: LearningPathHomeProps) {
  const copy = useCopy();
  const target = useTargetLanguage();
  const languageName = copy.targetLanguageNames[target];
  const t = copy.pathHome;

  const display = getPathDisplayValues(learningSummary);
  const milestones = getMilestones(copy);
  const shouldReengage = Boolean(learningSummary?.should_reengage);
  const primaryMission = getPrimaryFeatureFlowItem();
  const upcomingMissions = getFeatureFlowItemsByPhase('upcoming');
  const nextMission = upcomingMissions[0];

  const navigate = (path: string) => onNavigateToFeature(path);
  const back = pathView === 'home' ? undefined : { onClick: () => navigate('/') };

  if (pathView === 'full') {
    return (
      <SceneShell
        eyebrow={t.full.eyebrow}
        title={t.full.title}
        subline={t.full.subline}
        explainerKey="path.full"
        explainerTitle={t.full.explainerTitle}
        explainerBody={<p>{t.full.explainerBody}</p>}
        back={back}
        onNavigate={navigate}
      >
        <FullPath pathLevel={display.pathLevel} levelLabel={t.full.levelLabel} milestones={milestones} />
      </SceneShell>
    );
  }

  if (pathView === 'stats') {
    return (
      <SceneShell
        eyebrow={t.stats.eyebrow}
        title={t.stats.title}
        subline={t.stats.subline}
        explainerKey="path.stats"
        explainerTitle={t.stats.explainerTitle}
        explainerBody={<p>{t.stats.explainerBody}</p>}
        back={back}
        onNavigate={navigate}
      >
        <div className="grid auto-rows-fr grid-cols-2 gap-3">
          <StatCard label={t.stats.pathLevel} value={display.pathLevel} icon={<Gauge size={20} />} color="coral" />
          <StatCard
            label={t.stats.words}
            value={learningSummary?.total_words_practiced ?? 0}
            icon={<BookOpen size={20} />}
            color="coral-strong"
          />
          <StatCard
            label={t.stats.strong}
            value={learningSummary?.words_mastered ?? 0}
            icon={<Trophy size={20} />}
            color="success"
          />
          <StatCard
            label={t.stats.avgMastery}
            value={Number(display.averageMastery.toFixed(1))}
            icon={<Target size={20} />}
            color="teal"
          />
        </div>
      </SceneShell>
    );
  }

  if (pathView === 'diary') {
    return (
      <SceneShell
        eyebrow={t.diary.eyebrow}
        title={t.diary.title}
        subline={t.diary.subline}
        explainerKey="path.diary"
        explainerTitle={t.diary.explainerTitle}
        explainerBody={<p>{t.diary.explainerBody}</p>}
        back={back}
        onNavigate={navigate}
      >
        <DiaryTimeline
          pathLevel={display.pathLevel}
          progress={progress}
          totalCards={totalCards}
          variant="full"
          progressEyebrow={t.diary.progressEyebrow}
          todayPillTemplate={t.diary.todayPill}
          levelLabel={t.full.levelLabel}
          milestones={milestones}
        />
      </SceneShell>
    );
  }

  if (pathView === 'next') {
    return (
      <SceneShell
        eyebrow={t.next.eyebrow}
        title={t.next.title}
        subline={t.next.subline}
        explainerKey="path.next"
        explainerTitle={t.next.explainerTitle}
        explainerBody={<p>{t.next.explainerBody}</p>}
        back={back}
        onNavigate={navigate}
      >
        <div className="flex flex-col gap-3">
          {nextMission && (
            <button
              type="button"
              onClick={() => navigate(nextMission.route)}
              className={`${UI_RADIUS.surface} ${UI_INTERACTION.transition} flex w-full items-center gap-3 border border-hairline bg-canvas p-4 text-left hover:bg-surface-card`}
            >
              <span
                className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-accent-teal text-ink`}
              >
                <Puzzle size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${EYEBROW_CLASS} text-accent-teal`}>
                  {t.next.nextChallengeEyebrow}
                </span>
                <span className="mt-1 block text-body-md font-semibold text-ink truncate">{nextMission.title}</span>
              </span>
              <ChevronRight size={18} className="text-muted-soft shrink-0" />
            </button>
          )}
          <PathToolButton
            icon={<BookOpenCheck size={18} />}
            title={t.next.reviewToolsTitle}
            onOpen={() => navigate('/review')}
          />
          <PathToolButton
            icon={<Compass size={18} />}
            title={t.next.exploreToolsTitle}
            onOpen={() => navigate('/explore')}
          />
        </div>
      </SceneShell>
    );
  }

  return (
    <SceneShell
      eyebrow={t.home.eyebrow}
      title={formatCopy(t.home.title, { language: languageName })}
      subline={t.home.subline}
      explainerKey="path.home"
      explainerTitle={t.home.explainerTitle}
      explainerBody={
        <>
          <p>{t.home.explainerBodyP1}</p>
          <p>{t.home.explainerBodyP2}</p>
        </>
      }
      onNavigate={navigate}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <GameSignalBadge icon={<Sparkles size={14} />} label={t.home.dailyQuest} tone="amber" />
          <GameSignalBadge icon={<ShieldCheck size={14} />} label={t.home.streakShield} tone="teal" />
          <GameSignalBadge icon={<Trophy size={14} />} label={t.home.xpBank} tone="success" />
        </div>

        {shouldReengage && (
          <SurfacePanel className="border-accent-amber bg-accent-amber/10" padding="md">
            <div className="flex items-start gap-3">
              <div
                className={`${UI_RADIUS.touchIcon} flex h-11 w-11 items-center justify-center bg-canvas text-accent-amber`}
              >
                <Clock3 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-semibold text-ink">{t.home.reengageTitle}</p>
                <p className="mt-1 text-body-sm font-medium text-muted">
                  {formatCopy(t.home.reengageBody, {
                    days: learningSummary?.days_since_last_practice ?? 0,
                    language: languageName,
                  })}
                </p>
              </div>
            </div>
          </SurfacePanel>
        )}

        <SurfacePanel padding="lg" className="space-y-2">
          <p className={`${EYEBROW_CLASS} text-muted`}>{t.home.snapshotEyebrow}</p>
          <h2 className="font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
            {getLearningTrendLabel(learningSummary, copy)}
          </h2>
        </SurfacePanel>

        <button
          type="button"
          onClick={() => navigate(primaryMission.route)}
          aria-label={primaryMission.ctaLabel}
          className={`${UI_RADIUS.surface} ${UI_INTERACTION.transition} flex w-full flex-col items-start gap-3 bg-primary px-5 py-5 text-left text-on-primary`}
        >
          <span className="flex w-full items-center gap-3">
            <span
              className={`${UI_RADIUS.touchIcon} flex h-11 w-11 shrink-0 items-center justify-center bg-canvas/15`}
            >
              <Play size={20} />
            </span>
            <span className="min-w-0">
              <span className={`block ${EYEBROW_CLASS} text-on-primary/70`}>
                {primaryMission.missionLabel}
              </span>
              <span className="mt-0.5 block font-sans text-title-sm font-semibold text-on-primary">
                {primaryMission.title}
              </span>
            </span>
          </span>
          <span
            className={`${UI_RADIUS.pill} bg-canvas px-3 py-2 text-caption font-medium text-primary`}
          >
            {t.home.primaryCtaPill}
          </span>
        </button>

        <nav aria-label="Path sections" className="mt-2 flex flex-col gap-2">
          <PathSectionLink
            label={t.home.linkFull}
            onClick={() => navigate('/path/full')}
          />
          <PathSectionLink
            label={t.home.linkStats}
            onClick={() => navigate('/path/stats')}
          />
          <PathSectionLink
            label={t.home.linkDiary}
            onClick={() => navigate('/path/diary')}
          />
          <PathSectionLink
            label={t.home.linkNext}
            onClick={() => navigate('/path/next')}
          />
        </nav>
      </div>
    </SceneShell>
  );
}

function PathSectionLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} flex w-full items-center justify-between gap-3 border border-hairline bg-canvas px-4 py-3 text-left hover:bg-surface-card`}
    >
      <span className="block text-title-sm font-semibold text-ink truncate">{label}</span>
      <ChevronRight size={18} className="text-muted-soft shrink-0" />
    </button>
  );
}

function FullPath({
  pathLevel,
  levelLabel,
  milestones,
}: {
  pathLevel: number;
  levelLabel: string;
  milestones: LearningPathMilestone[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {milestones.map((step) => {
        const isComplete = pathLevel >= step.level;
        return (
          <li
            key={step.title}
            className={`${UI_RADIUS.control} border border-hairline px-4 py-3 ${
              isComplete ? 'bg-surface-cream-strong' : 'bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-body-sm font-semibold text-ink">{step.title}</h3>
              <span className="text-caption font-medium text-muted">{formatCopy(levelLabel, { level: step.level })}</span>
            </div>
            <p className="mt-1 text-body-sm font-medium text-muted">{step.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}

function DiaryTimeline({
  pathLevel,
  progress,
  totalCards,
  variant,
  progressEyebrow,
  todayPillTemplate,
  levelLabel,
  milestones,
}: {
  pathLevel: number;
  progress: UserProgress;
  totalCards: number;
  variant: 'full' | 'compact';
  progressEyebrow: string;
  todayPillTemplate: string;
  levelLabel: string;
  milestones: LearningPathMilestone[];
}) {
  const activeMilestoneIndex = getActiveMilestoneIndex(pathLevel, milestones);
  const visibleMilestones =
    variant === 'compact'
      ? milestones.slice(
          Math.max(0, activeMilestoneIndex - 1),
          Math.min(milestones.length, activeMilestoneIndex + 2),
        )
      : milestones;

  return (
    <SurfacePanel padding="lg" className="relative overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className={`${EYEBROW_CLASS} text-muted`}>{progressEyebrow}</p>
        <div
          className={`${UI_RADIUS.pill} border border-hairline bg-surface-card px-3 py-2 text-caption font-medium text-muted`}
        >
          {formatCopy(todayPillTemplate, { reviewed: progress.cards_reviewed, total: totalCards || 0 })}
        </div>
      </div>
      <div className="relative space-y-3">
        <div className="absolute bottom-8 left-6 top-8 w-0.5 bg-hairline" />
        {visibleMilestones.map((step) => {
          const index = milestones.indexOf(step);
          const isComplete = pathLevel >= step.level;
          const isActive = index === activeMilestoneIndex;
          return (
            <div key={step.title} className="relative flex gap-4">
              <div
                className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} border ${
                  isComplete
                    ? 'border-hairline bg-success text-ink'
                    : isActive
                    ? 'border-hairline bg-primary text-on-primary'
                    : 'border-hairline bg-surface-card text-muted'
                }`}
              >
                {isComplete ? <Trophy size={20} /> : isActive ? <Flame size={20} /> : <Target size={18} />}
              </div>
              <div
                className={`${UI_RADIUS.control} flex-1 border px-4 py-3 ${
                  isActive ? 'border-hairline bg-surface-card' : 'border-hairline bg-canvas'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-body-sm font-semibold text-ink">{step.title}</h3>
                  <span className="text-caption font-medium text-muted">{formatCopy(levelLabel, { level: step.level })}</span>
                </div>
                <p className="mt-1 text-body-sm font-medium text-muted">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SurfacePanel>
  );
}

function PathToolButton({
  icon,
  title,
  onOpen,
}: {
  icon: ReactNode;
  title: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex w-full items-center gap-3 border border-hairline bg-canvas p-4 text-left hover:bg-surface-card`}
    >
      <span
        className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-ink text-canvas`}
      >
        {icon}
      </span>
      <span className="block flex-1 text-title-sm font-semibold text-ink truncate">{title}</span>
      <ChevronRight size={18} className="text-muted-soft shrink-0" />
    </button>
  );
}
