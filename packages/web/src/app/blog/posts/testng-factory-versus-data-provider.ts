import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 918,
  slug: 'testng-factory-versus-data-provider',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Testng Factory Versus Data Provider',
  description:
    'TestNG factory versus data provider: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'TestNG factory versus data provider',
  intent: 'comparison',
  coreQuestion:
    'When should QA teams distinguish TestNG factory versus data provider, specifically instance construction versus method invocation data?',
  intentBoundary:
    'Owns instance construction versus method invocation data. It excludes general TestNG setup, Selenium workflows, or DataProvider parallelization, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'TestNG factory versus data provider example',
    'TestNG factory versus data provider test cases',
    'TestNG factory versus data provider failure modes',
    'how to verify testng factory versus data provider',
    'TestNG instance construction versus method invocation data',
    'TestNG factory versus data provider best practices',
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
      title: 'Build the TestNG factory versus data provider baseline',
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
