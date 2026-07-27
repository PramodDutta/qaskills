import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 966,
  slug: 'nunit-onetimesetup-inheritance-order',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Nunit Onetimesetup Inheritance Order',
  description:
    'NUnit OneTimeSetUp inheritance order: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'NUnit OneTimeSetUp inheritance order',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify NUnit OneTimeSetUp inheritance order, specifically base and derived one-time setup and teardown ordering?',
  intentBoundary:
    'Owns base and derived one-time setup and teardown ordering. It excludes NUnit installation, broad .NET comparisons, or browser automation, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'NUnit OneTimeSetUp inheritance order example',
    'NUnit OneTimeSetUp inheritance order test cases',
    'NUnit OneTimeSetUp inheritance order failure modes',
    'how to verify nunit onetimesetup inheritance order',
    'NUnit base and derived one-time setup and teardown ordering',
    'NUnit OneTimeSetUp inheritance order best practices',
  ],
  repoEvidence: [
    'seed-skills/nunit-testing/SKILL.md',
    'seed-skills/dotnet-testing/SKILL.md',
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
    'https://docs.nunit.org/articles/nunit/writing-tests/attributes.html',
    'https://docs.nunit.org/articles/nunit/writing-tests/constraints/Constraints.html',
    'https://docs.nunit.org/articles/nunit/writing-tests/setup-teardown/index.html',
  ],
  codeExamples: [
    {
      title: 'Build the NUnit OneTimeSetUp inheritance order baseline',
      language: 'text',
      path: 'seed-skills/nunit-testing/SKILL.md',
      snippet:
        'Solution/\n  src/\n    MyApp/\n      Services/\n        UserService.cs\n        PaymentService.cs\n      Models/\n        User.cs\n        Order.cs\n      Repositories/\n        IUserRepository.cs\n        UserRepository.cs\n      Utilities/\n        Validators.cs\n  tests/\n    MyApp.Tests/\n      Services/\n        UserServiceTests.cs',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'csharp',
      path: 'seed-skills/dotnet-testing/SKILL.md',
      snippet: '',
    },
  ],
});
