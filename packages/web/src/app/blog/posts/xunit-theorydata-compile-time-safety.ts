import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 915,
  slug: 'xunit-theorydata-compile-time-safety',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Xunit Theorydata Compile Time Safety',
  description:
    'xUnit TheoryData compile time safety: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'xUnit TheoryData compile time safety',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify xUnit TheoryData compile time safety, specifically strongly typed theory rows and refactor failures?',
  intentBoundary:
    'Owns strongly typed theory rows and refactor failures. It excludes broad .NET framework comparisons, web integration tests, or infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'xUnit TheoryData compile time safety example',
    'xUnit TheoryData compile time safety test cases',
    'xUnit TheoryData compile time safety failure modes',
    'how to verify xunit theorydata compile time safety',
    'xUnit strongly typed theory rows and refactor failures',
    'xUnit TheoryData compile time safety best practices',
  ],
  repoEvidence: [
    'seed-skills/dotnet-testing/SKILL.md',
    'seed-skills/nunit-testing/SKILL.md',
    'packages/web/src/app/blog/posts/dotnet-testing-xunit-nunit-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/dotnet-testing-xunit-nunit-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'dotnet-testing-xunit-nunit-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://xunit.net/docs/getting-started/v3/getting-started',
    'https://xunit.net/docs/shared-context',
    'https://api.xunit.net/v3/3.0.1/',
  ],
  codeExamples: [
    {
      title: 'Build the xUnit TheoryData compile time safety baseline',
      language: 'csharp',
      path: 'seed-skills/dotnet-testing/SKILL.md',
      snippet:
        '// Example dotnet pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/nunit-testing/SKILL.md',
      snippet:
        'IUserRepository.cs\n        UserRepository.cs\n      Utilities/\n        Validators.cs\n  tests/\n    MyApp.Tests/\n      Services/\n        UserServiceTests.cs\n        PaymentServiceTests.cs\n      Models/\n        UserTests.cs\n        OrderTests.cs\n      Utilities/\n        ValidatorsTests.cs\n      Fixtures/\n        TestDataFactory.cs\n      MyApp.Tests.csproj\n    MyApp.IntegrationTests/',
    },
  ],
});
