import { useState, useEffect } from 'react';
import { X, BookOpen, History, AlertTriangle, MessageCircle, Link2, MapPin, Volume2, Database } from 'lucide-react';
import { api } from '../services/api';
import type { FlashcardDetail, WordDbRow } from '../types';
import { isFeatureEnabled } from '../config/appMode';
import { UI_RADIUS } from './ui';

interface WordDetailModalProps {
  wordId: number;
  initialTab?: TabType;
  onClose: () => void;
}

type TabType = 'overview' | 'examples' | 'etymology' | 'false_friends' | 'proverbs' | 'collocations' | 'dialects' | 'db_row';

const GENDER_LABELS: Record<string, { article: string; color: string }> = {
  masculine: { article: 'der', color: 'bg-blue-500' },
  feminine: { article: 'die', color: 'bg-pink-500' },
  neuter: { article: 'das', color: 'bg-green-500' },
};

const CEFR_COLORS: Record<string, string> = {
  A1: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  A2: 'bg-green-200 text-green-900 dark:bg-green-800/30 dark:text-green-300',
  B1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  B2: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800/30 dark:text-yellow-300',
  C1: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  C2: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const CONFUSION_COLORS: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white',
};

const formatDbValue = (value: unknown) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const formatDbLabel = (key: string) => key.replace(/_/g, ' ');

const isEmptyDbValue = (value: unknown) => value === null || value === undefined || value === '';

const DbField = ({ name, value }: { name: string; value: unknown }) => (
  <div className={`${UI_RADIUS.control} border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 min-w-0`}>
    <p className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1 break-words">
      {name}
    </p>
    <pre className={`whitespace-pre-wrap break-words text-sm font-mono leading-relaxed ${isEmptyDbValue(value) ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
      {formatDbValue(value)}
    </pre>
  </div>
);

export function WordDetailModal({ wordId, initialTab = 'overview', onClose }: WordDetailModalProps) {
  const [word, setWord] = useState<FlashcardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
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
        console.error(err);
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
        console.error(err);
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
      const response = await api.generateSpeech(word.word, 'de');
      const audio = new Audio(`data:audio/mp3;base64,${response.audio_base64}`);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
    } catch (err) {
      console.error('Failed to play audio:', err);
      setIsPlaying(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
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
        <div className={`bg-white dark:bg-slate-800 ${UI_RADIUS.surface} p-8 text-center`}>
          <div className={`animate-spin ${UI_RADIUS.pill} h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4`} />
          <p className="text-gray-600 dark:text-gray-400">Loading word details...</p>
        </div>
      </div>
    );
  }

  if (error || !word) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
        <div className={`bg-white dark:bg-slate-800 ${UI_RADIUS.surface} p-8 text-center max-w-md`}>
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center ${UI_RADIUS.touchIcon} bg-red-100 text-red-600`}>
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={onClose}
            className={`px-6 py-2 bg-indigo-600 text-white ${UI_RADIUS.control} font-semibold hover:bg-indigo-700 transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-slate-800 ${UI_RADIUS.surface} shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="relative">
          <div className="h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
            {word.image_base64 ? (
              <img
                src={`data:image/jpeg;base64,${word.image_base64}`}
                alt={word.word}
                className="w-full h-full object-cover opacity-40"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl font-bold text-white/30">{word.word.charAt(0)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm ${UI_RADIUS.touchIcon} text-white hover:bg-white/30 transition-colors`}
            >
              <X size={24} />
            </button>

            <div className="absolute bottom-4 left-6 right-6">
              <div className="flex items-center gap-3 mb-2">
                {word.cefr_level && (
                  <span className={`px-3 py-1 ${UI_RADIUS.pill} text-sm font-bold ${CEFR_COLORS[word.cefr_level]}`}>
                    {word.cefr_level}
                  </span>
                )}
                {word.gender && GENDER_LABELS[word.gender] && (
                  <span className={`${GENDER_LABELS[word.gender].color} text-white px-3 py-1 ${UI_RADIUS.pill} text-sm font-bold`}>
                    {GENDER_LABELS[word.gender].article}
                  </span>
                )}
                {word.is_compound && (
                  <span className={`bg-purple-500 text-white px-3 py-1 ${UI_RADIUS.pill} text-sm font-bold`}>
                    Compound
                  </span>
                )}
                {word.part_of_speech && (
                  <span className={`bg-white/20 backdrop-blur-sm text-white px-3 py-1 ${UI_RADIUS.pill} text-sm`}>
                    {word.part_of_speech}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-bold text-white">
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
                        ? 'bg-indigo-400 cursor-not-allowed'
                        : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    <Volume2 size={20} className={`text-white ${isPlaying ? 'animate-pulse' : ''}`} />
                  </button>
                )}
              </div>
              <p className="text-xl text-white/90 mt-1">{word.translation}</p>
              {word.plural_form && (
                <p className="text-sm text-white/70 mt-1">Plural: {word.plural_form}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
          <div className="flex">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 ${UI_RADIUS.pill}`}>
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
                  <div className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-4`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Frequency</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{word.frequency_band.replace('_', ' ')}</p>
                  </div>
                )}
                {word.register && (
                  <div className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-4`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Register</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{word.register}</p>
                  </div>
                )}
                {word.word_formation && (
                  <div className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-4`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Formation</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{word.word_formation}</p>
                  </div>
                )}
                {word.thematic_domain && (
                  <div className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-4`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Domain</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{word.thematic_domain}</p>
                  </div>
                )}
              </div>

              {word.examples.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <MessageCircle size={20} className="text-indigo-600" />
                    Example Sentences
                  </h3>
                  <div className="space-y-3">
                    {word.examples.slice(0, 2).map((example, index) => (
                      <div key={index} className={`bg-indigo-50 dark:bg-indigo-900/20 ${UI_RADIUS.control} p-4`}>
                        <p className="text-gray-900 dark:text-white font-medium">{example.sentence}</p>
                        {example.translation && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{example.translation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {word.false_friends.length > 0 && (
                <div className={`bg-amber-50 dark:bg-amber-900/20 ${UI_RADIUS.control} p-4`}>
                  <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Watch out! False Friend
                  </h3>
                  <p className="text-amber-900 dark:text-amber-300">
                    Don't confuse with "<strong>{word.false_friends[0].similar_word}</strong>" in {word.false_friends[0].target_language.toUpperCase()}
                    {word.false_friends[0].similar_word_meaning && (
                      <span className="text-amber-700 dark:text-amber-400"> (means: {word.false_friends[0].similar_word_meaning})</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="space-y-4">
              {word.examples.map((example, index) => (
                <div key={index} className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-5`}>
                  <p className="text-lg text-gray-900 dark:text-white font-medium mb-2">{example.sentence}</p>
                  {example.translation && (
                    <p className="text-gray-600 dark:text-gray-400">{example.translation}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {example.difficulty_level && (
                      <span className={`text-xs px-2 py-1 ${UI_RADIUS.pill} ${CEFR_COLORS[example.difficulty_level] || 'bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300'}`}>
                        {example.difficulty_level}
                      </span>
                    )}
                    {example.context_type && (
                      <span className={`text-xs px-2 py-1 ${UI_RADIUS.pill} bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300`}>
                        {example.context_type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {word.examples.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No examples available</p>
              )}
            </div>
          )}

          {activeTab === 'etymology' && (
            <div className="space-y-4">
              {word.etymologies.map((etym, index) => (
                <div key={index} className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-5`}>
                  {etym.etymology_text && (
                    <p className="text-gray-900 dark:text-white mb-4">{etym.etymology_text}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {etym.origin_language && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Origin Language</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{etym.origin_language}</p>
                      </div>
                    )}
                    {etym.origin_word && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Origin Word</p>
                        <p className="font-semibold text-gray-900 dark:text-white italic">{etym.origin_word}</p>
                      </div>
                    )}
                    {etym.language_family && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Language Family</p>
                        <p className="font-semibold text-gray-900 dark:text-white capitalize">{etym.language_family}</p>
                      </div>
                    )}
                    {etym.time_period && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Time Period</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{etym.time_period}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {word.etymologies.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No etymology data available</p>
              )}
            </div>
          )}

          {activeTab === 'false_friends' && (
            <div className="space-y-4">
              {word.false_friends.map((ff, index) => (
                <div key={index} className={`bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 ${UI_RADIUS.control} p-5`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        "{ff.similar_word}" <span className="text-sm font-normal text-gray-500">({ff.target_language.toUpperCase()})</span>
                      </p>
                      {ff.similar_word_meaning && (
                        <p className="text-gray-600 dark:text-gray-400">Means: {ff.similar_word_meaning}</p>
                      )}
                    </div>
                    {ff.confusion_level && (
                      <span className={`px-3 py-1 ${UI_RADIUS.pill} text-xs font-bold ${CONFUSION_COLORS[ff.confusion_level] || 'bg-gray-500 text-white'}`}>
                        {ff.confusion_level} risk
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {word.false_friends.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No false friends identified</p>
              )}
            </div>
          )}

          {activeTab === 'proverbs' && (
            <div className="space-y-4">
              {word.proverbs.map((proverb, index) => (
                <div key={index} className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-5`}>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2 italic">
                    "{proverb.expression}"
                  </p>
                  {proverb.literal_meaning && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      <span className="font-medium">Literal:</span> {proverb.literal_meaning}
                    </p>
                  )}
                  {proverb.figurative_meaning && (
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Meaning:</span> {proverb.figurative_meaning}
                    </p>
                  )}
                  {proverb.expression_type && (
                    <span className={`inline-block mt-2 text-xs px-2 py-1 ${UI_RADIUS.pill} bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400`}>
                      {proverb.expression_type}
                    </span>
                  )}
                </div>
              ))}
              {word.proverbs.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No proverbs or idioms available</p>
              )}
            </div>
          )}

          {activeTab === 'collocations' && (
            <div className="space-y-4">
              {word.collocations.map((coll, index) => (
                <div key={index} className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-5`}>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {coll.collocate_word}
                  </p>
                  {coll.example_phrase && (
                    <p className="text-gray-600 dark:text-gray-400 italic">"{coll.example_phrase}"</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {coll.collocation_type && (
                      <span className={`text-xs px-2 py-1 ${UI_RADIUS.pill} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`}>
                        {coll.collocation_type}
                      </span>
                    )}
                    {coll.frequency && (
                      <span className={`text-xs px-2 py-1 ${UI_RADIUS.pill} bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300`}>
                        {coll.frequency}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {word.collocations.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No collocations available</p>
              )}
            </div>
          )}

          {activeTab === 'dialects' && (
            <div className="space-y-4">
              {word.dialect_variants.map((dialect, index) => (
                <div key={index} className={`bg-gray-50 dark:bg-slate-700/50 ${UI_RADIUS.control} p-5`}>
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin size={20} className="text-indigo-600" />
                    <span className="font-bold text-gray-900 dark:text-white">{dialect.region}</span>
                    {dialect.dialect_name && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">({dialect.dialect_name})</span>
                    )}
                  </div>
                  <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                    {dialect.variant_word}
                  </p>
                  {dialect.pronunciation && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Pronunciation: <span className="italic">{dialect.pronunciation}</span>
                    </p>
                  )}
                  {dialect.usage_notes && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{dialect.usage_notes}</p>
                  )}
                </div>
              ))}
              {word.dialect_variants.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No dialect variants available</p>
              )}
            </div>
          )}

          {activeTab === 'db_row' && (
            <div className="space-y-6">
              {dbRowLoading && (
                <div className="py-10 text-center">
                  <div className={`animate-spin ${UI_RADIUS.pill} h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3`} />
                  <p className="text-gray-600 dark:text-gray-400">Loading database row...</p>
                </div>
              )}

              {dbRowError && (
                <div className={`${UI_RADIUS.control} bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-300`}>
                  {dbRowError}
                </div>
              )}

              {dbRow && (
                <>
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Database size={18} className="text-indigo-600" />
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">words</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(dbRow.word).map(([key, value]) => (
                        <DbField key={key} name={key} value={value} />
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">media</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(dbRow.media).map(([key, value]) => (
                        <DbField key={key} name={key} value={value} />
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">related tables</h3>
                    <div className="space-y-3">
                      {Object.entries(dbRow.related).map(([tableName, rows]) => (
                        <details
                          key={tableName}
                          className={`${UI_RADIUS.control} border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50`}
                          open={rows.length > 0}
                        >
                          <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-900 dark:text-white">
                            {formatDbLabel(tableName)} <span className="text-gray-500 dark:text-gray-400">({rows.length})</span>
                          </summary>
                          <div className="border-t border-gray-200 dark:border-slate-700 p-4 space-y-3">
                            {rows.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">No rows</p>
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
