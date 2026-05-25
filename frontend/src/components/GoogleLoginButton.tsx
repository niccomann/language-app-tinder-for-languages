import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../config/appMode';
import { api } from '../services/api';
import { writeAuthSession } from '../services/authSession';
import { reportClientError } from '../utils/clientError';

interface GoogleCredentialResponse {
  credential?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
// Compact width so the official Google button fits inside the app menu (w-60).
const BUTTON_WIDTH = 200;

function loadGoogleIdentityServices(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Official Google sign-in button (compact + filled). Google's anti-clickjacking
 * rules forbid recoloring or overlaying it, so we can only size/theme it within
 * their options; the dark "filled" theme blends with the app's ink accents.
 * No-op without a client id.
 */
export function GoogleLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleIdentityServices()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response.credential) return;
            setBusy(true);
            try {
              const session = await api.loginWithGoogle(response.credential);
              writeAuthSession(session);
              window.location.reload();
            } catch (err) {
              reportClientError('Google login failed', err);
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'medium',
          type: 'standard',
          text: 'signin_with',
          shape: 'pill',
          width: BUTTON_WIDTH,
        });
      })
      .catch((err) => reportClientError('Google Identity Services load failed', err));

    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={containerRef} aria-busy={busy} className="flex justify-center" style={{ minHeight: 32 }} />;
}
