import { useEffect } from 'react';
import { CardStack } from './components/CardStack';

function App() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        const leftButton = document.querySelector('[aria-label="Don\'t know"]') as HTMLButtonElement;
        leftButton?.click();
      } else if (event.key === 'ArrowRight') {
        const rightButton = document.querySelector('[aria-label="Know"]') as HTMLButtonElement;
        rightButton?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <CardStack />
    </div>
  );
}

export default App;
