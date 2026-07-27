import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 951,
  slug: 'mock-reset-clear-restore-matrix',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Mock Reset Clear Restore Matrix',
  description:
    'Mock reset clear restore matrix: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Mock reset clear restore matrix',
  intent: 'comparison',
  coreQuestion:
    'When should QA teams distinguish Mock reset clear restore matrix, specifically call history, implementation reset, and original restoration choices?',
  intentBoundary:
    'Owns call history, implementation reset, and original restoration choices. It excludes framework installation, browser request interception, or generic mock tutorials, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Mock reset clear restore matrix example',
    'Mock reset clear restore matrix test cases',
    'Mock reset clear restore matrix failure modes',
    'how to verify mock reset clear restore matrix',
    'mocking practice call history, implementation reset, and original restoration choices',
    'Mock reset clear restore matrix best practices',
  ],
  repoEvidence: [
    'seed-skills/jest-mocking-patterns/SKILL.md',
    'seed-skills/msw-mocking/SKILL.md',
    'packages/web/src/app/blog/posts/jest-mock-vs-mockimplementation-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/api-mocking-service-virtualization-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'api-mocking-service-virtualization-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://jestjs.io/docs/mock-functions',
    'https://docs.python.org/3/library/unittest.mock.html',
    'https://javadoc.io/doc/org.mockito/mockito-core/latest/org.mockito/org/mockito/Mockito.html',
  ],
  codeExamples: [
    {
      title: 'Build the Mock reset clear restore matrix baseline',
      language: 'typescript',
      path: 'seed-skills/jest-mocking-patterns/SKILL.md',
      snippet:
        "test('jest.fn return value control', () => {\n  const calc = jest.fn();\n\n  calc.mockReturnValue(10); // default for every call\n  calc.mockReturnValueOnce(1).mockReturnValueOnce(2); // queued, then falls back\n\n  expect(calc()).toBe(1);\n  expect(calc()).toBe(2);\n  expect(calc()).toBe(10);\n  expect(calc).toHaveBeenCalledTimes(3);\n});\n\ntest('async return values', async () => {\n  const fetchUser = jest.fn<Promise<{ id: number }>, [number]>();\n  fetchUser.mockResolvedValue({ id: 1 });\n\n  await expect(fetchUser(1)).resolves.toEqual({ id: 1 });",
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'bash',
      path: 'seed-skills/msw-mocking/SKILL.md',
      snippet: '',
    },
  ],
});
