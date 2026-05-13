import { createContext } from 'react';

import type { UserProfile } from '../services/userApi';

export interface UserContextValue {
  userId: string | null;
  profile: UserProfile | null;
  status: 'loading' | 'ready';
  refreshProfile: () => Promise<void>;
  resetIdentity: () => Promise<void>;
}

export const UserContext = createContext<UserContextValue | null>(null);
