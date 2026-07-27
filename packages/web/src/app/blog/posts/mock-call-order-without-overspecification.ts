import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 948,
  slug: 'mock-call-order-without-overspecification',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Mock Call Order Without Overspecification',
  description:
    'Mock call order without overspecification: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'Mock call order without overspecification',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Mock call order without overspecification, specifically business-significant order without incidental sequence coupling?',
  intentBoundary:
    'Owns business-significant order without incidental sequence coupling. It excludes framework installation, browser request interception, or generic mock tutorials, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Mock call order without overspecification example',
    'Mock call order without overspecification test cases',
    'Mock call order without overspecification failure modes',
    'how to verify mock call order without overspecification',
    'mocking practice business-significant order without incidental sequence coupling',
    'Mock call order without overspecification best practices',
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
      title: 'Build the Mock call order without overspecification baseline',
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
