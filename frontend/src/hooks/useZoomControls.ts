/**
 * useZoomControls - Hook centralizzato per gestire zoom e fullscreen
 * 
 * Fornisce:
 * - Zoom in/out/reset
 * - Fit to view (centra tutti gli elementi)
 * - Fullscreen mode
 * - Tracking del livello di zoom corrente
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import * as d3 from 'd3';

export interface ZoomControlsOptions {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  zoomStep?: number;
}

export interface ZoomControlsReturn {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  currentZoom: number;
  zoomRef: React.MutableRefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleFitToView: (nodes: { x?: number; y?: number }[], nodeRadius: number) => void;
  initializeZoom: (svg: SVGSVGElement, container: d3.Selection<SVGGElement, unknown, null, undefined>) => void;
}

export function useZoomControls(
  svgRef: React.RefObject<SVGSVGElement>,
  dimensions: { width: number; height: number },
  options: ZoomControlsOptions = {}
): ZoomControlsReturn {
  const {
    minZoom = 0.3,
    maxZoom = 3,
    initialZoom = 1,
    zoomStep = 1.3,
  } = options;

  const [isExpanded, setIsExpanded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(initialZoom);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.scaleBy, zoomStep);
    }
  }, [svgRef, zoomStep]);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.scaleBy, 1 / zoomStep);
    }
  }, [svgRef, zoomStep]);

  const handleZoomReset = useCallback(() => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, [svgRef]);

  const handleFitToView = useCallback((nodes: { x?: number; y?: number }[], nodeRadius: number) => {
    if (svgRef.current && zoomRef.current && nodes.length > 0) {
      const svg = d3.select(svgRef.current);
      const { width, height } = dimensions;
      
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
  }, [svgRef, dimensions]);

  const initializeZoom = useCallback((
    svg: SVGSVGElement, 
    container: d3.Selection<SVGGElement, unknown, null, undefined>
  ) => {
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setCurrentZoom(event.transform.k);
      });

    d3.select(svg).call(zoom);
    zoomRef.current = zoom;
    
    return zoom;
  }, [minZoom, maxZoom]);

  return {
    isExpanded,
    setIsExpanded,
    toggleExpanded,
    currentZoom,
    zoomRef,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleFitToView,
    initializeZoom,
  };
}
