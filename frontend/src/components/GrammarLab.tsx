import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { GitBranch, Cloud, Play, Info, Volume2, Loader2, Puzzle, Magnet, Globe2, Layers, Gamepad2, Sparkles, Star, Trophy } from 'lucide-react';
import { api } from '../services/api';
import type { GrammarSentence, GrammarNode, FlashcardWithProgress, WordCloudItem } from '../types';
import { AppScreen, GameSignalBadge, PillTabs, ScreenHeader, SurfacePanel, UI_RADIUS } from './ui';
import type { PillTabItem } from './ui';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { useTheme } from '../contexts/useTheme';
import type { GrammarView } from '../routes/appRoutes';
import { reportClientError } from '../utils/clientError';
import { CATEGORY_COLORS } from '../utils/wordDisplayMeta';

const EmbeddedGrammarGraph = lazy(() => import('./EmbeddedGrammarGraph').then((module) => ({ default: module.EmbeddedGrammarGraph })));
const EmbeddedWordCloud = lazy(() => import('./EmbeddedWordCloud').then((module) => ({ default: module.EmbeddedWordCloud })));
const WordDetailModal = lazy(() => import('./WordDetailModal').then((module) => ({ default: module.WordDetailModal })));
const SentenceBuilder = lazy(() => import('./SentenceBuilder').then((module) => ({ default: module.SentenceBuilder })));
const FunSentenceBuilder = lazy(() => import('./FunSentenceBuilder').then((module) => ({ default: module.FunSentenceBuilder })));
const ClusteredNodes = lazy(() => import('./ClusteredNodes').then((module) => ({ default: module.ClusteredNodes })));
const DialectMap = lazy(() => import('./DialectMap').then((module) => ({ default: module.DialectMap })));
const HierarchySunburst = lazy(() => import('./HierarchySunburst').then((module) => ({ default: module.HierarchySunburst })));

interface GrammarLabProps {
  activeView: GrammarView;
  onViewChange: (view: GrammarView) => void;
  onBack: () => void;
}

const LAB_TABS: Array<PillTabItem<GrammarView>> = [
  { value: 'graph', label: 'Sentence Graph', icon: <GitBranch size={18} />, tone: 'blue' },
  { value: 'wordcloud', label: 'Word Cloud', icon: <Cloud size={18} />, tone: 'cyan' },
  { value: 'builder', label: 'Build Sentence', icon: <Puzzle size={18} />, tone: 'orange' },
  { value: 'funbuilder', label: 'Compose Sentence', icon: <Gamepad2 size={18} />, tone: 'pink' },
  { value: 'clusters', label: 'Clusters', icon: <Magnet size={18} />, tone: 'pink' },
  { value: 'dialects', label: 'Dialects', icon: <Globe2 size={18} />, tone: 'emerald' },
  { value: 'sunburst', label: 'Hierarchy', icon: <Layers size={18} />, tone: 'amber' },
];

export function GrammarLab({ activeView, onViewChange, onBack }: GrammarLabProps) {
  const [sentences, setSentences] = useState<GrammarSentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState<WordCloudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GrammarNode | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordCloudItem | null>(null);
  const { isDark } = useTheme();

  const [audioCache, setAudioCache] = useState<Record<string, boolean>>({});
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setSelectedNode(null);
  }, [activeView]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sentencesData, wordsData] = await Promise.all([
        api.getGrammarSentences(),
        api.getLibraryWords({ language: 'de', limit: 200 }),
      ]);

      setSentences(sentencesData);

      const wordCloudData: WordCloudItem[] = wordsData.map((word: FlashcardWithProgress) => ({
        text: word.word,
        size: Math.min(20 + (word.swipe_right_count || 0) * 8, 80),
        category: word.category,
        translation: word.translation,
        swipe_right_count: word.swipe_right_count,
        swipe_left_count: word.swipe_left_count,
        review_count: word.review_count,
        image_url: word.image_url,
        image_base64: word.image_base64,
        cefr_level: word.cefr_level,
        frequency_band: word.frequency_band,
        gender: word.gender,
        part_of_speech: word.part_of_speech,
        register: word.register,
        is_compound: word.is_compound,
        word_formation: word.word_formation,
        thematic_domain: word.thematic_domain,
      }));
      setWords(wordCloudData);
    } catch (error) {
      reportClientError('Failed to load grammar lab data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextSentence = () => {
    setCurrentIndex((prev) => (prev + 1) % sentences.length);
    setSelectedNode(null);
  };

  const checkAudioCache = useCallback(async (sentence: GrammarSentence) => {
    const textsToCheck = [sentence.german, ...sentence.nodes.map(node => node.label)];
    try {
      const response = await api.checkAudioExists(textsToCheck);
      setAudioCache(prev => ({ ...prev, ...response.results }));
    } catch (error) {
      reportClientError('Failed to check audio cache:', error);
    }
  }, []);

  useEffect(() => {
    if (sentences[currentIndex]) {
      checkAudioCache(sentences[currentIndex]);
    }
  }, [currentIndex, sentences, checkAudioCache]);

  const playAudio = useCallback(async (text: string) => {
    if (loadingAudio || playingAudio === text) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setLoadingAudio(text);

    try {
      const response = await api.generateSpeech(text);
      setAudioCache(prev => ({ ...prev, [text]: true }));

      const audio = new Audio(response.audio_base64);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };

      setLoadingAudio(null);
      setPlayingAudio(text);
      await audio.play();

    } catch (error) {
      reportClientError('Failed to play audio:', error);
      setLoadingAudio(null);
    }
  }, [loadingAudio, playingAudio]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const currentSentence = sentences[currentIndex];
  const wordDatasetLoading = loading && words.length === 0;

  return (
    <AppScreen mode="overlay" width="full" scroll="none" contentClassName="flex h-full flex-col">
      <SurfacePanel className="rounded-none border-x-0 border-t-0 shadow-sm" padding="none">
        <div className="px-4 py-3">
          <ScreenHeader
            title="Grammar Lab"
            onBack={onBack}
            density="compact"
            align="center"
            actions={activeView === 'graph' && currentSentence ? (
              <button
                onClick={handleNextSentence}
                className={`flex min-h-11 items-center gap-2 ${UI_RADIUS.pill} bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] active:scale-95`}
              >
                Next <Play size={16} />
              </button>
            ) : <div className="w-20" />}
          />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <GameSignalBadge icon={<Star size={14} />} label="Grammar Quest" tone="indigo" />
            <GameSignalBadge icon={<Sparkles size={14} />} label="Combo Lab" tone="purple" />
            <GameSignalBadge icon={<Trophy size={14} />} label="Syntax Loot" tone="amber" />
          </div>
        </div>
        <PillTabs
          items={LAB_TABS}
          value={activeView}
          onChange={onViewChange}
          className="px-4 pb-3"
          ariaLabel="Grammar Lab views"
        />
      </SurfacePanel>

      {/* Sentence Display (only for graph view) */}
      {activeView === 'graph' && currentSentence && (
        <div className={`text-center py-4 border-b transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center gap-3">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{currentSentence.german}</h1>
            <button
              onClick={() => playAudio(currentSentence.german)}
              disabled={loadingAudio === currentSentence.german}
              className={`p-2 ${UI_RADIUS.touchIcon} transition-all ${playingAudio === currentSentence.german
                ? 'bg-blue-500 text-white animate-pulse'
                : audioCache[currentSentence.german]
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              title={audioCache[currentSentence.german] ? 'Play (cached)' : 'Generate & Play'}
            >
              {loadingAudio === currentSentence.german ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Volume2 size={20} />
              )}
            </button>
          </div>
          <p className={`text-base ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{currentSentence.english}</p>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-visible relative">
        <Suspense fallback={<GrammarViewFallback />}>
          {activeView === 'graph' && loading && !currentSentence && (
            <GrammarDataLoadingPanel message="Loading graph data..." />
          )}
          {activeView === 'graph' && !loading && !currentSentence && (
            <div className="flex h-full items-center justify-center p-6">
              <SurfacePanel className="max-w-md text-center" padding="lg">
                <Puzzle size={44} className="mx-auto mb-4 text-indigo-500" />
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  No grammar sentences yet
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                  The lab can still use the builder, clusters, dialect map, hierarchy, and word cloud while sentence data is empty.
                </p>
                <button
                  type="button"
                  onClick={() => onViewChange('builder')}
                  className={`mt-5 inline-flex min-h-11 items-center gap-2 ${UI_RADIUS.pill} bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02] active:scale-95`}
                >
                  <Puzzle size={17} />
                  Build Sentence
                </button>
              </SurfacePanel>
            </div>
          )}
          {activeView === 'graph' && currentSentence && (
            <EmbeddedGrammarGraph
              sentence={currentSentence}
              onNodeSelect={setSelectedNode}
            />
          )}
          {activeView === 'wordcloud' && words.length > 0 && (
            <EmbeddedWordCloud words={words} onWordClick={setSelectedWord} />
          )}
          {activeView === 'wordcloud' && wordDatasetLoading && (
            <GrammarDataLoadingPanel message="Loading word cloud..." />
          )}
          {activeView === 'builder' && (
            <SentenceBuilder />
          )}
          {activeView === 'funbuilder' && (
            <FunSentenceBuilder />
          )}
          {activeView === 'clusters' && words.length > 0 && (
            <ClusteredNodes words={words} onWordClick={setSelectedWord} />
          )}
          {activeView === 'clusters' && wordDatasetLoading && (
            <GrammarDataLoadingPanel message="Loading clusters..." />
          )}
          {activeView === 'dialects' && (
            <DialectMap />
          )}
          {activeView === 'sunburst' && words.length > 0 && (
            <HierarchySunburst words={words} onWordClick={setSelectedWord} />
          )}
          {activeView === 'sunburst' && wordDatasetLoading && (
            <GrammarDataLoadingPanel message="Loading hierarchy..." />
          )}
        </Suspense>
      </div>

      {/* Node Info Panel (for graph view) */}
      {activeView === 'graph' && selectedNode && (
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-2xl mx-auto flex items-start gap-4">
            <div
              className={`p-3 ${UI_RADIUS.control} border-2`}
              style={{ borderColor: getNodeColor(selectedNode.type), backgroundColor: `${getNodeColor(selectedNode.type)}10` }}
            >
              <Info size={24} style={{ color: getNodeColor(selectedNode.type) }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {selectedNode.label}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio(selectedNode.label);
                  }}
                  disabled={loadingAudio === selectedNode.label}
                  className={`p-1.5 ${UI_RADIUS.touchIcon} transition-all ${playingAudio === selectedNode.label
                    ? 'bg-blue-500 text-white animate-pulse'
                    : audioCache[selectedNode.label]
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  title={audioCache[selectedNode.label] ? 'Play (cached)' : 'Generate & Play'}
                >
                  {loadingAudio === selectedNode.label ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Volume2 size={16} />
                  )}
                </button>
                <span
                  className={`text-xs px-2 py-0.5 ${UI_RADIUS.pill} text-white`}
                  style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                >
                  {getNodeLabel(selectedNode.type)}
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
                {selectedNode.meta?.case && (
                  <p><span className="text-gray-400">Case:</span> <strong>{selectedNode.meta.case}</strong></p>
                )}
                {selectedNode.meta?.gender && (
                  <p><span className="text-gray-400">Gender:</span> <strong>{selectedNode.meta.gender}</strong></p>
                )}
                {selectedNode.meta?.tense && (
                  <p><span className="text-gray-400">Tense:</span> <strong>{selectedNode.meta.tense}</strong></p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Word Cloud Legend */}
      {activeView === 'wordcloud' && (
        <div className={`p-4 border-t transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(CATEGORY_COLORS).slice(0, 5).map(([category, color]) => (
              <div key={category} className={`flex items-center gap-2 px-3 py-1.5 ${UI_RADIUS.pill} ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className={`w-3 h-3 ${UI_RADIUS.pill} flex-shrink-0`} style={{ backgroundColor: color }} />
                <span className={`text-xs capitalize ${isDark ? 'text-white' : 'text-gray-800'}`}>{category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Word Detail Modal */}
      {selectedWord && (
        <Suspense fallback={null}>
          <WordDetailModal word={selectedWord} onClose={() => setSelectedWord(null)} />
        </Suspense>
      )}
    </AppScreen>
  );
}

function GrammarViewFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-300">
      Loading view...
    </div>
  );
}

function GrammarDataLoadingPanel({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <SurfacePanel className="flex items-center gap-3 text-sm font-semibold text-slate-500 dark:text-slate-300" padding="md">
        <Loader2 size={18} className="animate-spin text-indigo-500" />
        {message}
      </SurfacePanel>
    </div>
  );
}
