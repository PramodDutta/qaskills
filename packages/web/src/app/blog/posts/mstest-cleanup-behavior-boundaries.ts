import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 955,
  slug: 'mstest-cleanup-behavior-boundaries',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Mstest Cleanup Behavior Boundaries',
  description:
    'MSTest cleanup behavior boundaries: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MSTest cleanup behavior boundaries',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify MSTest cleanup behavior boundaries, specifically cleanup execution after initialization and test failures?',
  intentBoundary:
    'Owns cleanup execution after initialization and test failures. It excludes MSTest installation, broad .NET comparisons, or deployment infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'MSTest cleanup behavior boundaries example',
    'MSTest cleanup behavior boundaries test cases',
    'MSTest cleanup behavior boundaries failure modes',
    'how to verify mstest cleanup behavior boundaries',
    'MSTest cleanup execution after initialization and test failures',
    'MSTest cleanup behavior boundaries best practices',
  ],
  repoEvidence: [
    'seed-skills/mstest-testing/SKILL.md',
    'seed-skills/dotnet-testing/SKILL.md',
    'packages/web/src/app/blog/posts/xunit-vs-nunit-vs-mstest-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/xunit-vs-nunit-vs-mstest-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'xunit-vs-nunit-vs-mstest-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-intro',
    'https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-writing-tests-attributes',
    'https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-analyzers',
  ],
  codeExamples: [
    {
      title: 'Build the MSTest cleanup behavior boundaries baseline',
      language: 'text',
      path: 'seed-skills/mstest-testing/SKILL.md',
      snippet:
        'Solution/\n  src/\n    MyApp/\n      Services/\n        UserService.cs\n        PaymentService.cs\n      Models/\n        User.cs\n        Order.cs\n      Repositories/\n        IUserRepository.cs\n        UserRepository.cs\n      Utilities/\n        Validators.cs\n  tests/\n    MyApp.UnitTests/\n      Services/\n        UserServiceTests.cs',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'csharp',
      path: 'seed-skills/dotnet-testing/SKILL.md',
      snippet: '',
    },
  ],
});
