'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import { WEBINAR, sectionFromPath, webinarUrl, type WebinarState } from '@/lib/webinar';
import { webinarCopy } from './copy';
import { CLICKED_KEY, writeStorage, type WebinarView } from './use-webinar';

export type WebinarPlacement = 'blog-inline' | 'skill-sidebar' | 'agents-inline' | 'exit-intent';

// Commercial promo to an external domain: same link policy as CourseAd, so it
// passes no PageRank.
export const WEBINAR_REL = 'sponsored nofollow noopener noreferrer';

/** GA4 params shared with the top banner's webinar_impression / webinar_click. */
export function webinarEventParams(p: {
  placement: WebinarPlacement;
  hookId: string;
  section: string;
  start: number;
  state: WebinarState;
}) {
  return {
    placement: p.placement,
    hook: p.hookId,
    section: p.section,
    session_date: new Date(p.start).toISOString().slice(0, 10),
    state: p.state,
  };
}

export function WebinarBadge({ label, hot, live }: { label: string; hot: boolean; live: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${hot ? 'bg-rose-600 text-white' : 'bg-primary text-primary-foreground'}`}
    >
      {live && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse"
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}

interface WebinarCardProps {
  view: WebinarView;
  placement: WebinarPlacement;
  variant: 'inline' | 'sidebar';
  /** Replaces the default outer margin of the inline card. */
  className?: string;
}

export function WebinarCard({ view, placement, variant, className }: WebinarCardProps) {
  const section = sectionFromPath(usePathname());
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  const { start, state } = view.session;
  const hookId = view.hook.id;

  // Count an impression only once the card is actually on screen: mid-article
  // slots are below the fold, and mount-time counts would flatter the CTR.
  useEffect(() => {
    const el = ref.current;
    if (!el || seen.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        io.disconnect();
        trackEvent(
          'webinar_impression',
          webinarEventParams({ placement, hookId, section, start, state }),
        );
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [placement, hookId, section, start, state]);

  const copy = webinarCopy(view.session, view.timeZone);
  const href = webinarUrl({ medium: placement, term: section, content: hookId });
  const live = state === 'live';

  const onClick = () => {
    writeStorage(CLICKED_KEY, String(start));
    trackEvent('webinar_click', webinarEventParams({ placement, hookId, section, start, state }));
  };

  // Theme tokens, not dark: utilities: the site toggles dark mode with a .dark
  // class while Tailwind's dark: variant here follows the OS setting. A solid
  // fill also avoids Chrome's speckled corners on violet gradients.
  const surface = 'rounded-xl border border-primary/30 bg-primary/5';
  const label = 'text-[11px] font-semibold uppercase tracking-wide text-primary';
  const button =
    'bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90';
  const hook = (
    <>
      {view.hook.lead} <span className="font-semibold text-primary">{view.hook.punch}</span>
    </>
  );

  if (variant === 'sidebar') {
    return (
      <aside
        ref={ref}
        className={`p-5 ${surface} ${className ?? ''}`}
        aria-label="Live webinar"
        data-webinar={placement}
      >
        <div className="flex items-center gap-2">
          <WebinarBadge label={copy.badge} hot={copy.hot} live={live} />
          <span className={label}>Live webinar</span>
        </div>
        <h3 className="mt-3 text-base font-bold leading-snug text-foreground">{WEBINAR.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{hook}</p>
        <p className="mt-3 text-sm font-semibold text-foreground">{copy.when}</p>
        {copy.hint && <p className="mt-0.5 text-xs text-muted-foreground">{copy.hint}</p>}
        <a
          href={href}
          target="_blank"
          rel={WEBINAR_REL}
          onClick={onClick}
          className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 ${button}`}
        >
          {copy.cta} &rarr;
        </a>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">{copy.moreDates}</p>
      </aside>
    );
  }

  return (
    <aside
      ref={ref}
      className={`${className ?? 'my-10'} p-6 ${surface}`}
      aria-label="Live webinar"
      data-webinar={placement}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <WebinarBadge label={copy.badge} hot={copy.hot} live={live} />
            <span className={label}>Live webinar &middot; The Testing Academy</span>
          </div>
          <h3 className="mt-2 text-lg font-bold leading-tight text-foreground">{WEBINAR.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{hook}</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {copy.when}
            {copy.hint && (
              <span className="font-normal text-muted-foreground"> ({copy.hint})</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.moreDates}</p>
        </div>
        <a
          href={href}
          target="_blank"
          rel={WEBINAR_REL}
          onClick={onClick}
          className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-5 py-2.5 ${button}`}
        >
          {copy.cta} &rarr;
        </a>
      </div>
    </aside>
  );
}
