import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Image, ImageOff, Sparkles } from 'lucide-react';
import type { WordCloudItem } from '../types';
import { 
  computeSimilarityClusters, 
  computeRhymeClusters, 
  getForceConfig
} from '../utils/clusteringAlgorithms';
import { getGroupColor } from '../utils/clusterColors';
import { useTheme } from '../contexts/ThemeContext';
import { useLinguisticFilters, LINGUISTIC_FILTER_CONFIGS, type LinguisticCriteria } from '../hooks/useLinguisticFilters';
import { LinguisticFilterBar, GroupLegend } from './LinguisticFilterBar';

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

export function ClusteredNodes({ words, onWordClick }: ClusteredNodesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [showImages, setShowImages] = useState(false);
  const { isDark } = useTheme();

  const {
    activeCriteria,
    setActiveCriteria,
    availableConfigs,
    activeConfig,
    getGroupForWord,
    groupWords,
    getGroupColor: getHookGroupColor,
  } = useLinguisticFilters({ defaultCriteria: 'category' });

  const similarityClusters = useMemo(() => {
    return computeSimilarityClusters(words, 10);
  }, [words]);

  const rhymeClusters = useMemo(() => {
    return computeRhymeClusters(words);
  }, [words]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: height - 80 });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
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

  const forceConfig = getForceConfig(activeCriteria as any);

  useEffect(() => {
    if (!svgRef.current || words.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;

    const nodes: SimulationNode[] = words.map((word, index) => ({
      id: `node-${index}`,
      text: word.text,
      group: getGroupFunction(word),
      radius: Math.max(20, Math.min(40, 15 + (word.size || 20) / 3)),
      wordData: word,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));

    const uniqueGroups = [...new Set(nodes.map(node => node.group))];
    setGroups(uniqueGroups);

    const groupCenters: Record<string, { x: number; y: number }> = {};
    const angleStep = (2 * Math.PI) / uniqueGroups.length;
    const centerRadius = Math.min(width, height) * 0.3;
    
    uniqueGroups.forEach((group, index) => {
      const angle = index * angleStep - Math.PI / 2;
      groupCenters[group] = {
        x: width / 2 + centerRadius * Math.cos(angle),
        y: height / 2 + centerRadius * Math.sin(angle),
      };
    });

    function forceCluster(alpha: number) {
      for (const node of nodes) {
        const center = groupCenters[node.group];
        if (center && node.x !== undefined && node.y !== undefined) {
          node.vx = (node.vx || 0) + (center.x - node.x) * alpha * forceConfig.clusterStrength;
          node.vy = (node.vy || 0) + (center.y - node.y) * alpha * forceConfig.clusterStrength;
        }
      }
    }

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(forceConfig.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(forceConfig.centerStrength))
      .force('collision', d3.forceCollide<SimulationNode>().radius(node => node.radius + 2).strength(forceConfig.collisionStrength))
      .force('cluster', (alpha) => forceCluster(alpha))
      .alphaDecay(forceConfig.alphaDecay)
      .velocityDecay(forceConfig.velocityDecay);

    simulationRef.current = simulation;

    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    
    nodes.forEach(node => {
      if (node.wordData.image_url) {
        defs.append('pattern')
          .attr('id', `img-${node.id}`)
          .attr('patternUnits', 'objectBoundingBox')
          .attr('width', 1)
          .attr('height', 1)
          .append('image')
          .attr('href', node.wordData.image_url)
          .attr('width', node.radius * 2)
          .attr('height', node.radius * 2)
          .attr('preserveAspectRatio', 'xMidYMid slice');
      }
    });

    const mainGroup = svg
      .attr('width', width)
      .attr('height', height)
      .append('g');

    const nodeElements = mainGroup
      .selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimulationNode>()
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
        })
      );

    nodeElements
      .append('circle')
      .attr('r', node => node.radius)
      .attr('fill', node => {
        if (showImages && node.wordData.image_url) {
          return `url(#img-${node.id})`;
        }
        return getGroupColor(node.group);
      })
      .attr('stroke', node => getGroupColor(node.group))
      .attr('stroke-width', showImages ? 3 : 2)
      .attr('opacity', 0.9);

    nodeElements
      .append('text')
      .text(node => node.text.length > 8 ? node.text.slice(0, 7) + '…' : node.text)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', node => Math.max(10, node.radius / 3))
      .attr('font-weight', '600')
      .attr('pointer-events', 'none');

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
          .attr('opacity', 0.85);
        setHoveredNode(null);
      })
      .on('click', (_event, node) => {
        onWordClick(node.wordData);
      });

    simulation.on('tick', () => {
      nodeElements.attr('transform', node => `translate(${node.x},${node.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [words, dimensions, activeCriteria, getGroupFunction, onWordClick, showImages, forceConfig]);

  return (
    <div ref={containerRef} className={`w-full h-full flex flex-col transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Cluster Buttons - Using reusable LinguisticFilterBar */}
      <div className={`flex flex-wrap justify-center items-center gap-2 p-3 border-b transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
        <LinguisticFilterBar
          configs={availableConfigs}
          activeCriteria={activeCriteria}
          onCriteriaChange={(criteria) => setActiveCriteria(criteria)}
          variant="horizontal"
          showIcons={true}
        />
        
        <div className={`w-px h-8 mx-2 ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />
        
        <button
          onClick={() => setShowImages(!showImages)}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all duration-300 whitespace-nowrap min-w-fit ${
            showImages
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
              : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
          }`}
          title={showImages ? 'Nascondi immagini' : 'Mostra immagini'}
        >
          {showImages ? <Image size={18} /> : <ImageOff size={18} />}
          <span className="text-sm">{showImages ? 'Immagini ON' : 'Immagini OFF'}</span>
        </button>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" />
        
        {/* Legend */}
        <div className={`absolute bottom-4 left-4 backdrop-blur-sm rounded-lg p-3 border shadow-lg transition-colors duration-300 ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200'}`}>
          <div className={`text-xs mb-2 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            <Sparkles size={12} />
            Gruppi attivi
          </div>
          <div className="flex flex-wrap gap-2 max-w-xs">
            {groups.map((group) => (
              <div key={group} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getGroupColor(group) }}
                />
                <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{group}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hovered Node Info */}
        {hoveredNode && (
          <div className={`absolute top-4 right-4 backdrop-blur-sm rounded-xl p-4 border shadow-xl min-w-[200px] transition-colors duration-300 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-gray-200'}`}>
            <div className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{hoveredNode.text}</div>
            {hoveredNode.wordData.translation && (
              <div className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{hoveredNode.wordData.translation}</div>
            )}
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getGroupColor(hoveredNode.group) }}
              />
              <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{hoveredNode.group}</span>
            </div>
            {hoveredNode.wordData.review_count !== undefined && (
              <div className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                Reviewed: {hoveredNode.wordData.review_count} times
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
