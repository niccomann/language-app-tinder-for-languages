import { BookOpen, FlaskConical, Puzzle } from 'lucide-react';
import { AppScreen, NavButton, ScreenHeader, SurfacePanel, UI_RADIUS } from './ui';
import { SentencePlacementChallenge } from './SentencePlacementChallenge';

interface GrammarPlacementAssessmentProps {
  onBack: () => void;
  onOpenLibrary: () => void;
  onOpenGrammarLab: () => void;
}

export function GrammarPlacementAssessment({
  onBack,
  onOpenLibrary,
  onOpenGrammarLab,
}: GrammarPlacementAssessmentProps) {
  return (
    <AppScreen width="full" contentClassName="min-h-dvh px-2 py-3 sm:px-4">
      <main className="mx-auto flex w-full max-w-[1800px] flex-col gap-3">
        <ScreenHeader
          title="Grammar Placement"
          subtitle="Build a full German sentence so the app can evaluate grammar, logic, and function-word control beyond single-word mastery."
          onBack={onBack}
          density="compact"
          actions={(
            <div className={`${UI_RADIUS.pill} bg-canvas px-3 py-2 text-sm font-semibold text-accent-teal border border-hairline`}>
              Sentence task
            </div>
          )}
        />

        <SurfacePanel padding="md" className="border-hairline bg-surface-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`${UI_RADIUS.touchIcon} flex h-11 w-11 shrink-0 items-center justify-center bg-canvas text-accent-teal border border-hairline`}>
                <Puzzle size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  Sentence-based level check
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-body">
                  Use nouns, verbs, articles, pronouns, adverbs, prepositions, and conjunctions. This is the first step toward a total placement score.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
              <NavButton onClick={onOpenLibrary} icon={<BookOpen size={17} />} label="Library" color="coral-strong" size="small" />
              <NavButton onClick={onOpenGrammarLab} icon={<FlaskConical size={17} />} label="Grammar Lab" color="teal" size="small" />
            </div>
          </div>
        </SurfacePanel>

        <div className="min-h-[680px] overflow-visible">
          <SentencePlacementChallenge />
        </div>
      </main>
    </AppScreen>
  );
}
