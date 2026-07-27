import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 965,
  slug: 'nunit-multiple-assertion-result-aggregation',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Nunit Multiple Assertion Result Aggregation',
  description:
    'NUnit multiple assertion result aggregation: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'NUnit multiple assertion result aggregation',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify NUnit multiple assertion result aggregation, specifically aggregated assertion failures and prohibited control flow?',
  intentBoundary:
    'Owns aggregated assertion failures and prohibited control flow. It excludes NUnit installation, broad .NET comparisons, or browser automation, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'NUnit multiple assertion result aggregation example',
    'NUnit multiple assertion result aggregation test cases',
    'NUnit multiple assertion result aggregation failure modes',
    'how to verify nunit multiple assertion result aggregation',
    'NUnit aggregated assertion failures and prohibited control flow',
    'NUnit multiple assertion result aggregation best practices',
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
      title: 'Build the NUnit multiple assertion result aggregation baseline',
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
