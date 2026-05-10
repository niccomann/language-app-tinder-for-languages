import { BookOpen, CheckCircle, FlaskConical, RotateCcw, SlidersHorizontal, Target, Trophy, XCircle } from 'lucide-react';
import { AppScreen, Button, CalloutCard, NavButton, SurfacePanel, UI_RADIUS } from './ui';

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
  return (
    <AppScreen width="compact" contentClassName="flex min-h-dvh items-center px-4 py-6">
      <main className="w-full">
        <CalloutCard
          className="mb-6"
          title={
            <span className="flex items-center gap-3">
              <Trophy size={28} strokeWidth={2} />
              Session Complete
            </span>
          }
          body="You've completed all flashcards in this session."
          cta={
            <Button
              variant="secondary"
              onClick={onRestart}
              leadingIcon={<RotateCcw size={18} strokeWidth={2.5} />}
            >
              Start Over
            </Button>
          }
        />

        <SurfacePanel className="mb-6" padding="lg">
          <div className="grid auto-rows-fr grid-cols-3 gap-6">
            <div className={`p-4 bg-surface-card ${UI_RADIUS.control}`}>
              <Target size={24} className="mx-auto mb-2 text-primary" />
              <div className="font-display font-normal text-display-sm text-primary mb-1 text-center">
                {progress.cards_reviewed}
              </div>
              <div className="text-body-sm font-medium text-muted text-center">Reviewed</div>
            </div>
            <div className={`p-4 bg-surface-card ${UI_RADIUS.control}`}>
              <CheckCircle size={24} className="mx-auto mb-2 text-success" />
              <div className="font-display font-normal text-display-sm text-success mb-1 text-center">
                {progress.known_count}
              </div>
              <div className="text-body-sm font-medium text-muted text-center">Known</div>
            </div>
            <div className={`p-4 bg-surface-card ${UI_RADIUS.control}`}>
              <XCircle size={24} className="mx-auto mb-2 text-error" />
              <div className="font-display font-normal text-display-sm text-error mb-1 text-center">
                {progress.unknown_count}
              </div>
              <div className="text-body-sm font-medium text-muted text-center">To Review</div>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid auto-rows-fr gap-3 sm:grid-cols-3">
          <NavButton
            onClick={onChangeCategories}
            icon={<SlidersHorizontal size={24} strokeWidth={2.5} />}
            label="Adjust Filters"
            color="muted"
            size="large"
            className="w-full"
          />
          <NavButton
            onClick={onOpenLibrary}
            icon={<BookOpen size={24} strokeWidth={2.5} />}
            label="View Library"
            color="coral-strong"
            size="large"
            className="w-full"
          />
          <NavButton
            onClick={onOpenGrammarLab}
            icon={<FlaskConical size={24} strokeWidth={2.5} />}
            label="Grammar Lab"
            color="teal"
            size="large"
            className="w-full"
          />
        </div>
      </main>
    </AppScreen>
  );
}
