/**
 * Owner mode
 *
 * The app has no login ("no account required"), so "owner-only" features are
 * gated by a local flag that only the owner enables on their own devices.
 *
 * Enable:  visit any page with `?owner=1` (e.g. https://customizeyourlingua.com/?owner=1)
 * Disable: visit any page with `?owner=0`
 *
 * The flag persists in localStorage, so it survives reloads. This is a UI gate
 * to hide work-in-progress / personal tools from normal users — not a security
 * boundary.
 */
import { readAuthSession } from '../services/authSession';

const OWNER_MODE_KEY = 'languageApp:ownerMode:v1';

function readFlag(): boolean {
  try {
    return window.localStorage.getItem(OWNER_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(OWNER_MODE_KEY, 'true');
    } else {
      window.localStorage.removeItem(OWNER_MODE_KEY);
    }
  } catch {
    // localStorage may be unavailable (private mode); the gate just stays off.
  }
}

// Apply `?owner=1` / `?owner=0` once at startup, before anything reads the flag.
(function syncFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = new URLSearchParams(window.location.search).get('owner');
    if (raw === null) return;
    writeFlag(raw === '1' || raw === 'true');
  } catch {
    // ignore malformed URLs
  }
})();

export function isOwnerMode(): boolean {
  // A signed-in owner account unlocks owner features; the ?owner flag is a
  // no-login fallback (e.g. before Google login is configured).
  if (readAuthSession()?.isOwner) return true;
  return readFlag();
}

// Features visible only to the owner. Referenced by the Games hub, the
// "Visualizza" grid, and the route guard so they stay hidden everywhere.
export const OWNER_ONLY_FEATURE_IDS = new Set<string>(['compose-sentence']);
export const OWNER_ONLY_GRAMMAR_VIEWS = new Set<string>(['funbuilder', 'dialects']);
