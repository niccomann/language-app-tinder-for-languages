import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Info, Sparkles, Layers, GraduationCap, Users, Activity, MessageSquare, BookOpen } from 'lucide-react';
import type { WordCloudItem } from '../types';
import { 
    buildHierarchyFromWords, 
    buildHierarchyByCriteria,
    getAvailableHierarchyCriteria,
    getCategoryColor, 
    type HierarchyNode,
    type HierarchyCriteria 
} from '../utils/hierarchyBuilder';
import { useTheme } from '../contexts/ThemeContext';

interface HierarchySunburstProps {
    words: WordCloudItem[];
    onWordClick: (word: WordCloudItem) => void;
}

interface D3HierarchyNode extends d3.HierarchyRectangularNode<HierarchyNode> {
    current?: D3HierarchyNode;
    target?: D3HierarchyNode;
}

const CRITERIA_CONFIG: Record<HierarchyCriteria, { label: string; icon: React.ReactNode }> = {
    category: { label: 'Categoria', icon: <Layers size={16} /> },
    cefr: { label: 'CEFR', icon: <GraduationCap size={16} /> },
    gender: { label: 'Genere', icon: <Users size={16} /> },
    frequency: { label: 'Frequenza', icon: <Activity size={16} /> },
    register: { label: 'Registro', icon: <MessageSquare size={16} /> },
    part_of_speech: { label: 'Tipo', icon: <BookOpen size={16} /> },
};

export function HierarchySunburst({ words, onWordClick }: HierarchySunburstProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
    const [hoveredNode, setHoveredNode] = useState<HierarchyNode | null>(null);
    const [currentNodePath, setCurrentNodePath] = useState<string[]>(['Vocabolario']);
    const [activeCriteria, setActiveCriteria] = useState<HierarchyCriteria>('category');
    const { isDark } = useTheme();

    const availableCriteria = useMemo(() => {
        return getAvailableHierarchyCriteria(words);
    }, [words]);

    const rootData = useMemo(() => {
        if (activeCriteria === 'category') {
            return buildHierarchyFromWords(words);
        }
        return buildHierarchyByCriteria(words, activeCriteria);
    }, [words, activeCriteria]);

    // Handle resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                // Make it square-ish but fit in container
                const size = Math.min(width, height);
                setDimensions({ width: size, height: size });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // D3 Implementation
    useEffect(() => {
        if (!svgRef.current || !rootData || dimensions.width === 0) return;

        const width = dimensions.width;
        const height = dimensions.height;
        const radius = width / 6;

        // Clear previous render
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Create hierarchy and partition
        const hierarchy = d3.hierarchy(rootData)
            .sum(d => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        const root = d3.partition<HierarchyNode>()
            .size([2 * Math.PI, hierarchy.height + 1])
            (hierarchy) as D3HierarchyNode;

        root.each(d => {
            d.current = d;
        });

        // Create arc generator
        const arc = d3.arc<D3HierarchyNode>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius * 1.5)
            .innerRadius(d => d.y0 * radius)
            .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

        // Color scale
        const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, root.children?.length || 1 + 1));

        // Append main group centered
        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Draw arcs
        const path = g.append('g')
            .selectAll('path')
            .data(root.descendants().slice(1))
            .join('path')
            .attr('fill', d => {
                // Use semantic colors for top level, then variations
                let ancestor = d;
                while (ancestor.depth > 1 && ancestor.parent) ancestor = ancestor.parent;
                const baseColor = getCategoryColor(ancestor.data.name);

                // Adjust brightness based on depth
                const opacity = 0.6 + (1 - d.depth / (root.height + 1)) * 0.4;
                return d3.color(baseColor)?.copy({ opacity }).toString() || baseColor;
            })
            .attr('fill-opacity', d => arcVisible(d.current!) ? (d.children ? 0.8 : 0.6) : 0)
            .attr('pointer-events', d => arcVisible(d.current!) ? 'auto' : 'none')
            .attr('d', d => arc(d.current!));

        // Add click interaction
        path.filter(d => !!d.children)
            .style('cursor', 'pointer')
            .on('click', clicked);

        // Add leaf click interaction
        path.filter(d => !d.children)
            .style('cursor', 'pointer')
            .on('click', (_event, d) => {
                if (d.data.wordData) {
                    onWordClick(d.data.wordData);
                }
            });

        // Add hover interaction
        path.on('mouseenter', function (_event, d) {
            d3.select(this).attr('fill-opacity', 1);
            setHoveredNode(d.data);
        })
            .on('mouseleave', function (_event, d) {
                d3.select(this).attr('fill-opacity', d => arcVisible(d.current!) ? (d.children ? 0.8 : 0.6) : 0);
                setHoveredNode(null);
            });

        // Add labels
        const label = g.append('g')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .style('user-select', 'none')
            .selectAll('text')
            .data(root.descendants().slice(1))
            .join('text')
            .attr('dy', '0.35em')
            .attr('fill-opacity', d => +labelVisible(d.current!))
            .attr('transform', d => labelTransform(d.current!))
            .attr('fill', isDark ? '#fff' : '#1e293b')
            .attr('font-weight', '600')
            .attr('font-size', d => Math.max(10, 14 - d.depth) + 'px')
            .text(d => d.data.name.length > 12 ? d.data.name.slice(0, 10) + '…' : d.data.name);

        // Center circle for zooming out
        const parent = g.append('circle')
            .datum(root)
            .attr('r', radius)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('click', clicked);

        // Zoom function
        function clicked(event: any, p: D3HierarchyNode) {
            parent.datum(p.parent || root);

            // Update current path for breadcrumbs
            const path: string[] = [];
            let current = p;
            while (current) {
                path.unshift(current.data.name);
                current = current.parent!;
            }
            setCurrentNodePath(path);

            root.each(d => d.target = {
                x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                y0: Math.max(0, d.y0 - p.depth),
                y1: Math.max(0, d.y1 - p.depth)
            } as any);

            const t = g.transition().duration(750);

            path.transition(t)
                .tween('data', d => {
                    const i = d3.interpolate(d.current, d.target);
                    return t => d.current = i(t);
                })
                .filter(function (d) {
                    return +this.getAttribute('fill-opacity')! || arcVisible(d.target!);
                })
                .attr('fill-opacity', d => arcVisible(d.target!) ? (d.children ? 0.8 : 0.6) : 0)
                .attr('pointer-events', d => arcVisible(d.target!) ? 'auto' : 'none')
                .attrTween('d', d => () => arc(d.current!) || '');

            label.filter(function (d) {
                return +this.getAttribute('fill-opacity')! || labelVisible(d.target!);
            })
                .transition(t)
                .attr('fill-opacity', d => +labelVisible(d.target!))
                .attrTween('transform', d => () => labelTransform(d.current!));
        }

        function arcVisible(d: D3HierarchyNode) {
            return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
        }

        function labelVisible(d: D3HierarchyNode) {
            return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
        }

        function labelTransform(d: D3HierarchyNode) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2 * radius;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        }

    }, [rootData, dimensions, isDark, onWordClick]);

    return (
        <div ref={containerRef} className={`w-full h-full flex flex-col items-center justify-center relative transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>

            {/* Criteria Selector */}
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1 rounded-lg backdrop-blur-sm ${isDark ? 'bg-slate-800/90' : 'bg-white/90'} shadow-lg`}>
                {availableCriteria.map((criteria) => {
                    const config = CRITERIA_CONFIG[criteria];
                    const isActive = activeCriteria === criteria;
                    return (
                        <button
                            key={criteria}
                            onClick={() => setActiveCriteria(criteria)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                isActive
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                                    : isDark
                                        ? 'text-slate-300 hover:bg-slate-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title={`Raggruppa per ${config.label}`}
                        >
                            {config.icon}
                            <span>{config.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Breadcrumbs */}
            <div className="absolute top-16 left-4 z-10 flex items-center gap-2 text-sm font-medium opacity-70">
                {currentNodePath.map((node, i) => (
                    <span key={i} className="flex items-center">
                        {i > 0 && <span className="mx-1">/</span>}
                        <span className={i === currentNodePath.length - 1 ? 'text-indigo-500 font-bold' : ''}>
                            {node}
                        </span>
                    </span>
                ))}
            </div>

            {/* SVG Container */}
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                className="max-w-full max-h-full"
            />

            {/* Center Info / Instructions */}
            <div className="absolute bottom-4 left-4 text-xs text-gray-500 flex flex-col gap-1 pointer-events-none">
                <div className="flex items-center gap-1">
                    <ZoomIn size={14} />
                    <span>Click sector to zoom in</span>
                </div>
                <div className="flex items-center gap-1">
                    <ZoomOut size={14} />
                    <span>Click center to zoom out</span>
                </div>
            </div>

            {/* Hover Info Card */}
            {hoveredNode && (
                <div className={`absolute top-4 right-4 backdrop-blur-sm rounded-xl p-4 border shadow-xl min-w-[200px] transition-colors duration-300 pointer-events-none z-20 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-gray-200'}`}>
                    <div className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {hoveredNode.name}
                    </div>

                    {hoveredNode.translation && (
                        <div className={`text-sm mb-2 italic ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                            {hoveredNode.translation}
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getCategoryColor(hoveredNode.name) }} // This might be inaccurate for leaf nodes, but ok for now
                        />
                        <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            {hoveredNode.children ? `${hoveredNode.children.length} items` : 'Word'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
