import { useState, type FormEvent, type ReactNode } from 'react';
import { MessageSquarePlus, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { api } from '../services/api';
import { Button, UI_INTERACTION, UI_RADIUS } from './ui';

interface FeedbackButtonProps {
  triggerClassName?: string;
  triggerLabel?: string;
  triggerIcon?: ReactNode;
}

type Sentiment = 'like' | 'dislike' | 'neutral';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; id: string }
  | { kind: 'error'; message: string };

export function FeedbackButton({
  triggerClassName,
  triggerLabel,
  triggerIcon,
}: FeedbackButtonProps = {}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const reset = () => {
    setMessage('');
    setSentiment('neutral');
    setStatus({ kind: 'idle' });
  };

  const closeModal = () => {
    setOpen(false);
    setTimeout(reset, 200);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.kind === 'sending') return;
    const trimmed = message.trim();
    if (!trimmed) return;
    setStatus({ kind: 'sending' });
    try {
      const res = await api.submitFeedback({
        message: trimmed,
        sentiment,
        source_url: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      setStatus({ kind: 'success', id: res.id });
      setMessage('');
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unexpected error';
      setStatus({ kind: 'error', message: detail });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName
          ?? `flex min-h-10 items-center gap-2 px-3 py-2 ${UI_RADIUS.control} font-sans font-medium ${UI_INTERACTION.fastTransition} bg-canvas text-ink border border-hairline hover:bg-surface-card`
        }
        aria-label="Open tester feedback form"
      >
        {triggerIcon ?? <MessageSquarePlus size={18} />}
        <span className={triggerLabel ? '' : 'hidden text-nav-link sm:inline'}>
          {triggerLabel ?? 'Utente Tester'}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Tester feedback form"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={`relative w-full max-w-lg ${UI_RADIUS.surface} border border-hairline bg-canvas p-6`}>
            <button
              type="button"
              onClick={closeModal}
              className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center ${UI_RADIUS.control} text-muted hover:bg-surface-card hover:text-ink`}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <p className="text-caption-uppercase tracking-[1.5px] font-medium uppercase text-primary">
              Tester feedback
            </p>
            <h2 className="mt-2 font-display font-normal text-display-sm tracking-[-0.3px] text-ink">
              Cosa ne pensi?
            </h2>
            <p className="mt-2 text-body-sm text-muted">
              Lascia un commento sul design, una feature che ti piace o non ti piace.
              Verrà salvato persistentemente per chi sviluppa l'app.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="flex gap-2">
                <SentimentChip
                  label="Mi piace"
                  icon={<ThumbsUp size={16} />}
                  active={sentiment === 'like'}
                  onClick={() => setSentiment('like')}
                  activeClass="bg-success text-ink border-transparent"
                />
                <SentimentChip
                  label="Non mi piace"
                  icon={<ThumbsDown size={16} />}
                  active={sentiment === 'dislike'}
                  onClick={() => setSentiment('dislike')}
                  activeClass="bg-error text-on-primary border-transparent"
                />
                <SentimentChip
                  label="Neutro"
                  active={sentiment === 'neutral'}
                  onClick={() => setSentiment('neutral')}
                  activeClass="bg-surface-cream-strong text-ink border-transparent"
                />
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Scrivi qui il tuo commento…"
                rows={5}
                maxLength={4000}
                className={`w-full ${UI_RADIUS.control} border border-hairline bg-canvas px-3.5 py-3 text-body-md text-ink placeholder:text-muted-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
              />

              {status.kind === 'success' && (
                <p className="text-body-sm font-medium text-success">
                  Grazie! Il tuo commento è stato salvato.
                </p>
              )}
              {status.kind === 'error' && (
                <p className="text-body-sm font-medium text-error">
                  Errore nel salvataggio: {status.message}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="secondary" type="button" onClick={closeModal}>
                  Chiudi
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={!message.trim() || status.kind === 'sending'}
                >
                  {status.kind === 'sending' ? 'Invio…' : 'Invia commento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SentimentChip({
  label,
  icon,
  active,
  onClick,
  activeClass,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  activeClass: string;
}) {
  const base = `inline-flex items-center gap-1.5 px-3 py-1.5 ${UI_RADIUS.control} text-caption font-medium border ${UI_INTERACTION.fastTransition}`;
  const cls = active
    ? `${base} ${activeClass}`
    : `${base} bg-canvas text-muted border-hairline hover:bg-surface-card hover:text-ink`;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {label}
    </button>
  );
}
