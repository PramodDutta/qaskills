'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import {
  IST,
  WEBINAR,
  currentWebinarSession,
  formatClock,
  formatCountdown,
  formatDay,
  localTimeHint,
  pickHook,
  sectionFromPath,
  webinarUrl,
  type WebinarHook,
} from '@/lib/webinar';

// Holds the start of the session the visitor dismissed, so the invite returns
// for the next session instead of disappearing for the whole batch.
const DISMISS_KEY = 'qaskills-webinar-dismissed';
const HOOK_KEY = 'qaskills-webinar-hook';

const ACCENT: Record<WebinarHook['accent'], string> = {
  violet: 'text-violet-300',
  emerald: 'text-emerald-300',
  rose: 'text-rose-300',
};

export function WebinarBanner() {
  const pathname = usePathname();
  const [now, setNow] = useState<number | null>(null);
  const [hook, setHook] = useState<WebinarHook | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);
  const impressionSent = useRef(false);

  useEffect(() => {
    let storedHook: string | null = null;
    let storedDismissal: string | null = null;
    try {
      storedHook = localStorage.getItem(HOOK_KEY);
      storedDismissal = localStorage.getItem(DISMISS_KEY);
    } catch {}
    const picked = pickHook(storedHook, Math.random());
    try {
      localStorage.setItem(HOOK_KEY, picked.id);
    } catch {}
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {}
    setHook(picked);
    setDismissed(storedDismissal);
    setNow(Date.now());
    // Re-check so the countdown, "live now", and the move to the next session stay current.
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const session = now === null ? null : currentWebinarSession(now, { timeZone });
  const visible = Boolean(hook && session && dismissed !== String(session.start));
  const section = sectionFromPath(pathname);

  useEffect(() => {
    if (!visible || impressionSent.current || !hook || !session) return;
    impressionSent.current = true;
    trackEvent('webinar_impression', {
      hook: hook.id,
      section,
      session_date: new Date(session.start).toISOString().slice(0, 10),
      state: session.state,
      placement: 'top-banner',
    });
  }, [visible, hook, session, section]);

  if (!visible || !hook || !session) return null;

  const activeHook = hook;
  const activeSession = session;
  const live = activeSession.state === 'live';
  const href = webinarUrl({ medium: 'top-banner', term: section, content: activeHook.id });
  const istClock = formatClock(activeSession.start, IST);
  const localClock = formatClock(activeSession.start, timeZone);
  const hint = localTimeHint(activeSession.start, timeZone);

  const badgeTone = live
    ? 'bg-rose-600 text-white'
    : activeSession.state === 'upcoming'
      ? 'bg-violet-500 text-white'
      : 'bg-emerald-400 text-slate-950';

  const shortBadge = live
    ? 'Live now'
    : activeSession.state === 'today'
      ? `Today ${localClock}`
      : activeSession.state === 'tomorrow'
        ? `Tomorrow ${localClock}`
        : formatDay(activeSession.start, timeZone);

  // Phones: every pixel the badge gives back goes to the hook.
  const tinyBadge =
    activeSession.state === 'upcoming'
      ? formatDay(activeSession.start, timeZone).replace(/^\w+ /, '')
      : activeSession.state === 'tomorrow'
        ? 'Tomorrow'
        : shortBadge;

  const when = live
    ? `Started ${istClock} IST · join now`
    : activeSession.state === 'today'
      ? `Today, ${istClock} IST · starts in ${formatCountdown(activeSession.minutesToStart)}`
      : activeSession.state === 'tomorrow'
        ? `Tomorrow, ${istClock} IST`
        : `${formatDay(activeSession.start, IST)}, ${istClock} IST`;

  const onClick = () => {
    trackEvent('webinar_click', {
      hook: activeHook.id,
      section,
      session_date: new Date(activeSession.start).toISOString().slice(0, 10),
      state: activeSession.state,
      placement: 'top-banner',
    });
  };

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const key = String(activeSession.start);
    setDismissed(key);
    try {
      localStorage.setItem(DISMISS_KEY, key);
    } catch {}
  };

  return (
    <div className="relative bg-gradient-to-r from-[#0e0c24] via-[#1c1446] to-[#0e0c24] text-white">
      <div className="mx-auto flex items-center justify-between gap-2 px-3 py-2 sm:px-6">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          title={WEBINAR.title}
          className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
        >
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeTone}`}
          >
            {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
            <span className="sm:hidden">{tinyBadge}</span>
            <span className="hidden sm:inline xl:hidden">{shortBadge}</span>
            <span className="hidden xl:inline">{live ? 'Live now' : 'Free live webinar'}</span>
          </span>

          {/* One line from sm up keeps the bar the same height as the course banner. */}
          <span className="min-w-0 text-[11px] leading-snug sm:text-xs lg:text-sm">
            <span className="lg:hidden">{activeHook.short}</span>
            <span className="hidden lg:inline">
              <span className="font-semibold">{activeHook.lead}</span>{' '}
              <span className={`font-semibold ${ACCENT[activeHook.accent]}`}>
                {activeHook.punch}
              </span>
            </span>
          </span>

          <span className="hidden shrink-0 text-xs text-gray-300 xl:inline">
            {when}
            {hint ? ` (${hint})` : ''}
            {activeSession.remaining > 0 && (
              <span className="hidden 2xl:inline">{` · +${activeSession.remaining} more dates`}</span>
            )}
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-violet-500 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-violet-400 sm:px-3 sm:text-sm"
          >
            <span className="sm:hidden">{live ? 'Join' : 'Register'}</span>
            <span className="hidden sm:inline">{live ? 'Join live' : 'Register free'}</span>
            <span aria-hidden="true" className="hidden sm:inline">
              &rarr;
            </span>
          </a>
          <button
            onClick={dismiss}
            className="rounded-full p-1 transition-colors hover:bg-white/20"
            aria-label="Dismiss webinar invite"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
