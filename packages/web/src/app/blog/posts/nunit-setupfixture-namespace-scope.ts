import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 967,
  slug: 'nunit-setupfixture-namespace-scope',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Nunit Setupfixture Namespace Scope',
  description:
    'NUnit SetUpFixture namespace scope: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'NUnit SetUpFixture namespace scope',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify NUnit SetUpFixture namespace scope, specifically namespace-wide setup discovery and nesting boundaries?',
  intentBoundary:
    'Owns namespace-wide setup discovery and nesting boundaries. It excludes NUnit installation, broad .NET comparisons, or browser automation, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'NUnit SetUpFixture namespace scope example',
    'NUnit SetUpFixture namespace scope test cases',
    'NUnit SetUpFixture namespace scope failure modes',
    'how to verify nunit setupfixture namespace scope',
    'NUnit namespace-wide setup discovery and nesting boundaries',
    'NUnit SetUpFixture namespace scope best practices',
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
      title: 'Build the NUnit SetUpFixture namespace scope baseline',
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
