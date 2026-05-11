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
import { SceneShell } from './scene';
import {
  LEARNING_PATH_MILESTONES,
  getActiveMilestoneIndex,
  getLearningTrendLabel,
  getPathDisplayValues,
} from './learningPathMeta';
import {
  getFeatureFlowItemsByPhase,
  getPrimaryFeatureFlowItem,
} from '../gamification/featureFlowRegistry';

export type PathView = 'home' | 'full' | 'stats' | 'diary' | 'next';

interface LearningPathHomeProps {
  pathView: PathView;
  learningSummary: AdaptiveLearningSummary | null;
  progress: UserProgress;
  totalCards: number;
  categoriesCount: number;
  selectedCategoriesCount: number;
  onNavigateToFeature: (path: string) => void;
}

export function LearningPathHome({
  pathView,
  learningSummary,
  progress,
  totalCards,
  categoriesCount,
  selectedCategoriesCount,
  onNavigateToFeature,
}: LearningPathHomeProps) {
  const display = getPathDisplayValues(learningSummary);
  const shouldReengage = Boolean(learningSummary?.should_reengage);
  const primaryMission = getPrimaryFeatureFlowItem();
  const upcomingMissions = getFeatureFlowItemsByPhase('upcoming');
  const nextMission = upcomingMissions[0];

  const navigate = (path: string) => onNavigateToFeature(path);
  const back = pathView === 'home' ? undefined : { onClick: () => navigate('/') };

  if (pathView === 'full') {
    return (
      <SceneShell
        eyebrow="PATH · 400-LEVEL"
        title="Full path"
        subline="Tutti i 400 livelli del percorso e dove sei adesso."
        explainerKey="path.full"
        explainerTitle="Cos'è il 400-level path"
        explainerBody={
          <p>
            Il percorso è organizzato in 400 livelli che riflettono quanto e quanto bene conosci le parole.
            Ogni swipe aggiorna il tuo livello. Esempio: se sai una parola al livello 22, vedrai contesti
            adatti a quel livello, non più semplici.
          </p>
        }
        back={back}
        onNavigate={navigate}
      >
        <FullPath pathLevel={display.pathLevel} />
      </SceneShell>
    );
  }

  if (pathView === 'stats') {
    return (
      <SceneShell
        eyebrow="PATH · STATS"
        title="Le tue cifre"
        subline="Path level, parole, parole forti e mastery medio."
        explainerKey="path.stats"
        explainerTitle="Cosa misurano queste cifre"
        explainerBody={
          <p>
            Path Level è il tuo livello sul percorso 400. Words è il totale parole praticate. Strong è il
            numero di parole con mastery alto. Avg Mastery è la media di tutte le confidence di parola.
          </p>
        }
        back={back}
        onNavigate={navigate}
      >
        <div className="grid auto-rows-fr grid-cols-2 gap-3">
          <StatCard label="Path Level" value={display.pathLevel} icon={<Gauge size={20} />} color="coral" />
          <StatCard
            label="Words"
            value={learningSummary?.total_words_practiced ?? 0}
            icon={<BookOpen size={20} />}
            color="coral-strong"
          />
          <StatCard
            label="Strong"
            value={learningSummary?.words_mastered ?? 0}
            icon={<Trophy size={20} />}
            color="success"
          />
          <StatCard
            label="Avg Mastery"
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
        eyebrow="PATH · DIARY"
        title="Learning diary"
        subline="La storia delle missioni del path, in ordine cronologico."
        explainerKey="path.diary"
        explainerTitle="Come funziona il diario"
        explainerBody={
          <p>
            Il diario mostra le tappe del path 400-level — le missioni passate sono completate, quelle correnti
            sono evidenziate, quelle future restano grigie finché non le sblocchi.
          </p>
        }
        back={back}
        onNavigate={navigate}
      >
        <DiaryTimeline
          pathLevel={display.pathLevel}
          progress={progress}
          totalCards={totalCards}
          variant="full"
        />
      </SceneShell>
    );
  }

  if (pathView === 'next') {
    return (
      <SceneShell
        eyebrow="PATH · NEXT"
        title="Pronto a salire"
        subline="La sfida successiva e gli strumenti consigliati per arrivarci."
        explainerKey="path.next"
        explainerTitle="Come decidiamo cosa è 'next'"
        explainerBody={
          <p>
            Quando il sistema vede abbastanza segnali di mastery, sblocca la prossima sfida (es. Sentence
            Placement). Qui trovi anche i tool di Review ed Explore consigliati per la fase corrente.
          </p>
        }
        back={back}
        onNavigate={navigate}
      >
        <div className="flex flex-col gap-3">
          {nextMission && (
            <button
              type="button"
              onClick={() => navigate(nextMission.route)}
              className={`${UI_RADIUS.surface} ${UI_INTERACTION.transition} flex w-full items-start gap-3 border border-hairline bg-canvas p-4 text-left hover:bg-surface-card`}
            >
              <span
                className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-accent-teal text-ink`}
              >
                <Puzzle size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-caption-uppercase font-medium uppercase tracking-[1.5px] text-accent-teal">
                  Next when ready
                </span>
                <span className="mt-1 block text-body-md font-semibold text-ink">{nextMission.title}</span>
                <span className="mt-1 block text-body-sm text-muted">
                  Compose sentences to check grammar, logic, and function words.
                </span>
              </span>
            </button>
          )}
          <PathToolButton
            icon={<BookOpenCheck size={18} />}
            title="Review tools"
            body={`Your Vocabulary, Topic Deck, Word Library, and Learning System. Topics ${selectedCategoriesCount}/${categoriesCount || 0}.`}
            onOpen={() => navigate('/review')}
          />
          <PathToolButton
            icon={<Compass size={18} />}
            title="Explore tools"
            body="Grammar training and language-map tools are available when the path asks for deeper work."
            onOpen={() => navigate('/explore')}
          />
        </div>
      </SceneShell>
    );
  }

  return (
    <SceneShell
      eyebrow="PATH · HOME"
      title="German Learning"
      subline="Decidi se sai una parola o no — il sistema fa il resto."
      explainerKey="path.home"
      explainerTitle="Come funziona la Home"
      explainerBody={
        <>
          <p>
            La Home mostra la missione corrente. Tutto il resto — stats, diario, sfida successiva — sta nelle
            schermate dedicate raggiungibili dai link in fondo.
          </p>
          <p>
            Esempio: se vuoi vedere i 4 numeri del tuo path (livello, parole, mastery), tocca "Le tue cifre".
          </p>
        </>
      }
      onNavigate={navigate}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <GameSignalBadge icon={<Sparkles size={14} />} label="Daily Quest" tone="amber" />
          <GameSignalBadge icon={<ShieldCheck size={14} />} label="Streak Shield" tone="teal" />
          <GameSignalBadge icon={<Trophy size={14} />} label="XP Bank" tone="success" />
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
                <p className="text-body-sm font-semibold text-ink">Welcome back</p>
                <p className="mt-1 text-body-sm font-medium text-muted">
                  {learningSummary?.days_since_last_practice} days since the last German session. Review German
                  Level to recalibrate the path.
                </p>
              </div>
            </div>
          </SurfacePanel>
        )}

        <SurfacePanel padding="lg" className="space-y-3">
          <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-muted">
            Daily Learning Snapshot
          </p>
          <h2 className="font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
            {getLearningTrendLabel(learningSummary)}
          </h2>
          <p className="text-body-sm font-medium text-muted">
            Your 400-level path updates from every swipe, then uses word mastery to choose easier or harder
            contexts.
          </p>
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
              <span className="block text-caption-uppercase font-medium uppercase tracking-[1.5px] text-on-primary/70">
                {primaryMission.missionLabel}
              </span>
              <span className="mt-0.5 block font-sans text-title-sm font-semibold text-on-primary">
                {primaryMission.title}
              </span>
            </span>
          </span>
          <span className="text-body-sm font-medium leading-5 text-on-primary/85">
            {primaryMission.description}
          </span>
          <span
            className={`${UI_RADIUS.pill} bg-canvas px-3 py-2 text-caption font-medium text-primary`}
          >
            Continue
          </span>
        </button>

        <nav aria-label="Path sections" className="mt-2 flex flex-col gap-2">
          <PathSectionLink
            label="Vedi il path completo"
            sub={`Tutti i 400 livelli — sei al ${display.pathLevel}`}
            onClick={() => navigate('/path/full')}
          />
          <PathSectionLink
            label="Le tue cifre"
            sub={`Path level, words, strong, mastery medio`}
            onClick={() => navigate('/path/stats')}
          />
          <PathSectionLink
            label="Learning diary"
            sub={`${progress.cards_reviewed}/${totalCards || 0} oggi`}
            onClick={() => navigate('/path/diary')}
          />
          <PathSectionLink
            label="Pronto a salire"
            sub="Prossima sfida + tool consigliati"
            onClick={() => navigate('/path/next')}
          />
        </nav>
      </div>
    </SceneShell>
  );
}

function PathSectionLink({
  label,
  sub,
  onClick,
}: {
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} flex w-full items-center justify-between gap-3 border border-hairline bg-canvas px-4 py-3 text-left hover:bg-surface-card`}
    >
      <span className="min-w-0">
        <span className="block text-body-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-caption font-medium text-muted">{sub}</span>
      </span>
      <ChevronRight size={18} className="text-muted-soft" />
    </button>
  );
}

function FullPath({ pathLevel }: { pathLevel: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {LEARNING_PATH_MILESTONES.map((step) => {
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
              <span className="text-caption font-medium text-muted">Level {step.level}</span>
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
}: {
  pathLevel: number;
  progress: UserProgress;
  totalCards: number;
  variant: 'full' | 'compact';
}) {
  const activeMilestoneIndex = getActiveMilestoneIndex(pathLevel);
  const visibleMilestones =
    variant === 'compact'
      ? LEARNING_PATH_MILESTONES.slice(
          Math.max(0, activeMilestoneIndex - 1),
          Math.min(LEARNING_PATH_MILESTONES.length, activeMilestoneIndex + 2),
        )
      : LEARNING_PATH_MILESTONES;

  return (
    <SurfacePanel padding="lg" className="relative overflow-hidden">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-caption-uppercase font-medium uppercase tracking-[1.5px] text-muted">
          Current progress
        </p>
        <div
          className={`${UI_RADIUS.pill} border border-hairline bg-surface-card px-3 py-2 text-caption font-medium text-muted`}
        >
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
                  <span className="text-caption font-medium text-muted">Level {step.level}</span>
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
      className={`${UI_RADIUS.control} ${UI_INTERACTION.transition} flex w-full items-start gap-3 border border-hairline bg-canvas p-4 text-left hover:bg-surface-card`}
    >
      <span
        className={`${UI_RADIUS.touchIcon} flex h-10 w-10 shrink-0 items-center justify-center bg-ink text-canvas`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-caption font-medium leading-5 text-muted">{body}</span>
      </span>
    </button>
  );
}

