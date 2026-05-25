import { motion, useReducedMotion } from 'framer-motion';
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Compass,
  Flame,
  Footprints,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PathMissionsResponse, UserProgress } from '../types';
import type { FeatureFlowItem } from '../gamification/featureFlowRegistry';
import type { LearningRoadmapStep } from './learningPathMeta';
import { formatCopy } from '../i18n/staticCopy';
import { useCopy } from '../i18n/languageContext';

type RoadmapCopy = ReturnType<typeof useCopy>['pathRoadmap'];
import { UI_INTERACTION, UI_RADIUS } from './ui';
import { EYEBROW_CLASS } from './scene';

type LearningRoadmapVariant = 'home' | 'full' | 'diary';

interface LearningRoadmapProps {
  variant: LearningRoadmapVariant;
  steps: LearningRoadmapStep[];
  pathLevel: number;
  maxPathLevel: number;
  xpToNextLevel: number;
  pathLevelProgress: number;
  progress?: UserProgress;
  totalCards?: number;
  levelLabel: string;
  progressEyebrow?: string;
  todayPillTemplate?: string;
  nextMission?: FeatureFlowItem;
  missionSummary?: PathMissionsResponse;
  missionLoading?: boolean;
  missionError?: string | null;
  onCompleteMission?: (missionId: string) => Promise<void> | void;
  onNavigate: (path: string) => void;
}

const NODE_SIZE_BY_VARIANT: Record<LearningRoadmapVariant, string> = {
  home: 'h-16 w-16',
  full: 'h-14 w-14',
  diary: 'h-12 w-12',
};

const ROAD_VIEWPORT_BY_VARIANT: Record<LearningRoadmapVariant, string> = {
  home: 'h-[72vh] min-h-[560px] max-h-[760px]',
  full: '',
  diary: 'h-[72vh] min-h-[560px] max-h-[860px]',
};

const MIN_ROAD_CANVAS_HEIGHT: Record<LearningRoadmapVariant, number> = {
  home: 720,
  full: 980,
  diary: 840,
};

const ROAD_SVG_WIDTH = 360;

const STATE_CLASSES: Record<LearningRoadmapStep['state'], string> = {
  complete: 'border-canvas bg-success text-ink',
  active: 'border-canvas bg-primary text-on-primary motion-safe:animate-pulse',
  upcoming: 'border-canvas bg-accent-teal text-ink',
  locked: 'border-canvas bg-surface-cream-strong text-muted',
};

function formatPathNumber(value: number) {
  return Number(value.toFixed(2));
}

function roadmapPath(steps: LearningRoadmapStep[], canvasHeight: number) {
  if (steps.length === 0) return '';

  return steps.slice(1).reduce((path, step, index) => {
    const previous = steps[index];
    const previousX = (previous.x / 100) * ROAD_SVG_WIDTH;
    const previousY = (previous.y / 100) * canvasHeight;
    const stepX = (step.x / 100) * ROAD_SVG_WIDTH;
    const stepY = (step.y / 100) * canvasHeight;
    const controlY = previousY + (stepY - previousY) * 0.5;
    return `${path} C ${formatPathNumber(previousX)} ${formatPathNumber(controlY)}, ${formatPathNumber(stepX)} ${formatPathNumber(controlY)}, ${formatPathNumber(stepX)} ${formatPathNumber(stepY)}`;
  }, `M ${formatPathNumber((steps[0].x / 100) * ROAD_SVG_WIDTH)} ${formatPathNumber((steps[0].y / 100) * canvasHeight)}`);
}

function stepsThroughActive(steps: LearningRoadmapStep[]) {
  const activeIndex = steps.findIndex((step) => step.state === 'active');
  return activeIndex === -1 ? steps : steps.slice(0, activeIndex + 1);
}

function StepIcon({ step }: { step: LearningRoadmapStep }) {
  if (step.state === 'complete') return <CheckCircle2 size={20} />;
  if (step.state === 'active') return <Flame size={20} />;
  if (step.state === 'upcoming') return <Target size={19} />;
  return <Lock size={17} />;
}

function nodeComplexityText(step: LearningRoadmapStep, t: RoadmapCopy) {
  if (step.cefrPhase === 'A2') return t.complexityA2;
  if (step.cefrPhase === 'B1') return t.complexityB1;
  if (step.cefrPhase === 'B2') return t.complexityB2;
  return t.complexityA1;
}

function nodeStateText(step: LearningRoadmapStep, t: RoadmapCopy) {
  const missionStatus = step.missionStatus ?? step.state;
  if (missionStatus === 'completed' || missionStatus === 'complete') {
    return t.stateCompleted;
  }
  if (missionStatus === 'available' || missionStatus === 'active') {
    return t.stateAvailable;
  }
  return t.stateLocked;
}

function levelText(template: string, level: number) {
  return formatCopy(template, { level });
}

interface RoadmapPhaseBand {
  key: string;
  label: string;
  top: number;
  height: number;
  tone: string;
}

function buildPhaseBands(steps: LearningRoadmapStep[]): RoadmapPhaseBand[] {
  const bands = new Map<string, { label: string; firstY: number; lastY: number }>();
  for (const step of steps) {
    if (!step.cefrPhase || !step.phaseLabel) continue;
    const existing = bands.get(step.cefrPhase);
    if (!existing) {
      bands.set(step.cefrPhase, { label: step.phaseLabel, firstY: step.y, lastY: step.y });
    } else {
      existing.firstY = Math.min(existing.firstY, step.y);
      existing.lastY = Math.max(existing.lastY, step.y);
    }
  }

  const toneByPhase: Record<string, string> = {
    A1: 'border-success/25 bg-success/10 text-success',
    A2: 'border-accent-teal/25 bg-accent-teal/10 text-accent-teal',
    B1: 'border-primary/25 bg-primary/10 text-primary',
    B2: 'border-accent-amber/35 bg-accent-amber/15 text-ink',
  };

  return Array.from(bands.entries()).map(([key, band]) => {
    const top = Math.max(0, band.firstY - 1.8);
    const bottom = Math.min(100, band.lastY + 1.8);
    return {
      key,
      label: band.label,
      top,
      height: Math.max(4, bottom - top),
      tone: toneByPhase[key] ?? 'border-hairline bg-surface-soft text-muted',
    };
  });
}

function RoadmapPhaseBands({ bands }: { bands: RoadmapPhaseBand[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      {bands.map((band) => (
        <div
          key={band.key}
          className={`${UI_RADIUS.surface} absolute left-2 right-2 border ${band.tone}`}
          style={{ top: `${band.top}%`, height: `${band.height}%` }}
        >
          <span className={`${UI_RADIUS.pill} absolute left-3 top-3 bg-canvas px-3 py-1 text-caption font-black shadow-sm`}>
            {band.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LearningRoadmap({
  variant,
  steps,
  pathLevel,
  maxPathLevel,
  xpToNextLevel,
  pathLevelProgress,
  progress,
  totalCards,
  levelLabel,
  progressEyebrow,
  todayPillTemplate,
  nextMission,
  missionSummary,
  missionLoading,
  missionError,
  onCompleteMission,
  onNavigate,
}: LearningRoadmapProps) {
  const activeStep = steps.find((step) => step.state === 'active') ?? steps[0];
  const [selectedStepIndex, setSelectedStepIndex] = useState(activeStep?.index ?? 0);
  const [completingMissionId, setCompletingMissionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const userSelectedStepRef = useRef(false);
  const selectedStep = steps.find((step) => step.index === selectedStepIndex) ?? activeStep;
  const progressLabel = Math.max(0, Math.min(100, Math.round(pathLevelProgress)));
  const missionCount = missionSummary?.missions.length ?? steps.length;
  const completedCount = missionSummary?.completed_count ?? steps.filter((step) => step.state === 'complete').length;
  const canvasHeight = Math.max(MIN_ROAD_CANVAS_HEIGHT[variant], steps.length * 72);
  const pageScrollRoad = variant === 'full';
  const prefersReducedMotion = useReducedMotion();
  const fullPath = roadmapPath(steps, canvasHeight);
  const completedPath = roadmapPath(stepsThroughActive(steps), canvasHeight);

  const phaseBands = useMemo(() => buildPhaseBands(steps), [steps]);

  useEffect(() => {
    if (pageScrollRoad || !scrollRef.current || !activeStep) return;
    const targetTop = (activeStep.y / 100) * canvasHeight;
    scrollRef.current.scrollTo({
      top: Math.max(0, targetTop - scrollRef.current.clientHeight * 0.42),
      behavior: 'smooth',
    });
  }, [activeStep, canvasHeight, pageScrollRoad]);

  useEffect(() => {
    if (!activeStep || userSelectedStepRef.current) return;
    setSelectedStepIndex(activeStep.index);
  }, [activeStep]);

  const handleCompleteMission = async (missionId: string) => {
    const completedIndex = selectedStep?.index ?? activeStep?.index ?? 0;
    setCompletingMissionId(missionId);
    try {
      await onCompleteMission?.(missionId);
      setSelectedStepIndex(Math.min(steps.length - 1, completedIndex + 1));
    } finally {
      setCompletingMissionId(null);
    }
  };

  const details = selectedStep ? (
    <RoadmapCheckpointDetails
      step={selectedStep}
      checkpointCount={missionCount}
      maxPathLevel={maxPathLevel}
      levelLabel={levelLabel}
      isCompleting={selectedStep.missionId === completingMissionId}
      sticky={pageScrollRoad}
      onNavigate={onNavigate}
      onCompleteMission={selectedStep.missionId ? handleCompleteMission : undefined}
    />
  ) : null;

  return (
    <section
      data-testid="path-focus-flow"
      aria-label="Gamified learning path"
      className={`${UI_RADIUS.surface} relative overflow-hidden border border-hairline bg-surface-soft`}
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-canvas" aria-hidden="true" />
      <div className="relative z-10 flex flex-wrap gap-2 p-4 pb-0">
        <RoadStat icon={<Sparkles size={14} />} label="400-level path" value={`${pathLevel}/${maxPathLevel}`} />
        <RoadStat icon={<Trophy size={14} />} label="Missions" value={`${completedCount}/${missionCount}`} />
        <RoadStat icon={<Flame size={14} />} label="XP to next level" value={xpToNextLevel} />
        <RoadStat icon={<ShieldCheck size={14} />} label="Progress" value={`${progressLabel}%`} />
      </div>
      <div className="relative z-10 mx-4 mt-3 rounded-md border border-hairline bg-canvas px-3 py-2 text-caption font-semibold text-muted">
        400 levels total · {missionCount} mission nodes · tap a node to inspect it
        {missionLoading ? <span className="ml-2 text-primary">Syncing missions…</span> : null}
      </div>
      {missionError ? (
        <div className="relative z-10 mx-4 mt-2 rounded-md border border-accent-amber/50 bg-accent-amber/10 px-3 py-2 text-caption font-semibold text-ink">
          {missionError}
        </div>
      ) : null}

      {variant === 'diary' && progressEyebrow && todayPillTemplate && progress ? (
        <div className="relative z-10 mx-4 mt-4 flex items-center justify-between gap-3">
          <p className={`${EYEBROW_CLASS} text-muted`}>{progressEyebrow}</p>
          <div className={`${UI_RADIUS.pill} border border-hairline bg-canvas px-3 py-2 text-caption font-medium text-muted`}>
            {formatCopy(todayPillTemplate, { reviewed: progress.cards_reviewed, total: totalCards || 0 })}
          </div>
        </div>
      ) : null}

      {pageScrollRoad ? details : null}

      <div
        ref={scrollRef}
        data-testid="learning-roadmap-scroll"
        data-scroll-mode={pageScrollRoad ? 'page' : 'panel'}
        className={`relative ${ROAD_VIEWPORT_BY_VARIANT[variant]} mt-2 ${
          pageScrollRoad
            ? 'overflow-visible'
            : 'overflow-y-auto overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch] touch-pan-y'
        }`}
      >
        <div className="relative" style={{ height: `${canvasHeight}px` }}>
          <RoadmapPhaseBands bands={phaseBands} />
          <svg
            viewBox={`0 0 ${ROAD_SVG_WIDTH} ${canvasHeight}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
            aria-hidden="true"
            data-testid="learning-roadmap-road"
          >
            <defs>
              <filter id={`road-soft-shadow-${variant}`} x="-20%" y="-10%" width="140%" height="120%">
                <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="var(--color-ink)" floodOpacity="0.12" />
              </filter>
              <linearGradient id={`road-progress-gradient-${variant}`} x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success)" />
                <stop offset="55%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-accent-amber)" />
              </linearGradient>
            </defs>
            <path
              d={fullPath}
              fill="none"
              stroke="var(--color-ink)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.12"
              strokeWidth="34"
              vectorEffect="non-scaling-stroke"
              filter={`url(#road-soft-shadow-${variant})`}
            />
            <path
              d={fullPath}
              fill="none"
              stroke="var(--color-accent-amber)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.55"
              strokeWidth="28"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={fullPath}
              fill="none"
              stroke="var(--color-surface-cream-strong)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="22"
              vectorEffect="non-scaling-stroke"
              data-testid="learning-roadmap-road-base"
            />
            <path
              d={fullPath}
              fill="none"
              stroke="var(--color-canvas)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="15"
              vectorEffect="non-scaling-stroke"
            />
            <motion.path
              d={fullPath}
              fill="none"
              stroke="var(--color-muted-soft)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.42"
              strokeWidth="2.5"
              strokeDasharray="10 14"
              vectorEffect="non-scaling-stroke"
              animate={prefersReducedMotion ? undefined : { strokeDashoffset: [0, -24] }}
              transition={prefersReducedMotion ? undefined : { duration: 2.2, ease: 'linear', repeat: Infinity }}
              data-testid="learning-roadmap-road-lane"
            />
            <motion.path
              d={completedPath}
              fill="none"
              stroke={`url(#road-progress-gradient-${variant})`}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
              strokeDasharray="12 10"
              vectorEffect="non-scaling-stroke"
              initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0.35 }}
              animate={prefersReducedMotion ? undefined : { pathLength: 1, opacity: 1 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              data-testid="learning-roadmap-road-progress"
            />
          </svg>

          {activeStep ? (
            <motion.div
              data-testid="learning-roadmap-avatar"
              data-current-level={String(activeStep.level)}
              aria-label={`Current character on ${levelText(levelLabel, activeStep.level)}`}
              className={`${UI_RADIUS.touchIcon} pointer-events-none absolute z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-[125%] items-center justify-center border-2 border-canvas bg-ink text-canvas shadow-sm`}
              animate={{ left: `${activeStep.x}%`, top: `${activeStep.y}%` }}
              transition={{ type: 'spring', stiffness: 170, damping: 20 }}
            >
              <Footprints size={18} />
            </motion.div>
          ) : null}

          {selectedStep ? (
            <RoadmapNodeBubble
              key={`${selectedStep.level}-${selectedStep.state}`}
              step={selectedStep}
              maxPathLevel={maxPathLevel}
              prefersReducedMotion={Boolean(prefersReducedMotion)}
            />
          ) : null}

          {steps.map((step) => (
            <motion.button
              key={`${step.level}-${step.title}`}
              type="button"
              data-testid={`learning-roadmap-node-${step.state}`}
              aria-label={`${step.title}, ${levelText(levelLabel, step.level)}, ${step.phaseLabel ?? 'Path mission'}, ${step.missionStatus ?? step.state}`}
              aria-pressed={selectedStep?.index === step.index}
              onClick={() => {
                userSelectedStepRef.current = true;
                setSelectedStepIndex(step.index);
              }}
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: selectedStep?.index === step.index ? 1.08 : step.state === 'active' ? 1.04 : 1 }}
              transition={{ duration: 0.24, delay: Math.min(step.index, 18) * 0.012, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center ${NODE_SIZE_BY_VARIANT[variant]} ${UI_RADIUS.touchIcon} border-4 text-sm font-black shadow-sm ${STATE_CLASSES[step.state]} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                selectedStep?.index === step.index ? 'ring-4 ring-primary/25' : ''
              }`}
              style={{ left: `${step.x}%`, top: `${step.y}%` }}
            >
              <StepIcon step={step} />
              <span className="sr-only">{levelText(levelLabel, step.level)}</span>
            </motion.button>
          ))}

          {variant === 'diary' ? (
            <DiaryEntries steps={steps} levelLabel={levelLabel} />
          ) : null}
        </div>
      </div>

      {!pageScrollRoad ? details : null}

      {variant === 'home' ? (
        <div className="relative z-30 border-t border-hairline bg-canvas p-4">
          <div className="grid gap-2">
            {nextMission ? (
              <MissionButton
                icon={<Target size={18} />}
                title={nextMission.title}
                eyebrow={nextMission.missionLabel}
                ariaLabel={nextMission.ctaLabel}
                onClick={() => onNavigate(nextMission.route)}
              />
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <MissionButton
                icon={<BookOpenCheck size={18} />}
                title="Review tools"
                eyebrow="Review"
                onClick={() => onNavigate('/review')}
              />
              <MissionButton
                icon={<Compass size={18} />}
                title="Explore tools"
                eyebrow="Explore"
                onClick={() => onNavigate('/grammar')}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RoadmapNodeBubble({
  step,
  maxPathLevel,
  prefersReducedMotion,
}: {
  step: LearningRoadmapStep;
  maxPathLevel: number;
  prefersReducedMotion: boolean;
}) {
  const placement =
    step.x > 58
      ? 'left'
      : step.x < 42
        ? 'right'
        : 'top';
  const bubblePositionClass = {
    left: '-translate-x-[calc(100%+3rem)] -translate-y-1/2',
    right: 'translate-x-12 -translate-y-1/2',
    top: '-translate-x-1/2 -translate-y-[calc(100%+3rem)]',
  }[placement];
  const arrowClass = {
    left: '-right-1.5 top-1/2 -translate-y-1/2',
    right: '-left-1.5 top-1/2 -translate-y-1/2',
    top: 'bottom-[-7px] left-1/2 -translate-x-1/2',
  }[placement];
  const originClass = {
    left: 'origin-right',
    right: 'origin-left',
    top: 'origin-bottom',
  }[placement];

  return (
    <motion.aside
      role="status"
      aria-live="polite"
      data-testid="learning-roadmap-node-bubble"
      data-node-level={String(step.level)}
      className={`pointer-events-none absolute z-40 w-[min(14rem,46vw)] ${bubblePositionClass} ${originClass}`}
      style={{ left: `${step.x}%`, top: `${step.y}%` }}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <span
        aria-hidden="true"
        className={`absolute h-3.5 w-3.5 rotate-45 border border-hairline bg-canvas shadow-sm ${arrowClass}`}
      />
      <div className={`${UI_RADIUS.surface} relative border border-hairline bg-canvas p-3 text-left shadow-sm`}>
        <div className="flex items-start gap-2">
          <span className={`${UI_RADIUS.touchIcon} flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-on-primary shadow-sm`}>
            <MapPin size={15} />
          </span>
          <span className="min-w-0">
            <span className={`${EYEBROW_CLASS} block text-primary`}>Node {step.level} of {maxPathLevel}</span>
            <span className="mt-0.5 block text-body-sm font-black leading-tight text-ink">{step.title}</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`${UI_RADIUS.pill} bg-surface-soft px-2 py-1 text-caption font-bold text-muted`}>
            {step.phaseLabel ?? 'Path phase'}
          </span>
          <span className={`${UI_RADIUS.pill} bg-primary/10 px-2 py-1 text-caption font-bold text-primary`}>
            {step.missionStatus ?? step.state}
          </span>
        </div>
        <p className="mt-2 text-caption font-semibold leading-snug text-ink">{step.detail}</p>
        <p className="mt-1.5 text-caption font-medium leading-snug text-muted">{nodeComplexityText(step)}</p>
        <p className="mt-2 border-t border-hairline pt-2 text-caption font-semibold leading-snug text-body">
          {nodeStateText(step)}
        </p>
      </div>
    </motion.aside>
  );
}

function RoadStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={`${UI_RADIUS.pill} flex min-h-9 items-center gap-2 border border-hairline bg-canvas px-3 py-1.5 text-caption font-semibold text-ink`}>
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
      <span className="text-muted">{value}</span>
    </div>
  );
}

function MissionButton({
  icon,
  title,
  eyebrow,
  ariaLabel,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  eyebrow: string;
  ariaLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} flex min-h-16 w-full items-center gap-3 border border-hairline bg-surface-soft p-3 text-left hover:bg-surface-card`}
    >
      <span className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-canvas text-primary`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`${EYEBROW_CLASS} block truncate text-muted`}>{eyebrow}</span>
        <span className="mt-0.5 block truncate text-body-sm font-semibold text-ink">{title}</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-muted-soft" />
    </button>
  );
}

function RoadmapCheckpointDetails({
  step,
  checkpointCount,
  maxPathLevel,
  levelLabel,
  isCompleting,
  sticky,
  onNavigate,
  onCompleteMission,
}: {
  step: LearningRoadmapStep;
  checkpointCount: number;
  maxPathLevel: number;
  levelLabel: string;
  isCompleting?: boolean;
  sticky?: boolean;
  onNavigate: (path: string) => void;
  onCompleteMission?: (missionId: string) => void;
}) {
  const missionStatus = step.missionStatus ?? (
    step.state === 'complete'
      ? 'completed'
      : step.state === 'active'
        ? 'available'
        : 'locked'
  );
  const statusLabel = {
    completed: 'Completed mission',
    available: 'Available mission',
    locked: 'Locked mission',
  }[missionStatus];
  const canOpen = missionStatus !== 'locked' && step.route;
  const canComplete = missionStatus === 'available' && step.missionId && onCompleteMission;
  const openMissionLabel = missionStatus === 'available' ? 'Continue path' : 'Open mission';

  return (
    <section
      role="region"
      aria-label="Roadmap checkpoint details"
      className={`${sticky ? 'sticky top-12' : 'relative'} z-40 border-y border-hairline bg-canvas/95 p-4 backdrop-blur-sm`}
    >
      <p className={`${EYEBROW_CLASS} text-primary`}>Checkpoint details</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-title-sm font-semibold text-ink">{step.title}</h3>
          <p className="mt-1 text-body-sm font-medium text-muted">{step.detail}</p>
          {step.objective ? (
            <p className="mt-2 text-body-sm font-semibold text-ink">{step.objective}</p>
          ) : null}
        </div>
        <span className={`${UI_RADIUS.pill} shrink-0 bg-surface-card px-3 py-1.5 text-caption font-semibold text-muted`}>
          {levelText(levelLabel, step.level)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <DetailMetric label="Status" value={statusLabel} />
        <DetailMetric label="Phase" value={step.phaseLabel ?? 'Path phase'} />
        <DetailMetric label="Total path" value={`${maxPathLevel} levels total`} />
        <DetailMetric label="Map" value={`${checkpointCount} missions total`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {canOpen ? (
          <button
            type="button"
            onClick={() => onNavigate(step.route!)}
            className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} inline-flex min-h-11 items-center gap-2 bg-ink px-4 py-2 text-body-sm font-semibold text-canvas hover:bg-body-strong`}
          >
            {openMissionLabel}
            <ChevronRight size={17} />
          </button>
        ) : null}
        {canComplete ? (
          <button
            type="button"
            disabled={isCompleting}
            onClick={() => onCompleteMission(step.missionId!)}
            className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} inline-flex min-h-11 items-center gap-2 bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary-active disabled:cursor-wait disabled:opacity-70`}
          >
            {isCompleting ? 'Completing…' : 'Complete mission'}
            <CheckCircle2 size={17} />
          </button>
        ) : null}
        {missionStatus === 'locked' ? (
          <span className={`${UI_RADIUS.pill} inline-flex min-h-11 items-center bg-surface-soft px-4 py-2 text-body-sm font-semibold text-muted`}>
            Complete the current mission first
          </span>
        ) : null}
      </div>
    </section>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={`${UI_RADIUS.control} border border-hairline bg-surface-soft p-2`}>
      <p className={`${EYEBROW_CLASS} text-muted`}>{label}</p>
      <p className="mt-1 text-caption font-semibold text-ink">{value}</p>
    </div>
  );
}

function DiaryEntries({
  steps,
  levelLabel,
}: {
  steps: LearningRoadmapStep[];
  levelLabel: string;
}) {
  const visibleSteps = steps
    .filter((step) => step.isCheckpoint || step.state === 'active')
    .slice(0, 12);

  return (
    <div className="pointer-events-none absolute inset-x-4 top-24 z-10 flex flex-col gap-5">
      {visibleSteps.map((step) => (
        <div
          key={`${step.level}-diary`}
          className={`${UI_RADIUS.control} ml-auto w-[68%] border border-hairline bg-canvas/90 p-3 shadow-sm backdrop-blur-sm ${
            step.state === 'locked' ? 'opacity-60' : ''
          }`}
          style={{ marginTop: step.index === 0 ? 0 : 16 }}
        >
          <p className={`${EYEBROW_CLASS} text-primary`}>{levelText(levelLabel, step.level)}</p>
          <h3 className="mt-1 text-body-sm font-semibold text-ink">{step.title}</h3>
          <p className="mt-1 text-caption font-medium text-muted">{step.detail}</p>
        </div>
      ))}
    </div>
  );
}
