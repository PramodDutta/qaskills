'use client';

import { useEffect, useState } from 'react';
import {
  currentWebinarSession,
  pickHook,
  type WebinarHook,
  type WebinarSession,
} from '@/lib/webinar';

// Same keys as components/layout/webinar-banner.tsx: a visitor sees one hook in
// every placement, and dismissing the top banner also quiets the exit invite.
export const HOOK_KEY = 'qaskills-webinar-hook';
export const DISMISS_KEY = 'qaskills-webinar-dismissed';
// Start time of the session the visitor already clicked through for.
export const CLICKED_KEY = 'qaskills-webinar-clicked';

export interface WebinarView {
  session: WebinarSession;
  hook: WebinarHook;
  timeZone: string | undefined;
}

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the placement just forgets */
  }
}

/**
 * The session to promote right now plus this visitor's hook. Always null on the
 * server and on the first client render, so hydration matches the server HTML;
 * the date logic runs only in the browser because blog pages are static.
 */
export function useWebinar(): WebinarView | null {
  const [view, setView] = useState<WebinarView | null>(null);

  useEffect(() => {
    let timeZone: string | undefined;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* fall back to the runtime default zone */
    }
    const hook = pickHook(readStorage(HOOK_KEY), Math.random());
    writeStorage(HOOK_KEY, hook.id);

    const update = () => {
      const session = currentWebinarSession(Date.now(), { timeZone });
      setView(session ? { session, hook, timeZone } : null);
    };
    update();
    // Keeps "starts in", "live now", and the move to the next date current.
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return view;
}
