import { BookOpen, CheckCircle, FlaskConical, RotateCcw, SlidersHorizontal, Target, Trophy, XCircle } from 'lucide-react';
import { AppScreen, ScreenHeader, SurfacePanel, UI_INTERACTION, UI_RADIUS } from './ui';

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
  const actionBase = `flex min-h-14 items-center justify-center gap-3 ${UI_RADIUS.control} px-5 py-4 text-base font-extrabold ${UI_INTERACTION.transition} ${UI_INTERACTION.lift} ${UI_INTERACTION.press}`;
  const secondaryActionBase = `${actionBase} border-2 bg-white shadow-lg ${UI_INTERACTION.floatingHover}`;

  return (
    <AppScreen width="compact" contentClassName="flex min-h-dvh items-center px-4 py-6">
      <main className="w-full">
        <ScreenHeader
          title="Session Complete"
          subtitle="You've completed all flashcards in this session."
          icon={<Trophy size={30} />}
          align="center"
          className="mb-6 justify-center"
        />

        <SurfacePanel className="mb-6" padding="lg">
          <div className="grid grid-cols-3 gap-6">
            <div className={`p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 ${UI_RADIUS.control}`}>
              <Target size={24} className="mx-auto mb-2 text-indigo-600" />
              <div className="text-4xl font-extrabold text-indigo-600 mb-1 text-center">
                {progress.cards_reviewed}
              </div>
              <div className="text-sm font-semibold text-gray-700 text-center">Reviewed</div>
            </div>
            <div className={`p-4 bg-gradient-to-br from-green-50 to-green-100 ${UI_RADIUS.control}`}>
              <CheckCircle size={24} className="mx-auto mb-2 text-green-600" />
              <div className="text-4xl font-extrabold text-green-600 mb-1 text-center">
                {progress.known_count}
              </div>
              <div className="text-sm font-semibold text-gray-700 text-center">Known</div>
            </div>
            <div className={`p-4 bg-gradient-to-br from-red-50 to-red-100 ${UI_RADIUS.control}`}>
              <XCircle size={24} className="mx-auto mb-2 text-red-600" />
              <div className="text-4xl font-extrabold text-red-600 mb-1 text-center">
                {progress.unknown_count}
              </div>
              <div className="text-sm font-semibold text-gray-700 text-center">To Review</div>
            </div>
          </div>
        </SurfacePanel>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={onRestart}
            className={`${actionBase} bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl hover:shadow-2xl`}
          >
            <RotateCcw size={24} strokeWidth={2.5} />
            <span>Start Over</span>
          </button>
          <button
            onClick={onChangeCategories}
            className={`${secondaryActionBase} border-gray-300 text-gray-700 hover:border-indigo-400 hover:text-indigo-600`}
          >
            <SlidersHorizontal size={24} strokeWidth={2.5} />
            <span>Adjust Filters</span>
          </button>
          <button
            onClick={onOpenLibrary}
            className={`${secondaryActionBase} border-purple-300 text-purple-700 hover:border-purple-400 hover:text-purple-600`}
          >
            <BookOpen size={24} strokeWidth={2.5} />
            <span>View Library</span>
          </button>
          <button
            onClick={onOpenGrammarLab}
            className={`${secondaryActionBase} border-blue-300 text-blue-700 hover:border-blue-400 hover:text-blue-600`}
          >
            <FlaskConical size={24} strokeWidth={2.5} />
            <span>Grammar Lab</span>
          </button>
        </div>
      </main>
    </AppScreen>
  );
}
