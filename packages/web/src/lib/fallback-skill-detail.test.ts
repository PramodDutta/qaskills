import { describe, expect, it } from 'vitest';
import { getFallbackSkillDetail, readFallbackPlaywrightCliMarkdown } from './fallback-skill-detail';

describe('Playwright CLI offline detail fallback', () => {
  it('returns the complete curated skill only for its author-qualified route', () => {
    const skill = getFallbackSkillDetail('Pramod', 'playwright-cli');

    expect(skill).toMatchObject({
      name: 'Playwright CLI Browser Automation',
      authorName: 'Pramod',
      slug: 'playwright-cli',
      installCount: 66,
      weeklyInstalls: 66,
      qualityScore: 93,
      featured: true,
      verified: true,
      license: 'ISC',
    });
    expect(skill?.fullDescription).toContain('playwright-cli open');
    expect(getFallbackSkillDetail('pramod', 'playwright-cli')).toBeNull();
    expect(getFallbackSkillDetail('Pramod', 'missing')).toBeNull();
  });

  it('serves the original validated SKILL.md artifact', () => {
    const markdown = readFallbackPlaywrightCliMarkdown();

    expect(markdown).toContain('name: Playwright CLI Browser Automation');
    expect(markdown).toContain('license: ISC');
    expect(markdown).toContain('playwright-cli snapshot');
  });
});
