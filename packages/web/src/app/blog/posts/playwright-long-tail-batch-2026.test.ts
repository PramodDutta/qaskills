import { describe, expect, it } from 'vitest';
import { playwrightLongTail2026Posts } from './playwright-long-tail-batch-2026';

describe('playwright long-tail batch', () => {
  it('contains 10 unique Playwright articles', () => {
    const slugs = playwrightLongTail2026Posts.map(({ slug }) => slug);

    expect(playwrightLongTail2026Posts).toHaveLength(10);
    expect(new Set(slugs).size).toBe(10);
  });

  it('keeps every article wired to skills discovery and the playwright-cli skill', () => {
    for (const { post } of playwrightLongTail2026Posts) {
      expect(post.content).toContain('](/skills)');
      expect(post.content).toContain('](/skills/Pramod/playwright-cli)');
    }
  });

  it('uses guide or tutorial categories for every post', () => {
    for (const { post } of playwrightLongTail2026Posts) {
      expect(['Guide', 'Tutorial']).toContain(post.category);
      expect(post.date).toBe('2026-04-01');
    }
  });
});
