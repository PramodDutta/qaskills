/**
 * Google Analytics 4 event tracking utility.
 * Wraps gtag() calls with type-safe event helpers.
 *
 * Usage:
 *   import { trackEvent, trackSkillInstall, trackSkillClick } from '@/lib/analytics';
 *   trackSkillInstall('playwright-e2e', 'claude-code');
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/** Fire a custom GA4 event */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// ── Skill Events ──────────────────────────────────────────────

/** User clicks "Install" / copies the install command */
export function trackSkillInstall(skillSlug: string, agent?: string) {
  trackEvent('skill_install', {
    skill_slug: skillSlug,
    agent: agent ?? 'unknown',
    content_type: 'skill',
  });
}

/** User views a skill detail page */
export function trackSkillView(skillSlug: string, category?: string) {
  trackEvent('skill_view', {
    skill_slug: skillSlug,
    category: category ?? 'uncategorized',
    content_type: 'skill',
  });
}

/** User clicks on a skill card from listings/search */
export function trackSkillClick(skillSlug: string, listPosition?: number) {
  trackEvent('skill_click', {
    skill_slug: skillSlug,
    list_position: listPosition ?? 0,
    content_type: 'skill',
  });
}

// ── Search & Filter Events ────────────────────────────────────

/** User performs a search */
export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search', {
    search_term: query,
    results_count: resultsCount,
  });
}

/** User applies a filter */
export function trackFilter(filterType: string, filterValue: string) {
  trackEvent('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
  });
}

// ── Blog Events ───────────────────────────────────────────────

/** User views a blog post */
export function trackBlogView(slug: string, category?: string) {
  trackEvent('blog_view', {
    blog_slug: slug,
    category: category ?? 'uncategorized',
    content_type: 'blog',
  });
}

// ── CTA / Conversion Events ──────────────────────────────────

/** User clicks "Get Started" or similar CTA */
export function trackCTAClick(ctaName: string, location: string) {
  trackEvent('cta_click', {
    cta_name: ctaName,
    cta_location: location,
  });
}

/** User copies a CLI command */
export function trackCommandCopy(command: string, skillSlug?: string) {
  trackEvent('command_copy', {
    command,
    skill_slug: skillSlug ?? '',
  });
}

/** User clicks Browse Skills / Leaderboard nav */
export function trackNavClick(destination: string) {
  trackEvent('nav_click', {
    destination,
  });
}

// ── Pack Events ──────────────────────────────────────────────

/** User views or installs a skill pack */
export function trackPackAction(action: 'view' | 'install', packSlug: string) {
  trackEvent(`pack_${action}`, {
    pack_slug: packSlug,
    content_type: 'pack',
  });
}

// ── Signup / Auth Events ─────────────────────────────────────

/** User signs up */
export function trackSignup(method?: string) {
  trackEvent('sign_up', {
    method: method ?? 'clerk',
  });
}
