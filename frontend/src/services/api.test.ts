import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
  registerPlugin: vi.fn(() => ({
    request: vi.fn(),
  })),
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

const USER_ID_KEY = 'languageApp:userId:v1';

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function loadApi() {
  vi.resetModules();
  window.localStorage.clear();
  window.localStorage.setItem(USER_ID_KEY, 'header-user');
  return (await import('./api')).api;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({
    cards_reviewed: 0,
    known_count: 0,
    unknown_count: 0,
  })));
});

describe('api user context', () => {
  it('records progress with X-User-Id instead of a default_user body value', async () => {
    const api = await loadApi();

    await api.recordProgress(12, true);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('X-User-Id')).toBe('header-user');
    expect(JSON.parse(String(init?.body))).toEqual({
      card_id: '12',
      known: true,
    });
  });

  it('loads progress without appending default_user when no explicit user is passed', async () => {
    const api = await loadApi();

    await api.getProgress();

    const [url] = vi.mocked(fetch).mock.calls[0];
    const requestUrl = new URL(String(url));
    expect(requestUrl.pathname).toBe('/api/progress');
    expect(requestUrl.search).toBe('');
  });
});
