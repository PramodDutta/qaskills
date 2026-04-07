import { describe, expect, it } from 'vitest';
import { FALLBACK_SKILLS, sortFallbackSkills } from './fallback-skills';

describe('fallback skills dataset', () => {
  it('includes the promoted playwright-cli skill', () => {
    const skill = FALLBACK_SKILLS.find(({ slug }) => slug === 'playwright-cli');

    expect(skill).toMatchObject({
      name: 'Playwright CLI Browser Automation',
      author: 'Pramod',
      installCount: 66,
      qualityScore: 93,
      featured: true,
      verified: true,
    });
  });

  it('keeps playwright-cli in the top three most-installed fallback skills', () => {
    const topThree = sortFallbackSkills(FALLBACK_SKILLS, 'most_installed')
      .slice(0, 3)
      .map(({ slug }) => slug);

    expect(topThree).toEqual(['playwright-e2e', 'playwright-cli', 'jest-unit']);
  });

  it('puts playwright-cli first in newest sorting', () => {
    const newest = sortFallbackSkills(FALLBACK_SKILLS, 'newest')[0];

    expect(newest?.slug).toBe('playwright-cli');
  });
});
