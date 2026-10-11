'use client';

// Desktop-only "before you go" invite. Fires when the pointer leaves through
// the top edge (toward the tabs or address bar), at most once a day, never on
// touch devices, and never stacked on another dialog. Mounted from the footer
// so it covers every page.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { WEBINAR, sectionFromPath, webinarUrl, type WebinarHook } from '@/lib/webinar';
import { webinarCopy } from './copy';
import { WebinarBoundary } from './webinar-boundary';
import { WEBINAR_REL, WebinarBadge, webinarEventParams } from './webinar-card';
import {
  CLICKED_KEY,
  DISMISS_KEY,
  readStorage,
  useWebinar,
  writeStorage,
  type WebinarView,
} from './use-webinar';

const SHOWN_KEY = 'qaskills-webinar-exit-shown'; // epoch ms of the last showing
// LeadMagnetPopup writes this once a visitor has seen it. Until then it owns
// the visit's one popup, so the exit invite stays unarmed.
const LEAD_MAGNET_KEY = 'qaskills-lead-magnet-v1';
const ONCE_PER_MS = 24 * 60 * 60 * 1000;
const ARM_AFTER_MS = 10_000;
// Account, auth, unsubscribe, and pricing pages: someone mid-task gets no popup.
const SKIP_PREFIXES = ['/dashboard', '/sign-in', '/sign-up', '/unsubscribe', '/pricing'];

const ACCENT: Record<WebinarHook['accent'], string> = {
  violet: 'text-violet-300',
  emerald: 'text-emerald-300',
  rose: 'text-rose-300',
};

export function WebinarExitIntent() {
  return (
    <WebinarBoundary fallback={null}>
      <ExitIntent />
    </WebinarBoundary>
  );
}

function ExitIntent() {
  const view = useWebinar();
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const fired = useRef(false);
  const sessionStart = view?.session.start ?? null;

  useEffect(() => {
    if (sessionStart === null || fired.current) return;
    if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches) {
      return;
    }
    if (readStorage(LEAD_MAGNET_KEY) === null) return;
    const key = String(sessionStart);
    if (readStorage(DISMISS_KEY) === key || readStorage(CLICKED_KEY) === key) return;
    if (Date.now() - Number(readStorage(SHOWN_KEY) ?? 0) < ONCE_PER_MS) return;

    let armed = false;
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, ARM_AFTER_MS);
    const onOut = (e: MouseEvent) => {
      if (!armed || e.relatedTarget || e.clientY > 10) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      document.removeEventListener('mouseout', onOut);
      fired.current = true;
      writeStorage(SHOWN_KEY, String(Date.now()));
      setOpen(true);
    };
    document.addEventListener('mouseout', onOut);
    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener('mouseout', onOut);
    };
  }, [sessionStart, pathname]);

  if (!open || !view) return null;
  return (
    <ExitDialog view={view} section={sectionFromPath(pathname)} onClose={() => setOpen(false)} />
  );
}

function ExitDialog({
  view,
  section,
  onClose,
}: {
  view: WebinarView;
  section: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { start, state } = view.session;
  const params = webinarEventParams({
    placement: 'exit-intent',
    hookId: view.hook.id,
    section,
    start,
    state,
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    trackEvent('webinar_impression', params);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
    // Runs once per showing; params are fixed for the life of the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = webinarCopy(view.session, view.timeZone);
  const href = webinarUrl({ medium: 'exit-intent', term: section, content: view.hook.id });

  const onClick = () => {
    writeStorage(CLICKED_KEY, String(start));
    trackEvent('webinar_click', params);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="webinar-exit-title"
      data-webinar="exit-intent"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl outline-none"
      >
        <div className="bg-gradient-to-r from-[#0e0c24] via-[#1c1446] to-[#0e0c24] px-6 pb-5 pt-6 text-white">
          <div className="flex items-center gap-2">
            <WebinarBadge label={copy.badge} hot={copy.hot} live={state === 'live'} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-200">
              Before you go
            </span>
          </div>
          <p className="mt-3 text-xl font-bold leading-snug">{view.hook.lead}</p>
          <p className={`text-xl font-bold leading-snug ${ACCENT[view.hook.accent]}`}>
            {view.hook.punch}
          </p>
        </div>
        <div className="p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Live webinar &middot; The Testing Academy
          </p>
          <h2 id="webinar-exit-title" className="mt-1 text-lg font-bold leading-tight">
            {WEBINAR.title}
          </h2>
          <p className="mt-3 text-sm font-semibold">{copy.when}</p>
          {copy.hint && <p className="mt-0.5 text-xs text-muted-foreground">{copy.hint}</p>}
          <a
            href={href}
            target="_blank"
            rel={WEBINAR_REL}
            onClick={onClick}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {copy.cta} &rarr;
          </a>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            No thanks, keep reading
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">{copy.moreDates}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
