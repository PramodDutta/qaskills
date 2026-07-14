import { describe, expect, it, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: () => {
      throw new Error('database unavailable');
    },
  },
}));
vi.mock('@/db/schema', () => ({ skills: {}, users: {} }));
vi.mock('./blog/posts', () => ({
  postList: [
    {
      slug: 'published-post',
      date: '2025-01-02',
      updated: '2025-03-04',
    },
  ],
}));
vi.mock('@/lib/blog-canonical', () => ({ isCanonicalBlogSlug: () => true }));
vi.mock('@/lib/compare-data', () => ({ allComparisonSlugs: () => ['comparison'] }));
vi.mock('@/lib/skills-for-hubs', () => ({ allHubSlugs: () => ['topic'] }));
vi.mock('./roadmaps/roadmap-data', () => ({
  roadmaps: [
    { slug: 'playwright-automation-90-day-roadmap' },
    { slug: 'qa-seo-content-roadmap-2026' },
  ],
}));

import sitemap from './sitemap';

describe('sitemap modification dates', () => {
  it('omits fabricated dates while preserving article dates', async () => {
    const entries = await sitemap();
    const article = entries.find((entry) => entry.url.endsWith('/blog/published-post'));
    const entriesWithoutSourceDates = entries.filter((entry) => entry.url !== article?.url);

    expect(article?.lastModified).toEqual(new Date('2025-03-04'));
    expect(entriesWithoutSourceDates.every((entry) => entry.lastModified === undefined)).toBe(true);
  });

  it('includes the roadmap hub and every roadmap detail page', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('https://qaskills.sh/roadmaps');
    expect(urls).toContain('https://qaskills.sh/roadmaps/playwright-automation-90-day-roadmap');
    expect(urls).toContain('https://qaskills.sh/roadmaps/qa-seo-content-roadmap-2026');
  });
});
