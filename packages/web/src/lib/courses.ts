// Single source of truth for The Testing Academy course promos rendered across
// the site (skill sidebars, blog inline slots, footer). Update price/date/coupon
// HERE and every placement updates. The top PromoBanner still holds its own copy
// for now; fold it into this file in a later pass to fully dedupe.

export type CourseId = 'ai-tester' | 'playwright';

export interface Course {
  id: CourseId;
  emoji: string;
  label: string; // small eyebrow label above the card
  title: string;
  tagline: string;
  bullets: string[];
  priceOld?: string; // INR, no symbol
  priceNew?: string; // INR, no symbol
  discount: string;
  code: string;
  cohort: string;
  baseUrl: string;
  accent: 'blue' | 'emerald';
}

export const COURSES: Record<CourseId, Course> = {
  'ai-tester': {
    id: 'ai-tester',
    emoji: '🚀',
    label: 'AI testing course',
    title: 'AI Tester Blueprint',
    tagline: 'Build AI agents that write, run, and fix tests. Playwright, LLM evals, and CI in one live cohort.',
    bullets: [
      'AI-driven test generation and self-healing',
      'Playwright plus LLM evaluation pipelines',
      'Live sessions with lifetime recordings',
    ],
    priceOld: '35,000',
    priceNew: '9,999',
    discount: '33% OFF',
    code: 'AITESTER',
    cohort: 'Starts 26 Jul 2026',
    baseUrl: 'https://class.thetestingacademy.com/ai-powered-testing-mastery',
    accent: 'blue',
  },
  playwright: {
    id: 'playwright',
    emoji: '🎭',
    label: 'Playwright course',
    title: 'Playwright Automation Mastery',
    tagline: 'Go from zero to Playwright pro: Page Object Model, fixtures, and CI/CD on real projects.',
    bullets: [
      'Stable locators, POM, and fixtures',
      'Parallel runs and CI/CD integration',
      'Live cohort, Tue/Thu/Sat 7:00 AM IST',
    ],
    discount: 'Up to 10% OFF',
    code: 'PROMODE',
    cohort: 'Starts 11 Jul 2026',
    baseUrl: 'https://class.thetestingacademy.com/playwright-automation-mastery-course',
    accent: 'emerald',
  },
};

/**
 * Contextually pick which course to promote on a given page. Playwright/E2E
 * topics get the Playwright course; everything else (AI agents, API, general
 * QA) gets the AI Tester Blueprint.
 */
export function pickCourse(ctx: {
  frameworks?: string[] | null;
  testingTypes?: string[] | null;
  category?: string | null;
  title?: string | null;
  tags?: string[] | null;
}): CourseId {
  const hay = [
    ...(ctx.frameworks ?? []),
    ...(ctx.testingTypes ?? []),
    ...(ctx.tags ?? []),
    ctx.category ?? '',
    ctx.title ?? '',
  ]
    .join(' ')
    .toLowerCase();

  if (/playwright|\be2e\b|end-to-end|browser automation|selenium|cypress|webdriver/.test(hay)) {
    return 'playwright';
  }
  return 'ai-tester';
}

/**
 * Course URL with UTM params so GA / course analytics can attribute clicks to a
 * specific on-site slot (skill-sidebar, blog-inline, blog-mid, footer, ...).
 */
export function courseUrl(id: CourseId, slot: string): string {
  const base = COURSES[id].baseUrl;
  const params = new URLSearchParams({
    utm_source: 'qaskills',
    utm_medium: slot,
    utm_campaign: id,
  });
  return `${base}?${params.toString()}`;
}
