/**
 * FunSentenceBuilder - Interactive D3-based sentence composition component
 * 
 * This component allows users to:
 * - Add grammar nodes (subjects, verbs, objects) to a canvas
 * - Connect nodes by dragging them close together
 * - Validate the constructed sentence via API
 * - Zoom/pan the canvas and expand to fullscreen
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  Check, 
  AlertTriangle, 
  Loader2, 
  RotateCcw, 
  Volume2,
  X,
  Minimize2,
} from 'lucide-react';
import { api } from '../services/api';
import type { GrammarNode, ValidateSentenceResponse, ConnectionInfo } from '../types';
import { LoadingSpinner, UI_RADIUS, ZoomControlBar } from './ui';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { buildOrderedSentence } from '../utils/sentenceBuilderOrder';
import { GrammarBuilderFrame } from './GrammarBuilderFrame';
import { useAvailableGrammarNodes } from '../hooks/useAvailableGrammarNodes';
import { useZoomControls } from '../hooks/useZoomControls';
import { reportClientError } from '../utils/clientError';
import { useTargetLanguage } from '../i18n/languageContext';

// ============================================================================
// Types
// ============================================================================

/** Node in the D3 force simulation */
interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  image_base64?: string;
  sourceId: string;
}

/** Connection between two nodes */
interface SimLink {
  source: string;
  target: string;
}

// ============================================================================
// Constants
// ============================================================================

const NODE_RADIUS = 50;
const CONNECTION_THRESHOLD = 180;  // Distance to create a connection on release
const PREVIEW_THRESHOLD = 250;     // Distance to show preview arrow (larger for smoother UX)

export function FunSentenceBuilder() {
  const language = useTargetLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const connectionsRef = useRef<SimLink[]>([]);  // Synced copy of connections for D3 callbacks
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const previewRafRef = useRef<number | null>(null);
  const lastPotentialTargetIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);
  const { availableNodes, loading } = useAvailableGrammarNodes();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  const [canvasNodes, setCanvasNodes] = useState<SimNode[]>([]);
  const [connections, setConnections] = useState<SimLink[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateSentenceResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimNode | null>(null);
  const [potentialTarget, setPotentialTarget] = useState<SimNode | null>(null);

  const {
    isExpanded,
    setIsExpanded,
    toggleExpanded,
    currentZoom,
    zoomRef,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFitToView: fitNodesToView,
    initializeZoom,
  } = useZoomControls(svgRef, dimensions);

  const handleFitToView = useCallback(() => {
    const positioned = canvasNodes.map(n => {
      const pos = nodePositionsRef.current.get(n.id);
      return { x: pos?.x ?? n.x, y: pos?.y ?? n.y };
    });
    fitNodesToView(positioned, NODE_RADIUS);
  }, [fitNodesToView, canvasNodes]);


  // ==========================================================================
  // Dimension Tracking
  // ==========================================================================

  useEffect(() => {
    const apply = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const debouncedResize = () => {
      if (resizeTimeoutId !== null) clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(apply, 200);
    };
    apply();
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (resizeTimeoutId !== null) clearTimeout(resizeTimeoutId);
    };
  }, []);

  // ==========================================================================
  // Node & Connection Management
  // ==========================================================================

  /** Add a new node to the canvas from the available nodes list */
  const addNodeToCanvas = useCallback((sourceNode: GrammarNode) => {
    const newNode: SimNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      label: sourceNode.label,
      type: sourceNode.type,
      image_base64: sourceNode.image_base64,
      sourceId: sourceNode.id,
      x: dimensions.width / 2 + (Math.random() - 0.5) * 200,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 200,
    };
    
    setCanvasNodes(prev => [...prev, newNode]);
    setValidationResult(null);
  }, [dimensions]);

  const removeNodeFromCanvas = useCallback((nodeId: string) => {
    setCanvasNodes(prev => prev.filter(n => n.id !== nodeId));
    connectionsRef.current = connectionsRef.current.filter(
      c => c.source !== nodeId && c.target !== nodeId
    );
    setConnections([...connectionsRef.current]);
    setValidationResult(null);
    nodePositionsRef.current.delete(nodeId);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || canvasNodes.length === 0) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
      }
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      return;
    }

    try {
    const svg = d3.select(svgRef.current);
    const previousTransform = d3.zoomTransform(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    const nodes: SimNode[] = canvasNodes.map(n => {
      const saved = nodePositionsRef.current.get(n.id);
      return saved ? { ...n, x: saved.x, y: saved.y } : { ...n };
    });
    
    const links: { source: SimNode; target: SimNode }[] = connectionsRef.current
      .map(c => {
        const sourceNode = nodes.find(n => n.id === c.source);
        const targetNode = nodes.find(n => n.id === c.target);
        if (sourceNode && targetNode) {
          return { source: sourceNode, target: targetNode };
        }
        return null;
      })
      .filter((l): l is { source: SimNode; target: SimNode } => l !== null);

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const linkDistance = Math.max(160, Math.min(260, 140 + nodes.length * 10));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDistance).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-450))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force('collision', d3.forceCollide().radius(NODE_RADIUS + 15).strength(1))
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY(height / 2).strength(0.02))
      .alphaDecay(0.02)
      .velocityDecay(0.3);

    simulationRef.current = simulation;

    const container = svg.append('g').attr('class', 'zoom-container');
    const defs = svg.append('defs');

    initializeZoom(svgRef.current, container);

    if (zoomRef.current && previousTransform.k !== 1) {
      svg.call(zoomRef.current.transform, previousTransform);
    }

    defs.append('marker')
      .attr('id', 'arrowhead-fun')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', NODE_RADIUS + 12)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#cc785c');

    defs.append('marker')
      .attr('id', 'arrowhead-preview')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 5)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 15)
      .attr('markerHeight', 15)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#e8a55a');

    defs.append('filter')
      .attr('id', 'glow-preview')
      .html(`
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      `);

    nodes.forEach(node => {
      if (node.image_base64) {
        defs.append('pattern')
          .attr('id', `img-fun-${node.id}`)
          .attr('patternUnits', 'objectBoundingBox')
          .attr('width', 1)
          .attr('height', 1)
          .append('image')
          .attr('href', `data:image/jpeg;base64,${node.image_base64}`)
          .attr('width', NODE_RADIUS * 2)
          .attr('height', NODE_RADIUS * 2)
          .attr('preserveAspectRatio', 'xMidYMid slice');
      }
    });

    const linkGroup = container.append('g').attr('class', 'links');
    const nodeGroup = container.append('g').attr('class', 'nodes');
    const previewGroup = container.append('g').attr('class', 'preview');

    const linkElements = linkGroup
      .selectAll('g.link')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'link');

    linkElements
      .append('line')
      .attr('stroke', '#cc785c')
      .attr('stroke-width', 3)
      .attr('marker-end', 'url(#arrowhead-fun)');

    linkElements
      .append('circle')
      .attr('r', 12)
      .attr('fill', '#faf9f5')
      .attr('stroke', '#cc785c')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation();
        // Remove from DOM
        d3.select(this.parentNode as SVGGElement).remove();
        // Remove from refs and state
        connectionsRef.current = connectionsRef.current.filter(
          c => !(c.source === d.source.id && c.target === d.target.id)
        );
        setConnections([...connectionsRef.current]);
        setValidationResult(null);
      });

    linkElements
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#cc785c')
      .attr('cursor', 'pointer')
      .text('×')
      .on('click', function(event, d) {
        event.stopPropagation();
        // Remove from DOM
        d3.select(this.parentNode as SVGGElement).remove();
        // Remove from refs and state
        connectionsRef.current = connectionsRef.current.filter(
          c => !(c.source === d.source.id && c.target === d.target.id)
        );
        setConnections([...connectionsRef.current]);
        setValidationResult(null);
      });

    let currentTarget: SimNode | null = null;

    const nodeElements = nodeGroup
      .selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'grab')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', function(event, d) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          setDraggedNode(d);
          d3.select(this).attr('cursor', 'grabbing');
        })
        .on('drag', function(event, d) {
          d.fx = event.x;
          d.fy = event.y;

          const dragX = event.x;
          const dragY = event.y;

          if (previewRafRef.current !== null) {
            cancelAnimationFrame(previewRafRef.current);
          }
          previewRafRef.current = requestAnimationFrame(() => {
            previewRafRef.current = null;

            // Find closest node for preview (using larger threshold)
            let closestNode: SimNode | undefined;
            let closestDistance = Infinity;

            nodes.forEach(n => {
              if (n.id === d.id) return;
              const dx = (n.x || 0) - dragX;
              const dy = (n.y || 0) - dragY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < PREVIEW_THRESHOLD && dist < closestDistance) {
                closestDistance = dist;
                closestNode = n;
              }
            });

            // Only set as connection target if within connection threshold
            const nearNode = closestDistance < CONNECTION_THRESHOLD ? closestNode ?? null : null;
            currentTarget = nearNode || null;
            const newTargetId = currentTarget?.id ?? null;
            if (lastPotentialTargetIdRef.current !== newTargetId) {
              lastPotentialTargetIdRef.current = newTargetId;
              setPotentialTarget(currentTarget);
            }

            previewGroup.selectAll('*').remove();

            // Show preview for any node within preview threshold
            if (closestNode !== undefined) {
              const sourceX = dragX;
              const sourceY = dragY;
              const targetX = closestNode.x || 0;
              const targetY = closestNode.y || 0;
            
            // Progress based on preview threshold (0 at edge, 1 at connection threshold)
            const previewProgress = Math.max(0, 1 - closestDistance / PREVIEW_THRESHOLD);
            // Stronger progress when within connection threshold
            const connectionProgress = closestDistance < CONNECTION_THRESHOLD 
              ? Math.max(0, 1 - closestDistance / CONNECTION_THRESHOLD)
              : 0;
            
            // Base opacity increases as you get closer
            const baseOpacity = 0.2 + previewProgress * 0.4 + connectionProgress * 0.4;
            const strokeWidth = 2 + previewProgress * 3 + connectionProgress * 3;
            
            previewGroup
              .append('line')
              .attr('class', 'preview-line')
              .attr('x1', sourceX)
              .attr('y1', sourceY)
              .attr('x2', targetX)
              .attr('y2', targetY)
              .attr('stroke', `rgba(204, 120, 92, ${baseOpacity})`)
              .attr('stroke-width', strokeWidth)
              .attr('stroke-linecap', 'round')
              .attr('filter', 'url(#glow-preview)')
              .attr('marker-end', 'url(#arrowhead-preview)');

            // Target ring - more visible when closer
            previewGroup
              .append('circle')
              .attr('cx', targetX)
              .attr('cy', targetY)
              .attr('r', NODE_RADIUS + 15 + connectionProgress * 15)
              .attr('fill', 'none')
              .attr('stroke', connectionProgress > 0 ? '#cc785c' : '#5db8a6')
              .attr('stroke-width', 2 + connectionProgress * 2)
              .attr('stroke-dasharray', connectionProgress > 0 ? '8,4' : '4,8')
              .attr('opacity', 0.2 + previewProgress * 0.3 + connectionProgress * 0.5);

            // Source indicator
            previewGroup
              .append('circle')
              .attr('cx', sourceX)
              .attr('cy', sourceY)
              .attr('r', 6 + connectionProgress * 4)
              .attr('fill', connectionProgress > 0 ? '#cc785c' : '#5db8a6')
              .attr('opacity', 0.5 + connectionProgress * 0.4);
            
            // "Ready to connect" indicator when within connection threshold
            if (connectionProgress > 0.5) {
              previewGroup
                .append('text')
                .attr('x', (sourceX + targetX) / 2)
                .attr('y', (sourceY + targetY) / 2 - 20)
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .attr('fill', '#cc785c')
                .attr('opacity', connectionProgress)
                .text('Release to connect.');
            }
            }
          });
        })
        .on('end', function(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          if (previewRafRef.current !== null) {
            cancelAnimationFrame(previewRafRef.current);
            previewRafRef.current = null;
          }
          lastPotentialTargetIdRef.current = null;
          
          if (currentTarget) {
            const existsInRef = connectionsRef.current.some(
              c => c.source === d.id && c.target === currentTarget!.id
            );
            if (!existsInRef) {
              // Add connection to ref immediately
              const newConnection = { source: d.id, target: currentTarget!.id };
              connectionsRef.current = [...connectionsRef.current, newConnection];
              
              // Create link in D3 directly without React re-render
              const sourceNode = nodes.find(n => n.id === d.id);
              const targetNode = nodes.find(n => n.id === currentTarget!.id);
              
              // Capture IDs in local variables for closure
              const sourceId = d.id;
              const targetId = currentTarget!.id;
              
              if (sourceNode && targetNode) {
                const newLinkData = { source: sourceNode, target: targetNode };
                
                const newLink = linkGroup.append('g').attr('class', 'link');
                
                newLink.append('line')
                  .attr('stroke', '#cc785c')
                  .attr('stroke-width', 3)
                  .attr('marker-end', 'url(#arrowhead-fun)')
                  .attr('x1', sourceNode.x || 0)
                  .attr('y1', sourceNode.y || 0)
                  .attr('x2', targetNode.x || 0)
                  .attr('y2', targetNode.y || 0);
                
                const midX = ((sourceNode.x || 0) + (targetNode.x || 0)) / 2;
                const midY = ((sourceNode.y || 0) + (targetNode.y || 0)) / 2;
                
                // Delete button function
                const removeThisLink = function(e: Event) {
                  e.stopPropagation();
                  connectionsRef.current = connectionsRef.current.filter(
                    c => !(c.source === sourceId && c.target === targetId)
                  );
                  newLink.remove();
                  setConnections([...connectionsRef.current]);
                  setValidationResult(null);
                };
                
                newLink.append('circle')
                  .attr('r', 12)
                  .attr('fill', '#faf9f5')
                  .attr('stroke', '#cc785c')
                  .attr('stroke-width', 2)
                  .attr('cursor', 'pointer')
                  .attr('cx', midX)
                  .attr('cy', midY)
                  .on('click', removeThisLink);
                
                newLink.append('text')
                  .attr('text-anchor', 'middle')
                  .attr('dominant-baseline', 'middle')
                  .attr('font-size', '14px')
                  .attr('font-weight', 'bold')
                  .attr('fill', '#cc785c')
                  .attr('cursor', 'pointer')
                  .attr('x', midX)
                  .attr('y', midY + 1)
                  .text('×')
                  .on('click', removeThisLink);
                
                // Store link data for tick updates
                newLink.datum(newLinkData);
              }
              
              // Sync to React state without triggering D3 rebuild
              setTimeout(() => {
                setConnections([...connectionsRef.current]);
                setValidationResult(null);
              }, 0);
            }
          }
          
          d.fx = null;
          d.fy = null;
          currentTarget = null;
          setDraggedNode(null);
          setPotentialTarget(null);
          previewGroup.selectAll('*').remove();
          d3.select(this).attr('cursor', 'grab');
        })
      );

    nodeElements
      .append('circle')
      .attr('r', NODE_RADIUS + 4)
      .attr('fill', d => d.image_base64 ? `url(#img-fun-${d.id})` : getNodeColor(d.type))
      .attr('stroke', d => getNodeColor(d.type))
      .attr('stroke-width', 4)
      .attr('filter', 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))');

    nodeElements
      .append('circle')
      .attr('class', 'highlight-ring')
      .attr('r', NODE_RADIUS + 12)
      .attr('fill', 'none')
      .attr('stroke', '#cc785c')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8,4')
      .attr('opacity', 0);

    nodeElements
      .append('rect')
      .attr('x', -35)
      .attr('y', NODE_RADIUS + 8)
      .attr('width', 70)
      .attr('height', 20)
      .attr('rx', 10)
      .attr('fill', d => getNodeColor(d.type));

    nodeElements
      .append('text')
      .attr('y', NODE_RADIUS + 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', 'white')
      .text(d => getNodeLabel(d.type));

    nodeElements
      .append('text')
      .attr('y', NODE_RADIUS + 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('font-weight', '700')
      .attr('fill', '#141413')
      .text(d => d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label);

    const deleteButtons = nodeElements
      .append('g')
      .attr('class', 'delete-btn')
      .attr('transform', `translate(${NODE_RADIUS - 5}, ${-NODE_RADIUS + 5})`)
      .attr('cursor', 'pointer')
      .attr('opacity', 0)
      .on('click', function(event, d) {
        event.stopPropagation();
        removeNodeFromCanvas(d.id);
      });

    deleteButtons
      .append('circle')
      .attr('r', 14)
      .attr('fill', '#cc785c')
      .attr('stroke', '#faf9f5')
      .attr('stroke-width', 2);

    deleteButtons
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('×');

    nodeElements
      .on('mouseover', function(_, d) {
        setHoveredNode(d);
        d3.select(this).select('.delete-btn').attr('opacity', 1);
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', NODE_RADIUS + 8);
      })
      .on('mouseout', function() {
        setHoveredNode(null);
        d3.select(this).select('.delete-btn').attr('opacity', 0);
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', NODE_RADIUS + 4);
      });

    simulation.on('tick', () => {
      // Update ALL links in the linkGroup (including dynamically created ones)
      linkGroup.selectAll('g.link').each(function() {
        const linkEl = d3.select(this);
        const d = linkEl.datum() as { source: SimNode; target: SimNode } | undefined;
        if (d && d.source && d.target) {
          linkEl.select('line')
            .attr('x1', d.source.x || 0)
            .attr('y1', d.source.y || 0)
            .attr('x2', d.target.x || 0)
            .attr('y2', d.target.y || 0);

          const midX = ((d.source.x || 0) + (d.target.x || 0)) / 2;
          const midY = ((d.source.y || 0) + (d.target.y || 0)) / 2;

          linkEl.select('circle')
            .attr('cx', midX)
            .attr('cy', midY);

          linkEl.select('text')
            .attr('x', midX)
            .attr('y', midY + 1);
        }
      });

      nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);

      for (const n of nodes) {
        if (typeof n.x === 'number' && typeof n.y === 'number') {
          nodePositionsRef.current.set(n.id, { x: n.x, y: n.y });
        }
      }
    });

    } catch (error) {
      reportClientError('D3 rendering error:', error);
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      if (previewRafRef.current !== null) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
    };
  // We intentionally exclude `canvasNodes`, `connections`, and `connectionsRef`
  // from the deps. `canvasNodes` content changes (node add/remove) trigger a
  // length change which IS in the deps. `connections` is consumed via
  // `connectionsRef.current` to avoid rebuilding the whole simulation on every
  // link add/remove (links are synced into the live D3 selection elsewhere).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasNodes.length, dimensions.width, dimensions.height, isExpanded, initializeZoom]);

  const handleValidate = async () => {
    if (canvasNodes.length < 2) return;

    setValidating(true);
    setValidationResult(null);
    setValidationError(null);

    try {
      const nodesForValidation = canvasNodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type
      }));

      const connectionsForValidation: ConnectionInfo[] = connections.map(c => ({
        from_id: c.source,
        to_id: c.target
      }));

      const result = await api.validateSentence({
        nodes: nodesForValidation,
        connections: connectionsForValidation,
        language,
      });

      setValidationResult(result);
    } catch (error) {
      reportClientError('Failed to validate sentence:', error);
      setValidationError('Validazione fallita. Controlla la connessione e riprova.');
    } finally {
      setValidating(false);
    }
  };

  const handleReset = () => {
    setCanvasNodes([]);
    setConnections([]);
    connectionsRef.current = [];
    setValidationResult(null);
  };

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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'green': return 'bg-success/10 border-success text-success';
      case 'yellow': return 'bg-accent-amber/10 border-accent-amber text-accent-amber';
      case 'red': return 'bg-error/10 border-error text-error';
      default: return 'bg-surface-card border-hairline text-ink';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return <Check className="text-success" size={24} />;
      case 'yellow': return <AlertTriangle className="text-accent-amber" size={24} />;
      case 'red': return <X className="text-error" size={24} />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'green': return 'Perfect!';
      case 'yellow': return 'Grammar OK, but...';
      case 'red': return 'Error';
      default: return '';
    }
  };
  const orderedConnections = connections.map(connection => ({
    fromId: connection.source,
    toId: connection.target,
  }));
  const builtSentence = buildOrderedSentence(canvasNodes, orderedConnections);

  const renderSentenceActions = ({
    compact = false,
    showClose = false,
  }: {
    compact?: boolean;
    showClose?: boolean;
  }) => {
    const resetSize = compact ? 'px-4 py-2' : 'px-6 py-3';
    const validateSize = compact ? 'px-4 py-2' : 'px-8 py-3';
    const iconSize = compact ? 16 : 18;

    return (
      <div className={`flex justify-center ${compact ? 'gap-3' : 'gap-4'}`}>
        <button
          onClick={handleReset}
          className={`${resetSize} ${UI_RADIUS.control} font-medium transition-all flex items-center gap-2 bg-surface-cream-strong text-body-strong`}
        >
          <RotateCcw size={iconSize} />
          Reset
        </button>
        <button
          onClick={handleValidate}
          disabled={canvasNodes.length < 2 || validating}
          className={`${validateSize} ${UI_RADIUS.control} font-semibold transition-all flex items-center gap-2 ${
            canvasNodes.length < 2
              ? 'bg-surface-cream-strong text-muted cursor-not-allowed'
              : 'bg-primary text-on-primary'
          }`}
        >
          {validating ? (
            <>
              <Loader2 size={iconSize} className="animate-spin" />
              {compact ? 'Check' : 'Validating...'}
            </>
          ) : (
            <>
              <Check size={iconSize} />
              {compact ? 'Check' : 'Check Sentence'}
            </>
          )}
        </button>
        {showClose && (
          <button
            onClick={() => setIsExpanded(false)}
            className={`${resetSize} ${UI_RADIUS.control} font-medium transition-all flex items-center gap-2 bg-surface-dark text-on-dark`}
          >
            <Minimize2 size={iconSize} />
            Close
          </button>
        )}
      </div>
    );
  };

  const renderValidationPanel = (variant: 'floating' | 'inline') => {
    if (validationError && !validationResult) {
      const isFloating = variant === 'floating';
      return (
        <div
          role="alert"
          className={
            isFloating
              ? `absolute top-4 right-4 max-w-md ${UI_RADIUS.surface} p-4 border border-error bg-error/10 text-error text-sm`
              : `${UI_RADIUS.surface} p-4 border mb-4 border-error bg-error/10 text-error text-sm`
          }
        >
          {validationError}
        </div>
      );
    }
    if (!validationResult) return null;

    const isFloating = variant === 'floating';

    return (
      <div
        className={
          isFloating
            ? `absolute top-4 right-4 max-w-md ${UI_RADIUS.surface} p-4 border ${getStatusColor(validationResult.status)}`
            : `${UI_RADIUS.surface} p-4 border mb-4 ${getStatusColor(validationResult.status)}`
        }
      >
        <div className={`flex items-start ${isFloating ? 'gap-3' : 'gap-4'}`}>
          <div className={`p-2 ${UI_RADIUS.touchIcon} bg-canvas`}>
            {getStatusIcon(validationResult.status)}
          </div>
          <div className="flex-1">
            <h3 className={isFloating ? 'font-semibold' : 'text-lg font-semibold flex items-center gap-2'}>
              {getStatusLabel(validationResult.status)}
              {!isFloating && validationResult.grammar_correct && (
                <span className={`text-xs bg-success/20 text-success px-2 py-0.5 ${UI_RADIUS.pill}`}>
                  ✓ Grammar
                </span>
              )}
              {!isFloating && validationResult.semantic_correct && (
                <span className={`text-xs bg-success/20 text-success px-2 py-0.5 ${UI_RADIUS.pill}`}>
                  ✓ Semantics
                </span>
              )}
            </h3>
            <p className={isFloating ? 'text-sm mt-1' : 'mt-2 text-body-strong'}>{validationResult.explanation}</p>
            {!isFloating && validationResult.suggestion && (
              <p className="mt-2 text-sm">
                <span className="font-medium">Suggestion:</span> {validationResult.suggestion}
              </p>
            )}
          </div>
          {!isFloating && (
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
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (isExpanded) {
    return (
      <div 
        ref={containerRef}
        className="fixed inset-0 z-50 bg-surface-dark"
      >
        <svg ref={svgRef} width="100%" height="100%" style={{ cursor: 'grab' }} />

        <ZoomControlBar
          currentZoom={currentZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onFitToView={handleFitToView}
          isExpanded
          onToggleExpand={() => setIsExpanded(false)}
          position="top-left"
          size="lg"
        />

        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 p-4 ${UI_RADIUS.surface} bg-surface-dark-elevated`}>
          <p className="text-center font-medium mb-3 text-on-dark">
            Sentence: <span className="text-on-dark-soft">"{builtSentence}"</span>
          </p>
          {renderSentenceActions({ compact: true, showClose: true })}
        </div>

        {renderValidationPanel('floating')}
      </div>
    );
  }

  return (
    <GrammarBuilderFrame
        nodes={availableNodes}
        selectedNodeIds={canvasNodes.map(node => node.sourceId)}
        onWordClick={addNodeToCanvas}
        actionLabel="Add word to graph"
        contentClassName="flex min-h-[560px] flex-col"
      >

      <div 
        ref={containerRef}
        className={`relative overflow-hidden bg-surface-dark ${isExpanded ? 'fixed inset-0 z-50' : ''}`}
        style={{ minHeight: '400px', flex: 1 }}
      >
        <svg ref={svgRef} width="100%" height="100%" style={{ cursor: 'grab' }} />

        <ZoomControlBar
          currentZoom={currentZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onFitToView={handleFitToView}
          isExpanded={false}
          onToggleExpand={() => setIsExpanded(true)}
          position="top-left"
          size="lg"
        />

        {canvasNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`text-center p-8 ${UI_RADIUS.surface} bg-surface-dark-elevated`}>
              <p className="text-lg font-medium text-on-dark">
                Click the + buttons to add nodes.
              </p>
              <p className="text-sm mt-2 text-on-dark-soft">
                Then drag them onto each other to connect them.
              </p>
              <p className="text-xs mt-4 text-on-dark-soft">
                Scroll to zoom · drag to move
              </p>
            </div>
          </div>
        )}

        {hoveredNode && (
          <div className={`absolute top-4 right-4 ${UI_RADIUS.surface} p-4 border border-hairline bg-canvas min-w-[180px]`}>
            <div className="text-lg font-semibold mb-1 text-ink">{hoveredNode.label}</div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 ${UI_RADIUS.pill}`}
                style={{ backgroundColor: getNodeColor(hoveredNode.type) }}
              />
              <span className="text-xs text-body-strong">{getNodeLabel(hoveredNode.type)}</span>
            </div>
          </div>
        )}

        {draggedNode && potentialTarget && (
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 ${UI_RADIUS.pill} bg-primary text-on-primary font-medium animate-pulse`}>
            Release to connect to "{potentialTarget.label}"
          </div>
        )}
      </div>

      <div className="p-4 border-t border-hairline bg-canvas">
        {canvasNodes.length > 0 && (
          <div className="text-center mb-4">
            <p className="text-lg text-body-strong">
              Sentence: <span className="font-semibold text-primary">"{builtSentence}"</span>
            </p>
          </div>
        )}
        {renderValidationPanel('inline')}
        {renderSentenceActions({ compact: false })}
      </div>
    </GrammarBuilderFrame>
  );
}
