import { describe, expect, it } from 'vitest';
import {
  calculateShingleContainment,
  createWordShingles,
  extractBlogSlugs,
  getFaqCount,
  getIntroductionWords,
  normalizeArticleForSimilarity,
} from './seo-cluster-quality';

describe('SEO cluster quality helpers', () => {
  it('counts visible FAQ questions without leaking into later sections', () => {
    const content = `
## Frequently asked questions

### First question?

Answer one.

### Second question?

Answer two.

## Conclusion

### This is not an FAQ
`;

    expect(getFaqCount(content)).toBe(2);
  });

  it('extracts article slugs and limits introduction text', () => {
    const content = `${Array.from({ length: 120 }, (_, index) => `word${index}`).join(' ')}

[Pillar](/blog/playwright-cli-complete-guide-2026)
[Child](/blog/playwright-cli-debug-tests-traces-agents-guide-2026#setup)`;

    expect(getIntroductionWords(content).split(/\s+/)).toHaveLength(100);
    expect(extractBlogSlugs(content)).toEqual([
      'playwright-cli-complete-guide-2026',
      'playwright-cli-debug-tests-traces-agents-guide-2026',
    ]);
  });

  it('excludes code and link destinations from eight-word similarity checks', () => {
    const left = `
[Playwright guide](/blog/playwright-e2e-complete-guide)

This sentence has eight deliberately repeated words for overlap testing now.

\`\`\`bash
playwright-cli open https://example.com
\`\`\`
`;
    const right = `
[Playwright guide](https://example.com/elsewhere)

This sentence has eight deliberately repeated words for overlap testing now.

\`\`\`bash
an entirely different command ignored by similarity checks
\`\`\`
`;

    expect(normalizeArticleForSimilarity(left)).not.toContain('playwright-cli open');
    expect(
      calculateShingleContainment(createWordShingles(left), createWordShingles(right)),
    ).toBeGreaterThan(0);
  });
});
