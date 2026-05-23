import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './contexts/UserContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { reportClientError } from './utils/clientError'

// Global handlers so unhandled async errors are at least logged. Without
// these, errors inside event handlers/effects that don't catch silently
// disappear and we can't tell from telemetry that something went wrong.
window.addEventListener('error', (event) => {
  reportClientError('window.onerror:', event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  reportClientError('unhandledrejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <UserProvider>
          <App />
        </UserProvider>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
)
