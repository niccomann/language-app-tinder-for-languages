import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Hook to manage category selection and loading
 */
export const useCategories = () => {
  const { language } = useLanguage();
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const cards = await api.getFlashcards({ language });
      const categories = Array.from(
        new Set(cards.map(card => card.category).filter(Boolean))
      ) as string[];
      setAllCategories(categories);
      setSelectedCategories(categories); // Select all by default
    } catch (err) {
      setError('Failed to load categories. Make sure the backend is running.');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const selectAll = () => setSelectedCategories(allCategories);
  const deselectAll = () => setSelectedCategories([]);

  return {
    allCategories,
    selectedCategories,
    loading,
    error,
    toggleCategory,
    selectAll,
    deselectAll,
  };
};
