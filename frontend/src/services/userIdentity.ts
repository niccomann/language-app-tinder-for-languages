import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const USER_ID_KEY = 'languageApp:userId:v1';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function readRaw(): Promise<string | null> {
  if (isNative()) {
    const { value } = await Preferences.get({ key: USER_ID_KEY });
    return value ?? null;
  }
  return typeof window !== 'undefined' ? window.localStorage.getItem(USER_ID_KEY) : null;
}

async function writeRaw(value: string): Promise<void> {
  if (isNative()) {
    await Preferences.set({ key: USER_ID_KEY, value });
    return;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(USER_ID_KEY, value);
  }
}

async function removeRaw(): Promise<void> {
  if (isNative()) {
    await Preferences.remove({ key: USER_ID_KEY });
    return;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_ID_KEY);
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
