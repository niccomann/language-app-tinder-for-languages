import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Image, ImageOff, Sparkles } from 'lucide-react';
import type { WordCloudItem } from '../types';
import { 
  computeSimilarityClusters, 
  computeRhymeClusters, 
  getForceConfig
} from '../utils/clusteringAlgorithms';
import { getGroupColor } from '../utils/clusterColors';
import { useLinguisticFilters } from '../hooks/useLinguisticFilters';
import { useZoomControls } from '../hooks/useZoomControls';
import { LinguisticFilterBar } from './LinguisticFilterBar';
import { ZoomControlBar, ExpandedViewWrapper, UI_ELEVATION, UI_RADIUS } from './ui';

interface ClusteredNodesProps {
  words: WordCloudItem[];
  onWordClick: (word: WordCloudItem) => void;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  text: string;
  group: string;
  radius: number;
  wordData: WordCloudItem;
}

const getWordImageHref = (word: WordCloudItem) => (
  word.image_base64 ? `data:image/jpeg;base64,${word.image_base64}` : word.image_url
);

const hasWordImage = (word: WordCloudItem) => Boolean(getWordImageHref(word));

export function ClusteredNodes({ words, onWordClick }: ClusteredNodesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [showImages, setShowImages] = useState(true);

  const {
    activeCriteria,
    setActiveCriteria,
    availableConfigs,
    getGroupForWord,
  } = useLinguisticFilters({ defaultCriteria: 'category' });

  const {
    isExpanded,
    toggleExpanded,
    currentZoom,
    zoomRef,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    initializeZoom,
  } = useZoomControls(svgRef, dimensions);

  const handleFitToView = useCallback(() => {
    if (svgRef.current && zoomRef.current && nodesRef.current.length > 0) {
      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;
      const nodes = nodesRef.current;
      const nodeRadius = 40;
      
      const minX = Math.min(...nodes.map(n => (n.x || 0) - nodeRadius));
      const maxX = Math.max(...nodes.map(n => (n.x || 0) + nodeRadius));
      const minY = Math.min(...nodes.map(n => (n.y || 0) - nodeRadius));
      const maxY = Math.max(...nodes.map(n => (n.y || 0) + nodeRadius));
      
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
  }, [dimensions, zoomRef]);

  const similarityClusters = useMemo(() => {
    return computeSimilarityClusters(words, 10);
  }, [words]);

  const rhymeClusters = useMemo(() => {
    return computeRhymeClusters(words);
  }, [words]);

  useEffect(() => {
    const apply = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Cap by viewport height minus space for the fixed BottomNav (~88px)
        // and the top chrome (~64px). Otherwise nodes would render under the
        // BottomNav on mobile because the container can extend off-screen.
        const cap = window.innerHeight - 88 - 64;
        const safeHeight = Math.min(height, cap);
        setDimensions({ width, height: safeHeight - 80 });
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

  const getGroupFunction = useMemo(() => {
    if (activeCriteria === 'similarity') {
      return (word: WordCloudItem) => similarityClusters.get(word.text) || 'Altro';
    }
    if (activeCriteria === 'rhyme') {
      return (word: WordCloudItem) => rhymeClusters.get(word.text) || '🎤 Altri';
    }
    return getGroupForWord;
  }, [activeCriteria, similarityClusters, rhymeClusters, getGroupForWord]);

  const forceConfig = useMemo(() => getForceConfig(activeCriteria), [activeCriteria]);

  useEffect(() => {
    if (!svgRef.current || words.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    const wordGroups = words.map(word => getGroupFunction(word));
    const uniqueGroups = [...new Set(wordGroups)];
    setGroups(uniqueGroups);

    const groupCenters: Record<string, { x: number; y: number }> = {};
    const angleStep = (2 * Math.PI) / Math.max(uniqueGroups.length, 1);
    // Scale center radius down when there are many groups, so cluster centers
    // stay close enough to fit on screen but never overlap each other.
    const groupSpread = Math.max(0.18, Math.min(0.28, 0.4 - uniqueGroups.length * 0.015));
    const centerRadius = Math.min(width, height) * groupSpread;

    uniqueGroups.forEach((group, index) => {
      const angle = index * angleStep - Math.PI / 2;
      groupCenters[group] = {
        x: width / 2 + centerRadius * Math.cos(angle),
        y: height / 2 + centerRadius * Math.sin(angle),
      };
    });

    // Count nodes per group to scale clusterStrength inversely
    // (large groups would otherwise collapse onto their center).
    const groupSizes: Record<string, number> = {};
    for (const group of wordGroups) {
      groupSizes[group] = (groupSizes[group] || 0) + 1;
    }

    const nodes: SimulationNode[] = words.map((word, index) => {
      const group = wordGroups[index];
      const center = groupCenters[group];
      return {
        id: `node-${index}`,
        text: word.text,
        group,
        radius: Math.max(20, Math.min(40, 15 + (word.size || 20) / 3)),
        wordData: word,
        x: center.x + (Math.random() - 0.5) * 60,
        y: center.y + (Math.random() - 0.5) * 60,
      };
    });

    function forceCluster(alpha: number) {
      for (const node of nodes) {
        const center = groupCenters[node.group];
        if (center && node.x !== undefined && node.y !== undefined) {
          const size = groupSizes[node.group] || 1;
          const scale = Math.min(1, 8 / size);
          node.vx = (node.vx || 0) + (center.x - node.x) * alpha * forceConfig.clusterStrength * scale;
          node.vy = (node.vy || 0) + (center.y - node.y) * alpha * forceConfig.clusterStrength * scale;
        }
      }
    }

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(forceConfig.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(forceConfig.centerStrength))
      .force('collision', d3.forceCollide<SimulationNode>().radius(node => node.radius + 8).strength(forceConfig.collisionStrength))
      .force('cluster', (alpha) => forceCluster(alpha))
      .alphaDecay(forceConfig.alphaDecay)
      .velocityDecay(forceConfig.velocityDecay);

    simulationRef.current = simulation;
    nodesRef.current = nodes;

    const previousTransform = svgRef.current ? d3.zoomTransform(svgRef.current) : null;
    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    const mainGroup = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('class', 'zoom-container');

    initializeZoom(svgRef.current, mainGroup);

    if (previousTransform && zoomRef.current && previousTransform.k !== 1) {
      svg.call(zoomRef.current.transform, previousTransform);
    }

    const nodeElements = mainGroup
      .selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, SimulationNode>()
          .on('start', (event, draggedNode) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            draggedNode.fx = draggedNode.x;
            draggedNode.fy = draggedNode.y;
          })
          .on('drag', (event, draggedNode) => {
            draggedNode.fx = event.x;
            draggedNode.fy = event.y;
          })
          .on('end', (event, draggedNode) => {
            if (!event.active) simulation.alphaTarget(0);
            draggedNode.fx = null;
            draggedNode.fy = null;
          }) as any
      );

    nodeElements
      .filter(node => hasWordImage(node.wordData))
      .each(function(node) {
        defs
          .append('clipPath')
          .attr('id', `clip-cluster-${node.id}`)
          .append('circle')
          .attr('r', node.radius - 3);
      });

    nodeElements
      .append('circle')
      .attr('r', node => node.radius)
      .attr('fill', node => getGroupColor(node.group))
      .attr('stroke', node => getGroupColor(node.group))
      .attr('stroke-width', showImages ? 3 : 2)
      .attr('opacity', node => showImages && hasWordImage(node.wordData) ? 0.18 : 0.9);

    nodeElements
      .filter(node => showImages && hasWordImage(node.wordData))
      .append('image')
      .attr('href', node => getWordImageHref(node.wordData) || '')
      .attr('x', node => -node.radius + 3)
      .attr('y', node => -node.radius + 3)
      .attr('width', node => (node.radius - 3) * 2)
      .attr('height', node => (node.radius - 3) * 2)
      .attr('clip-path', node => `url(#clip-cluster-${node.id})`)
      .attr('preserveAspectRatio', 'xMidYMid slice')
      .attr('pointer-events', 'none');

    nodeElements
      .append('text')
      .text(node => node.text.length > 8 ? node.text.slice(0, 7) + '…' : node.text)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', node => showImages && hasWordImage(node.wordData) ? node.radius + 15 : 0)
      .attr('fill', node => showImages && hasWordImage(node.wordData) ? '#141413' : '#faf9f5')
      .attr('font-size', node => Math.max(10, node.radius / 3))
      .attr('font-weight', '600')
      .attr('paint-order', 'stroke')
      .attr('stroke', node => showImages && hasWordImage(node.wordData) ? '#faf9f5' : 'transparent')
      .attr('stroke-width', node => showImages && hasWordImage(node.wordData) ? 4 : 0)
      .attr('opacity', node => showImages && hasWordImage(node.wordData) ? 0 : 1)
      .attr('pointer-events', 'none');

    nodeElements
      .append('title')
      .text(node => `${node.text}${node.wordData.translation ? ` - ${node.wordData.translation}` : ''}`);

    nodeElements
      .on('mouseover', function(_event, node) {
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', node.radius * 1.2)
          .attr('opacity', 1);
        setHoveredNode(node);
      })
      .on('mouseout', function(_event, node) {
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', node.radius)
          .attr('opacity', showImages && hasWordImage(node.wordData) ? 0.18 : 0.9);
        setHoveredNode(null);
      })
      .on('click', (_event, node) => {
        onWordClick(node.wordData);
      });

    simulation.on('tick', () => {
      nodeElements.attr('transform', node => `translate(${node.x},${node.y})`);
    });

    // Auto fit-to-view after simulation settles
    let fitTimeoutId: ReturnType<typeof setTimeout> | null = null;
    simulation.on('end', () => {
      fitTimeoutId = setTimeout(() => {
        if (svgRef.current && zoomRef.current && nodesRef.current.length > 0) {
          const svgEl = d3.select(svgRef.current);
          const nodeRadius = 40;
          const padding = 60;
          
          const minX = Math.min(...nodesRef.current.map(n => (n.x || 0) - nodeRadius));
          const maxX = Math.max(...nodesRef.current.map(n => (n.x || 0) + nodeRadius));
          const minY = Math.min(...nodesRef.current.map(n => (n.y || 0) - nodeRadius));
          const maxY = Math.max(...nodesRef.current.map(n => (n.y || 0) + nodeRadius));
          
          const nodesWidth = maxX - minX + padding * 2;
          const nodesHeight = maxY - minY + padding * 2;
          
          const scale = Math.min(width / nodesWidth, height / nodesHeight, 1.2);
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);
          
          svgEl.transition().duration(500).call(zoomRef.current.transform, transform);
        }
      }, 100);
    });

    return () => {
      simulation.stop();
      if (fitTimeoutId !== null) {
        clearTimeout(fitTimeoutId);
        fitTimeoutId = null;
      }
    };
  }, [words, dimensions, activeCriteria, getGroupFunction, onWordClick, showImages, forceConfig, initializeZoom, isExpanded, zoomRef]);

  const content = (
    <div ref={containerRef} className="w-full h-full flex flex-col transition-colors duration-300 bg-canvas">
      {/* Cluster Buttons - Using reusable LinguisticFilterBar */}
      {!isExpanded && (
        <div className="flex flex-wrap justify-center items-center gap-2 p-3 border-b border-hairline transition-colors duration-300 bg-surface-soft">
          <LinguisticFilterBar
            configs={availableConfigs}
            activeCriteria={activeCriteria}
            onCriteriaChange={(criteria) => setActiveCriteria(criteria)}
            variant="horizontal"
            showIcons={true}
          />
          
          <div className="w-px h-8 mx-2 bg-hairline" />
          
          <button
            onClick={() => setShowImages(!showImages)}
            className={`flex items-center gap-2 px-6 py-2.5 ${UI_RADIUS.pill} font-medium transition-all duration-300 whitespace-nowrap min-w-fit ${
              showImages
                ? `bg-success text-ink ${UI_ELEVATION.floating}`
                : 'bg-surface-card text-body hover:bg-surface-cream-strong'
            }`}
            title={showImages ? 'Hide images' : 'Show images'}
          >
            {showImages ? <Image size={18} /> : <ImageOff size={18} />}
            <span className="text-sm">{showImages ? 'Images ON' : 'Images OFF'}</span>
          </button>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }} />
        
        {/* Zoom Controls */}
        <ZoomControlBar
          currentZoom={currentZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onFitToView={handleFitToView}
          isExpanded={isExpanded}
          onToggleExpand={toggleExpanded}
          position={isExpanded ? 'top-left' : 'top-right'}
        />
        
        {/* Legend */}
        <div className={`absolute ${isExpanded ? 'bottom-4 right-4' : 'bottom-20 left-4'} ${UI_RADIUS.control} p-3 border border-hairline bg-canvas z-10`}>
          <div className="text-xs font-medium mb-3 flex items-center gap-1 text-muted">
            <Sparkles size={12} />
            Gruppi attivi ({groups.length})
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {groups.map((group) => (
              <div key={group} className={`flex items-center gap-2 px-2 py-1.5 ${UI_RADIUS.control} bg-surface-soft`}>
                <div
                  className={`w-3 h-3 ${UI_RADIUS.pill}`}
                  style={{ backgroundColor: getGroupColor(group) }}
                />
                <span className="text-xs font-medium text-ink">{group}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hovered Node Info */}
        {hoveredNode && (
          <div className={`absolute ${isExpanded ? 'top-20' : 'top-4'} ${isExpanded ? 'left-4' : 'right-4'} ${UI_RADIUS.surface} p-4 border border-hairline bg-canvas min-w-[200px] transition-colors duration-300 z-10`}>
            <div className="text-lg font-semibold mb-1 text-ink">{hoveredNode.text}</div>
            {hoveredNode.wordData.translation && (
              <div className="text-sm mb-2 text-muted">{hoveredNode.wordData.translation}</div>
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 ${UI_RADIUS.pill}`}
                style={{ backgroundColor: getGroupColor(hoveredNode.group) }}
              />
              <span className="text-xs text-body">{hoveredNode.group}</span>
            </div>
            {hoveredNode.wordData.review_count !== undefined && (
              <div className="text-xs mt-2 text-muted">
                Reviewed: {hoveredNode.wordData.review_count} times
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ExpandedViewWrapper isExpanded={isExpanded}>
      {content}
    </ExpandedViewWrapper>
  );
}
