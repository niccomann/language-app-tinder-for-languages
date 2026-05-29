import { BookOpen, CheckCircle, FlaskConical, RotateCcw, SlidersHorizontal, Target, Trophy, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppScreen, Button, CalloutCard, NavButton, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';
import { useCopy } from '../i18n/languageContext';
import { revealContainer, revealItem } from '../utils/animations';
import { useCountUp } from '../hooks/useCountUp';

interface CompletionScreenProps {
  progress: {
    cards_reviewed: number;
    known_count: number;
    unknown_count: number;
  };
  onRestart: () => void;
  onChangeCategories: () => void;
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
}

export function CompletionScreen({
  progress,
  onRestart,
  onChangeCategories,
  onOpenLibrary,
  onOpenGrammarLab,
}: CompletionScreenProps) {
  const copy = useCopy();
  const c = copy.completion;
  const reviewed = useCountUp(progress.cards_reviewed, 700, 200);
  const known = useCountUp(progress.known_count, 700, 280);
  const unknown = useCountUp(progress.unknown_count, 700, 360);
  return (
    <AppScreen width="compact" contentClassName="flex min-h-dvh items-center px-4 py-6">
      <motion.main className="w-full" variants={revealContainer} initial="hidden" animate="show">
        <motion.div variants={revealItem}>
          <CalloutCard
            className="mb-6"
            title={
              <span className="flex items-center gap-3">
                <Trophy size={28} strokeWidth={2} />
                {c.sessionComplete}
              </span>
            }
            body={c.sessionBody}
            cta={
              <Button
                variant="secondary"
                onClick={onRestart}
                leadingIcon={<RotateCcw size={18} strokeWidth={2.5} />}
              >
                {c.startOver}
              </Button>
            }
          />
        </motion.div>

        <motion.div variants={revealItem}>
          <SurfacePanel className="mb-6" padding="lg">
            <div className="grid auto-rows-fr grid-cols-3 gap-6">
              <div className={`p-4 bg-surface-card ${UI_RADIUS.control} ${UI_INTERACTION.transition}`}>
                <Target size={24} className="mx-auto mb-2 text-primary" />
                <div className="font-display font-normal text-display-sm text-primary mb-1 text-center tabular-nums">
                  {reviewed}
                </div>
                <div className="text-body-sm font-medium text-muted text-center">{c.reviewed}</div>
              </div>
              <div className={`p-4 bg-surface-card ${UI_RADIUS.control} ${UI_INTERACTION.transition}`}>
                <CheckCircle size={24} className="mx-auto mb-2 text-success" />
                <div className="font-display font-normal text-display-sm text-success mb-1 text-center tabular-nums">
                  {known}
                </div>
                <div className="text-body-sm font-medium text-muted text-center">{c.known}</div>
              </div>
              <div className={`p-4 bg-surface-card ${UI_RADIUS.control} ${UI_INTERACTION.transition}`}>
                <XCircle size={24} className="mx-auto mb-2 text-error" />
                <div className="font-display font-normal text-display-sm text-error mb-1 text-center tabular-nums">
                  {unknown}
                </div>
                <div className="text-body-sm font-medium text-muted text-center">{c.toReview}</div>
              </div>
            </div>
          </SurfacePanel>
        </motion.div>

        <motion.div className="grid auto-rows-fr gap-3 sm:grid-cols-3" variants={revealItem}>
          <NavButton
            onClick={onChangeCategories}
            icon={<SlidersHorizontal size={24} strokeWidth={2.5} />}
            label={c.adjustFilters}
            color="muted"
            size="large"
            className="w-full"
          />
          <NavButton
            onClick={onOpenLibrary}
            icon={<BookOpen size={24} strokeWidth={2.5} />}
            label={c.viewLibrary}
            color="coral-strong"
            size="large"
            className="w-full"
          />
          <NavButton
            onClick={onOpenGrammarLab}
            icon={<FlaskConical size={24} strokeWidth={2.5} />}
            label={c.grammarLab}
            color="teal"
            size="large"
            className="w-full"
          />
        </motion.div>
      </motion.main>
    </AppScreen>
  );
}
