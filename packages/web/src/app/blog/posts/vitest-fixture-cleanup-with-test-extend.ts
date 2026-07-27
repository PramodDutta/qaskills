import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 937,
  slug: 'vitest-fixture-cleanup-with-test-extend',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Vitest Fixture Cleanup With Test Extend',
  description:
    'Vitest fixture cleanup with test extend: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Vitest fixture cleanup with test extend',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Vitest fixture cleanup with test extend, specifically fixture setup, use, and teardown through test.extend?',
  intentBoundary:
    'Owns fixture setup, use, and teardown through test.extend. It excludes Vitest setup, migration, browser mode, or CI infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Vitest fixture cleanup with test extend example',
    'Vitest fixture cleanup with test extend test cases',
    'Vitest fixture cleanup with test extend failure modes',
    'how to verify vitest fixture cleanup with test extend',
    'Vitest fixture setup, use, and teardown through test.extend',
    'Vitest fixture cleanup with test extend best practices',
  ],
  repoEvidence: [
    'seed-skills/vitest/SKILL.md',
    'seed-skills/vitest-testing/SKILL.md',
    'packages/web/src/app/blog/posts/vitest-vs-jest-2026-comparison.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/vitest-config-setup-guide-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'vitest-config-setup-guide-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://vitest.dev/api/mock.html',
    'https://vitest.dev/api/vi',
    'https://vitest.dev/guide/test-context.html',
  ],
  codeExamples: [
    {
      title: 'Build the Vitest fixture cleanup with test extend baseline',
      language: 'text',
      path: 'seed-skills/vitest/SKILL.md',
      snippet:
        'project/\n  src/\n    components/\n      Button.tsx\n      Button.test.tsx\n    services/\n      user.service.ts\n      user.service.test.ts\n    utils/\n      validators.ts\n      validators.test.ts\n  tests/\n    integration/\n      api.test.ts\n      db.test.ts\n    fixtures/\n      test-data.ts\n    setup.ts',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'seed-skills/vitest-testing/SKILL.md',
      snippet: '',
    },
  ],
});
