'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { COURSES } from '@/lib/courses';
import { currentWebinarSession } from '@/lib/webinar';

const DISMISS_KEY = 'promo-banner-dismissed';
// Bump this when the banner content changes enough to show it again to
// everyone who dismissed the previous campaign.
const CAMPAIGN_ID = 'dual-aug-2026-v1';

// Derived from the single source of truth in lib/courses.ts; edit course info there.
const VARIANTS = [COURSES['ai-tester'], COURSES['playwright']].map((c) => ({
  emoji: c.emoji,
  title: c.title,
  titleShort: c.titleShort,
  tagline: c.tagline,
  url: c.baseUrl,
  bg: c.bannerBg,
}));

export function PromoBanner() {
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // WebinarBanner owns the top slot until the webinar batch ends.
    if (currentWebinarSession(Date.now())) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) !== CAMPAIGN_ID) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
    // rotate every 6 seconds
    const timer = setInterval(() => setIdx((i) => (i + 1) % VARIANTS.length), 6000);
    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  const v = VARIANTS[idx];

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, CAMPAIGN_ID);
    } catch {}
  }

  return (
    <div
      className={`relative bg-gradient-to-r ${v.bg} text-white transition-colors duration-700`}
    >
      <div className="mx-auto flex items-center justify-between gap-2 px-3 py-2 sm:px-6">
        {/* Left: course info */}
        <a
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
        >
          {/* LIVE badge */}
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>

          {/* Title */}
          <span className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
            <span aria-hidden="true">{v.emoji}</span>
            <span className="hidden lg:inline">{v.title}</span>
            <span className="lg:hidden">{v.titleShort}</span>
          </span>

          {/* Tagline */}
          <span className="hidden min-w-0 truncate text-xs text-gray-300 md:block">
            {v.tagline}
          </span>
        </a>

        {/* Right: CTA */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Join */}
          <a
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold whitespace-nowrap backdrop-blur-sm transition-all hover:bg-white/20 sm:text-sm"
          >
            &#9997; Join
          </a>

          {/* Close */}
          <button
            onClick={dismiss}
            className="rounded-full p-1 transition-colors hover:bg-white/20"
            aria-label="Dismiss banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
