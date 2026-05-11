import { useState, useEffect } from 'react';
import { X, BookOpen, History, AlertTriangle, MessageCircle, Link2, MapPin, Volume2, Database } from 'lucide-react';
import { api } from '../services/api';
import type { FlashcardDetail, WordDbRow } from '../types';
import { isFeatureEnabled } from '../config/appMode';
import { UI_RADIUS } from './ui';
import type { LibraryDetailTab } from '../routes/appRoutes';
import { reportClientError } from '../utils/clientError';
import {
  CEFR_BADGE_CLASSES as CEFR_COLORS,
  CONFUSION_LEVEL_CLASSES as CONFUSION_COLORS,
  GENDER_BADGE_META as GENDER_LABELS,
} from '../utils/wordDisplayMeta';
import { useCopy, useTargetLanguage } from '../i18n/languageContext';

interface WordDetailModalProps {
  wordId: number;
  initialTab?: LibraryDetailTab;
  onTabChange?: (tab: LibraryDetailTab) => void;
  onClose: () => void;
}

const formatDbValue = (value: unknown) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const formatDbLabel = (key: string) => key.replace(/_/g, ' ');

const isEmptyDbValue = (value: unknown) => value === null || value === undefined || value === '';

const DbField = ({ name, value }: { name: string; value: unknown }) => (
  <div className={`${UI_RADIUS.control} border border-hairline bg-canvas p-3 min-w-0`}>
    <p className="text-[11px] font-semibold uppercase text-muted mb-1 break-words">
      {name}
    </p>
    <pre className={`whitespace-pre-wrap break-words text-sm font-mono leading-relaxed ${isEmptyDbValue(value) ? 'text-muted' : 'text-ink'}`}>
      {formatDbValue(value)}
    </pre>
  </div>
);

export function WordDetailModal({ wordId, initialTab = 'overview', onTabChange, onClose }: WordDetailModalProps) {
  const language = useTargetLanguage();
  const copy = useCopy();
  const wd = copy.wordDetail;
  const [word, setWord] = useState<FlashcardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryDetailTab>(initialTab);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dbRow, setDbRow] = useState<WordDbRow | null>(null);
  const [dbRowLoading, setDbRowLoading] = useState(false);
  const [dbRowError, setDbRowError] = useState<string | null>(null);

  useEffect(() => {
    const loadWordDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getWordDetail(wordId);
        setWord(data);
      } catch (err) {
        setError('Failed to load word details');
        reportClientError('Failed to load word details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWordDetail();
  }, [wordId]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, wordId]);

  useEffect(() => {
    if (activeTab !== 'db_row' || dbRow || dbRowLoading) return;

    const loadDbRow = async () => {
      try {
        setDbRowLoading(true);
        setDbRowError(null);
        const data = await api.getWordDbRow(wordId);
        setDbRow(data);
      } catch (err) {
        setDbRowError('Failed to load database row');
        reportClientError('Failed to load database row:', err);
      } finally {
        setDbRowLoading(false);
      }
    };

    loadDbRow();
  }, [activeTab, dbRow, dbRowLoading, wordId]);

  const handlePlayAudio = async () => {
    if (!word || !isFeatureEnabled('textToSpeech') || isPlaying) return;

    try {
      setIsPlaying(true);
      const response = await api.generateSpeech(word.word, language);
      const audio = new Audio(`data:audio/mp3;base64,${response.audio_base64}`);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (err) {
      reportClientError('Failed to play audio:', err);
      setIsPlaying(false);
    }
  };

  const tabs: { id: LibraryDetailTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BookOpen size={16} /> },
    { id: 'examples', label: 'Examples', icon: <MessageCircle size={16} />, count: word?.examples.length },
    { id: 'etymology', label: 'Etymology', icon: <History size={16} />, count: word?.etymologies.length },
    { id: 'false_friends', label: 'False Friends', icon: <AlertTriangle size={16} />, count: word?.false_friends.length },
    { id: 'proverbs', label: 'Proverbs', icon: <MessageCircle size={16} />, count: word?.proverbs.length },
    { id: 'collocations', label: 'Collocations', icon: <Link2 size={16} />, count: word?.collocations.length },
    { id: 'dialects', label: 'Dialects', icon: <MapPin size={16} />, count: word?.dialect_variants.length },
    { id: 'db_row', label: 'DB Row', icon: <Database size={16} /> },
  ];

  const visibleTabs = tabs.filter(tab => tab.id === 'overview' || tab.id === 'db_row' || (tab.count && tab.count > 0));

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
        <div className={`bg-canvas border border-hairline ${UI_RADIUS.surface} p-8 text-center`}>
          <div className={`animate-spin ${UI_RADIUS.pill} h-12 w-12 border-b-2 border-primary mx-auto mb-4`} />
          <p className="text-muted">{wd.loadingDetails}</p>
        </div>
      </div>
    );
  }

  if (error || !word) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
        <div className={`bg-canvas border border-hairline ${UI_RADIUS.surface} p-8 text-center max-w-md`}>
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center ${UI_RADIUS.touchIcon} bg-error/10 text-error`}>
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-semibold text-ink mb-2">Error</h3>
          <p className="text-muted mb-4">{error}</p>
          <button
            onClick={onClose}
            className={`px-6 py-2 bg-primary text-on-primary ${UI_RADIUS.control} font-semibold hover:bg-primary-active transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className={`bg-canvas border border-hairline ${UI_RADIUS.surface} w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="relative">
          <div className="h-48 bg-surface-dark relative overflow-hidden">
            {word.image_base64 ? (
              <img
                src={`data:image/jpeg;base64,${word.image_base64}`}
                alt={word.word}
                className="w-full h-full object-cover opacity-40"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl font-semibold text-on-dark/30">{word.word.charAt(0)}</span>
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />

            <button
              onClick={onClose}
              className={`absolute top-4 right-4 p-2 bg-canvas/20 ${UI_RADIUS.touchIcon} text-on-dark hover:bg-canvas/30 transition-colors`}
            >
              <X size={24} />
            </button>

            <div className="absolute bottom-4 left-6 right-6">
              <div className="flex items-center gap-3 mb-2">
                {word.cefr_level && (
                  <span className={`px-3 py-1 ${UI_RADIUS.pill} text-sm font-semibold ${CEFR_COLORS[word.cefr_level]}`}>
                    {word.cefr_level}
                  </span>
                )}
                {word.gender && GENDER_LABELS[word.gender] && (
                  <span className={`${GENDER_LABELS[word.gender].color} text-on-primary px-3 py-1 ${UI_RADIUS.pill} text-sm font-semibold`}>
                    {GENDER_LABELS[word.gender].article}
                  </span>
                )}
                {word.is_compound && (
                  <span className={`bg-accent-teal text-ink px-3 py-1 ${UI_RADIUS.pill} text-sm font-semibold`}>
                    Compound
                  </span>
                )}
                {word.part_of_speech && (
                  <span className={`bg-canvas/20 text-on-dark px-3 py-1 ${UI_RADIUS.pill} text-sm`}>
                    {word.part_of_speech}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-semibold text-on-dark">
                  {word.gender && GENDER_LABELS[word.gender] && (
                    <span className="opacity-70">{GENDER_LABELS[word.gender].article} </span>
                  )}
                  {word.word}
                </h2>
                {isFeatureEnabled('textToSpeech') && (
                  <button
                    onClick={handlePlayAudio}
                    disabled={isPlaying}
                    className={`p-2 ${UI_RADIUS.touchIcon} transition-colors ${
                      isPlaying
                        ? 'bg-primary/60 cursor-not-allowed'
                        : 'bg-canvas/20 hover:bg-canvas/30'
                    }`}
                  >
                    <Volume2 size={20} className={`text-on-dark ${isPlaying ? 'animate-pulse' : ''}`} />
                  </button>
                )}
              </div>
              <p className="text-xl text-on-dark/90 mt-1">{word.translation}</p>
              {word.plural_form && (
                <p className="text-sm text-on-dark/70 mt-1">Plural: {word.plural_form}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-hairline overflow-x-auto">
          <div className="flex">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  onTabChange?.(tab.id);
                }}
                aria-pressed={activeTab === tab.id}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`bg-surface-card text-muted text-xs px-2 py-0.5 ${UI_RADIUS.pill}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {word.frequency_band && (
                  <div className={`bg-surface-soft ${UI_RADIUS.control} p-4`}>
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">{wd.frequency}</p>
                    <p className="font-semibold text-ink capitalize">{word.frequency_band.replace('_', ' ')}</p>
                  </div>
                )}
                {word.register && (
                  <div className={`bg-surface-soft ${UI_RADIUS.control} p-4`}>
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">{wd.register}</p>
                    <p className="font-semibold text-ink capitalize">{word.register}</p>
                  </div>
                )}
                {word.word_formation && (
                  <div className={`bg-surface-soft ${UI_RADIUS.control} p-4`}>
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">{wd.formation}</p>
                    <p className="font-semibold text-ink capitalize">{word.word_formation}</p>
                  </div>
                )}
                {word.thematic_domain && (
                  <div className={`bg-surface-soft ${UI_RADIUS.control} p-4`}>
                    <p className="text-xs text-muted uppercase tracking-wide mb-1">Domain</p>
                    <p className="font-semibold text-ink capitalize">{word.thematic_domain}</p>
                  </div>
                )}
              </div>

              {word.examples.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                    <MessageCircle size={20} className="text-primary" />
                    Example Sentences
                  </h3>
                  <div className="space-y-3">
                    {word.examples.slice(0, 2).map((example, index) => (
                      <div key={index} className={`bg-surface-soft ${UI_RADIUS.control} p-4`}>
                        <p className="text-ink font-medium">{example.sentence}</p>
                        {example.translation && (
                          <p className="text-muted text-sm mt-1">{example.translation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {word.false_friends.length > 0 && (
                <div className={`bg-accent-amber/10 ${UI_RADIUS.control} p-4`}>
                  <h3 className="text-lg font-semibold text-accent-amber mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Watch out! False Friend
                  </h3>
                  <p className="text-ink">
                    Don't confuse with "<strong>{word.false_friends[0].similar_word}</strong>" in {word.false_friends[0].target_language.toUpperCase()}
                    {word.false_friends[0].similar_word_meaning && (
                      <span className="text-muted"> (means: {word.false_friends[0].similar_word_meaning})</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="space-y-4">
              {word.examples.map((example, index) => (
                <div key={index} className={`bg-surface-soft ${UI_RADIUS.control} p-5`}>
                  <p className="text-lg text-ink font-medium mb-2">{example.sentence}</p>
                  {example.translation && (
                    <p className="text-muted">{example.translation}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {example.difficulty_level && (
                      <span className={`text-xs px-2 py-1 ${UI_RADIUS.pill} ${CEFR_COLORS[example.difficulty_level] || 'bg-surface-card text-body'}`}>
                        {example.difficulty_level}
                      </span>
                    )}
                    {example.context_type && (
                      <span className={`text-xs px-2 py-1 ${UI_RADIUS.pill} bg-surface-card text-body`}>
                        {example.context_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {word.examples.length === 0 && (
                <p className="text-center text-muted py-8">{wd.noExamples}</p>
              )}
            </div>
          )}

          {activeTab === 'etymology' && (
            <div className="space-y-4">
              {word.etymologies.map((etym, index) => (
                <div key={index} className={`bg-surface-soft ${UI_RADIUS.control} p-5`}>
                  {etym.etymology_text && (
                    <p className="text-ink mb-4">{etym.etymology_text}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {etym.origin_language && (
                      <div>
                        <p className="text-muted">{wd.originLanguage}</p>
                        <p className="font-semibold text-ink">{etym.origin_language}</p>
                      </div>
                    )}
                    {etym.origin_word && (
                      <div>
                        <p className="text-muted">{wd.originWord}</p>
                        <p className="font-semibold text-ink italic">{etym.origin_word}</p>
                      </div>
                    )}
                    {etym.language_family && (
                      <div>
                        <p className="text-muted">{wd.languageFamily}</p>
                        <p className="font-semibold text-ink capitalize">{etym.language_family}</p>
                      </div>
                    )}
                    {etym.time_period && (
                      <div>
                        <p className="text-muted">{wd.timePeriod}</p>
                        <p className="font-semibold text-ink">{etym.time_period}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {word.etymologies.length === 0 && (
                <p className="text-center text-muted py-8">{wd.noEtymology}</p>
              )}
            </div>
          )}

          {activeTab === 'false_friends' && (
            <div className="space-y-4">
              {word.false_friends.map((ff, index) => (
                <div key={index} className={`bg-accent-amber/10 border-l-4 border-accent-amber ${UI_RADIUS.control} p-5`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xl font-semibold text-ink mb-1">
                        "{ff.similar_word}" <span className="text-sm font-normal text-muted">({ff.target_language.toUpperCase()})</span>
                      </p>
                      {ff.similar_word_meaning && (
                        <p className="text-muted">Means: {ff.similar_word_meaning}</p>
                      )}
                    </div>
                    {ff.confusion_level && (
                      <span className={`px-3 py-1 ${UI_RADIUS.pill} text-xs font-semibold ${CONFUSION_COLORS[ff.confusion_level] || 'bg-surface-card text-body'}`}>
                        {ff.confusion_level} risk
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {word.false_friends.length === 0 && (
                <p className="text-center text-muted py-8">{wd.noFalseFriends}</p>
              )}
            </div>
          )}

          {activeTab === 'proverbs' && (
            <div className="space-y-4">
              {word.proverbs.map((proverb, index) => (
                <div key={index} className={`bg-surface-soft ${UI_RADIUS.control} p-5`}>
                  <p className="text-lg font-semibold text-ink mb-2 italic">
                    "{proverb.expression}"
                  </p>
                  {proverb.literal_meaning && (
                    <p className="text-muted text-sm mb-1">
                      <span className="font-medium">Literal:</span> {proverb.literal_meaning}
                    </p>
                  )}
                  {proverb.figurative_meaning && (
                    <p className="text-body">
                      <span className="font-medium">Meaning:</span> {proverb.figurative_meaning}
                    </p>
                  )}
                  {proverb.expression_type && (
                    <span className={`inline-block mt-2 text-xs px-2 py-1 ${UI_RADIUS.pill} bg-surface-card text-body`}>
                      {proverb.expression_type}
                    </span>
                  )}
                </div>
              ))}
              {word.proverbs.length === 0 && (
                <p className="text-center text-muted py-8">{wd.noProverbs}</p>
              )}
            </div>
          )}

          {activeTab === 'collocations' && (
            <div className="space-y-4">
              {word.collocations.map((coll, index) => (
                <div key={index} className={`bg-surface-soft ${UI_RADIUS.control} p-5`}>
                  <p className="text-lg font-semibold text-ink mb-2">
                    {coll.collocate_word}
                  </p>
                  {coll.example_phrase && (
                    <p className="text-muted italic">"{coll.example_phrase}"</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {coll.collocation_type && (
                      <span className={`text-xs px-2 py-1 ${UI_RADIUS.pill} bg-accent-teal/10 text-accent-teal`}>
                        {coll.collocation_type}
                      </span>
                    )}
                    {coll.frequency && (
                      <span className={`text-xs px-2 py-1 ${UI_RADIUS.pill} bg-surface-card text-body`}>
                        {coll.frequency}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {word.collocations.length === 0 && (
                <p className="text-center text-muted py-8">{wd.noCollocations}</p>
              )}
            </div>
          )}

          {activeTab === 'dialects' && (
            <div className="space-y-4">
              {word.dialect_variants.map((dialect, index) => (
                <div key={index} className={`bg-surface-soft ${UI_RADIUS.control} p-5`}>
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin size={20} className="text-primary" />
                    <span className="font-semibold text-ink">{dialect.region}</span>
                    {dialect.dialect_name && (
                      <span className="text-sm text-muted">({dialect.dialect_name})</span>
                    )}
                  </div>
                  <p className="text-2xl font-semibold text-primary mb-2">
                    {dialect.variant_word}
                  </p>
                  {dialect.pronunciation && (
                    <p className="text-muted text-sm">
                      Pronunciation: <span className="italic">{dialect.pronunciation}</span>
                    </p>
                  )}
                  {dialect.usage_notes && (
                    <p className="text-muted text-sm mt-2">{dialect.usage_notes}</p>
                  )}
                </div>
              ))}
              {word.dialect_variants.length === 0 && (
                <p className="text-center text-muted py-8">{wd.noDialectVariants}</p>
              )}
            </div>
          )}

          {activeTab === 'db_row' && (
            <div className="space-y-6">
              {dbRowLoading && (
                <div className="py-10 text-center">
                  <div className={`animate-spin ${UI_RADIUS.pill} h-10 w-10 border-b-2 border-primary mx-auto mb-3`} />
                  <p className="text-muted">{wd.loadingRow}</p>
                </div>
              )}

              {dbRowError && (
                <div className={`${UI_RADIUS.control} bg-error/10 border border-error/30 p-4 text-error`}>
                  {dbRowError}
                </div>
              )}

              {dbRow && (
                <>
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Database size={18} className="text-primary" />
                      <h3 className="text-lg font-semibold text-ink">words</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(dbRow.word).map(([key, value]) => (
                        <DbField key={key} name={key} value={value} />
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold text-ink mb-3">media</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(dbRow.media).map(([key, value]) => (
                        <DbField key={key} name={key} value={value} />
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold text-ink mb-3">related tables</h3>
                    <div className="space-y-3">
                      {Object.entries(dbRow.related).map(([tableName, rows]) => (
                        <details
                          key={tableName}
                          className={`${UI_RADIUS.control} border border-hairline bg-surface-soft`}
                          open={rows.length > 0}
                        >
                          <summary className="cursor-pointer px-4 py-3 font-semibold text-ink">
                            {formatDbLabel(tableName)} <span className="text-muted">({rows.length})</span>
                          </summary>
                          <div className="border-t border-hairline p-4 space-y-3">
                            {rows.length === 0 ? (
                              <p className="text-sm text-muted">{wd.noRows}</p>
                            ) : (
                              rows.map((row, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Object.entries(row).map(([key, value]) => (
                                    <DbField key={key} name={key} value={value} />
                                  ))}
                                </div>
                              ))
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
