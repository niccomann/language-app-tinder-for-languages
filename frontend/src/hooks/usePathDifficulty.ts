import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { CefrLevel } from '../types';
import { useTargetLanguage } from '../i18n/languageContext';
import {
  getCefrLevelForPathLevel,
  getCefrPathPhaseForLevel,
  getUnlockedCefrLevelsForPathLevel,
} from '../components/learningPathMeta';
import { reportClientError } from '../utils/clientError';

export function usePathDifficulty() {
  const language = useTargetLanguage();
  const [pathLevel, setPathLevel] = useState(1);

  useEffect(() => {
    let cancelled = false;
    api
      .getAdaptiveLearningSummary(language)
      .then((data) => {
        if (!cancelled) setPathLevel(data.path_level);
      })
      .catch((error) => {
        if (!cancelled) reportClientError('Failed to load path difficulty:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  return useMemo(() => {
    const currentCefrLevel: CefrLevel = getCefrLevelForPathLevel(pathLevel);
    return {
      pathLevel,
      currentCefrLevel,
      currentPhase: getCefrPathPhaseForLevel(pathLevel),
      unlockedCefrLevels: getUnlockedCefrLevelsForPathLevel(pathLevel),
    };
  }, [pathLevel]);
}
