import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { readSavedLearningPreferenceProfile } from '../learning/preferenceProfile';
import type { GrammarNode } from '../types';
import { reportClientError } from '../utils/clientError';

export function useAvailableGrammarNodes() {
  const [availableNodes, setAvailableNodes] = useState<GrammarNode[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadAvailableNodes = useCallback(async () => {
    setLoading(true);
    try {
      const preferenceProfile = readSavedLearningPreferenceProfile();
      const nodes = await api.getAvailableNodes({
        learningPreferenceProfile: preferenceProfile,
      });
      setAvailableNodes(nodes);
    } catch (error) {
      reportClientError('Failed to load available nodes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadAvailableNodes();
  }, [reloadAvailableNodes]);

  return {
    availableNodes,
    loading,
    reloadAvailableNodes,
  };
}
