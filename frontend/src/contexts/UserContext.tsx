import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { getUser } from '../services/userApi';
import type { UserProfile } from '../services/userApi';
import { clearIdentity, getOrCreateUserId } from '../services/userIdentity';
import { UserContext } from './user-context';

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  const loadProfile = useCallback(async (id: string) => {
    try {
      const fetched = await getUser(id);
      setProfile(fetched);
    } catch (err) {
      console.error('UserContext: failed to load profile', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const id = await getOrCreateUserId();
        if (cancelled) return;
        setUserId(id);
        await loadProfile(id);
      } catch (err) {
        // Safari private mode / quota / Capacitor storage failure must not
        // leave the app stuck on the loading splash forever.
        console.error('UserContext: identity init failed', err);
      } finally {
        if (!cancelled) setStatus('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    await loadProfile(userId);
  }, [loadProfile, userId]);

  const resetIdentity = useCallback(async () => {
    try {
      await clearIdentity();
    } catch (err) {
      console.error('UserContext: clearIdentity failed', err);
    }
    setProfile(null);
    setUserId(null);
    setStatus('loading');
    try {
      const fresh = await getOrCreateUserId();
      setUserId(fresh);
    } catch (err) {
      console.error('UserContext: resetIdentity getOrCreate failed', err);
    } finally {
      setProfile(null);
      setStatus('ready');
    }
  }, []);

  const value = useMemo(
    () => ({ userId, profile, status, refreshProfile, resetIdentity }),
    [userId, profile, status, refreshProfile, resetIdentity],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
