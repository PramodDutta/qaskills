// Single source of truth for The Testing Academy course promos rendered across
// the site: top PromoBanner, skill sidebars, blog inline slots, footer.
// Promos are evergreen: course information and links only. Cohort dates,
// prices and coupon codes once went stale on every placement at the same
// time; a dated campaign belongs in a self-expiring promo like lib/webinar.ts.

export type CourseId = 'ai-tester' | 'playwright';

export interface Course {
  id: CourseId;
  emoji: string;
  label: string; // small eyebrow label above the card
  title: string;
  titleShort: string; // banner title on narrow screens
  tagline: string;
  bullets: string[];
  baseUrl: string;
  accent: 'blue' | 'emerald';
  bannerBg: string; // banner gradient classes
}

export const COURSES: Record<CourseId, Course> = {
  'ai-tester': {
    id: 'ai-tester',
    emoji: '🚀',
    label: 'AI testing course',
    title: 'AI Tester Blueprint',
    titleShort: 'AI Tester',
    tagline: 'Build AI agents that write, run, and fix tests. Playwright, LLM evals, and CI in one live cohort.',
    bullets: [
      'AI-driven test generation and self-healing',
      'Playwright plus LLM evaluation pipelines',
      'Live sessions with lifetime recordings',
    ],
    baseUrl: 'https://class.thetestingacademy.com/ai-powered-testing-mastery',
    accent: 'blue',
    bannerBg: 'from-blue-900 via-indigo-900 to-slate-900',
  },
  playwright: {
    id: 'playwright',
    emoji: '🎭',
    label: 'Playwright course',
    title: 'Playwright Automation Mastery',
    titleShort: 'Playwright',
    tagline: 'Go from zero to Playwright pro: Page Object Model, fixtures, and CI/CD on real projects.',
    bullets: [
      'Stable locators, POM, and fixtures',
      'Parallel runs and CI/CD integration',
      'Live cohort classes',
    ],
    baseUrl: 'https://class.thetestingacademy.com/playwright-automation-mastery-course',
    accent: 'emerald',
    bannerBg: 'from-emerald-900 via-teal-900 to-slate-900',
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
