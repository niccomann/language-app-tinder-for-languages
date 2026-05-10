import { useState, useEffect } from 'react';
import { Search, BookOpen, CheckCircle, XCircle, Filter } from 'lucide-react';
import { api } from '../services/api';
import type { FlashcardWithProgress } from '../types';
import { LoadingSpinner, ErrorState, PageHeader, StatCard } from './ui';
import { AudioButton } from './AudioButton';
import { ConfidenceBadge } from './ConfidenceBadge';
import { StatsSummary } from './StatsSummary';
import { useLanguage } from '../contexts/LanguageContext';

interface WordsLibraryProps {
  onClose: () => void;
}

export function WordsLibrary({ onClose }: WordsLibraryProps) {
  const { language } = useLanguage();
  const [words, setWords] = useState<FlashcardWithProgress[]>([]);
  const [filteredWords, setFilteredWords] = useState<FlashcardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'known' | 'unknown'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const loadWords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getWordsLibrary({
        status: statusFilter === 'all' ? undefined : statusFilter,
        language,
      });
      setWords(data);
      setFilteredWords(data);
    } catch (err) {
      setError('Error loading words');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = async (word: FlashcardWithProgress) => {
    try {
      const newKnownStatus = !word.known;
      
      await api.recordProgress(word.id, newKnownStatus);
      
      setWords(prevWords =>
        prevWords.map(w =>
          w.id === word.id
            ? {
                ...w,
                known: newKnownStatus,
                review_count: (w.review_count || 0) + 1,
                last_reviewed: new Date().toISOString(),
              }
            : w
        )
      );

      console.log(`✅ Word "${word.word}" marked as ${newKnownStatus ? 'known' : 'unknown'}`);
    } catch (err) {
      console.error('Failed to update word status:', err);
      setError('Error updating word status');
    }
  };

  useEffect(() => {
    loadWords();
  }, [statusFilter, language]);

  useEffect(() => {
    let filtered = words;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        word =>
          word.word.toLowerCase().includes(query) ||
          word.translation.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(word => word.category === categoryFilter);
    }

    setFilteredWords(filtered);
  }, [searchQuery, categoryFilter, words]);

  const categories = Array.from(new Set(words.map(w => w.category).filter(Boolean)));

  const knownWords = words.filter(w => w.known === true);
  const unknownWords = words.filter(w => w.known === false);
  const notReviewedWords = words.filter(w => w.known === null);

  if (loading) {
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        <PageHeader
          title="My Library"
          subtitle="All your words in one place"
          icon={<BookOpen size={36} />}
          onBack={onClose}
        />

        {/* Confidence Stats Summary */}
        <StatsSummary className="mb-6" />
        
        {/* Statistics Cards */}
        <p className="text-sm text-gray-500 mb-3 text-center font-medium">
          👆 Click on a word to toggle its status (Known / To Review)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total"
            value={words.length}
            icon={<BookOpen size={24} className="text-gray-600" />}
            color="gray"
            isActive={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <StatCard
            label="Learned"
            value={knownWords.length}
            icon={<CheckCircle size={24} className="text-green-600" />}
            color="green"
            isActive={statusFilter === 'known'}
            onClick={() => setStatusFilter('known')}
          />
          <StatCard
            label="To Review"
            value={unknownWords.length}
            icon={<XCircle size={24} className="text-red-600" />}
            color="red"
            isActive={statusFilter === 'unknown'}
            onClick={() => setStatusFilter('unknown')}
          />
          <StatCard
            label="Not Viewed"
            value={notReviewedWords.length}
            icon={<Filter size={24} className="text-blue-600" />}
            color="blue"
            onClick={() => {
              setStatusFilter('all');
              setFilteredWords(notReviewedWords);
            }}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search word or translation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'known' | 'unknown')}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors font-semibold"
            >
              <option value="all">All words</option>
              <option value="known">Only learned</option>
              <option value="unknown">Only to review</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors font-semibold"
            >
              <option value="all">All categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600 font-medium">
            Showing <span className="font-bold text-indigo-600">{filteredWords.length}</span> words
          </p>
        </div>

        {/* Words Grid */}
        {filteredWords.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No words found</h3>
            <p className="text-gray-600">Try modifying your search filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWords.map((word) => (
              <div
                key={word.id}
                onClick={() => handleWordClick(word)}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 border-gray-100 cursor-pointer"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {word.image_base64 ? (
                    <img
                      src={`data:image/jpeg;base64,${word.image_base64}`}
                      alt={word.word}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                      <span className="text-4xl font-bold text-indigo-300">{word.word.charAt(0)}</span>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {word.known === true && (
                      <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <CheckCircle size={14} />
                        Learned
                      </div>
                    )}
                    {word.known === false && (
                      <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                        <XCircle size={14} />
                        To Review
                      </div>
                    )}
                    {word.known === null && (
                      <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                        Not Viewed
                      </div>
                    )}
                  </div>
                  {/* Category Badge */}
                  {word.category && (
                    <div className="absolute bottom-3 left-3">
                      <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold">
                        {word.category}
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-2xl font-bold text-gray-900">{word.word}</h3>
                    <AudioButton text={word.word} size="sm" />
                  </div>
                  <p className="text-gray-600 text-lg mb-3">{word.translation}</p>
                  
                  {/* Confidence Badge */}
                  <div className="mb-3">
                    <ConfidenceBadge word={word.word} size="sm" />
                  </div>
                  
                  {/* Stats */}
                  {word.review_count !== null && word.review_count !== undefined && (
                    <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                      <span className="font-medium">Reviews: {word.review_count}</span>
                      {word.last_reviewed && (
                        <span className="text-xs">
                          {new Date(word.last_reviewed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
