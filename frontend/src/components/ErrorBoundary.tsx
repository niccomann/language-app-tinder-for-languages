import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportClientError } from '../utils/clientError';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional override of the recovery UI. */
  fallback?: (reset: () => void, error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary so a render-time throw (or a failed lazy chunk)
 * does not leave the user staring at a blank white screen.
 *
 * The default fallback offers a hard reload, which is the only reliable
 * recovery for chunk-load errors after a deploy (the user is running an
 * old index.html whose hashed chunks no longer exist).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError('ErrorBoundary caught:', { error, info });
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(this.reset, error);
    }

    const isChunkLoadError =
      /Loading chunk|Failed to fetch dynamically imported module|ChunkLoadError/i.test(
        error.message ?? '',
      );

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl" aria-hidden>
            🦉
          </div>
          <h1 className="font-display text-display-sm font-normal tracking-[-0.3px] text-ink">
            {isChunkLoadError
              ? 'Aggiornamento disponibile'
              : 'Qualcosa è andato storto'}
          </h1>
          <p className="mt-2 text-body-sm text-muted">
            {isChunkLoadError
              ? 'È stata rilasciata una nuova versione dell’app. Ricarica per continuare.'
              : 'Riprova oppure ricarica la pagina. Se il problema persiste, segnalalo dal menu feedback.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={this.reload}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
            >
              Ricarica
            </button>
            {!isChunkLoadError && (
              <button
                type="button"
                onClick={this.reset}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-canvas px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-card"
              >
                Riprova
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
