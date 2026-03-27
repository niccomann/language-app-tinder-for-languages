/**
 * LearningPage - Main flashcard learning interface
 * Route: /learn, /learn/video
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LearningScreen } from '../components/LearningScreen';
import { LoadingSpinner, ErrorState } from '../components/ui';
import { useCategories } from '../hooks/useCategories';
import { useLearningSession } from '../hooks/useLearningSession';

interface LearningPageProps {
  showVideo?: boolean;
}

export const LearningPage = ({ showVideo }: LearningPageProps) => {
  const navigate = useNavigate();
  const categories = useCategories();
  const session = useLearningSession();

  useEffect(() => {
    if (categories.selectedCategories.length > 0 && session.flashcards.length === 0 && !session.loading) {
      session.loadFlashcards(categories.selectedCategories);
    }
  }, [categories.selectedCategories]);

  useEffect(() => {
    if (categories.selectedCategories.length === 0) {
      navigate('/');
    }
  }, [categories.selectedCategories, navigate]);

  useEffect(() => {
    if (session.isComplete) {
      navigate('/completion');
    }
  }, [session.isComplete, navigate]);

  if (session.loading) {
    return <LoadingSpinner message="Loading flashcards..." />;
  }

  if (session.error) {
    return (
      <ErrorState
        title="Connection Error"
        message={session.error}
        onRetry={() => session.loadFlashcards(categories.selectedCategories)}
      />
    );
  }

  if (!session.currentCard) {
    return <LoadingSpinner message="Preparing cards..." />;
  }

  return (
    <LearningScreen
      currentCard={session.currentCard}
      nextCard={session.nextCard}
      progress={session.progress}
      totalCards={session.flashcards.length}
      onSwipe={session.handleSwipe}
      onBackToCategories={() => {
        session.reset();
        navigate('/');
      }}
      onOpenLibrary={() => navigate('/library')}
      onOpenGrammarLab={() => navigate('/grammar')}
      onGenerateVideo={session.generateSoraVideo}
      youtubeVideo={session.youtubeVideo}
      onCloseVideoModal={session.closeVideoModal}
      showVideoSourceSelector={session.showVideoSourceSelector}
      currentWord={session.currentWord}
      onSelectYouTube={session.selectYouTubeVideos}
      onSelectAI={session.selectAIVideos}
      onCloseVideoSourceSelector={session.closeVideoSourceSelector}
      showReelFeed={session.showReelFeed}
      onCloseReelFeed={session.closeReelFeed}
      onShowConfirmation={session.showLearnedWordConfirmation}
      showAIReelFeed={session.showAIReelFeed}
      onCloseAIReelFeed={session.closeAIReelFeed}
      showLearnedConfirmation={session.showLearnedConfirmation}
      onConfirmWordLearned={session.confirmWordLearned}
      onSkipWordConfirmation={session.skipWordConfirmation}
      showSoraModal={session.showSoraModal}
      onCloseSoraModal={session.closeSoraModal}
      videoJobId={session.videoJobId}
      trackingActive={session.trackingActive}
      interactionCount={session.interactionCount}
      minimumInteractions={session.MINIMUM_INTERACTIONS}
      onStartTracking={session.startTracking}
      onStopTracking={session.stopTracking}
      sessionUuid={session.sessionUuid}
    />
  );
};
