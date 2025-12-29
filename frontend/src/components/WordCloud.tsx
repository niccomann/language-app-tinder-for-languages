import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface WordCloudProps {
  words: { text: string; size: number; category?: string }[];
  onBack: () => void;
  onWordClick?: (word: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  animals: '#3B82F6',
  food: '#10B981',
  verbs: '#EF4444',
  adjectives: '#F59E0B',
  objects: '#8B5CF6',
  actions: '#EC4899',
  nature: '#14B8A6',
  colors: '#F97316',
  body: '#6366F1',
  weather: '#06B6D4',
  clothing: '#D946EF',
  transportation: '#84CC16',
  family: '#F43F5E',
  time: '#0EA5E9',
  music: '#A855F7',
  sports: '#22C55E',
  places: '#EAB308',
  default: '#64748B',
};

export function WordCloud({ words, onBack, onWordClick }: WordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

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

    const layout = cloud()
      .size([width, height])
      .words(words.map((d) => ({ 
        text: d.text, 
        size: d.size,
        category: d.category 
      })))
      .padding(5)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90 * (Math.random() > 0.5 ? 1 : -1)))
      .font('Inter, system-ui, sans-serif')
      .fontSize((d: any) => d.size)
      .on('end', draw);

    function draw(cloudWords: any[]) {
      const group = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
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
        .style('transition', 'all 0.2s ease')
        .attr('text-anchor', 'middle')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
        .text((d: any) => d.text)
        .on('mouseover', function(event, d: any) {
          d3.select(this)
            .style('font-size', `${d.size * 1.2}px`)
            .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))');
          setHoveredWord(d.text);
        })
        .on('mouseout', function(event, d: any) {
          d3.select(this)
            .style('font-size', `${d.size}px`)
            .style('filter', 'none');
          setHoveredWord(null);
        })
        .on('click', (event, d: any) => {
          if (onWordClick) onWordClick(d.text);
        });
    }

    layout.start();
  }, [words, dimensions, onWordClick]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur-md">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Word Cloud ☁️
          </h2>
          <p className="text-sm text-gray-400">Click on a word to explore</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Word Cloud Area */}
      <div ref={containerRef} className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Hovered Word Info */}
      {hoveredWord && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
          <span className="text-white font-bold text-lg">{hoveredWord}</span>
        </div>
      )}

      {/* Legend */}
      <div className="p-4 bg-black/30 border-t border-white/10">
        <div className="flex flex-wrap justify-center gap-4">
          {Object.entries(CATEGORY_COLORS).slice(0, 8).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-400 capitalize">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
