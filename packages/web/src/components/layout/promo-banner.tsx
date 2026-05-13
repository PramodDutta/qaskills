'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'promo-banner-dismissed';
const CAMPAIGN_ID = 'playwright-ai-apr-2026-v2';
const PLAYWRIGHT_URL =
  'https://class.thetestingacademy.com/playwright-automation-mastery-course';

export function PromoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) !== CAMPAIGN_ID) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, CAMPAIGN_ID);
    } catch {}
  }

  return (
    <div className="relative bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white">
      <div className="mx-auto flex items-center justify-between gap-2 px-3 py-2 sm:px-6">
        {/* Left side: course info */}
        <a
          href={PLAYWRIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
        >
          {/* LIVE badge */}
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            Live
          </span>

          {/* Course title */}
          <span className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
            <span aria-hidden="true">🎭</span>
            <span className="hidden lg:inline">Playwright + AI Blueprint</span>
            <span className="lg:hidden">Playwright + AI</span>
          </span>

          {/* New Batch badge */}
          <span className="hidden shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black sm:inline">
            New Batch Launching
          </span>

          {/* Date & time */}
          <span className="hidden text-xs text-gray-300 md:inline">
            New Batch &bull; 30 Jun 2026, 7 AM IST
          </span>
        </a>

        {/* Right side: pricing + CTA */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Pricing */}
          <div className="hidden items-center gap-1.5 text-xs sm:flex">
            <span className="text-gray-400 line-through">{'₹'}35,000</span>
            <span className="font-bold text-green-400">{'₹'}9,999</span>
            <span className="rounded bg-red-500/80 px-1 py-0.5 text-[10px] font-bold">
              33% OFF
            </span>
          </div>

          {/* Coupon code */}
          <div className="hidden items-center gap-1 text-[10px] lg:flex">
            <span className="text-yellow-300">&#9889;</span>
            <span className="text-gray-400">Code:</span>
            <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 font-mono font-bold text-yellow-300">
              PLAYWRIGHT
            </span>
          </div>

          {/* Join button */}
          <a
            href={PLAYWRIGHT_URL}
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
