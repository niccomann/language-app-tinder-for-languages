import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Sparkles, Layers, GraduationCap, Users, Activity, MessageSquare, BookOpen } from 'lucide-react';
import type { WordCloudItem } from '../types';
import { 
    buildHierarchyFromWords, 
    buildHierarchyByCriteria,
    getAvailableHierarchyCriteria,
    getCategoryColor, 
    type HierarchyNode,
    type HierarchyCriteria 
} from '../utils/hierarchyBuilder';
import { useTheme } from '../contexts/useTheme';
import { ExpandedViewWrapper, PillTabs, UI_RADIUS, ZoomControlBar } from './ui';

interface HierarchySunburstProps {
    words: WordCloudItem[];
    onWordClick: (word: WordCloudItem) => void;
}

interface D3HierarchyNode extends d3.HierarchyRectangularNode<HierarchyNode> {
    current?: D3HierarchyNode;
    target?: D3HierarchyNode;
}

const CRITERIA_CONFIG: Record<HierarchyCriteria, { label: string; icon: React.ReactNode }> = {
    category: { label: 'Category', icon: <Layers size={16} /> },
    cefr: { label: 'CEFR', icon: <GraduationCap size={16} /> },
    gender: { label: 'Gender', icon: <Users size={16} /> },
    frequency: { label: 'Frequency', icon: <Activity size={16} /> },
    register: { label: 'Register', icon: <MessageSquare size={16} /> },
    part_of_speech: { label: 'Type', icon: <BookOpen size={16} /> },
};

export function HierarchySunburst({ words, onWordClick }: HierarchySunburstProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
    const [hoveredNode, setHoveredNode] = useState<HierarchyNode | null>(null);
    const [currentNodePath, setCurrentNodePath] = useState<string[]>(['Vocabolario']);
    const [activeCriteria, setActiveCriteria] = useState<HierarchyCriteria>('category');
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(1);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const { isDark } = useTheme();

    const toggleExpanded = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

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

    const availableCriteria = useMemo(() => {
        return getAvailableHierarchyCriteria(words);
    }, [words]);

    const criteriaTabs = useMemo(() => availableCriteria.map((criteria) => {
        const config = CRITERIA_CONFIG[criteria];
        return {
            value: criteria,
            label: config.label,
            icon: config.icon,
            tone: 'pink' as const,
        };
    }), [availableCriteria]);

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

        const partition = d3.partition<HierarchyNode>()
            .size([2 * Math.PI, hierarchy.height + 1]);
        const root = partition(hierarchy) as D3HierarchyNode;

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

        // Setup zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                g.attr('transform', `translate(${width / 2 + event.transform.x},${height / 2 + event.transform.y}) scale(${event.transform.k})`);
                setCurrentZoom(event.transform.k);
            });

        svg.call(zoom);
        zoomRef.current = zoom;

        // Append main group centered
        const g = svg.append('g')
            .attr('class', 'zoom-container')
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
        path.on('mouseenter', (event, d) => {
            d3.select(event.currentTarget as SVGPathElement).attr('fill-opacity', 1);
            setHoveredNode(d.data);
        })
            .on('mouseleave', (event) => {
                const pathElement = event.currentTarget as SVGPathElement;
                const node = d3.select<SVGPathElement, D3HierarchyNode>(pathElement).datum();
                d3.select<SVGPathElement, D3HierarchyNode>(pathElement)
                    .attr('fill-opacity', arcVisible(node.current!) ? (node.children ? 0.8 : 0.6) : 0);
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
        function clicked(_event: any, p: D3HierarchyNode) {
            parent.datum(p.parent || root);

            // Update current path for breadcrumbs
            const breadcrumbs: string[] = [];
            let current: D3HierarchyNode | null = p;
            while (current) {
                breadcrumbs.unshift(current.data.name);
                current = current.parent as D3HierarchyNode | null;
            }
            setCurrentNodePath(breadcrumbs);

            root.each(d => d.target = {
                x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                y0: Math.max(0, d.y0 - p.depth),
                y1: Math.max(0, d.y1 - p.depth)
            } as any);

            const t = g.transition().duration(750);
            const pathSelection = path as any;
            const labelSelection = label as any;

            pathSelection.transition(t)
                .tween('data', (d: D3HierarchyNode) => {
                    const i = d3.interpolate(d.current ?? d, d.target ?? d);
                    return (progress: number) => {
                        d.current = i(progress) as D3HierarchyNode;
                    };
                })
                .filter((d: D3HierarchyNode, index: number, nodes: ArrayLike<SVGPathElement>) => {
                    const element = nodes[index] as SVGPathElement;
                    return Boolean(+element.getAttribute('fill-opacity')! || arcVisible(d.target!));
                })
                .attr('fill-opacity', (d: D3HierarchyNode) => arcVisible(d.target!) ? (d.children ? 0.8 : 0.6) : 0)
                .attr('pointer-events', (d: D3HierarchyNode) => arcVisible(d.target!) ? 'auto' : 'none')
                .attrTween('d', (d: D3HierarchyNode) => () => arc(d.current!) || '');

            labelSelection.filter((d: D3HierarchyNode, index: number, nodes: ArrayLike<SVGTextElement>) => {
                const element = nodes[index] as SVGTextElement;
                return Boolean(+element.getAttribute('fill-opacity')! || labelVisible(d.target!));
            })
                .transition(t)
                .attr('fill-opacity', (d: D3HierarchyNode) => +labelVisible(d.target!))
                .attrTween('transform', (d: D3HierarchyNode) => () => labelTransform(d.current!));
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

    }, [rootData, dimensions, isDark, onWordClick, isExpanded]);

    const content = (
        <div ref={containerRef} className={`w-full h-full flex flex-col items-center justify-center relative transition-colors duration-300 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>

            <ZoomControlBar
                currentZoom={currentZoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onZoomReset={handleZoomReset}
                isExpanded={isExpanded}
                onToggleExpand={toggleExpanded}
                showFitToView={false}
            />

            <div className={`absolute ${isExpanded ? 'top-4 right-4' : 'top-4 left-1/2 -translate-x-1/2'} z-20 max-w-[calc(100%-2rem)] p-1 ${UI_RADIUS.surface} backdrop-blur-sm shadow-lg ${isDark ? 'bg-slate-800/90' : 'bg-white/90'}`}>
                <PillTabs
                    items={criteriaTabs}
                    value={activeCriteria}
                    onChange={setActiveCriteria}
                    ariaLabel="Hierarchy grouping criteria"
                    className="justify-start"
                />
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

            {/* Active Groups Legend */}
            {rootData.children && rootData.children.length > 0 && (
                <div className={`absolute ${isExpanded ? 'bottom-4 right-4' : 'bottom-20 right-4'} ${UI_RADIUS.control} p-3 border shadow-lg z-10 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <div className={`text-xs font-medium mb-3 flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        <Sparkles size={12} />
                        Gruppi attivi ({rootData.children.length})
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {rootData.children.map((group) => (
                            <div key={group.name} className={`flex items-center gap-2 px-2 py-1.5 ${UI_RADIUS.control} ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                                <div 
                                    className={`w-3 h-3 ${UI_RADIUS.pill}`} 
                                    style={{ backgroundColor: getCategoryColor(group.name) }}
                                />
                                <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {group.name}
                                </span>
                                {group.children && (
                                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                        ({group.children.length})
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hover Info Card */}
            {hoveredNode && (
                <div className={`absolute ${isExpanded ? 'top-20 left-4' : 'top-4 right-4'} backdrop-blur-sm ${UI_RADIUS.surface} p-4 border shadow-xl min-w-[200px] transition-colors duration-300 pointer-events-none z-20 ${isDark ? 'bg-slate-800/95 border-slate-700' : 'bg-white/95 border-gray-200'}`}>
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
                            className={`w-3 h-3 ${UI_RADIUS.pill}`}
                            style={{ backgroundColor: getCategoryColor(hoveredNode.name) }}
                        />
                        <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                            {hoveredNode.children ? `${hoveredNode.children.length} items` : 'Word'}
                        </span>
                    </div>
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
