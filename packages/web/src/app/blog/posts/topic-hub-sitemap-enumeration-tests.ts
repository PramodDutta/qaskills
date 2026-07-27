import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 395,
  slug: 'topic-hub-sitemap-enumeration-tests',
  campaignCluster: 'web-platform',
  title: 'Topic Hub Sitemap Enumeration Tests',
  description:
    'topic hub sitemap enumeration tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'topic hub sitemap enumeration tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify topic hub sitemap enumeration in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns topic hub sitemap enumeration as implemented by the cited QASkills files. It excludes broad sitemap and robots output assembled from existing registries and database rows guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test topic hub sitemap enumeration',
    'topic hub sitemap enumeration edge cases',
    'topic hub sitemap enumeration integration coverage',
    'topic hub sitemap enumeration Playwright assertions',
    'topic hub sitemap enumeration fallback behavior',
    'topic hub sitemap enumeration regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/sitemap.ts',
    'packages/web/src/app/sitemap.test.ts',
    'packages/web/src/lib/blog-canonical.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/roadmaps',
    '/agents',
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
    'https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap',
    'https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the topic hub sitemap enumeration tests baseline',
      language: 'typescript',
      path: 'packages/web/src/app/sitemap.ts',
      snippet:
        'export default async function sitemap(): Promise<MetadataRoute.Sitemap> {\n  try {\n    const allSkills = await db\n      .select({ slug: skills.slug, authorName: skills.authorName, updatedAt: skills.updatedAt })\n      .from(skills);\n\n    const skillPages: MetadataRoute.Sitemap = allSkills.map((skill) => ({\n      url: `${baseUrl}/skills/${skill.authorName}/${skill.slug}`,\n      lastModified: skill.updatedAt,\n    }));\n\n    const allUsers = await db\n      .select({ username: users.username, updatedAt: users.updatedAt })\n      .from(users);\n\n    const userPages: MetadataRoute.Sitemap = allUsers.map((user) => ({\n      url: `${baseUrl}/users/${user.username}`,\n      lastModified: user.updatedAt,',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/sitemap.test.ts',
      snippet:
        "{\n      slug: 'published-post',\n      date: '2025-01-02',\n      updated: '2025-03-04',\n    },\n  ],\n}));\nvi.mock('@/lib/blog-canonical', () => ({ isCanonicalBlogSlug: () => true }));\nvi.mock('@/lib/compare-data', () => ({ allComparisonSlugs: () => ['comparison'] }));\nvi.mock('@/lib/skills-for-hubs', () => ({ allHubSlugs: () => ['topic'] }));\nvi.mock('./roadmaps/roadmap-data', () => ({\n  roadmaps: [\n    { slug: 'playwright-automation-90-day-roadmap' },\n    { slug: 'qa-seo-content-roadmap-2026' },\n  ],\n}));\n\nimport sitemap from './sitemap';",
    },
  ],
});
