import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import type { WordCloudItem } from '../types';
import { ExpandedViewWrapper, UI_RADIUS, ZoomControlBar } from './ui';
import { CATEGORY_COLORS } from '../utils/wordDisplayMeta';

interface EmbeddedWordCloudProps {
  words: WordCloudItem[];
  onWordClick: (word: WordCloudItem) => void;
}

export function EmbeddedWordCloud({ words, onWordClick }: EmbeddedWordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);

  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
    }
  }, []);

  const handleZoomReset = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

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
    if (!svgRef.current || words.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const wordsMap = new Map(words.map((word) => [word.text, word]));

    const layout = cloud()
      .size([width, height])
      .words(words.map((d) => ({ text: d.text, size: d.size, category: d.category })))
      .padding(5)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90 * (Math.random() > 0.5 ? 1 : -1)))
      .font('Inter, system-ui, sans-serif')
      .fontSize((d: any) => d.size)
      .on('end', draw);

    function draw(cloudWords: any[]) {
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
          group.attr('transform', `translate(${width / 2 + event.transform.x},${height / 2 + event.transform.y}) scale(${event.transform.k})`);
          setCurrentZoom(event.transform.k);
        });

      svg.call(zoom);
      zoomRef.current = zoom;

      const group = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('class', 'zoom-container')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      group
        .selectAll('text')
        .data(cloudWords)
        .enter()
        .append('text')
        .style('font-size', (d: any) => `${d.size}px`)
        .style('font-family', 'Inter, system-ui, sans-serif')
        .style('font-weight', '700')
        .style('fill', (d: any) => CATEGORY_COLORS[d.category] || CATEGORY_COLORS.default)
        .style('cursor', 'pointer')
        .attr('text-anchor', 'middle')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text((d: any) => d.text)
        .on('mouseover', function(_event, d: any) {
          d3.select(this)
            .style('font-size', `${d.size * 1.2}px`)
            .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))');
          setHoveredWord(d.text);
        })
        .on('mouseout', function(_event, d: any) {
          d3.select(this)
            .style('font-size', `${d.size}px`)
            .style('filter', 'none');
          setHoveredWord(null);
        })
        .on('click', function(_event, d: any) {
          const fullWordData = wordsMap.get(d.text);
          if (fullWordData) {
            onWordClick(fullWordData);
          }
        });
    }

    layout.start();
  }, [words, dimensions, onWordClick, isExpanded]);

  const content = (
    <div ref={containerRef} className="w-full h-full relative bg-surface-dark">
      <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }} />
      
      <ZoomControlBar
        currentZoom={currentZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        isExpanded={isExpanded}
        onToggleExpand={toggleExpanded}
        showFitToView={false}
      />

      {hoveredWord && (
        <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-canvas border border-hairline px-6 py-3 ${UI_RADIUS.pill}`}>
          <span className="text-ink font-bold text-lg">{hoveredWord}</span>
        </div>
      )}
    </div>
  );

  return (
    <ExpandedViewWrapper isExpanded={isExpanded}>
      {content}
    </ExpandedViewWrapper>
  );
}
