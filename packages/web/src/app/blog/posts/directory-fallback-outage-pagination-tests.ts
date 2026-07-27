import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 472,
  slug: 'directory-fallback-outage-pagination-tests',
  campaignCluster: 'web-platform',
  title: 'Skills Fallback Outage Pagination Tests',
  description:
    'skills fallback outage pagination tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'skills fallback outage pagination tests',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams verify skills fallback outage pagination in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns skills fallback outage pagination as implemented by the cited QASkills files. It excludes broad server-rendered skill discovery query state and card presentation guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test skills fallback outage pagination',
    'skills fallback outage pagination edge cases',
    'skills fallback outage pagination integration coverage',
    'skills fallback outage pagination Playwright assertions',
    'skills fallback outage pagination fallback behavior',
    'skills fallback outage pagination regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/fallback-skills.ts',
    'packages/web/src/lib/fallback-skills.test.ts',
    'packages/web/src/app/skills/page.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories',
    '/agents',
    '/getting-started',
    '/blog/react-nextjs-testing-complete-guide',
    '/blog/api-testing-complete-guide',
    '/blog/database-testing-automation-guide',
    '/blog/authentication-authorization-testing-guide',
  ],
  relatedSlugs: [
    'react-nextjs-testing-complete-guide',
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
  ],
  sources: [
    'https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config',
    'https://testing-library.com/docs/react-testing-library/intro/',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the skills fallback outage pagination tests baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/fallback-skills.ts',
      snippet:
        "export const FALLBACK_SKILLS: SkillSummary[] = [\n  {\n    id: '1',\n    name: 'Playwright E2E Testing',\n    slug: 'playwright-e2e',\n    description:\n      'Comprehensive Playwright end-to-end testing patterns with Page Object Model, fixtures, and best practices',\n    author: 'thetestingacademy',\n    qualityScore: 92,\n    installCount: 86,\n    testingTypes: ['e2e', 'visual'],\n    frameworks: ['playwright'],\n    featured: true,\n    verified: true,\n    createdAt: '2026-02-01T00:00:00.000Z',\n  },\n  {\n    id: '22',",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/lib/fallback-skills.test.ts',
      snippet:
        "featured: true,\n      verified: true,\n    });\n  });\n\n  it('keeps playwright-cli in the top three most-installed fallback skills', () => {\n    const topThree = sortFallbackSkills(FALLBACK_SKILLS, 'most_installed')\n      .slice(0, 3)\n      .map(({ slug }) => slug);\n\n    expect(topThree).toEqual(['playwright-e2e', 'vibe-check', 'playwright-cli']);\n  });\n\n  it('puts playwright-cli first in newest sorting', () => {\n    const newest = sortFallbackSkills(FALLBACK_SKILLS, 'newest')[0];\n\n    expect(newest?.slug).toBe('playwright-cli');\n  });",
    },
  ],
});
