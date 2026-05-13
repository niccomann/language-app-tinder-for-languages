import { API_BASE_URL } from '../config/appMode';

export interface UserProfile {
  user_id: string;
  display_name: string;
  age: number | null;
  target_language: string;
  proficiency_level: 'beginner' | 'a1_a2' | 'b1_b2';
  daily_goal_minutes: number;
  onboarding_completed: boolean;
}

export interface UserCreatePayload {
  user_id: string;
  display_name: string;
  age?: number | null;
  target_language?: string;
  proficiency_level?: UserProfile['proficiency_level'];
  daily_goal_minutes?: number;
}

export type UserPatchPayload = Partial<Omit<UserProfile, 'user_id'>>;

async function jsonOrThrow(res: Response): Promise<UserProfile> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`userApi ${res.status}: ${text}`);
  }
  return (await res.json()) as UserProfile;
}

export async function createUser(payload: UserCreatePayload): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}

export async function getUser(userId: string): Promise<UserProfile | null> {
  const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`);
  if (res.status === 404) return null;
  return jsonOrThrow(res);
}

export async function patchUser(userId: string, patch: UserPatchPayload): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow(res);
}
