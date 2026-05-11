import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { reportClientError } from '../utils/clientError';
import { useTargetLanguage } from '../i18n/languageContext';

/**
 * Hook to manage category selection and loading
 */
export const useCategories = () => {
  const language = useTargetLanguage();
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = await api.getLibraryFilters(language);
      const categories = filters.categories;
      setAllCategories(categories);
      setSelectedCategories(categories); // Select all by default
    } catch (err) {
      setError('Failed to load categories. Make sure the backend is running.');
      reportClientError('Error loading categories:', err);
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
