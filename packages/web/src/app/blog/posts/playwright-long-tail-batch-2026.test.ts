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

  it('uses the current playwright-cli video filename syntax', () => {
    const videoArticle = playwrightLongTail2026Posts.find(
      ({ slug }) => slug === 'playwright-video-recording-guide-2026',
    );

    expect(videoArticle?.post.content).toContain(
      'playwright-cli video-start recordings/checkout-failure.webm',
    );
    expect(videoArticle?.post.content).toContain('playwright-cli video-stop');
    expect(videoArticle?.post.content).not.toMatch(/playwright-cli video-stop\s+\S+\.webm/);
  });
});
