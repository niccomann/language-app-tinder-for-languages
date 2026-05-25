/**
 * Optional Google account session.
 *
 * When present, `canonicalUserId` overrides the anonymous X-User-Id so the
 * person's data follows their account across devices (see api.ts). `isOwner`
 * unlocks owner-only features (see config/ownerMode.ts). Stored in localStorage
 * only — anonymous use needs no session.
 */
export interface AuthSession {
  canonicalUserId: string;
  email: string;
  isOwner: boolean;
}

const AUTH_SESSION_KEY = 'languageApp:authSession:v1';

export function readAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (typeof parsed.canonicalUserId !== 'string' || parsed.canonicalUserId.length === 0) {
      return null;
    }
    return {
      canonicalUserId: parsed.canonicalUserId,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      isOwner: parsed.isOwner === true,
    };
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable (private mode); login simply won't persist.
  }
}

export function clearAuthSession(): void {
  try {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    // ignore
  }
}

/** The account's user id, or null when signed out. Read synchronously by api.ts. */
export function sessionUserId(): string | null {
  return readAuthSession()?.canonicalUserId ?? null;
}
