import { BookOpen, Clock3, Flame, FlaskConical, Gauge, Layers3, Play, Target, Trophy } from 'lucide-react';
import type { AdaptiveLearningSummary, UserProgress } from '../types';
import { AppScreen, NavButton, ScreenHeader, StatCard, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import {
  LEARNING_PATH_MILESTONES,
  getActiveMilestoneIndex,
  getLearningTrendLabel,
  getPathDisplayValues,
} from './learningPathMeta';

interface LearningPathHomeProps {
  learningSummary: AdaptiveLearningSummary | null;
  progress: UserProgress;
  totalCards: number;
  categoriesCount: number;
  selectedCategoriesCount: number;
  onStartSession: () => void;
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
  onOpenFilters: () => void;
}

export function LearningPathHome({
  learningSummary,
  progress,
  totalCards,
  categoriesCount,
  selectedCategoriesCount,
  onStartSession,
  onOpenLibrary,
  onOpenGrammarLab,
  onOpenFilters,
}: LearningPathHomeProps) {
  const {
    averageMastery,
    pathLevel,
    maxPathLevel,
    xpToNextLevel,
    pathLevelProgress,
  } = getPathDisplayValues(learningSummary);
  const activeMilestoneIndex = getActiveMilestoneIndex(pathLevel);
  const shouldReengage = Boolean(learningSummary?.should_reengage);

  return (
    <AppScreen width="wide" contentClassName="min-h-dvh px-4 py-4">
      <main className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(420px,1fr)]">
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

          {shouldReengage && (
            <SurfacePanel className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" padding="md">
              <div className="flex items-start gap-3">
                <div className={`${UI_RADIUS.touchIcon} flex h-11 w-11 items-center justify-center bg-white text-amber-700 dark:bg-white/10 dark:text-amber-100`}>
                  <Clock3 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-amber-900 dark:text-amber-100">Bentornato</p>
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

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Path Level" value={pathLevel} icon={<Gauge size={20} />} color="indigo" />
              <StatCard label="Words" value={learningSummary?.total_words_practiced ?? 0} icon={<BookOpen size={20} />} color="purple" />
              <StatCard label="Strong" value={learningSummary?.words_mastered ?? 0} icon={<Trophy size={20} />} color="green" />
              <StatCard label="Avg Mastery" value={Number(averageMastery.toFixed(1))} icon={<Target size={20} />} color="blue" />
            </div>

            <button
              type="button"
              onClick={onStartSession}
              className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} ${UI_INTERACTION.press} flex min-h-14 w-full items-center justify-center gap-3 bg-indigo-600 px-5 py-4 text-sm font-extrabold text-white shadow-lg hover:bg-indigo-700`}
            >
              <Play size={18} />
              Review German Level
            </button>

            <div className="grid grid-cols-3 gap-2">
              <NavButton onClick={onOpenFilters} icon={<Layers3 size={17} />} label={`Topics ${selectedCategoriesCount}/${categoriesCount || 0}`} color="indigo" size="small" />
              <NavButton onClick={onOpenLibrary} icon={<BookOpen size={17} />} label="Library" color="purple" size="small" />
              <NavButton onClick={onOpenGrammarLab} icon={<FlaskConical size={17} />} label="Grammar" color="blue" size="small" />
            </div>
          </SurfacePanel>
        </section>

        <SurfacePanel padding="lg" className="relative overflow-hidden">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Learning Diary</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">Path progress</h2>
            </div>
            <div className={`${UI_RADIUS.pill} bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600 dark:bg-slate-700 dark:text-slate-200`}>
              {progress.cards_reviewed}/{totalCards || 0} today
            </div>
          </div>

          <div className="relative space-y-3">
            <div className="absolute bottom-8 left-6 top-8 w-0.5 bg-slate-200 dark:bg-slate-700" />
            {LEARNING_PATH_MILESTONES.map((step, index) => {
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
        </SurfacePanel>
      </main>
    </AppScreen>
  );
}
