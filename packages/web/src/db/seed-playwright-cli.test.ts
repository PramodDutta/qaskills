import { describe, expect, it } from 'vitest';
import { getPlaywrightCliLaunchValues } from './seed-playwright-cli';

describe('targeted playwright-cli launch seed', () => {
  it('builds one deterministic, author-qualified launch row', () => {
    const first = getPlaywrightCliLaunchValues();
    const second = getPlaywrightCliLaunchValues();

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      slug: 'playwright-cli',
      authorName: 'Pramod',
      installCount: 66,
      weeklyInstalls: 66,
      qualityScore: 93,
      featured: true,
      verified: true,
      license: 'ISC',
    });
    expect(first.fullDescription).toContain('playwright-cli snapshot');
  });

  it('cannot describe or update unrelated skill rows', () => {
    const values = getPlaywrightCliLaunchValues();

    expect(Object.hasOwn(values, 'skills')).toBe(false);
    expect(JSON.stringify(values)).not.toContain('jest-unit');
    expect(JSON.stringify(values)).not.toContain('vibe-check');
  });
});
