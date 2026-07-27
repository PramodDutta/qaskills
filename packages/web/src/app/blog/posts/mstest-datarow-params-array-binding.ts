import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 956,
  slug: 'mstest-datarow-params-array-binding',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Mstest Datarow Params Array Binding',
  description:
    'MSTest DataRow params array binding: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'MSTest DataRow params array binding',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify MSTest DataRow params array binding, specifically params arrays, nulls, and inline data conversion?',
  intentBoundary:
    'Owns params arrays, nulls, and inline data conversion. It excludes MSTest installation, broad .NET comparisons, or deployment infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'MSTest DataRow params array binding example',
    'MSTest DataRow params array binding test cases',
    'MSTest DataRow params array binding failure modes',
    'how to verify mstest datarow params array binding',
    'MSTest params arrays, nulls, and inline data conversion',
    'MSTest DataRow params array binding best practices',
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
      title: 'Build the MSTest DataRow params array binding baseline',
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
