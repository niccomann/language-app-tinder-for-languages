import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Check, 
  X, 
  AlertTriangle, 
  Loader2, 
  RotateCcw, 
  Volume2,
  Link,
  Unlink
} from 'lucide-react';
import { api } from '../services/api';
import type { GrammarNode, ValidationStatus, ValidateSentenceResponse, ConnectionInfo } from '../types';
import { LoadingSpinner } from './ui';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SentenceBuilderProps {
  onBack: () => void;
}

interface BuilderNode extends GrammarNode {
  selected?: boolean;
  order?: number;
}

interface Connection {
  fromId: string;
  toId: string;
}

export function SentenceBuilder({ onBack }: SentenceBuilderProps) {
  const [availableNodes, setAvailableNodes] = useState<GrammarNode[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<BuilderNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateSentenceResponse | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const { isDark } = useTheme();
  const { language } = useLanguage();

  useEffect(() => {
    loadAvailableNodes();
  }, []);

  const loadAvailableNodes = async () => {
    setLoading(true);
    try {
      const nodes = await api.getAvailableNodes();
      setAvailableNodes(nodes);
    } catch (error) {
      console.error('Failed to load available nodes:', error);
    } finally {
      setLoading(false);
    }
  };

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
      setSelectedNodes([...selectedNodes, { ...node, order: selectedNodes.length }]);
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
    } catch (error) {
      console.error('Failed to validate sentence:', error);
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

  const handlePlayAudio = async () => {
    if (!validationResult?.sentence || playingAudio) return;
    
    setPlayingAudio(true);
    try {
      const response = await api.generateSpeech(validationResult.sentence);
      const audio = new Audio(response.audio_base64);
      audio.onended = () => setPlayingAudio(false);
      audio.onerror = () => setPlayingAudio(false);
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setPlayingAudio(false);
    }
  };

  const getStatusColor = (status: ValidationStatus): string => {
    switch (status) {
      case 'green': return 'bg-green-100 border-green-500 text-green-800';
      case 'yellow': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'red': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'green': return <Check className="text-green-600" size={24} />;
      case 'yellow': return <AlertTriangle className="text-yellow-600" size={24} />;
      case 'red': return <X className="text-red-600" size={24} />;
      default: return null;
    }
  };

  const getStatusLabel = (status: ValidationStatus): string => {
    switch (status) {
      case 'green': return 'Corretto!';
      case 'yellow': return 'Grammatica OK, ma...';
      case 'red': return 'Errore';
      default: return '';
    }
  };

  const getBuiltSentence = (): string => {
    if (connections.length === 0) {
      return selectedNodes.map(node => node.label).join(' ');
    }
    
    const nodeMap = new Map(selectedNodes.map(node => [node.id, node]));
    const fromIds = new Set(connections.map(connection => connection.fromId));
    const toIds = new Set(connections.map(connection => connection.toId));
    const startIds = [...fromIds].filter(id => !toIds.has(id));
    
    if (startIds.length === 0 && connections.length > 0) {
      startIds.push(connections[0].fromId);
    }
    
    const orderedLabels: string[] = [];
    const visited = new Set<string>();
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId) || !nodeMap.has(nodeId)) return;
      visited.add(nodeId);
      orderedLabels.push(nodeMap.get(nodeId)!.label);
      
      for (const connection of connections) {
        if (connection.fromId === nodeId) {
          traverse(connection.toId);
        }
      }
    };
    
    for (const startId of startIds) {
      traverse(startId);
    }
    
    for (const node of selectedNodes) {
      if (!visited.has(node.id)) {
        orderedLabels.push(node.label);
      }
    }
    
    return orderedLabels.join(' ');
  };

  const groupedNodes = {
    subjects: availableNodes.filter(node => node.type === 'subject'),
    verbs: availableNodes.filter(node => node.type === 'predicate'),
    objects: availableNodes.filter(node => node.type === 'object' || node.type === 'direct_object')
  };

  if (loading) {
    return <LoadingSpinner message="Loading Sentence Builder..." fullScreen />;
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 to-white'}`}>
      <div className={`border-b shadow-sm transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className={`flex items-center gap-2 transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold text-purple-600 flex items-center gap-2">
            🧩 Sentence Builder
          </h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className={`rounded-xl shadow-md p-4 transition-colors duration-300 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              📦 Available Nodes
              <span className={`text-sm font-normal ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>(click to add)</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-blue-600 mb-2">Subjects (Soggetti)</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedNodes.subjects.map(node => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        selectedNodes.some(selectedNode => selectedNode.id === node.id)
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {node.image_base64 && (
                        <img src={`data:image/jpeg;base64,${node.image_base64}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <span className="font-medium">{node.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-red-600 mb-2">Verbs (Verbi)</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedNodes.verbs.map(node => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        selectedNodes.some(selectedNode => selectedNode.id === node.id)
                          ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
                      }`}
                    >
                      {node.image_base64 && (
                        <img src={`data:image/jpeg;base64,${node.image_base64}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <span className="font-medium">{node.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-green-600 mb-2">Objects (Oggetti)</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedNodes.objects.map(node => (
                    <button
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        selectedNodes.some(selectedNode => selectedNode.id === node.id)
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      {node.image_base64 && (
                        <img src={`data:image/jpeg;base64,${node.image_base64}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <span className="font-medium">{node.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-xl shadow-md p-4 border-2 transition-colors duration-300 ${isDark ? 'bg-slate-800' : 'bg-white'} ${
            validationResult 
              ? validationResult.status === 'green' 
                ? 'border-green-400' 
                : validationResult.status === 'yellow' 
                  ? 'border-yellow-400' 
                  : 'border-red-400'
              : isDark ? 'border-slate-600' : 'border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              🔨 Build Area
              {connectingFrom && (
                <span className="text-sm font-normal text-purple-600 animate-pulse flex items-center gap-1">
                  <Link size={14} />
                  Click another node to connect
                </span>
              )}
            </h2>
            
            {selectedNodes.length === 0 ? (
              <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                <p className="text-lg">Select nodes from above to start building</p>
                <p className="text-sm mt-2">Click nodes to add them, then connect them in order</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 justify-center py-4">
                  {selectedNodes.map((node, index) => (
                    <div key={node.id} className="flex items-center gap-2">
                      <button
                        onClick={() => handleBuildAreaNodeClick(node.id)}
                        className={`relative px-4 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 min-w-[100px] ${
                          connectingFrom === node.id
                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300 scale-105'
                            : validationResult
                              ? validationResult.status === 'green'
                                ? 'border-green-400 bg-green-50'
                                : validationResult.status === 'yellow'
                                  ? 'border-yellow-400 bg-yellow-50'
                                  : 'border-red-400 bg-red-50'
                              : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                        style={{ borderColor: connectingFrom === node.id ? undefined : getNodeColor(node.type) }}
                      >
                        {node.image_base64 && (
                          <img src={`data:image/jpeg;base64,${node.image_base64}`} alt="" className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <span className="font-semibold text-gray-800">{node.label}</span>
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: getNodeColor(node.type) }}
                        >
                          {getNodeLabel(node.type)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNodeClick(node);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      </button>
                      
                      {index < selectedNodes.length - 1 && connections.some(
                        connection => connection.fromId === node.id
                      ) && (
                        <div className="text-purple-500 font-bold text-xl">→</div>
                      )}
                    </div>
                  ))}
                </div>
                
                {connections.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Connections:</h4>
                    <div className="flex flex-wrap gap-2">
                      {connections.map((connection, index) => {
                        const fromNode = selectedNodes.find(node => node.id === connection.fromId);
                        const toNode = selectedNodes.find(node => node.id === connection.toId);
                        return (
                          <div 
                            key={index}
                            className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm"
                          >
                            <span>{fromNode?.label}</span>
                            <span>→</span>
                            <span>{toNode?.label}</span>
                            <button
                              onClick={() => removeConnection(connection.fromId, connection.toId)}
                              className="ml-1 hover:text-red-600"
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
                  <p className="text-lg font-medium text-gray-700">
                    Sentence: <span className="text-purple-600">"{getBuiltSentence()}"</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {validationResult && (
            <div className={`rounded-xl shadow-md p-4 border-2 ${getStatusColor(validationResult.status)}`}>
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-white shadow">
                  {getStatusIcon(validationResult.status)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {getStatusLabel(validationResult.status)}
                    {validationResult.grammar_correct && (
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                        ✓ Grammar
                      </span>
                    )}
                    {validationResult.semantic_correct && (
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                        ✓ Semantic
                      </span>
                    )}
                  </h3>
                  <p className="mt-2 text-gray-700">{validationResult.explanation}</p>
                  {validationResult.suggestion && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">💡 Suggestion:</span> {validationResult.suggestion}
                    </p>
                  )}
                </div>
                <button
                  onClick={handlePlayAudio}
                  disabled={playingAudio}
                  className={`p-3 rounded-full transition-all ${
                    playingAudio 
                      ? 'bg-blue-500 text-white animate-pulse' 
                      : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {playingAudio ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Volume2 size={20} />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={handleReset}
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors flex items-center gap-2 whitespace-nowrap min-w-fit"
            >
              <RotateCcw size={18} />
              Reset
            </button>
            <button
              onClick={handleValidate}
              disabled={selectedNodes.length < 2 || validating}
              className={`px-10 py-4 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap min-w-fit ${
                selectedNodes.length < 2
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
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
        </div>
      </div>
    </div>
  );
}
