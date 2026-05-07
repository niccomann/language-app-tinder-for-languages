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
import { useTheme } from '../contexts/useTheme';
import { GrammarBuilderFrame } from './GrammarBuilderFrame';

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
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const connectionsRef = useRef<SimLink[]>([]);  // Synced copy of connections for D3 callbacks
  
  const [availableNodes, setAvailableNodes] = useState<GrammarNode[]>([]);
  const [canvasNodes, setCanvasNodes] = useState<SimNode[]>([]);
  const [connections, setConnections] = useState<SimLink[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateSentenceResponse | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimNode | null>(null);
  const [potentialTarget, setPotentialTarget] = useState<SimNode | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  
  const { isDark } = useTheme();

  // ==========================================================================
  // Data Loading
  // ==========================================================================

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

  // ==========================================================================
  // Dimension Tracking
  // ==========================================================================

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // ==========================================================================
  // Node & Connection Management
  // ==========================================================================

  /** Add a new node to the canvas from the available nodes list */
  const addNodeToCanvas = useCallback((sourceNode: GrammarNode) => {
    const newNode: SimNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    setConnections(prev => prev.filter(c => c.source !== nodeId && c.target !== nodeId));
    setValidationResult(null);
  }, []);

  // ==========================================================================
  // Zoom Controls
  // ==========================================================================

  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleZoomReset = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  const handleFitToView = useCallback(() => {
    if (svgRef.current && zoomRef.current && canvasNodes.length > 0) {
      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;
      
      const minX = Math.min(...canvasNodes.map(n => (n.x || 0) - NODE_RADIUS));
      const maxX = Math.max(...canvasNodes.map(n => (n.x || 0) + NODE_RADIUS));
      const minY = Math.min(...canvasNodes.map(n => (n.y || 0) - NODE_RADIUS));
      const maxY = Math.max(...canvasNodes.map(n => (n.y || 0) + NODE_RADIUS));
      
      const nodesWidth = maxX - minX + 100;
      const nodesHeight = maxY - minY + 100;
      
      const scale = Math.min(width / nodesWidth, height / nodesHeight, 1.5);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);
      
      svg.transition().duration(500).call(zoomRef.current.transform, transform);
    }
  }, [canvasNodes, dimensions]);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || canvasNodes.length === 0) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
      }
      return;
    }

    try {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    const nodes: SimNode[] = canvasNodes.map(n => ({ ...n }));
    
    const links: { source: SimNode; target: SimNode }[] = connections
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

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(180).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.1))
      .force('collision', d3.forceCollide().radius(NODE_RADIUS + 15).strength(0.8))
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY(height / 2).strength(0.02))
      .alphaDecay(0.02)
      .velocityDecay(0.3);

    simulationRef.current = simulation;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setCurrentZoom(event.transform.k);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    const container = svg.append('g').attr('class', 'zoom-container');
    const defs = svg.append('defs');
    
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
      .attr('fill', isDark ? '#a78bfa' : '#8b5cf6');

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
      .attr('fill', '#ec4899');

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

    svg.append('defs')
      .append('filter')
      .attr('id', 'glow-preview')
      .html(`
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      `);

    const linkElements = linkGroup
      .selectAll('g.link')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'link');

    linkElements
      .append('line')
      .attr('stroke', isDark ? '#a78bfa' : '#8b5cf6')
      .attr('stroke-width', 3)
      .attr('marker-end', 'url(#arrowhead-fun)');

    linkElements
      .append('circle')
      .attr('r', 12)
      .attr('fill', isDark ? '#1e293b' : 'white')
      .attr('stroke', isDark ? '#ef4444' : '#dc2626')
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
      .attr('fill', isDark ? '#ef4444' : '#dc2626')
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
          
          // Find closest node for preview (using larger threshold)
          let closestNode: SimNode | undefined;
          let closestDistance = Infinity;
          
          nodes.forEach(n => {
            if (n.id === d.id) return;
            const dx = (n.x || 0) - event.x;
            const dy = (n.y || 0) - event.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < PREVIEW_THRESHOLD && dist < closestDistance) {
              closestDistance = dist;
              closestNode = n;
            }
          });
          
          // Only set as connection target if within connection threshold
          const nearNode = closestDistance < CONNECTION_THRESHOLD ? closestNode ?? null : null;
          currentTarget = nearNode || null;
          setPotentialTarget(currentTarget);
          
          previewGroup.selectAll('*').remove();
          
          // Show preview for any node within preview threshold
          if (closestNode !== undefined) {
            const sourceX = event.x;
            const sourceY = event.y;
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
              .attr('stroke', `rgba(236, 72, 153, ${baseOpacity})`)
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
              .attr('stroke', connectionProgress > 0 ? '#ec4899' : '#a855f7')
              .attr('stroke-width', 2 + connectionProgress * 2)
              .attr('stroke-dasharray', connectionProgress > 0 ? '8,4' : '4,8')
              .attr('opacity', 0.2 + previewProgress * 0.3 + connectionProgress * 0.5);

            // Source indicator
            previewGroup
              .append('circle')
              .attr('cx', sourceX)
              .attr('cy', sourceY)
              .attr('r', 6 + connectionProgress * 4)
              .attr('fill', connectionProgress > 0 ? '#ec4899' : '#a855f7')
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
                .attr('fill', '#ec4899')
                .attr('opacity', connectionProgress)
                .text('Rilascia per collegare!');
            }
          }
        })
        .on('end', function(event, d) {
          if (!event.active) simulation.alphaTarget(0);
          
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
                  .attr('stroke', isDark ? '#a78bfa' : '#8b5cf6')
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
                  .attr('fill', isDark ? '#1e293b' : 'white')
                  .attr('stroke', isDark ? '#ef4444' : '#dc2626')
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
                  .attr('fill', isDark ? '#ef4444' : '#dc2626')
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
      .attr('stroke', '#ec4899')
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
      .attr('fill', isDark ? '#e2e8f0' : '#1e293b')
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
      .attr('fill', '#ef4444')
      .attr('stroke', 'white')
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

      nodes.forEach((n, i) => {
        if (canvasNodes[i]) {
          canvasNodes[i].x = n.x;
          canvasNodes[i].y = n.y;
        }
      });
    });

    } catch (error) {
      console.error('D3 rendering error:', error);
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasNodes.length, dimensions.width, dimensions.height, isDark, isExpanded]);

  const handleValidate = async () => {
    if (canvasNodes.length < 2) return;
    
    setValidating(true);
    setValidationResult(null);
    
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
        language: 'de'
      });
      
      setValidationResult(result);
    } catch (error) {
      console.error('Failed to validate sentence:', error);
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'green': return 'bg-green-100 border-green-500 text-green-800';
      case 'yellow': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'red': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return <Check className="text-green-600" size={24} />;
      case 'yellow': return <AlertTriangle className="text-yellow-600" size={24} />;
      case 'red': return <X className="text-red-600" size={24} />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'green': return 'Perfetto! 🎉';
      case 'yellow': return 'Grammatica OK, ma...';
      case 'red': return 'Errore ❌';
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
          className={`${resetSize} ${UI_RADIUS.control} font-medium transition-all flex items-center gap-2 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          <RotateCcw size={iconSize} />
          Reset
        </button>
        <button
          onClick={handleValidate}
          disabled={canvasNodes.length < 2 || validating}
          className={`${validateSize} ${UI_RADIUS.control} font-semibold transition-all flex items-center gap-2 ${
            canvasNodes.length < 2
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : `bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:shadow-lg ${compact ? '' : 'hover:scale-[1.02]'}`
          }`}
        >
          {validating ? (
            <>
              <Loader2 size={iconSize} className="animate-spin" />
              {compact ? 'Verifica' : 'Validazione...'}
            </>
          ) : (
            <>
              <Check size={iconSize} />
              {compact ? 'Verifica' : 'Verifica Frase'}
            </>
          )}
        </button>
        {showClose && (
          <button
            onClick={() => setIsExpanded(false)}
            className={`${resetSize} ${UI_RADIUS.control} font-medium transition-all flex items-center gap-2 ${isDark ? 'bg-slate-600 text-white hover:bg-slate-500' : 'bg-gray-600 text-white hover:bg-gray-500'}`}
          >
            <Minimize2 size={iconSize} />
            Chiudi
          </button>
        )}
      </div>
    );
  };

  const renderValidationPanel = (variant: 'floating' | 'inline') => {
    if (!validationResult) return null;

    const isFloating = variant === 'floating';

    return (
      <div
        className={
          isFloating
            ? `absolute top-4 right-4 max-w-md ${UI_RADIUS.surface} p-4 border-2 ${getStatusColor(validationResult.status)} shadow-xl`
            : `${UI_RADIUS.surface} p-4 border-2 mb-4 ${getStatusColor(validationResult.status)}`
        }
      >
        <div className={`flex items-start ${isFloating ? 'gap-3' : 'gap-4'}`}>
          <div className={`p-2 ${UI_RADIUS.touchIcon} bg-white shadow`}>
            {getStatusIcon(validationResult.status)}
          </div>
          <div className="flex-1">
            <h3 className={isFloating ? 'font-bold' : 'text-lg font-bold flex items-center gap-2'}>
              {getStatusLabel(validationResult.status)}
              {!isFloating && validationResult.grammar_correct && (
                <span className={`text-xs bg-green-200 text-green-800 px-2 py-0.5 ${UI_RADIUS.pill}`}>
                  ✓ Grammatica
                </span>
              )}
              {!isFloating && validationResult.semantic_correct && (
                <span className={`text-xs bg-green-200 text-green-800 px-2 py-0.5 ${UI_RADIUS.pill}`}>
                  ✓ Semantica
                </span>
              )}
            </h3>
            <p className={isFloating ? 'text-sm mt-1' : 'mt-2 text-gray-700'}>{validationResult.explanation}</p>
            {!isFloating && validationResult.suggestion && (
              <p className="mt-2 text-sm">
                <span className="font-medium">Suggerimento:</span> {validationResult.suggestion}
              </p>
            )}
          </div>
          {!isFloating && (
            <button
              onClick={handlePlayAudio}
              disabled={playingAudio}
              className={`p-3 ${UI_RADIUS.touchIcon} transition-all ${
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
        className={`fixed inset-0 z-50 ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 to-slate-100'}`}
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

        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 p-4 ${UI_RADIUS.surface} backdrop-blur-sm ${isDark ? 'bg-slate-800/90' : 'bg-white/90'} shadow-xl`}>
          <p className={`text-center font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Frase: <span className="text-purple-500">"{builtSentence}"</span>
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
        className={`relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 to-slate-100'} ${isExpanded ? 'fixed inset-0 z-50' : ''}`}
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
            <div className={`text-center p-8 ${UI_RADIUS.surface} ${isDark ? 'bg-slate-800/50' : 'bg-white/50'} backdrop-blur-sm`}>
              <p className={`text-lg font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                Clicca sui pulsanti + per aggiungere nodi!
              </p>
              <p className={`text-sm mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Poi trascinali uno sopra l'altro per collegarli
              </p>
              <p className={`text-xs mt-4 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>
                Scroll per zoom · trascina per spostare
              </p>
            </div>
          </div>
        )}

        {hoveredNode && (
          <div className={`absolute top-4 right-4 backdrop-blur-sm ${UI_RADIUS.surface} p-4 border shadow-xl min-w-[180px] ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-gray-200'}`}>
            <div className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{hoveredNode.label}</div>
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 ${UI_RADIUS.pill}`} 
                style={{ backgroundColor: getNodeColor(hoveredNode.type) }}
              />
              <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{getNodeLabel(hoveredNode.type)}</span>
            </div>
          </div>
        )}

        {draggedNode && potentialTarget && (
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 ${UI_RADIUS.pill} ${isDark ? 'bg-pink-600' : 'bg-pink-500'} text-white font-medium animate-pulse`}>
            Rilascia per collegare a "{potentialTarget.label}"
          </div>
        )}
      </div>

      <div className={`p-4 border-t ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        {canvasNodes.length > 0 && (
          <div className="text-center mb-4">
            <p className={`text-lg ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Frase: <span className="font-bold text-purple-600">"{builtSentence}"</span>
            </p>
          </div>
        )}
        {renderValidationPanel('inline')}
        {renderSentenceActions({ compact: false })}
      </div>
    </GrammarBuilderFrame>
  );
}
