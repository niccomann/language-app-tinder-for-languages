import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const USER_ID_KEY = 'languageApp:userId:v1';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// In-memory fallback for Safari private mode / quota-exceeded / iframe with
// disabled storage — never throw out of readRaw/writeRaw, just degrade to
// session-only identity.
let inMemoryUserId: string | null = null;

async function readRaw(): Promise<string | null> {
  if (isNative()) {
    try {
      const { value } = await Preferences.get({ key: USER_ID_KEY });
      return value ?? null;
    } catch {
      return inMemoryUserId;
    }
  }
  if (typeof window === 'undefined') return inMemoryUserId;
  try {
    return window.localStorage.getItem(USER_ID_KEY) ?? inMemoryUserId;
  } catch {
    return inMemoryUserId;
  }
}

async function writeRaw(value: string): Promise<void> {
  inMemoryUserId = value;
  if (isNative()) {
    try {
      await Preferences.set({ key: USER_ID_KEY, value });
    } catch (err) {
      console.warn('userIdentity: Preferences.set failed, falling back to memory', err);
    }
    return;
  }
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_ID_KEY, value);
  } catch (err) {
    console.warn('userIdentity: localStorage.setItem failed, falling back to memory', err);
  }
}

async function removeRaw(): Promise<void> {
  inMemoryUserId = null;
  if (isNative()) {
    try {
      await Preferences.remove({ key: USER_ID_KEY });
    } catch (err) {
      console.warn('userIdentity: Preferences.remove failed', err);
    }
    return;
  }
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(USER_ID_KEY);
  } catch (err) {
    console.warn('userIdentity: localStorage.removeItem failed', err);
  }
}

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (very old Capacitor / older browsers).
  const rand = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${rand()}-${rand().slice(0, 4)}-4${rand().slice(0, 3)}-${rand().slice(0, 4)}-${rand()}${rand().slice(0, 4)}`;
}

export async function getOrCreateUserId(): Promise<string> {
  const existing = await readRaw();
  if (existing && existing.length > 0) return existing;
  const fresh = newUuid();
  await writeRaw(fresh);
  return fresh;
}

export async function clearIdentity(): Promise<void> {
  await removeRaw();
}
