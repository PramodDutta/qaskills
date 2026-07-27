import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 905,
  slug: 'go-test-shuffle-seed-replay',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Go Test Shuffle Seed Replay',
  description:
    'Go test shuffle seed replay: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'Go test shuffle seed replay',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Go test shuffle seed replay, specifically capturing and replaying randomized test order?',
  intentBoundary:
    'Owns capturing and replaying randomized test order. It excludes table-driven testing introductions, service integration, or infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Go test shuffle seed replay example',
    'Go test shuffle seed replay test cases',
    'Go test shuffle seed replay failure modes',
    'how to verify go test shuffle seed replay',
    'Go testing capturing and replaying randomized test order',
    'Go test shuffle seed replay best practices',
  ],
  repoEvidence: [
    'seed-skills/go-testing/SKILL.md',
    'packages/web/src/app/blog/posts/go-testing-tutorial-table-driven-tests-2026.ts',
    'seed-skills/property-based-testing/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/go-testing-tutorial-table-driven-tests-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'go-testing-tutorial-table-driven-tests-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://pkg.go.dev/testing',
    'https://go.dev/doc/tutorial/add-a-test',
    'https://go.dev/blog/subtests',
  ],
  codeExamples: [
    {
      title: 'Build the Go test shuffle seed replay baseline',
      language: 'go',
      path: 'seed-skills/go-testing/SKILL.md',
      snippet:
        '// Example go pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/go-testing-tutorial-table-driven-tests-2026.ts',
      snippet:
        'A test file lives beside the code it tests, ends in \\`_test.go\\`, and uses the same package (or \\`package foo_test\\` for black-box tests).\n\n\\`\\`\\`go\n// math.go\npackage mathx\n\nfunc Add(a, b int) int { return a + b }\n\\`\\`\\`\n\n\\`\\`\\`go\n// math_test.go\npackage mathx\n\nimport "testing"\n\nfunc TestAdd(t *testing.T) {\n    got := Add(2, 3)',
    },
  ],
});
