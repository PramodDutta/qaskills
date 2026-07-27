import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 459,
  slug: 'related-article-category-weight-tests',
  campaignCluster: 'web-platform',
  title: 'Related Article Category Weight Tests',
  description:
    'related article category weight tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'related article category weight tests',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify related article category weight in the QASkills Next.js application across success, fallback, and boundary states?',
  intentBoundary:
    'Owns related article category weight as implemented by the cited QASkills files. It excludes broad blog routing, canonicalization, and content helper contracts guides and adjacent flows with different inputs, state transitions, or outputs.',
  secondaryKeywords: [
    'how to test related article category weight',
    'related article category weight edge cases',
    'related article category weight integration coverage',
    'related article category weight Playwright assertions',
    'related article category weight fallback behavior',
    'related article category weight regression checklist',
  ],
  repoEvidence: [
    'packages/web/src/lib/related-posts.ts',
    'packages/web/src/lib/blog-canonical.ts',
    'packages/web/src/app/blog/[slug]/page.tsx',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/faq',
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
    'https://react.dev/reference/react/useState',
    'https://vitest.dev/guide/',
    'https://developers.google.com/search/docs/appearance/structured-data/article',
  ],
  codeExamples: [
    {
      title: 'Build the related article category weight tests baseline',
      language: 'typescript',
      path: 'packages/web/src/lib/related-posts.ts',
      snippet:
        "export interface RelatedPostRef {\n  slug: string;\n  title: string;\n  description: string;\n  category: string;\n}\n\nconst STOPWORDS = new Set([\n  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'vs',\n  'guide', 'complete', 'best', 'how', 'what', 'is', 'are', 'your', 'you',\n  '2024', '2025', '2026', 'tutorial', 'testing', 'test', 'reference', 'using',\n  'use', 'qa', 'practices', 'guide', 'comparison', 'explained', 'setup',\n]);\n\nfunction tokenize(slug: string, title: string): Set<string> {\n  const raw = `${slug.replace(/-/g, ' ')} ${title}`.toLowerCase();\n  const tokens = raw\n    .replace(/[^a-z0-9 ]/g, ' ')",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/lib/blog-canonical.ts',
      snippet:
        "'playwright-mcp-server-configuration-2026': 'playwright-mcp-json-configuration-reference',\n  'playwright-mcp-server-config-guide-2026': 'playwright-mcp-json-configuration-reference',\n\n  'deepeval-llm-testing-guide-2026': 'deepeval-llm-testing-guide',\n  'deepeval-llm-testing-framework-guide': 'deepeval-llm-testing-guide',\n  'deepeval-llm-testing-framework-guide-2026': 'deepeval-llm-testing-guide',\n  'deepeval-python-llm-evaluation-guide': 'deepeval-llm-testing-guide',\n  'deepeval-pytest-llm-testing-guide': 'deepeval-llm-testing-guide',\n  'deepeval-complete-guide-2026': 'deepeval-llm-testing-guide',\n  'deepeval-task-completion-guide-2026': 'deepeval-task-completion-metric-agent',\n\n  'promptfoo-complete-guide-qa-teams-2026': 'promptfoo-complete-guide-2026',\n  'promptfoo-llm-red-teaming-guide': 'promptfoo-red-teaming-llm-applications',\n  'promptfoo-red-teaming-guide-2026': 'promptfoo-red-teaming-llm-applications',\n  'promptfoo-red-teaming-llm-guide': 'promptfoo-red-teaming-llm-applications',\n\n  'rag-testing-complete-guide-2026': 'rag-evaluation-metrics-complete-2026',",
    },
  ],
});
