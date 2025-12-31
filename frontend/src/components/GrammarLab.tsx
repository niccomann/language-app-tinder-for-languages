import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, GitBranch, Cloud, Play, Info, Volume2, Loader2, Puzzle, Magnet, Globe2, Layers, Gamepad2 } from 'lucide-react';
import { api } from '../services/api';
import type { GrammarSentence, GrammarNode, FlashcardWithProgress, WordCloudItem } from '../types';
import { LoadingSpinner } from './ui';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { EmbeddedGrammarGraph } from './EmbeddedGrammarGraph';
import { EmbeddedWordCloud } from './EmbeddedWordCloud';
import { WordDetailModal } from './WordDetailModal';
import { SentenceBuilder } from './SentenceBuilder';
import { FunSentenceBuilder } from './FunSentenceBuilder';
import { ClusteredNodes } from './ClusteredNodes';
import { DialectMap } from './DialectMap';
import { HierarchySunburst } from './HierarchySunburst';
import { useTheme } from '../contexts/ThemeContext';

type LabView = 'graph' | 'wordcloud' | 'builder' | 'funbuilder' | 'clusters' | 'dialects' | 'sunburst';

interface GrammarLabProps {
  onBack: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  animals: '#3B82F6',
  food: '#10B981',
  verbs: '#EF4444',
  adjectives: '#F59E0B',
  objects: '#8B5CF6',
  default: '#64748B',
};

export function GrammarLab({ onBack }: GrammarLabProps) {
  const [activeView, setActiveView] = useState<LabView>('graph');
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
      console.error('Failed to load grammar lab data:', error);
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
      console.error('Failed to check audio cache:', error);
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
      console.error('Failed to play audio:', error);
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

  if (loading) {
    return <LoadingSpinner message="Loading Grammar Lab..." fullScreen />;
  }

  const currentSentence = sentences[currentIndex];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 to-white'}`}>
      {/* Header */}
      <div className={`border-b shadow-sm transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}
          >
            <ArrowLeft size={24} />
          </button>

          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Grammar Lab 🧪
          </h1>

          {activeView === 'graph' && (
            <button
              onClick={handleNextSentence}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2 shadow-md"
            >
              Next <Play size={16} />
            </button>
          )}
          {(activeView === 'wordcloud' || activeView === 'builder' || activeView === 'funbuilder' || activeView === 'clusters' || activeView === 'sunburst') && <div className="w-20" />}
        </div>

        {/* Tab Buttons */}
        <div className="flex justify-center gap-2 px-4 pb-3">
          <button
            onClick={() => setActiveView('graph')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap min-w-fit ${activeView === 'graph'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <GitBranch size={18} />
            <span>Sentence Graph</span>
          </button>
          <button
            onClick={() => setActiveView('wordcloud')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap min-w-fit ${activeView === 'wordcloud'
              ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Cloud size={18} />
            <span>Word Cloud</span>
          </button>
          <button
            onClick={() => setActiveView('builder')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap min-w-fit ${activeView === 'builder'
              ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Puzzle size={18} />
            <span>Build Sentence</span>
          </button>
          <button
            onClick={() => setActiveView('funbuilder')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap min-w-fit ${activeView === 'funbuilder'
              ? 'bg-gradient-to-r from-pink-500 to-yellow-500 text-white shadow-lg'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Gamepad2 size={18} />
            <span>Componi Frase 🎮</span>
          </button>
          <button
            onClick={() => setActiveView('clusters')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap min-w-fit ${activeView === 'clusters'
              ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Magnet size={18} />
            <span>Clusters</span>
          </button>
          <button
            onClick={() => setActiveView('dialects')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap min-w-fit ${activeView === 'dialects'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Globe2 size={18} />
            <span>Dialetti</span>
          </button>
          <button
            onClick={() => setActiveView('sunburst')}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all duration-300 whitespace-nowrap min-w-fit ${activeView === 'sunburst'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <Layers size={18} />
            <span>Hierarchy</span>
          </button>
        </div>
      </div>

      {/* Sentence Display (only for graph view) */}
      {activeView === 'graph' && currentSentence && (
        <div className={`text-center py-4 border-b transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-center gap-3">
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{currentSentence.german}</h1>
            <button
              onClick={() => playAudio(currentSentence.german)}
              disabled={loadingAudio === currentSentence.german}
              className={`p-2 rounded-full transition-all ${playingAudio === currentSentence.german
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
        {activeView === 'graph' && currentSentence && (
          <EmbeddedGrammarGraph
            sentence={currentSentence}
            onNodeSelect={setSelectedNode}
          />
        )}
        {activeView === 'wordcloud' && words.length > 0 && (
          <EmbeddedWordCloud words={words} onWordClick={setSelectedWord} />
        )}
        {activeView === 'builder' && (
          <SentenceBuilder onBack={() => setActiveView('graph')} />
        )}
        {activeView === 'funbuilder' && (
          <FunSentenceBuilder />
        )}
        {activeView === 'clusters' && words.length > 0 && (
          <ClusteredNodes words={words} onWordClick={setSelectedWord} />
        )}
        {activeView === 'dialects' && (
          <DialectMap />
        )}
        {activeView === 'sunburst' && words.length > 0 && (
          <HierarchySunburst words={words} onWordClick={setSelectedWord} />
        )}
      </div>

      {/* Node Info Panel (for graph view) */}
      {activeView === 'graph' && selectedNode && (
        <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-2xl mx-auto flex items-start gap-4">
            <div
              className="p-3 rounded-xl border-2"
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
                  className={`p-1.5 rounded-full transition-all ${playingAudio === selectedNode.label
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
                  className="text-xs px-2 py-0.5 rounded-full text-white"
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
              <div key={category} className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className={`text-xs capitalize ${isDark ? 'text-white' : 'text-gray-800'}`}>{category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Word Detail Modal */}
      {selectedWord && (
        <WordDetailModal word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}
    </div>
  );
}
