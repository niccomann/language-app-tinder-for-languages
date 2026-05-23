import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  X,
  AlertTriangle,
  ArrowUp,
  Loader2,
  RotateCcw,
  Volume2,
  Link,
  Unlink
} from 'lucide-react';
import { api } from '../services/api';
import type { GrammarNode, ValidationStatus, ValidateSentenceResponse, ConnectionInfo } from '../types';
import { LoadingSpinner, SurfacePanel, ToolIntroGate, UI_RADIUS } from './ui';
import { GrammarBuilderFrame } from './GrammarBuilderFrame';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { buildOrderedSentence } from '../utils/sentenceBuilderOrder';
import { useAvailableGrammarNodes } from '../hooks/useAvailableGrammarNodes';
import { reportClientError } from '../utils/clientError';
import { useCopy, useTargetLanguage } from '../i18n/languageContext';
import { EASE_OUT_EXPO } from '../utils/animations';

interface Connection {
  fromId: string;
  toId: string;
}

interface SentenceBuilderProps {
  layout?: 'contained' | 'full';
}

export function SentenceBuilder({ layout = 'contained' }: SentenceBuilderProps) {
  const language = useTargetLanguage();
  const copy = useCopy();
  const { availableNodes, loading } = useAvailableGrammarNodes();
  const [selectedNodes, setSelectedNodes] = useState<GrammarNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateSentenceResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const reduce = useReducedMotion();

  const handleNodeClick = (node: GrammarNode) => {
    const isAlreadySelected = selectedNodes.some(selectedNode => selectedNode.id === node.id);
    
    if (isAlreadySelected) {
      setSelectedNodes(selectedNodes.filter(selectedNode => selectedNode.id !== node.id));
      setConnections(connections.filter(
        connection => connection.fromId !== node.id && connection.toId !== node.id
      ));
      if (connectingFrom === node.id) {
        setConnectingFrom(null);
      }
    } else {
      setSelectedNodes([...selectedNodes, node]);
    }
    
    setValidationResult(null);
  };

  const handleBuildAreaNodeClick = (nodeId: string) => {
    if (connectingFrom === null) {
      setConnectingFrom(nodeId);
    } else if (connectingFrom === nodeId) {
      setConnectingFrom(null);
    } else {
      const connectionExists = connections.some(
        connection => connection.fromId === connectingFrom && connection.toId === nodeId
      );
      
      if (!connectionExists) {
        setConnections([...connections, { fromId: connectingFrom, toId: nodeId }]);
      }
      setConnectingFrom(null);
    }
    
    setValidationResult(null);
  };

  const removeConnection = (fromId: string, toId: string) => {
    setConnections(connections.filter(
      connection => !(connection.fromId === fromId && connection.toId === toId)
    ));
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (selectedNodes.length < 2) return;
    
    setValidating(true);
    setValidationResult(null);
    
    try {
      const nodesForValidation = selectedNodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type
      }));
      
      const connectionsForValidation: ConnectionInfo[] = connections.map(connection => ({
        from_id: connection.fromId,
        to_id: connection.toId
      }));
      
      const result = await api.validateSentence({
        nodes: nodesForValidation,
        connections: connectionsForValidation,
        language,
      });
      
      setValidationResult(result);
      setValidationError(null);
    } catch (error) {
      reportClientError('Failed to validate sentence:', error);
      setValidationError('Validazione fallita. Controlla la connessione e riprova.');
    } finally {
      setValidating(false);
    }
  };

  const handleReset = () => {
    setSelectedNodes([]);
    setConnections([]);
    setConnectingFrom(null);
    setValidationResult(null);
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayAudio = async () => {
    if (!validationResult?.sentence || playingAudio) return;

    setPlayingAudio(true);
    try {
      const response = await api.generateSpeech(validationResult.sentence, language);
      if (!mountedRef.current) return;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(response.audio_base64);
      audioRef.current = audio;
      audio.onended = () => {
        if (!mountedRef.current) return;
        setPlayingAudio(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        if (!mountedRef.current) return;
        setPlayingAudio(false);
        audioRef.current = null;
      };
      await audio.play();
    } catch (error) {
      reportClientError('Failed to play audio:', error);
      if (mountedRef.current) setPlayingAudio(false);
    }
  };

  const getStatusColor = (status: ValidationStatus): string => {
    switch (status) {
      case 'green': return 'bg-success/10 border-success text-success';
      case 'yellow': return 'bg-accent-amber/10 border-accent-amber text-accent-amber';
      case 'red': return 'bg-error/10 border-error text-error';
      default: return 'bg-surface-card border-hairline text-ink';
    }
  };

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'green': return <Check className="text-success" size={24} />;
      case 'yellow': return <AlertTriangle className="text-accent-amber" size={24} />;
      case 'red': return <X className="text-error" size={24} />;
      default: return null;
    }
  };

  const getStatusLabel = (status: ValidationStatus): string => {
    switch (status) {
      case 'green': return 'Correct!';
      case 'yellow': return 'Grammar OK, but...';
      case 'red': return 'Error';
      default: return '';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Sentence Builder..." />;
  }

  return (
    <ToolIntroGate
      storageKey="sentenceBuilder"
      title={copy.sentenceBuilder.introTitle}
      steps={[copy.sentenceBuilder.selectPrompt, copy.sentenceBuilder.clickHint]}
    >
    <GrammarBuilderFrame
      nodes={availableNodes}
      selectedNodeIds={selectedNodes.map(node => node.id)}
      onWordClick={handleNodeClick}
      actionLabel="Toggle word"
      contentClassName="flex flex-col gap-3"
      layout={layout}
    >
          <SurfacePanel className={`min-h-[220px] border transition-colors duration-300 ${
            validationResult
              ? validationResult.status === 'green'
                ? 'border-success'
                : validationResult.status === 'yellow'
                  ? 'border-accent-amber'
                  : 'border-error'
              : 'border-hairline'
          }`} padding="md">
            {connectingFrom && (
              <div className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary animate-pulse">
                <Link size={14} />
                {copy.sentenceBuilder.connectHint}
              </div>
            )}

            {selectedNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-soft">
                <ArrowUp size={28} strokeWidth={2} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 justify-center py-4">
                  <AnimatePresence mode="popLayout" initial={false}>
                  {selectedNodes.map((node, index) => (
                    <motion.div
                      key={node.id}
                      layout
                      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={() => handleBuildAreaNodeClick(node.id)}
                        className={`relative px-4 py-3 ${UI_RADIUS.control} border transition-all flex flex-col items-center gap-2 min-w-[100px] ${
                          connectingFrom === node.id
                            ? 'border-primary bg-surface-card'
                            : validationResult
                              ? validationResult.status === 'green'
                                ? 'border-success bg-success/10'
                                : validationResult.status === 'yellow'
                                  ? 'border-accent-amber bg-accent-amber/10'
                                  : 'border-error bg-error/10'
                              : 'border-hairline'
                        }`}
                        style={{ borderColor: connectingFrom === node.id ? undefined : getNodeColor(node.type) }}
                      >
                        {node.image_base64 && (
                          <img src={`data:image/jpeg;base64,${node.image_base64}`} alt="" className={`w-12 h-12 ${UI_RADIUS.pill} object-cover`} />
                        )}
                        <span className="font-semibold text-ink">{node.label}</span>
                        <span
                          className={`text-xs px-2 py-0.5 ${UI_RADIUS.pill} text-on-primary`}
                          style={{ backgroundColor: getNodeColor(node.type) }}
                        >
                          {getNodeLabel(node.type)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNodeClick(node);
                          }}
                          className={`absolute -top-2 -right-2 bg-error text-on-primary ${UI_RADIUS.touchIcon} p-1 hover:opacity-90`}
                        >
                          <X size={12} />
                        </button>
                      </button>
                      
                      {index < selectedNodes.length - 1 && connections.some(
                        connection => connection.fromId === node.id
                      ) && (
                        <div className="text-primary font-semibold text-xl">→</div>
                      )}
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
                
                {connections.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-muted mb-2">Connections:</h4>
                    <div className="flex flex-wrap gap-2">
                      {connections.map((connection, index) => {
                        const fromNode = selectedNodes.find(node => node.id === connection.fromId);
                        const toNode = selectedNodes.find(node => node.id === connection.toId);
                        return (
                          <div 
                            key={index}
                            className={`flex items-center gap-1 bg-surface-card text-ink px-2 py-1 ${UI_RADIUS.pill} text-sm`}
                          >
                            <span>{fromNode?.label}</span>
                            <span>→</span>
                            <span>{toNode?.label}</span>
                            <button
                              onClick={() => removeConnection(connection.fromId, connection.toId)}
                              className="ml-1 hover:text-error"
                            >
                              <Unlink size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="text-center pt-2 border-t">
                  <p className="text-lg font-medium text-body-strong">
                    Sentence: <span className="text-primary">"{buildOrderedSentence(selectedNodes, connections)}"</span>
                  </p>
                </div>
              </div>
            )}
          </SurfacePanel>

          {validationError && (
            <motion.div
              role="alert"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
              className={`${UI_RADIUS.surface} p-4 border border-error bg-error/10 text-error text-sm`}
            >
              {validationError}
            </motion.div>
          )}

          {validationResult && (
            <motion.div
              key={validationResult.explanation}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className={`${UI_RADIUS.surface} p-4 border ${getStatusColor(validationResult.status)}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 ${UI_RADIUS.touchIcon} bg-canvas`}>
                  {getStatusIcon(validationResult.status)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {getStatusLabel(validationResult.status)}
                    {validationResult.grammar_correct && (
                      <span className={`text-xs bg-success/20 text-success px-2 py-0.5 ${UI_RADIUS.pill}`}>
                        ✓ Grammar
                      </span>
                    )}
                    {validationResult.semantic_correct && (
                      <span className={`text-xs bg-success/20 text-success px-2 py-0.5 ${UI_RADIUS.pill}`}>
                        ✓ Semantic
                      </span>
                    )}
                  </h3>
                  <p className="mt-2 text-body-strong">{validationResult.explanation}</p>
                  {validationResult.suggestion && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Suggestion:</span> {validationResult.suggestion}
                    </p>
                  )}
                </div>
                <button
                  onClick={handlePlayAudio}
                  disabled={playingAudio}
                  className={`p-3 ${UI_RADIUS.touchIcon} transition-all ${
                    playingAudio
                      ? 'bg-primary text-on-primary animate-pulse'
                      : 'bg-canvas text-body-strong'
                  }`}
                >
                  {playingAudio ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Volume2 size={20} />
                  )}
                </button>
              </div>
            </motion.div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={handleReset}
              className={`px-6 py-3 bg-surface-cream-strong text-body-strong ${UI_RADIUS.control} font-medium transition-colors flex items-center gap-2 whitespace-nowrap min-w-fit`}
            >
              <RotateCcw size={18} />
              Reset
            </button>
            <button
              onClick={handleValidate}
              disabled={selectedNodes.length < 2 || validating}
              className={`px-8 py-3 ${UI_RADIUS.control} font-medium transition-all flex items-center gap-2 whitespace-nowrap min-w-fit ${
                selectedNodes.length < 2
                  ? 'bg-surface-cream-strong text-muted cursor-not-allowed'
                  : 'bg-primary text-on-primary'
              }`}
            >
              {validating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Validate Sentence
                </>
              )}
            </button>
          </div>
    </GrammarBuilderFrame>
    </ToolIntroGate>
  );
}
