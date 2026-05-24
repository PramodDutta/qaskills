'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'promo-banner-dismissed';
const CAMPAIGN_ID = 'dual-jun-2026-v1';

const VARIANTS = [
  {
    emoji: '🚀',
    title: 'AI Tester Blueprint',
    titleShort: 'AI Tester',
    badge: 'Starts 17 Jun',
    date: '17 Jun 2026',
    schedule: '',
    priceOld: '35,000',
    priceNew: '9,999',
    discount: '33% OFF',
    code: 'AITESTER',
    url: 'https://class.thetestingacademy.com/ai-powered-testing-mastery',
    bg: 'from-blue-900 via-indigo-900 to-slate-900',
  },
  {
    emoji: '🎭',
    title: 'Playwright Automation Mastery',
    titleShort: 'Playwright',
    badge: 'Starts 30 Jun',
    date: '30 Jun 2026',
    schedule: 'Mon/Wed/Fri 7:00–8:15 AM IST',
    priceOld: '',
    priceNew: '',
    discount: 'Up to 10% OFF',
    code: 'PROMODE',
    url: 'https://class.thetestingacademy.com/playwright-automation-mastery-course',
    bg: 'from-emerald-900 via-teal-900 to-slate-900',
  },
] as const;

export function PromoBanner() {
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
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

          {/* Badge */}
          <span className="hidden shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-black sm:inline">
            {v.badge}
          </span>

          {/* Date + schedule */}
          <span className="hidden text-xs text-gray-300 md:inline">
            {v.date}
            {v.schedule ? ` · ${v.schedule}` : ''}
          </span>
        </a>

        {/* Right: pricing + CTA */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Pricing */}
          <div className="hidden items-center gap-1.5 text-xs sm:flex">
            {v.priceOld && (
              <span className="text-gray-400 line-through">
                {'₹'}{v.priceOld}
              </span>
            )}
            {v.priceNew && (
              <span className="font-bold text-green-400">
                {'₹'}{v.priceNew}
              </span>
            )}
            <span className="rounded bg-red-500/80 px-1 py-0.5 text-[10px] font-bold">
              {v.discount}
            </span>
          </div>

          {/* Coupon */}
          <div className="hidden items-center gap-1 text-[10px] lg:flex">
            <span className="text-yellow-300">&#9889;</span>
            <span className="text-gray-400">Code:</span>
            <span className="rounded bg-yellow-400/20 px-1.5 py-0.5 font-mono font-bold text-yellow-300">
              {v.code}
            </span>
          </div>

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
