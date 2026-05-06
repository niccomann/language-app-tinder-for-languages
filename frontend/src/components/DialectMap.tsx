import { useState, useMemo, useEffect, useCallback } from 'react';
import { Map, Globe2, ChevronDown, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { api } from '../services/api';
import type { DialectWord } from '../types';
import germanyGeoJsonUrl from '../assets/germany-states.json?url';
import { ExpandedViewWrapper, UI_RADIUS } from './ui';

interface DialectMapProps {
  initialWord?: string;
}

const STATE_TO_DIALECT_REGION: Record<string, string> = {
  'Bayern': 'bayern',
  'Baden-Württemberg': 'schwaben',
  'Sachsen': 'sachsen',
  'Sachsen-Anhalt': 'sachsen',
  'Thüringen': 'franken',
  'Berlin': 'berlin',
  'Brandenburg': 'berlin',
  'Hamburg': 'hamburg',
  'Bremen': 'hamburg',
  'Niedersachsen': 'hamburg',
  'Schleswig-Holstein': 'hamburg',
  'Mecklenburg-Vorpommern': 'hamburg',
  'Nordrhein-Westfalen': 'koeln',
  'Rheinland-Pfalz': 'koeln',
  'Saarland': 'koeln',
  'Hessen': 'franken',
};

const REGION_COLORS: Record<string, string> = {
  'bayern': '#3B82F6',
  'sachsen': '#10B981',
  'schwaben': '#F59E0B',
  'berlin': '#EF4444',
  'koeln': '#8B5CF6',
  'hamburg': '#06B6D4',
  'franken': '#EC4899',
  'oesterreich': '#84CC16',
};

const getRegionColor = (regionId: string): string => {
  return REGION_COLORS[regionId] || '#64748B';
};

export function DialectMap({ initialWord }: DialectMapProps) {
  const [dialectWords, setDialectWords] = useState<DialectWord[]>([]);
  const [geoJson, setGeoJson] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => setIsExpanded(prev => !prev), []);

  const loadDialectWords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDialectWords('de');
      setDialectWords(data);
      if (data.length > 0) {
        setSelectedWord(initialWord || data[0].standardGerman);
      }
    } catch (error) {
      console.error('Failed to load dialect words:', error);
    } finally {
      setLoading(false);
    }
  }, [initialWord]);

  useEffect(() => {
    loadDialectWords();
  }, [loadDialectWords]);

  useEffect(() => {
    let isMounted = true;

    const loadGeoJson = async () => {
      setGeoLoading(true);
      try {
        const response = await fetch(germanyGeoJsonUrl);
        if (!response.ok) {
          throw new Error(`GeoJSON request failed with ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setGeoJson(data);
        }
      } catch (error) {
        console.error('Failed to load Germany map GeoJSON:', error);
      } finally {
        if (isMounted) {
          setGeoLoading(false);
        }
      }
    };

    loadGeoJson();
    return () => {
      isMounted = false;
    };
  }, []);

  const availableWords = useMemo(() => dialectWords.map(d => d.standardGerman), [dialectWords]);
  const wordData = useMemo(() => dialectWords.find(d => d.standardGerman === selectedWord), [dialectWords, selectedWord]);

  const getVariantForRegion = (regionId: string) => {
    if (!wordData) return null;
    return wordData.variants.find(variant => variant.regionId === regionId);
  };

  const handleRegionHover = (regionId: string | null) => {
    setHoveredRegion(regionId);
  };

  const hoveredVariant = hoveredRegion ? getVariantForRegion(hoveredRegion) : null;

  if (loading || geoLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-slate-400">Caricamento dialetti...</span>
        </div>
      </div>
    );
  }

  if (dialectWords.length === 0 || !geoJson) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-3 text-center p-8">
          <Globe2 className="w-12 h-12 text-slate-500" />
          <h3 className="text-lg font-semibold text-white">Nessun dialetto disponibile</h3>
          <p className="text-slate-400 text-sm">I dati sui dialetti regionali devono essere popolati nel database.</p>
        </div>
      </div>
    );
  }

  const content = (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-gradient-to-br from-emerald-500 to-teal-600 ${UI_RADIUS.control}`}>
            <Globe2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Mappa Dialetti</h2>
            <p className="text-xs text-slate-400">Esplora le varianti regionali tedesche</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleExpanded}
            className={`p-2 ${UI_RADIUS.control} transition-all hover:scale-[1.04] hover:bg-slate-700 ${isExpanded ? 'text-purple-400' : 'text-slate-300'}`}
            title={isExpanded ? "Esci da fullscreen" : "Espandi a fullscreen"}
          >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 ${UI_RADIUS.control} text-white transition-colors`}
            >
              <span className="font-medium">{selectedWord || 'Seleziona parola'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          
            {isDropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 bg-slate-700 ${UI_RADIUS.control} shadow-xl border border-slate-600 z-50 max-h-64 overflow-y-auto`}>
                {availableWords.map((word) => (
                  <button
                    key={word}
                    onClick={() => {
                      setSelectedWord(word);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-slate-600 transition-colors ${
                      word === selectedWord ? 'bg-slate-600 text-emerald-400' : 'text-white'
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {wordData && (
        <div className={`mb-3 p-3 bg-slate-800/50 ${UI_RADIUS.surface} border border-slate-700 flex-shrink-0`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-white">{wordData.standardGerman}</span>
              <span className="text-slate-400 ml-3">({wordData.translation})</span>
            </div>
            <span className="text-sm text-slate-500">Hochdeutsch</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        <div className={`flex-1 relative bg-slate-800/30 ${UI_RADIUS.surface} border border-slate-700 p-2 overflow-hidden flex items-center justify-center`}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              center: [10.5, 51.2],
              scale: 2800
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup>
              <Geographies geography={geoJson}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies.map((geo: any) => {
                    const stateName = geo.properties.name;
                    const dialectRegionId = STATE_TO_DIALECT_REGION[stateName];
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => {
                          if (dialectRegionId) {
                            handleRegionHover(dialectRegionId);
                          }
                        }}
                        onMouseLeave={() => handleRegionHover(null)}
                        style={{
                          default: {
                            fill: dialectRegionId ? getRegionColor(dialectRegionId) : '#475569',
                            fillOpacity: 0.7,
                            stroke: '#1e293b',
                            strokeWidth: 0.5,
                            outline: 'none',
                          },
                          hover: {
                            fill: dialectRegionId ? getRegionColor(dialectRegionId) : '#475569',
                            fillOpacity: 0.95,
                            stroke: '#fff',
                            strokeWidth: 1.5,
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          pressed: {
                            fill: dialectRegionId ? getRegionColor(dialectRegionId) : '#475569',
                            fillOpacity: 1,
                            stroke: '#fff',
                            strokeWidth: 2,
                            outline: 'none',
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {hoveredVariant && (
            <div 
              className={`absolute top-3 left-3 bg-slate-900/95 backdrop-blur-sm ${UI_RADIUS.surface} p-3 border border-slate-600 shadow-2xl min-w-[180px]`}
            >
              <div className="text-xs text-slate-400 mb-1">{hoveredVariant.dialect}</div>
              <div className="text-xl font-bold text-yellow-300 mb-1">{hoveredVariant.variant}</div>
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Map className="w-3 h-3" />
                <span>{hoveredVariant.region}</span>
              </div>
            </div>
          )}
        </div>

        <div className={`w-72 bg-slate-800/50 ${UI_RADIUS.surface} border border-slate-700 p-3 overflow-y-auto flex-shrink-0`}>
          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Map className="w-4 h-4 text-emerald-400" />
            Tutte le Varianti
          </h3>
          
          <div className="space-y-2">
            {wordData?.variants.map((variant) => (
              <div 
                key={variant.regionId}
                className={`p-2.5 ${UI_RADIUS.control} border transition-all duration-200 cursor-pointer ${
                  hoveredRegion === variant.regionId 
                    ? 'bg-slate-700 border-slate-500' 
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                }`}
                onMouseEnter={() => handleRegionHover(variant.regionId)}
                onMouseLeave={() => handleRegionHover(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-2.5 h-2.5 ${UI_RADIUS.pill}`}
                      style={{ backgroundColor: getRegionColor(variant.regionId) }}
                    />
                    <span className="text-xs text-slate-400">{variant.dialect}</span>
                  </div>
                  <span className="text-xs text-slate-500">{variant.region}</span>
                </div>
                <div className={`text-base font-semibold ${hoveredRegion === variant.regionId ? 'text-yellow-300' : 'text-white'}`}>
                  {variant.variant}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {wordData && wordData.variants.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 flex-shrink-0">
          {wordData.variants.map((variant) => (
            <div 
              key={variant.regionId}
              className={`flex items-center gap-1.5 px-2.5 py-1 ${UI_RADIUS.pill} border transition-all cursor-pointer ${
                hoveredRegion === variant.regionId 
                  ? 'bg-slate-700 border-slate-500' 
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
              }`}
              onMouseEnter={() => handleRegionHover(variant.regionId)}
              onMouseLeave={() => handleRegionHover(null)}
            >
              <div 
                className={`w-2 h-2 ${UI_RADIUS.pill}`}
                style={{ backgroundColor: getRegionColor(variant.regionId) }}
              />
              <span className="text-xs text-slate-400">{variant.dialect}</span>
            </div>
          ))}
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
