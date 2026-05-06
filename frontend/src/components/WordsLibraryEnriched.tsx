import { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, CheckCircle, XCircle, Filter, ChevronDown, X, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import type { FlashcardWithProgress, LibraryFilters } from '../types';
import { AppScreen, FilterSelect, LoadingSpinner, ErrorState, ScreenHeader, StatCard, SurfacePanel, UI_RADIUS } from './ui';
import { WordDetailModal } from './WordDetailModalEnriched';

interface WordsLibraryEnrichedProps {
  onClose: () => void;
  initialWordId?: number;
  initialDetailTab?: 'overview' | 'db_row';
  onWordOpen?: (wordId: number) => void;
  onWordClose?: () => void;
}

const GENDER_LABELS: Record<string, { article: string; color: string }> = {
  masculine: { article: 'der', color: 'bg-blue-500' },
  feminine: { article: 'die', color: 'bg-pink-500' },
  neuter: { article: 'das', color: 'bg-green-500' },
};

const CEFR_COLORS: Record<string, string> = {
  A1: 'bg-green-100 text-green-800',
  A2: 'bg-green-200 text-green-900',
  B1: 'bg-yellow-100 text-yellow-800',
  B2: 'bg-yellow-200 text-yellow-900',
  C1: 'bg-orange-100 text-orange-800',
  C2: 'bg-red-100 text-red-800',
};

const FREQUENCY_ICONS: Record<string, string> = {
  very_common: '⭐⭐⭐⭐⭐',
  common: '⭐⭐⭐⭐',
  moderate: '⭐⭐⭐',
  rare: '⭐⭐',
  archaic: '⭐',
};

const LIBRARY_PAGE_SIZE = 200;

export function WordsLibraryEnriched({
  onClose,
  initialWordId,
  initialDetailTab,
  onWordOpen,
  onWordClose,
}: WordsLibraryEnrichedProps) {
  const [words, setWords] = useState<FlashcardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LibraryFilters | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState<number | null>(initialWordId ?? null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [cefrFilter, setCefrFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('');
  const [registerFilter, setRegisterFilter] = useState<string>('');
  const [posFilter, setPosFilter] = useState<string>('');
  const [compoundFilter, setCompoundFilter] = useState<string>('');

  const loadFilters = useCallback(async () => {
    try {
      const filtersData = await api.getLibraryFilters('de');
      setFilters(filtersData);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  }, []);

  const loadWords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getLibraryWords({
        language: 'de',
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
        cefr_level: cefrFilter || undefined,
        gender: genderFilter || undefined,
        frequency_band: frequencyFilter || undefined,
        register: registerFilter || undefined,
        part_of_speech: posFilter || undefined,
        is_compound: compoundFilter === 'true' ? true : compoundFilter === 'false' ? false : undefined,
        limit: LIBRARY_PAGE_SIZE,
        offset: 0,
      });
      const allWords = [...data];
      let currentPage = data;
      let offset = LIBRARY_PAGE_SIZE;

      while (currentPage.length === LIBRARY_PAGE_SIZE) {
        const page = await api.getLibraryWords({
          language: 'de',
          search: searchQuery || undefined,
          category: categoryFilter || undefined,
          cefr_level: cefrFilter || undefined,
          gender: genderFilter || undefined,
          frequency_band: frequencyFilter || undefined,
          register: registerFilter || undefined,
          part_of_speech: posFilter || undefined,
          is_compound: compoundFilter === 'true' ? true : compoundFilter === 'false' ? false : undefined,
          limit: LIBRARY_PAGE_SIZE,
          offset,
        });

        if (page.length === 0) {
          break;
        }

        allWords.push(...page);
        currentPage = page;
        offset += LIBRARY_PAGE_SIZE;
      }

      setWords(allWords);
    } catch (err) {
      setError('Error loading words');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, cefrFilter, genderFilter, frequencyFilter, registerFilter, posFilter, compoundFilter]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadWords();
    }, 300);
    return () => clearTimeout(debounce);
  }, [loadWords]);

  useEffect(() => {
    setSelectedWordId(initialWordId ?? null);
  }, [initialWordId]);

  const handleWordClick = (word: FlashcardWithProgress) => {
    if (onWordOpen) {
      onWordOpen(word.id);
      return;
    }
    setSelectedWordId(word.id);
  };

  const handleCloseWord = () => {
    if (onWordClose) {
      onWordClose();
      return;
    }
    setSelectedWordId(null);
  };

  const handleToggleStatus = async (word: FlashcardWithProgress, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const newKnownStatus = !word.known;
      await api.recordProgress(word.id, newKnownStatus);
      setWords(prevWords =>
        prevWords.map(currentWord =>
          currentWord.id === word.id
            ? { ...currentWord, known: newKnownStatus, review_count: (currentWord.review_count || 0) + 1 }
            : currentWord
        )
      );
    } catch (err) {
      console.error('Failed to update word status:', err);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCategoryFilter('');
    setCefrFilter('');
    setGenderFilter('');
    setFrequencyFilter('');
    setRegisterFilter('');
    setPosFilter('');
    setCompoundFilter('');
  };

  const activeFilterCount = [statusFilter, categoryFilter, cefrFilter, genderFilter, frequencyFilter, registerFilter, posFilter, compoundFilter].filter(Boolean).length;

  const knownWords = words.filter(word => word.known === true);
  const unknownWords = words.filter(word => word.known === false);
  const notReviewedWords = words.filter(word => word.known === null || word.known === undefined);
  const visibleWords = statusFilter === 'known'
    ? knownWords
    : statusFilter === 'unknown'
      ? unknownWords
      : words;

  if (loading && words.length === 0) {
    return <LoadingSpinner message="Loading words..." size="large" fullScreen />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error"
        message={error}
        onRetry={onClose}
        retryLabel="Go Back"
        fullScreen
      />
    );
  }

  return (
    <AppScreen mode="overlay" width="wide" contentClassName="p-6">
        <ScreenHeader
          title="Word Library"
          subtitle="Explore your vocabulary with rich linguistic data"
          icon={<BookOpen size={32} />}
          onBack={onClose}
          className="mb-6"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total"
            value={words.length}
            icon={<BookOpen size={20} className="text-gray-600 dark:text-gray-400" />}
            color="gray"
            isActive={!statusFilter}
            onClick={() => setStatusFilter('')}
          />
          <StatCard
            label="Learned"
            value={knownWords.length}
            icon={<CheckCircle size={20} className="text-green-600" />}
            color="green"
            isActive={statusFilter === 'known'}
            onClick={() => setStatusFilter(statusFilter === 'known' ? '' : 'known')}
          />
          <StatCard
            label="To Review"
            value={unknownWords.length}
            icon={<XCircle size={20} className="text-red-600" />}
            color="red"
            isActive={statusFilter === 'unknown'}
            onClick={() => setStatusFilter(statusFilter === 'unknown' ? '' : 'unknown')}
          />
          <StatCard
            label="Not Viewed"
            value={notReviewedWords.length}
            icon={<Sparkles size={20} className="text-blue-600" />}
            color="blue"
          />
        </div>

        <SurfacePanel className="mb-6" padding="md">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search word or translation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-slate-600 ${UI_RADIUS.control} focus:border-indigo-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 dark:text-white`}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 ${UI_RADIUS.control} font-semibold transition-all ${
                showFilters || activeFilterCount > 0
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Filter size={18} />
              Filters
              {activeFilterCount > 0 && (
                <span className={`bg-white text-indigo-600 text-xs font-bold px-2 py-0.5 ${UI_RADIUS.pill}`}>
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className={`flex items-center gap-1 px-3 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ${UI_RADIUS.control} transition-colors`}
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>

          {showFilters && filters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
              <FilterSelect
                ariaLabel="Filter by CEFR level"
                value={cefrFilter}
                onChange={setCefrFilter}
              >
                <option value="">All CEFR Levels</option>
                {filters.cefr_levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </FilterSelect>

              <FilterSelect
                ariaLabel="Filter by gender"
                value={genderFilter}
                onChange={setGenderFilter}
              >
                <option value="">All Genders</option>
                {filters.genders.map(gender => (
                  <option key={gender} value={gender}>
                    {GENDER_LABELS[gender]?.article || gender} ({gender})
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                ariaLabel="Filter by frequency"
                value={frequencyFilter}
                onChange={setFrequencyFilter}
              >
                <option value="">All Frequencies</option>
                {filters.frequency_bands.map(freq => (
                  <option key={freq} value={freq}>{freq.replace('_', ' ')}</option>
                ))}
              </FilterSelect>

              <FilterSelect
                ariaLabel="Filter by category"
                value={categoryFilter}
                onChange={setCategoryFilter}
              >
                <option value="">All Categories</option>
                {filters.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </FilterSelect>

              <FilterSelect
                ariaLabel="Filter by part of speech"
                value={posFilter}
                onChange={setPosFilter}
              >
                <option value="">All Parts of Speech</option>
                {filters.parts_of_speech.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </FilterSelect>

              <FilterSelect
                ariaLabel="Filter by compound status"
                value={compoundFilter}
                onChange={setCompoundFilter}
              >
                <option value="">Simple & Compound</option>
                <option value="false">Simple words only</option>
                <option value="true">Compound words only</option>
              </FilterSelect>

              {filters.registers.length > 0 && (
                <FilterSelect
                  ariaLabel="Filter by register"
                  value={registerFilter}
                  onChange={setRegisterFilter}
                >
                  <option value="">All Registers</option>
                  {filters.registers.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </FilterSelect>
              )}
            </div>
          )}
        </SurfacePanel>

        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Showing <span className="font-bold text-indigo-600">{visibleWords.length}</span> words
            {loading && <span className="ml-2 text-sm text-gray-400">(loading...)</span>}
          </p>
        </div>

        {visibleWords.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={56} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No words found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try modifying your search filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visibleWords.map((word) => (
              <div
                key={word.id}
                onClick={() => handleWordClick(word)}
                className={`bg-white dark:bg-slate-800 ${UI_RADIUS.surface} shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 border-gray-100 dark:border-slate-700 cursor-pointer`}
              >
                <div className="relative h-40 bg-gray-100 dark:bg-slate-700 overflow-hidden">
                  {word.image_base64 ? (
                    <img
                      src={`data:image/jpeg;base64,${word.image_base64}`}
                      alt={word.word}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900">
                      <span className="text-4xl font-bold text-indigo-300">{word.word.charAt(0)}</span>
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {word.cefr_level && (
                      <span className={`px-2 py-0.5 ${UI_RADIUS.pill} text-xs font-bold ${CEFR_COLORS[word.cefr_level] || 'bg-gray-100 text-gray-800'}`}>
                        {word.cefr_level}
                      </span>
                    )}
                    {word.gender && GENDER_LABELS[word.gender] && (
                      <span className={`${GENDER_LABELS[word.gender].color} text-white px-2 py-0.5 ${UI_RADIUS.pill} text-xs font-bold`}>
                        {GENDER_LABELS[word.gender].article}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => handleToggleStatus(word, e)}
                      className={`px-2.5 py-1 ${UI_RADIUS.pill} text-xs font-bold flex items-center gap-1 shadow-lg transition-colors ${
                        word.known === true
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : word.known === false
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {word.known === true ? <CheckCircle size={12} /> : word.known === false ? <XCircle size={12} /> : <Sparkles size={12} />}
                      {word.known === true ? 'Learned' : word.known === false ? 'Review' : 'New'}
                    </button>
                  </div>

                  {word.is_compound && (
                    <div className="absolute bottom-2 left-2">
                      <span className={`bg-purple-500 text-white px-2 py-0.5 ${UI_RADIUS.pill} text-xs font-semibold`}>
                        Compound
                      </span>
                    </div>
                  )}

                  {word.category && (
                    <div className="absolute bottom-2 right-2">
                      <span className={`bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 ${UI_RADIUS.pill} text-xs font-semibold`}>
                        {word.category}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-0.5">
                    {word.gender && GENDER_LABELS[word.gender] && (
                      <span className="text-gray-500 dark:text-gray-400 font-normal">
                        {GENDER_LABELS[word.gender].article}{' '}
                      </span>
                    )}
                    {word.word}
                    {word.plural_form && (
                      <span className="text-sm text-gray-400 dark:text-gray-500 font-normal ml-1">
                        ({word.plural_form})
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">{word.translation}</p>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {word.part_of_speech && (
                      <span className={`bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 ${UI_RADIUS.pill} text-xs`}>
                        {word.part_of_speech}
                      </span>
                    )}
                    {word.register && word.register !== 'neutral' && (
                      <span className={`bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 ${UI_RADIUS.pill} text-xs`}>
                        {word.register}
                      </span>
                    )}
                  </div>

                  {word.frequency_band && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {FREQUENCY_ICONS[word.frequency_band] || '⭐'}
                      <span className="ml-1">{word.frequency_band.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {selectedWordId && (
        <WordDetailModal
          wordId={selectedWordId}
          initialTab={initialDetailTab}
          onClose={handleCloseWord}
        />
      )}
    </AppScreen>
  );
}
