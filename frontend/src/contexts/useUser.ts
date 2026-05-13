import { useContext } from 'react';

import { UserContext } from './user-context';
import type { UserContextValue } from './user-context';

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
