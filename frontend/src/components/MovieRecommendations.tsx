import { useEffect, useState } from 'react';
import { Film, Info, Loader2, RotateCw } from 'lucide-react';
import { api } from '../services/api';
import type { MovieRecommendation } from '../types';
import { useCopy, useTargetLanguage } from '../i18n/languageContext';
import { reportClientError } from '../utils/clientError';
import { AppScreen, ScreenHeader, UI_INTERACTION, UI_RADIUS } from './ui';

const RECOMMENDATION_LIMIT = 20;

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; movies: MovieRecommendation[] };

interface MovieRecommendationsProps {
  onBack: () => void;
}

export function MovieRecommendations({ onBack }: MovieRecommendationsProps) {
  const copy = useCopy().movieRecommendations;
  const language = useTargetLanguage();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    api
      .getMovieRecommendations(language, RECOMMENDATION_LIMIT)
      .then((movies) => {
        if (!cancelled) setState({ status: 'loaded', movies });
      })
      .catch((error) => {
        if (cancelled) return;
        reportClientError('movie recommendations load failed', error);
        setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [language, reloadToken]);

  return (
    <AppScreen
      width="wide"
      contentClassName="flex min-h-dvh flex-col gap-5 px-4 pb-32 pt-5 sm:px-6 sm:pt-6 lg:px-8"
    >
      <ScreenHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<Film size={24} aria-hidden="true" />}
        onBack={onBack}
      />

      <AlgorithmGuide guide={copy.algorithmGuide} />

      {state.status === 'loading' ? (
        <LoadingState message={copy.loading} />
      ) : state.status === 'error' ? (
        <ErrorPanel
          title={copy.errorTitle}
          retryLabel={copy.errorRetry}
          onRetry={() => setReloadToken((token) => token + 1)}
        />
      ) : state.movies.length === 0 ? (
        <EmptyState message={copy.empty} />
      ) : (
        <ul className="grid gap-3 sm:gap-4" aria-label={copy.title}>
          {state.movies.map((movie) => (
            <li key={movie.imdb_id}>
              <MovieCard movie={movie} copy={copy} />
            </li>
          ))}
        </ul>
      )}
    </AppScreen>
  );
}

function AlgorithmGuide({
  guide,
}: {
  guide: ReturnType<typeof useCopy>['movieRecommendations']['algorithmGuide'];
}) {
  return (
    <section
      aria-labelledby="movie-algorithm-guide-title"
      className={`${UI_RADIUS.control} border border-hairline bg-surface-soft p-3 sm:p-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} bg-canvas text-primary`}>
          <Info size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="movie-algorithm-guide-title" className="text-title-sm font-semibold text-ink">
            {guide.title}
          </h2>
          <p className="mt-1 max-w-3xl text-body-sm leading-6 text-muted">
            {guide.summary}
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {guide.points.map((point) => (
              <div key={point.label} className={`${UI_RADIUS.control} bg-canvas px-3 py-2`}>
                <dt className="text-caption font-semibold text-body-strong">{point.label}</dt>
                <dd className="mt-1 text-caption leading-5 text-muted">{point.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[45dvh] flex-col items-center justify-center gap-3 text-center text-muted"
    >
      <Loader2 size={28} className="animate-spin text-primary" aria-hidden="true" />
      <p className="max-w-sm text-body-md font-medium">{message}</p>
    </div>
  );
}

function ErrorPanel({
  title,
  retryLabel,
  onRetry,
}: {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[45dvh] flex-col items-center justify-center gap-4 text-center"
    >
      <div className={`flex h-12 w-12 items-center justify-center ${UI_RADIUS.touchIcon} bg-surface-soft text-error`}>
        <Film size={22} aria-hidden="true" />
      </div>
      <h2 className="max-w-sm text-title-md font-semibold text-ink">{title}</h2>
      <button
        type="button"
        onClick={onRetry}
        className={`inline-flex min-h-10 items-center justify-center gap-2 ${UI_RADIUS.control} bg-primary px-4 text-button font-semibold text-on-primary ${UI_INTERACTION.fastTransition} hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas`}
      >
        <RotateCw size={16} aria-hidden="true" />
        {retryLabel}
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[45dvh] flex-col items-center justify-center gap-3 text-center">
      <div className={`flex h-12 w-12 items-center justify-center ${UI_RADIUS.touchIcon} bg-surface-soft text-muted`}>
        <Film size={22} aria-hidden="true" />
      </div>
      <p className="max-w-md text-body-md font-medium leading-7 text-muted">{message}</p>
    </div>
  );
}

function MovieCard({
  movie,
  copy,
}: {
  movie: MovieRecommendation;
  copy: ReturnType<typeof useCopy>['movieRecommendations'];
}) {
  return (
    <article
      className={`${UI_RADIUS.control} border border-hairline bg-canvas p-3 ${UI_INTERACTION.fastTransition} sm:p-4`}
    >
      <div className="flex min-w-0 gap-3 sm:gap-4">
        <MoviePoster movie={movie} noPoster={copy.noPoster} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="break-words text-title-md font-semibold leading-snug text-ink">{movie.title}</h2>
              {movie.year ? <p className="mt-1 text-caption font-medium text-muted">{movie.year}</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Metric label={copy.score} value={formatScore(movie.score)} />
              <Metric
                label={copy.coverageCount}
                value={`${movie.shared_vocab_count} / ${movie.subtitle_unique_word_count}`}
              />
              <Metric label={copy.uniqueSubtitleWords} value={movie.subtitle_unique_word_count.toString()} />
              <Metric label={copy.youKnow} value={movie.shared_vocab_count.toString()} />
            </div>
          </div>

          {movie.sample_known_words.length > 0 ? (
            <div className="mt-4">
              <p className="text-caption font-semibold text-muted">{copy.youKnow}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {movie.sample_known_words.map((word) => (
                  <li
                    key={word}
                    className={`max-w-full ${UI_RADIUS.control} border border-hairline bg-surface-soft px-2.5 py-1 text-caption font-medium text-body-strong`}
                  >
                    <span className="block max-w-full break-all">{word}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${UI_RADIUS.control} bg-surface-soft px-3 py-2 text-right`}>
      <p className="text-caption font-medium text-muted">{label.replace(/:$/, '')}</p>
      <p className="mt-0.5 text-title-sm font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function MoviePoster({
  movie,
  noPoster,
}: {
  movie: MovieRecommendation;
  noPoster: string;
}) {
  const [failed, setFailed] = useState(false);
  const posterUrl = failed ? null : getOmdbPosterUrl(movie.imdb_id);

  if (posterUrl) {
    return (
      <img
        src={posterUrl}
        alt={`${movie.title} poster`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`aspect-[2/3] w-20 shrink-0 object-cover ${UI_RADIUS.control} bg-surface-soft sm:w-24`}
      />
    );
  }

  return (
    <div
      aria-label={`${movie.title}: ${noPoster}`}
      className={`flex aspect-[2/3] w-20 shrink-0 flex-col items-center justify-center gap-2 bg-surface-soft p-2 text-center text-muted ${UI_RADIUS.control} sm:w-24`}
    >
      <Film size={20} aria-hidden="true" />
      <span className="max-w-full break-words text-caption font-medium leading-4">{noPoster}</span>
    </div>
  );
}

function getOmdbPosterUrl(imdbId: string) {
  const key = (import.meta.env.VITE_OMDB_KEY as string | undefined)?.trim();
  if (!key) return null;
  return `https://img.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(key)}`;
}

function formatScore(score: number) {
  const percent = score <= 1 ? score * 100 : score;
  if (percent > 0 && percent < 1) {
    return `${percent.toFixed(2)}%`;
  }
  if (percent > 0 && percent < 10) {
    return `${percent.toFixed(1)}%`;
  }
  return `${Math.round(percent)}%`;
}
