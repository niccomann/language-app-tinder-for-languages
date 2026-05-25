import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useTargetLanguage } from '../i18n/languageContext';
import type { PathMissionsResponse } from '../types';
import {
  buildFallbackPathMissions,
  type LearningPathMilestone,
} from '../components/learningPathMeta';
import { reportClientError } from '../utils/clientError';

function fallbackStorageKey(language: string) {
  return `languageApp:pathMissionFallback:${language}:completed:v1`;
}

function readFallbackCompleted(language: string) {
  if (typeof window === 'undefined') return undefined;
  const raw = window.localStorage.getItem(fallbackStorageKey(language));
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function writeFallbackCompleted(language: string, completedCount: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(fallbackStorageKey(language), String(completedCount));
}

export function usePathMissions(
  pathLevel: number,
  milestones: LearningPathMilestone[],
) {
  const language = useTargetLanguage();
  const [localCompletedCount, setLocalCompletedCount] = useState(() => readFallbackCompleted(language));
  const [missions, setMissions] = useState<PathMissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fallbackMissions = useMemo(
    () => buildFallbackPathMissions(pathLevel, milestones, language, localCompletedCount),
    [language, localCompletedCount, milestones, pathLevel],
  );

  const loadMissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPathMissions(language);
      setMissions(data);
      setError(null);
    } catch (err) {
      reportClientError('Failed to load path missions:', err);
      setMissions(fallbackMissions);
      setError('Path missions are running locally until the backend is reachable.');
    } finally {
      setLoading(false);
    }
  }, [fallbackMissions, language]);

  useEffect(() => {
    let cancelled = false;
    api.getPathMissions(language)
      .then((data) => {
        if (cancelled) return;
        setMissions(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        reportClientError('Failed to load path missions:', err);
        setMissions(fallbackMissions);
        setError('Path missions are running locally until the backend is reachable.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackMissions, language]);

  const completeMission = useCallback(async (missionId: string) => {
    try {
      const data = await api.completePathMission(missionId, language);
      setMissions(data);
      setError(null);
      return;
    } catch (err) {
      reportClientError('Failed to complete path mission:', err);
    }

    const current = missions ?? fallbackMissions;
    const mission = current.missions.find((item) => item.mission_id === missionId);
    if (!mission || mission.status !== 'available') {
      setError('Complete the current mission first.');
      return;
    }

    const nextCompletedCount = Math.max(current.completed_count, mission.level);
    writeFallbackCompleted(language, nextCompletedCount);
    setLocalCompletedCount(nextCompletedCount);
    setMissions(buildFallbackPathMissions(pathLevel, milestones, language, nextCompletedCount));
    setError('Mission saved locally until the backend confirms it.');
  }, [fallbackMissions, language, milestones, missions, pathLevel]);

  return {
    missions: missions ?? fallbackMissions,
    loading,
    error,
    reload: loadMissions,
    completeMission,
  };
}
