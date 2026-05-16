import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { readSavedLearningPreferenceProfile } from '../learning/preferenceProfile';
import type { GrammarNode } from '../types';
import { reportClientError } from '../utils/clientError';

export function useAvailableGrammarNodes() {
  const [availableNodes, setAvailableNodes] = useState<GrammarNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadAvailableNodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const preferenceProfile = readSavedLearningPreferenceProfile();
      const nodes = await api.getAvailableNodes({
        learningPreferenceProfile: preferenceProfile,
      });
      setAvailableNodes(nodes);
    } catch (err) {
      reportClientError('Failed to load available nodes:', err);
      setError('Impossibile caricare i nodi grammaticali — riprova più tardi');
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
    error,
    reloadAvailableNodes,
  };
}
