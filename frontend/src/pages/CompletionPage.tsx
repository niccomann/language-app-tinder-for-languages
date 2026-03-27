/**
 * CompletionPage - Session completion with stats
 * Route: /completion
 */
import { useNavigate } from 'react-router-dom';
import { CompletionScreen } from '../components/CompletionScreen';
import { useLearningSession } from '../hooks/useLearningSession';

export const CompletionPage = () => {
  const navigate = useNavigate();
  const session = useLearningSession();

  return (
    <CompletionScreen
      progress={session.progress}
      sessionUuid={session.sessionUuid}
      onRestart={() => {
        session.reset();
        navigate('/learn');
      }}
      onChangeCategories={() => {
        session.reset();
        navigate('/');
      }}
      onOpenLibrary={() => navigate('/library')}
      onOpenGrammarLab={() => navigate('/grammar')}
    />
  );
};
