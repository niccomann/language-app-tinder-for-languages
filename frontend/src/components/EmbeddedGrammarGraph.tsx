import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GrammarSentence, GrammarNode } from '../types';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { useTheme } from '../contexts/ThemeContext';

interface EmbeddedGrammarGraphProps {
  sentence: GrammarSentence;
  onNodeSelect: (node: GrammarNode | null) => void;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  image_url?: string;
  meta?: GrammarNode['meta'];
}

export function EmbeddedGrammarGraph({ sentence, onNodeSelect }: EmbeddedGrammarGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const { isDark } = useTheme();

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

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const nodeRadius = 45;

    const nodes: SimNode[] = sentence.nodes.map((node) => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));

    const links = sentence.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      label: edge.label,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(180))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(nodeRadius + 20));

    svg.append('defs').append('marker')
      .attr('id', 'arrowhead-embedded')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', nodeRadius + 10)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#94A3B8');

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#CBD5E1')
      .attr('stroke-width', 2.5)
      .attr('marker-end', 'url(#arrowhead-embedded)');

    const linkLabel = svg.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#64748B')
      .attr('text-anchor', 'middle')
      .attr('dy', -8)
      .text((d: any) => d.label);

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node.append('circle')
      .attr('r', nodeRadius + 4)
      .attr('fill', 'white')
      .attr('stroke', (d) => getNodeColor(d.type))
      .attr('stroke-width', 4)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

    node.append('clipPath')
      .attr('id', (d) => `clip-embedded-${d.id}`)
      .append('circle')
      .attr('r', nodeRadius);

    node.append('image')
      .attr('xlink:href', (d) => d.image_url || 'https://via.placeholder.com/100')
      .attr('x', -nodeRadius)
      .attr('y', -nodeRadius)
      .attr('width', nodeRadius * 2)
      .attr('height', nodeRadius * 2)
      .attr('clip-path', (d) => `url(#clip-embedded-${d.id})`)
      .attr('preserveAspectRatio', 'xMidYMid slice');

    node.append('rect')
      .attr('x', -40)
      .attr('y', nodeRadius + 8)
      .attr('width', 80)
      .attr('height', 22)
      .attr('rx', 11)
      .attr('fill', (d) => getNodeColor(d.type));

    node.append('text')
      .attr('y', nodeRadius + 23)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', 'white')
      .text((d) => getNodeLabel(d.type));

    node.append('text')
      .attr('y', nodeRadius + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .attr('fill', '#1E293B')
      .text((d) => d.label);

    node.on('click', (event, d) => {
      event.stopPropagation();
      const originalNode = sentence.nodes.find((n) => n.id === d.id);
      onNodeSelect(originalNode || null);
    });

    svg.on('click', () => onNodeSelect(null));

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [sentence, dimensions, onNodeSelect]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} width="100%" height="100%" className={`transition-colors duration-300 ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-gray-50 to-slate-100'}`} />
    </div>
  );
}
