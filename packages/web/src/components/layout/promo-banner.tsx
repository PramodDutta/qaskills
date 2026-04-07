'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'promo-banner-dismissed';
const CAMPAIGN_ID = 'playwright-apr-2026';
const COURSE_URL =
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

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, CAMPAIGN_ID);
    } catch {}
  }

  return (
    <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <a
          href={COURSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium hover:underline"
        >
          <span className="hidden shrink-0 sm:inline" aria-hidden="true">
            🎭
          </span>
          <span className="truncate sm:hidden">
            Playwright Mastery — Apr 29 | MWF 7 AM IST | 75 hrs
          </span>
          <span className="hidden sm:inline">
            Playwright Automation Mastery — Live Batch starts Apr 29 | MWF 7 AM
            + Fri Doubt Session 8 PM IST | 75 hrs
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={COURSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold whitespace-nowrap backdrop-blur-sm transition-colors hover:bg-white/30 sm:text-sm"
          >
            Enroll Now &rarr;
          </a>
          <button
            onClick={dismiss}
            className="rounded-full p-1 transition-colors hover:bg-white/20"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
