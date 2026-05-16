import { useState, useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, MessageSquarePlus, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { api } from '../services/api';
import { Button, UI_INTERACTION, UI_RADIUS } from './ui';
import { useCopy } from '../i18n/languageContext';

interface FeedbackButtonProps {
  triggerClassName?: string;
  triggerLabel?: string;
  triggerIcon?: ReactNode;
}

type Sentiment = 'like' | 'dislike' | 'neutral';
type Profession = 'artist' | 'humanist' | 'scientific' | 'technical' | 'student' | 'other';
type Gender = 'woman' | 'man' | 'other' | 'undisclosed';
type NativeLanguage = 'it' | 'en' | 'es' | 'de' | 'fr' | 'pt' | 'other';
type ProficiencyLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'none';

interface Persona {
  nickname: string;
  age: string;
  profession: Profession | '';
  gender: Gender | '';
  nativeLanguage: NativeLanguage | '';
  targetLevel: ProficiencyLevel | '';
  learningMotivation: string;
}

const EMPTY_PERSONA: Persona = {
  nickname: '',
  age: '',
  profession: '',
  gender: '',
  nativeLanguage: '',
  targetLevel: '',
  learningMotivation: '',
};

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; id: string }
  | { kind: 'error'; message: string };

const PROFESSION_OPTIONS: Profession[] = ['artist', 'humanist', 'scientific', 'technical', 'student', 'other'];
const GENDER_OPTIONS: Gender[] = ['woman', 'man', 'other', 'undisclosed'];
const NATIVE_LANGUAGE_OPTIONS: NativeLanguage[] = ['it', 'en', 'es', 'de', 'fr', 'pt', 'other'];
const PROFICIENCY_LEVEL_OPTIONS: ProficiencyLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'none'];

const HEADING_CLASS = 'font-display font-normal text-display-sm tracking-[-0.3px] text-ink';
const FIELD_CLASS = `w-full ${UI_RADIUS.control} border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`;
const INPUT_CLASS = `${FIELD_CLASS} placeholder:text-muted-soft`;
const LABEL_CLASS = 'block text-caption font-medium text-body-strong mb-1';

export function FeedbackButton({
  triggerClassName,
  triggerLabel,
  triggerIcon,
}: FeedbackButtonProps = {}) {
  const copy = useCopy();
  const f = copy.feedbackForm;
  const defaultLabel = copy.feedbackButton.defaultUser;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [message, setMessage] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');
  const [persona, setPersona] = useState<Persona>(EMPTY_PERSONA);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const reset = () => {
    setStep(1);
    setMessage('');
    setSentiment('neutral');
    setPersona(EMPTY_PERSONA);
    setStatus({ kind: 'idle' });
  };

  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const closeModal = () => {
    setOpen(false);
    if (resetTimeoutRef.current !== null) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      reset();
      resetTimeoutRef.current = null;
    }, 200);
  };

  const submitNow = async () => {
    if (status.kind === 'sending') return;
    const trimmed = message.trim();
    if (!trimmed) return;
    setStatus({ kind: 'sending' });
    try {
      const ageNumber = persona.age.trim() ? Number(persona.age) : undefined;
      const res = await api.submitFeedback({
        message: trimmed,
        sentiment,
        source_url: typeof window !== 'undefined' ? window.location.href : undefined,
        nickname: persona.nickname.trim() || undefined,
        age: Number.isFinite(ageNumber) ? (ageNumber as number) : undefined,
        profession: persona.profession || undefined,
        gender: persona.gender || undefined,
        native_language: persona.nativeLanguage || undefined,
        target_level: persona.targetLevel || undefined,
        learning_motivation: persona.learningMotivation.trim() || undefined,
      });
      setStatus({ kind: 'success', id: res.id });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unexpected error';
      setStatus({ kind: 'error', message: detail });
    }
  };

  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStep(2);
  };

  const handleStep2Submit = (e: FormEvent) => {
    e.preventDefault();
    submitNow();
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
        aria-label={f.openAria}
      >
        {triggerIcon ?? <MessageSquarePlus size={18} />}
        <span className={triggerLabel ? '' : 'hidden text-nav-link sm:inline'}>
          {triggerLabel ?? defaultLabel}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label={f.modalAria}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto ${UI_RADIUS.surface} border border-hairline bg-canvas p-6`}>
            <button
              type="button"
              onClick={closeModal}
              className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center ${UI_RADIUS.control} text-muted hover:bg-surface-card hover:text-ink`}
              aria-label={f.closeAria}
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 text-caption-uppercase tracking-[1.5px] font-medium uppercase text-primary">
              <span>{f.eyebrow}</span>
              <span className="text-muted-soft">·</span>
              <span className="text-muted">{step} / 2</span>
            </div>

            {status.kind === 'success' ? (
              <>
                <h2 className={`mt-2 ${HEADING_CLASS}`}>{f.title}</h2>
                <p className="mt-4 text-body-sm font-medium text-success">{f.successMessage}</p>
                <div className="mt-5 flex justify-end">
                  <Button variant="primary" type="button" onClick={closeModal}>
                    {f.closeButton}
                  </Button>
                </div>
              </>
            ) : step === 1 ? (
              <form onSubmit={handleStep1Submit} className="mt-3 flex flex-col gap-4">
                <h2 className={HEADING_CLASS}>{f.title}</h2>

                <div className="flex gap-2">
                  <SentimentChip
                    label={f.like}
                    icon={<ThumbsUp size={16} />}
                    active={sentiment === 'like'}
                    onClick={() => setSentiment('like')}
                    activeClass="bg-success text-ink border-transparent"
                  />
                  <SentimentChip
                    label={f.dislike}
                    icon={<ThumbsDown size={16} />}
                    active={sentiment === 'dislike'}
                    onClick={() => setSentiment('dislike')}
                    activeClass="bg-error text-on-primary border-transparent"
                  />
                  <SentimentChip
                    label={f.neutral}
                    active={sentiment === 'neutral'}
                    onClick={() => setSentiment('neutral')}
                    activeClass="bg-surface-cream-strong text-ink border-transparent"
                  />
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={f.placeholder}
                  rows={5}
                  maxLength={4000}
                  autoFocus
                  className={`w-full ${UI_RADIUS.control} border border-hairline bg-canvas px-3.5 py-3 text-body-md text-ink placeholder:text-muted-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="secondary" type="button" onClick={closeModal}>
                    {f.closeButton}
                  </Button>
                  <Button variant="primary" type="submit" disabled={!message.trim()}>
                    <span className="inline-flex items-center gap-1.5">
                      {f.continueButton}
                      <ArrowRight size={14} />
                    </span>
                  </Button>
                </div>
              </form>
            ) : (
              <PersonaForm
                persona={persona}
                onChange={(patch) => setPersona((current) => ({ ...current, ...patch }))}
                copy={f}
                sending={status.kind === 'sending'}
                error={status.kind === 'error' ? status.message : null}
                onBack={() => setStep(1)}
                onSkip={submitNow}
                onSubmit={handleStep2Submit}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PersonaForm({
  persona,
  onChange,
  copy: f,
  sending,
  error,
  onBack,
  onSkip,
  onSubmit,
}: {
  persona: Persona;
  onChange: (patch: Partial<Persona>) => void;
  copy: ReturnType<typeof useCopy>['feedbackForm'];
  sending: boolean;
  error: string | null;
  onBack: () => void;
  onSkip: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const p = f.persona;
  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-4">
      <h2 className={HEADING_CLASS}>{p.sectionTitle}</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASS} htmlFor="fb-nickname">{p.nicknameLabel}</label>
          <input
            id="fb-nickname"
            type="text"
            value={persona.nickname}
            onChange={(e) => onChange({ nickname: e.target.value })}
            placeholder={p.nicknamePlaceholder}
            maxLength={64}
            className={INPUT_CLASS}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASS} htmlFor="fb-age">{p.ageLabel}</label>
          <input
            id="fb-age"
            type="number"
            inputMode="numeric"
            min={5}
            max={120}
            value={persona.age}
            onChange={(e) => onChange({ age: e.target.value })}
            placeholder={p.agePlaceholder}
            className={INPUT_CLASS}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASS} htmlFor="fb-profession">{p.professionLabel}</label>
          <select
            id="fb-profession"
            value={persona.profession}
            onChange={(e) => onChange({ profession: e.target.value as Profession | '' })}
            className={FIELD_CLASS}
          >
            <option value="">{p.professionPlaceholder}</option>
            {PROFESSION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{p.professionOptions[opt]}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASS} htmlFor="fb-gender">{p.genderLabel}</label>
          <select
            id="fb-gender"
            value={persona.gender}
            onChange={(e) => onChange({ gender: e.target.value as Gender | '' })}
            className={FIELD_CLASS}
          >
            <option value="">{p.genderPlaceholder}</option>
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{p.genderOptions[opt]}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASS} htmlFor="fb-native">{p.nativeLanguageLabel}</label>
          <select
            id="fb-native"
            value={persona.nativeLanguage}
            onChange={(e) => onChange({ nativeLanguage: e.target.value as NativeLanguage | '' })}
            className={FIELD_CLASS}
          >
            <option value="">{p.nativeLanguagePlaceholder}</option>
            {NATIVE_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{p.nativeLanguageOptions[opt]}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={LABEL_CLASS} htmlFor="fb-target-level">{p.targetLevelLabel}</label>
          <select
            id="fb-target-level"
            value={persona.targetLevel}
            onChange={(e) => onChange({ targetLevel: e.target.value as ProficiencyLevel | '' })}
            className={FIELD_CLASS}
          >
            <option value="">{p.targetLevelPlaceholder}</option>
            {PROFICIENCY_LEVEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{p.targetLevelOptions[opt]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="fb-motivation">{p.learningMotivationLabel}</label>
        <textarea
          id="fb-motivation"
          value={persona.learningMotivation}
          onChange={(e) => onChange({ learningMotivation: e.target.value })}
          placeholder={p.learningMotivationPlaceholder}
          rows={3}
          maxLength={500}
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      {error && (
        <p className="text-body-sm font-medium text-error">
          {f.errorMessagePrefix}: {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" type="button" onClick={onBack}>
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft size={14} />
            {f.backButton}
          </span>
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={onSkip} disabled={sending}>
            {f.skipButton}
          </Button>
          <Button variant="primary" type="submit" disabled={sending}>
            {sending ? f.sendingButton : f.submitButton}
          </Button>
        </div>
      </div>
    </form>
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
