import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 916,
  slug: 'testng-alwaysrun-configuration-semantics',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Testng Alwaysrun Configuration Semantics',
  description:
    'TestNG alwaysRun configuration semantics: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'TestNG alwaysRun configuration semantics',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify TestNG alwaysRun configuration semantics, specifically alwaysRun behavior for lifecycle and dependent methods?',
  intentBoundary:
    'Owns alwaysRun behavior for lifecycle and dependent methods. It excludes general TestNG setup, Selenium workflows, or DataProvider parallelization, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'TestNG alwaysRun configuration semantics example',
    'TestNG alwaysRun configuration semantics test cases',
    'TestNG alwaysRun configuration semantics failure modes',
    'how to verify testng alwaysrun configuration semantics',
    'TestNG alwaysRun behavior for lifecycle and dependent methods',
    'TestNG alwaysRun configuration semantics best practices',
  ],
  repoEvidence: [
    'seed-skills/testng-testing/SKILL.md',
    'packages/web/src/app/blog/posts/testng-dataprovider-parallel-guide-2026.ts',
    'packages/web/src/app/blog/posts/testng-vs-junit5-comparison.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/testng-dataprovider-parallel-guide-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'testng-dataprovider-parallel-guide-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://testng.org/',
    'https://testng.org/annotations.html',
    'https://testng.org/method_interceptors.html',
  ],
  codeExamples: [
    {
      title: 'Build the TestNG alwaysRun configuration semantics baseline',
      language: 'text',
      path: 'seed-skills/testng-testing/SKILL.md',
      snippet:
        'src/\n  main/java/com/example/\n    service/\n      UserService.java\n      PaymentService.java\n    model/\n      User.java\n      Order.java\n    repository/\n      UserRepository.java\n    util/\n      Validators.java\n  test/java/com/example/\n    service/\n      UserServiceTest.java\n      PaymentServiceTest.java\n    model/\n      UserTest.java',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/testng-dataprovider-parallel-guide-2026.ts',
      snippet:
        'import org.testng.annotations.DataProvider;\nimport org.testng.annotations.Test;\nimport static org.testng.Assert.assertEquals;\n\npublic class CalculatorTest {\n\n    @DataProvider(name = "additionCases")\n    public Object[][] additionCases() {\n        return new Object[][] {\n            { 2, 3, 5 },\n            { -1, 1, 0 },\n            { 0, 0, 0 },\n            { 100, 250, 350 },\n        };\n    }\n\n    @Test(dataProvider = "additionCases")\n    public void addsCorrectly(int a, int b, int expected) {',
    },
  ],
});
