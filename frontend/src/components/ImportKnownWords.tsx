import { useRef, useState } from 'react';
import { ArrowLeft, Check, FileUp, Loader2, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useCopy, useTargetLanguage } from '../i18n/languageContext';
import { formatCopy } from '../i18n/staticCopy';
import { UI_INTERACTION, UI_RADIUS } from './ui';
import { reportClientError } from '../utils/clientError';
import type { ImportKnownResult } from '../types';

export function ImportKnownWords({ onClose }: { onClose: () => void }) {
  const c = useCopy().importKnown;
  const language = useTargetLanguage();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportKnownResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const content = await file.text();
      setText((prev) => (prev.trim() ? `${prev}\n${content}` : content));
    } catch (err) {
      reportClientError('read import file failed', err);
    }
  };

  const analyze = async () => {
    if (!text.trim()) {
      setError(c.emptyError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResult(await api.importKnownWords(language, text));
    } catch (err) {
      reportClientError('import known words failed', err);
      setError(c.emptyError);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setText('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-canvas">
      <div className="mx-auto flex max-w-[480px] flex-col gap-4 px-4 py-5">
        <button
          type="button"
          onClick={onClose}
          aria-label={c.close}
          className={`inline-flex h-10 w-10 items-center justify-center ${UI_RADIUS.control} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
        >
          <ArrowLeft size={18} />
        </button>

        <div>
          <h1 className="font-display text-display-sm font-normal tracking-[-0.3px] text-ink">{c.title}</h1>
          <p className="mt-2 text-body-sm font-medium text-muted">{c.body}</p>
        </div>

        {result ? (
          <div className={`${UI_RADIUS.surface} border border-hairline bg-surface-soft p-5`}>
            <div className="flex items-center gap-2 text-success">
              <Check size={20} />
              <h2 className="text-title-sm font-semibold text-ink">{c.resultHeading}</h2>
            </div>
            <p className="mt-3 text-body-md font-semibold text-ink">
              {formatCopy(c.resultAdded, { added: result.added })}
            </p>
            <p className="mt-1 text-body-sm text-muted">
              {formatCopy(c.resultMatched, { matched: result.matched, submitted: result.submitted })}
              {result.already_known > 0 ? ` · ${formatCopy(c.resultAlready, { count: result.already_known })}` : ''}
            </p>
            {result.unmatched_words.length > 0 ? (
              <div className="mt-3">
                <p className="text-caption font-semibold text-muted">{c.unmatchedHeading}</p>
                <p className="mt-1 text-caption text-muted-soft">{result.unmatched_words.join(', ')}</p>
              </div>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={reset}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} flex-1 border border-hairline bg-canvas px-4 py-3 text-body-sm font-semibold text-ink hover:bg-surface-card`}
              >
                {c.importMore}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} flex-1 bg-primary px-4 py-3 text-body-sm font-semibold text-on-primary hover:bg-primary-active`}
              >
                {c.close}
              </button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={c.placeholder}
              rows={9}
              className={`${UI_RADIUS.control} w-full resize-y border border-hairline bg-canvas p-3 text-body-sm text-ink placeholder:text-muted-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`}
            />
            <div className="flex items-center justify-between gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`inline-flex items-center gap-2 ${UI_RADIUS.control} border border-hairline bg-canvas px-3 py-2 text-caption font-semibold text-muted ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
              >
                <FileUp size={15} />
                {c.fileLabel}
              </button>
            </div>
            {error ? <p className="text-caption font-medium text-error">{error}</p> : null}
            <button
              type="button"
              onClick={analyze}
              disabled={busy}
              className={`inline-flex min-h-12 items-center justify-center gap-2 ${UI_RADIUS.control} bg-primary px-5 py-3 text-button font-semibold text-on-primary ${UI_INTERACTION.fastTransition} hover:bg-primary-active disabled:opacity-60`}
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {busy ? c.analyzing : c.analyze}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
