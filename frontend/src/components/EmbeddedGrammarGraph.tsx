import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GrammarSentence, GrammarNode } from '../types';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { useZoomControls } from '../hooks/useZoomControls';
import { ExpandedViewWrapper, ZoomControlBar } from './ui';

interface EmbeddedGrammarGraphProps {
  sentence: GrammarSentence;
  onNodeSelect: (node: GrammarNode | null) => void;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  image_base64?: string;
  meta?: GrammarNode['meta'];
}

export function EmbeddedGrammarGraph({ sentence, onNodeSelect }: EmbeddedGrammarGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

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

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const previousTransform = d3.zoomTransform(svgRef.current);
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

    const linkDistance = Math.max(140, Math.min(220, 120 + nodes.length * 12));

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDistance).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
      .force('collision', d3.forceCollide().radius(nodeRadius + 12).strength(1))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03))
      .alphaDecay(0.015)
      .velocityDecay(0.35);

    const container = svg.append('g').attr('class', 'zoom-container');

    initializeZoom(svgRef.current, container);

    if (zoomRef.current && previousTransform.k !== 1) {
      svg.call(zoomRef.current.transform, previousTransform);
    }

    container.append('defs').append('marker')
      .attr('id', 'arrowhead-embedded')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', nodeRadius + 10)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#cc785c');

    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cc785c')
      .attr('stroke-width', 2.5)
      .attr('marker-end', 'url(#arrowhead-embedded)');

    const linkLabel = container.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#706b63')
      .attr('text-anchor', 'middle')
      .attr('dy', -8)
      .text((d: any) => d.label);

    const node = container.append('g')
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
          }) as any
      );

    node.append('circle')
      .attr('r', nodeRadius + 4)
      .attr('fill', '#faf9f5')
      .attr('stroke', (d) => getNodeColor(d.type))
      .attr('stroke-width', 4)
      .attr('filter', 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))');

    node.append('clipPath')
      .attr('id', (d) => `clip-embedded-${d.id}`)
      .append('circle')
      .attr('r', nodeRadius);

    node.append('image')
      .attr('xlink:href', (d) => d.image_base64 ? `data:image/jpeg;base64,${d.image_base64}` : '')
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
      .attr('fill', '#141413')
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

    // Auto fit-to-view after simulation settles
    let fitTimeoutId: ReturnType<typeof setTimeout> | null = null;
    simulation.on('end', () => {
      fitTimeoutId = setTimeout(() => {
        if (svgRef.current && zoomRef.current && nodes.length > 0) {
          const padding = 80;

          const minX = Math.min(...nodes.map(n => (n.x || 0) - nodeRadius - 50));
          const maxX = Math.max(...nodes.map(n => (n.x || 0) + nodeRadius + 50));
          const minY = Math.min(...nodes.map(n => (n.y || 0) - nodeRadius - 50));
          const maxY = Math.max(...nodes.map(n => (n.y || 0) + nodeRadius + 50));

          const nodesWidth = maxX - minX + padding * 2;
          const nodesHeight = maxY - minY + padding * 2;

          const scale = Math.min(width / nodesWidth, height / nodesHeight, 1.0);
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);

          svg.transition().duration(500).call(zoomRef.current.transform, transform);
        }
      }, 100);
    });

    return () => {
      simulation.stop();
      if (fitTimeoutId !== null) {
        clearTimeout(fitTimeoutId);
        fitTimeoutId = null;
      }
      if (svgRef.current) {
        d3.select(svgRef.current).on('click', null);
      }
      zoomRef.current = null;
    };
  // Intentionally omit `zoomRef`/`initializeZoom` (stable refs from
  // useZoomControls). Adding initializeZoom would rebuild the entire D3
  // graph on every render, losing user zoom/drag state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence, dimensions, onNodeSelect, isExpanded]);

  const content = (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} width="100%" height="100%" style={{ cursor: 'grab' }} className="transition-colors duration-300 bg-surface-soft" />
      
      <ZoomControlBar
        currentZoom={currentZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        isExpanded={isExpanded}
        onToggleExpand={toggleExpanded}
        showFitToView={false}
      />
    </div>
  );

  return (
    <ExpandedViewWrapper isExpanded={isExpanded}>
      {content}
    </ExpandedViewWrapper>
  );
}
