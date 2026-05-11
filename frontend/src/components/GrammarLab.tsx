import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Play, Info, Volume2, Loader2, Puzzle } from 'lucide-react';
import { api } from '../services/api';
import type { GrammarSentence, GrammarNode, FlashcardWithProgress, WordCloudItem } from '../types';
import { AppScreen, SurfacePanel, UI_RADIUS } from './ui';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
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

import { SceneShell } from './scene';

interface GrammarLabProps {
  activeView: GrammarView;
  onViewChange: (view: GrammarView) => void;
  onBack: () => void;
}

const VIEW_META: Record<Exclude<GrammarView, 'hub'>, { eyebrow: string; title: string; subline: string; key: string; body: React.ReactNode }> = {
  graph: {
    eyebrow: 'GRAMMAR · SENTENCE GRAPH',
    title: 'Sentence Graph',
    subline: 'Relazioni grammaticali tra le parole di ogni frase.',
    key: 'grammar.graph',
    body: <p>Visualizza il grafo grammaticale di una frase: ogni parola è un nodo, ogni relazione (soggetto, oggetto, modificatore) è un arco. Tocca un nodo per vedere caso, genere, tempo.</p>,
  },
  wordcloud: {
    eyebrow: 'GRAMMAR · WORD CLOUD',
    title: 'Word Cloud',
    subline: 'Quanto sono frequenti le parole che hai incontrato.',
    key: 'grammar.wordcloud',
    body: <p>Le parole più grandi sono quelle viste o swipe-ate più spesso. Tocca una parola per aprirne il dettaglio.</p>,
  },
  builder: {
    eyebrow: 'GRAMMAR · BUILD SENTENCE',
    title: 'Build Sentence',
    subline: 'Costruisci frasi grammaticali a partire da un word bank.',
    key: 'grammar.builder',
    body: <p>Trascina o tocca i tile per assemblare una frase. Il sistema controlla la struttura grammaticale.</p>,
  },
  funbuilder: {
    eyebrow: 'GRAMMAR · COMPOSE SENTENCE',
    title: 'Compose Sentence',
    subline: 'Versione playful del builder con tile più ricchi.',
    key: 'grammar.funbuilder',
    body: <p>Variante del builder con interazione più giocosa: scegli i tile, componi la frase, vedi feedback.</p>,
  },
  clusters: {
    eyebrow: 'GRAMMAR · CLUSTERS',
    title: 'Clusters',
    subline: 'Gruppi semantici e quartieri di parole correlate.',
    key: 'grammar.clusters',
    body: <p>Le parole vengono raggruppate per significato simile. Esempio: tutti i verbi di movimento finiscono nello stesso cluster.</p>,
  },
  dialects: {
    eyebrow: 'GRAMMAR · DIALECTS',
    title: 'Dialects',
    subline: 'Varianti regionali del vocabolario tedesco.',
    key: 'grammar.dialects',
    body: <p>Vedi come una stessa parola può cambiare in zone diverse della Germania, Austria, Svizzera.</p>,
  },
  sunburst: {
    eyebrow: 'GRAMMAR · HIERARCHY',
    title: 'Hierarchy',
    subline: 'Struttura gerarchica dei concetti e categorie.',
    key: 'grammar.sunburst',
    body: <p>Un grafico a corona che mostra come categorie macro contengono sotto-categorie e parole.</p>,
  },
};

export function GrammarLab({ activeView, onViewChange, onBack }: GrammarLabProps) {
  const [sentences, setSentences] = useState<GrammarSentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [words, setWords] = useState<WordCloudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GrammarNode | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordCloudItem | null>(null);

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
  const leaf = activeView === 'hub' ? VIEW_META.graph : VIEW_META[activeView];
  void onViewChange;

  return (
    <SceneShell
      eyebrow={leaf.eyebrow}
      title={leaf.title}
      subline={leaf.subline}
      explainerKey={leaf.key}
      explainerTitle={`Cos'è ${leaf.title}`}
      explainerBody={leaf.body}
      back={{ onClick: onBack }}
      action={activeView === 'graph' && currentSentence ? (
        <button
          onClick={handleNextSentence}
          className={`flex min-h-10 items-center gap-2 ${UI_RADIUS.pill} bg-primary px-3 py-2 text-caption font-semibold text-on-primary transition-all`}
        >
          Next <Play size={14} />
        </button>
      ) : null}
      onNavigate={onBack}
    >
      {/* Sentence Display (only for graph view) */}
      {activeView === 'graph' && currentSentence && (
        <div className="text-center py-4 border-b border-hairline bg-canvas">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{currentSentence.german}</h1>
            <button
              onClick={() => playAudio(currentSentence.german)}
              disabled={loadingAudio === currentSentence.german}
              className={`p-2 ${UI_RADIUS.touchIcon} transition-all ${playingAudio === currentSentence.german
                ? 'bg-primary text-on-primary animate-pulse'
                : audioCache[currentSentence.german]
                  ? 'bg-success/20 text-success'
                  : 'bg-surface-card text-muted'
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
          <p className="text-base text-muted">{currentSentence.english}</p>
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
                <Puzzle size={44} className="mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-semibold text-ink">
                  No grammar sentences yet
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                  The lab can still use the builder, clusters, dialect map, hierarchy, and word cloud while sentence data is empty.
                </p>
                <button
                  type="button"
                  onClick={() => onViewChange('builder')}
                  className={`mt-5 inline-flex min-h-11 items-center gap-2 ${UI_RADIUS.pill} bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition`}
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
        <div className="bg-canvas border-t border-hairline p-4">
          <div className="max-w-2xl mx-auto flex items-start gap-4">
            <div
              className={`p-3 ${UI_RADIUS.control} border`}
              style={{ borderColor: getNodeColor(selectedNode.type), backgroundColor: `${getNodeColor(selectedNode.type)}10` }}
            >
              <Info size={24} style={{ color: getNodeColor(selectedNode.type) }} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                {selectedNode.label}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio(selectedNode.label);
                  }}
                  disabled={loadingAudio === selectedNode.label}
                  className={`p-1.5 ${UI_RADIUS.touchIcon} transition-all ${playingAudio === selectedNode.label
                    ? 'bg-primary text-on-primary animate-pulse'
                    : audioCache[selectedNode.label]
                      ? 'bg-success/20 text-success'
                      : 'bg-surface-card text-muted'
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
                  className={`text-xs px-2 py-0.5 ${UI_RADIUS.pill} text-on-primary`}
                  style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                >
                  {getNodeLabel(selectedNode.type)}
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm text-muted mt-2">
                {selectedNode.meta?.case && (
                  <p><span className="text-muted-soft">Case:</span> <strong>{selectedNode.meta.case}</strong></p>
                )}
                {selectedNode.meta?.gender && (
                  <p><span className="text-muted-soft">Gender:</span> <strong>{selectedNode.meta.gender}</strong></p>
                )}
                {selectedNode.meta?.tense && (
                  <p><span className="text-muted-soft">Tense:</span> <strong>{selectedNode.meta.tense}</strong></p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Word Cloud Legend */}
      {activeView === 'wordcloud' && (
        <div className="p-4 border-t border-hairline bg-canvas">
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(CATEGORY_COLORS).slice(0, 5).map(([category, color]) => (
              <div key={category} className={`flex items-center gap-2 px-3 py-1.5 ${UI_RADIUS.pill} bg-surface-card`}>
                <div className={`w-3 h-3 ${UI_RADIUS.pill} flex-shrink-0`} style={{ backgroundColor: color }} />
                <span className="text-xs capitalize text-ink">{category}</span>
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
    </SceneShell>
  );
}

function GrammarViewFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted">
      Loading view...
    </div>
  );
}

function GrammarDataLoadingPanel({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <SurfacePanel className="flex items-center gap-3 text-sm font-semibold text-muted" padding="md">
        <Loader2 size={18} className="animate-spin text-primary" />
        {message}
      </SurfacePanel>
    </div>
  );
}
