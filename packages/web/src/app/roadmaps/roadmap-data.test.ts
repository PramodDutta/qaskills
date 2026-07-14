import { describe, expect, it } from 'vitest';
import { seoTopicPlan2026 } from '../blog/posts/seo-topic-plan-2026';
import {
  getDefaultCompletedItemIds,
  getRoadmapBySlug,
  getRoadmapItemCount,
  roadmaps,
} from './roadmap-data';

describe('roadmap data', () => {
  it('keeps every roadmap and milestone addressable with unique identifiers', () => {
    expect(new Set(roadmaps.map((roadmap) => roadmap.slug)).size).toBe(roadmaps.length);

    for (const roadmap of roadmaps) {
      const items = roadmap.phases.flatMap((phase) => phase.items);
      expect(new Set(roadmap.phases.map((phase) => phase.id)).size).toBe(roadmap.phases.length);
      expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
      expect(roadmap.resources.every((resource) => resource.href.startsWith('/'))).toBe(true);
      expect(roadmap.faqs.length).toBeGreaterThanOrEqual(4);
      expect(roadmap.keywords).toContain(roadmap.primaryKeyword);
    }
  });

  it('models the referenced Playwright plan as four phases and 30 three-day milestones', () => {
    const roadmap = getRoadmapBySlug('playwright-automation-90-day-roadmap');

    expect(roadmap).toBeDefined();
    expect(roadmap?.phases).toHaveLength(4);
    expect(getRoadmapItemCount(roadmap!)).toBe(30);
    expect(roadmap?.phases[0].schedule).toBe('Days 1-21');
    expect(roadmap?.phases.at(-1)?.schedule).toBe('Days 73-90');
    expect(roadmap?.phases.at(-1)?.items.at(-1)?.schedule).toBe('Days 88-90');
    expect(getDefaultCompletedItemIds(roadmap!)).toEqual([]);
  });

  it('keeps the SEO roadmap synchronized with all 100 canonical topic-plan entries', () => {
    const roadmap = getRoadmapBySlug('qa-seo-content-roadmap-2026');
    const items = roadmap?.phases.flatMap((phase) => phase.items) ?? [];
    const roadmapTopicIds = items.map((item) => item.id.replace(/^seo-/, '')).sort();
    const sourceTopicSlugs = seoTopicPlan2026.map((topic) => topic.slug).sort();

    expect(roadmap?.phases).toHaveLength(10);
    expect(items).toHaveLength(100);
    expect(roadmapTopicIds).toEqual(sourceTopicSlugs);
    expect(items.filter((item) => item.status === 'ready')).toHaveLength(50);
    expect(items.filter((item) => item.status === 'backlog')).toHaveLength(50);
    expect(getDefaultCompletedItemIds(roadmap!)).toHaveLength(50);
  });
});
