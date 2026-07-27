import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 485,
  slug: 'robots-ai-crawler-parity-tests',
  campaignCluster: 'web-platform',
  title: 'Robots AI Crawler Parity Tests',
  description:
    'robots AI crawler parity tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'robots AI crawler parity tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify robots AI crawler parity in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns robots AI crawler parity as implemented by the cited QASkills files. It excludes broad sitemap and robots output assembled from existing registries and database rows guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test robots AI crawler parity',
    'robots AI crawler parity edge cases',
    'robots AI crawler parity integration coverage',
    'robots AI crawler parity Playwright assertions',
    'robots AI crawler parity fallback behavior',
    'robots AI crawler parity regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/app/robots.ts',
    'packages/web/src/app/robots.test.ts',
    'packages/web/src/app/',
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
    'https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots',
    'https://developers.google.com/search/docs/crawling-indexing/robots/intro',
    'https://playwright.dev/docs/test-assertions',
  ],
  codeExamples: [
    {
      title: 'Build the robots AI crawler parity tests baseline',
      language: 'typescript',
      path: 'packages/web/src/app/robots.ts',
      snippet:
        "export default function robots(): MetadataRoute.Robots {\n  const allow = ['/', '/api/og'];\n  const disallow = ['/dashboard/', '/api/', '/unsubscribe'];\n\n  return {\n    rules: [\n      {\n        userAgent: '*',\n        allow,\n        disallow,\n      },\n      {\n        userAgent: 'GPTBot',\n        allow,\n        disallow,\n      },\n      {\n        userAgent: 'ClaudeBot',",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/robots.test.ts',
      snippet:
        "const disallow = ruleList.flatMap((rule) => {\n      if (!rule?.disallow) return [];\n      return Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];\n    });\n\n    for (const authPath of ['/sign-in', '/sign-in/continue', '/sign-up', '/sign-up/verify']) {\n      expect(\n        disallow.some((pattern) => authPath.startsWith(pattern)),\n        authPath,\n      ).toBe(false);\n    }\n  });\n});",
    },
  ],
});
