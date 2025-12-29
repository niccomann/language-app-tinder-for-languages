import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { ArrowLeft, Play, Info, Volume2, Loader2 } from 'lucide-react';
import type { GrammarSentence, GrammarNode } from '../types';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { api } from '../services/api';

interface GrammarGraphProps {
  sentence: GrammarSentence;
  onNext: () => void;
  onBack: () => void;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  image_url?: string;
  meta?: GrammarNode['meta'];
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  label: string;
}

export function GrammarGraph({ sentence, onNext, onBack }: GrammarGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GrammarNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  
  const [audioCache, setAudioCache] = useState<Record<string, boolean>>({});
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const checkAudioCache = useCallback(async () => {
    const textsToCheck = [sentence.german, ...sentence.nodes.map(node => node.label)];
    try {
      const response = await api.checkAudioExists(textsToCheck);
      setAudioCache(response.results);
    } catch (error) {
      console.error('Failed to check audio cache:', error);
    }
  }, [sentence]);

  useEffect(() => {
    checkAudioCache();
  }, [checkAudioCache]);

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

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const { width, height } = svgRef.current.parentElement.getBoundingClientRect();
        setDimensions({ width, height: height - 50 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const nodeRadius = 45;

    const nodes: SimulationNode[] = sentence.nodes.map((node) => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));

    const links: SimulationLink[] = sentence.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink<SimulationNode, SimulationLink>(links).id((d) => d.id).distance(180))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(nodeRadius + 20));

    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', nodeRadius + 10)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#94A3B8');

    const linkGroup = svg.append('g').attr('class', 'links');
    const link = linkGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#CBD5E1')
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', 'url(#arrowhead)');

    const linkLabelGroup = svg.append('g').attr('class', 'link-labels');
    const linkLabel = linkLabelGroup
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#64748B')
      .attr('text-anchor', 'middle')
      .attr('dy', -8)
      .text((d) => d.label);

    const nodeGroup = svg.append('g').attr('class', 'nodes');

    const node = nodeGroup
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(
        d3.drag<SVGGElement, SimulationNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            d3.select(event.sourceEvent.target.closest('g')).attr('cursor', 'grabbing');
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            d3.select(event.sourceEvent.target.closest('g')).attr('cursor', 'grab');
          })
      );

    node
      .append('circle')
      .attr('r', nodeRadius + 4)
      .attr('fill', 'white')
      .attr('stroke', (d) => getNodeColor(d.type))
      .attr('stroke-width', 4)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

    node
      .append('clipPath')
      .attr('id', (d) => `clip-${d.id}`)
      .append('circle')
      .attr('r', nodeRadius);

    node
      .append('image')
      .attr('xlink:href', (d) => d.image_url || 'https://via.placeholder.com/100')
      .attr('x', -nodeRadius)
      .attr('y', -nodeRadius)
      .attr('width', nodeRadius * 2)
      .attr('height', nodeRadius * 2)
      .attr('clip-path', (d) => `url(#clip-${d.id})`)
      .attr('preserveAspectRatio', 'xMidYMid slice');

    node
      .append('rect')
      .attr('x', -40)
      .attr('y', nodeRadius + 8)
      .attr('width', 80)
      .attr('height', 22)
      .attr('rx', 11)
      .attr('fill', (d) => getNodeColor(d.type));

    node
      .append('text')
      .attr('y', nodeRadius + 23)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', 'white')
      .text((d) => getNodeLabel(d.type));

    node
      .append('text')
      .attr('y', nodeRadius + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .attr('fill', '#1E293B')
      .text((d) => d.label);

    node.on('click', (event, d) => {
      event.stopPropagation();
      const originalNode = sentence.nodes.find((n) => n.id === d.id);
      setSelectedNode(originalNode || null);
    });

    svg.on('click', () => setSelectedNode(null));

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimulationNode).x!)
        .attr('y1', (d) => (d.source as SimulationNode).y!)
        .attr('x2', (d) => (d.target as SimulationNode).x!)
        .attr('y2', (d) => (d.target as SimulationNode).y!);

      linkLabel
        .attr('x', (d) => ((d.source as SimulationNode).x! + (d.target as SimulationNode).x!) / 2)
        .attr('y', (d) => ((d.source as SimulationNode).y! + (d.target as SimulationNode).y!) / 2);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [sentence, dimensions]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-50 to-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md shadow-sm">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Grammar Lab 🧪
          </h2>
          <p className="text-sm text-gray-500">Drag nodes to explore</p>
        </div>
        <button
          onClick={onNext}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-semibold transition-all hover:scale-105 flex items-center gap-2 shadow-md"
        >
          Next <Play size={16} />
        </button>
      </div>

      {/* Sentence Display */}
      <div className="text-center py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{sentence.german}</h1>
          <button
            onClick={() => playAudio(sentence.german)}
            disabled={loadingAudio === sentence.german}
            className={`p-2 rounded-full transition-all ${
              playingAudio === sentence.german
                ? 'bg-blue-500 text-white animate-pulse'
                : audioCache[sentence.german]
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={audioCache[sentence.german] ? 'Play (cached)' : 'Generate & Play'}
          >
            {loadingAudio === sentence.german ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Volume2 size={20} />
            )}
          </button>
        </div>
        <p className="text-base text-gray-500">{sentence.english}</p>
      </div>

      {/* Graph Area */}
      <div className="flex-1 relative">
        <svg ref={svgRef} width="100%" height="100%" className="bg-gradient-to-br from-gray-50 to-slate-100" />
      </div>

      {/* Bottom Info Panel */}
      {selectedNode && (
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
                  className={`p-1.5 rounded-full transition-all ${
                    playingAudio === selectedNode.label
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
                  <p>
                    <span className="text-gray-400">Case:</span> <strong>{selectedNode.meta.case}</strong>
                  </p>
                )}
                {selectedNode.meta?.gender && (
                  <p>
                    <span className="text-gray-400">Gender:</span> <strong>{selectedNode.meta.gender}</strong>
                  </p>
                )}
                {selectedNode.meta?.number && (
                  <p>
                    <span className="text-gray-400">Number:</span> <strong>{selectedNode.meta.number}</strong>
                  </p>
                )}
                {selectedNode.meta?.tense && (
                  <p>
                    <span className="text-gray-400">Tense:</span> <strong>{selectedNode.meta.tense}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
