import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 919,
  slug: 'testng-group-dependency-ordering',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Testng Group Dependency Ordering',
  description:
    'TestNG group dependency ordering: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'TestNG group dependency ordering',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify TestNG group dependency ordering, specifically before-groups hooks and dependent group sequencing?',
  intentBoundary:
    'Owns before-groups hooks and dependent group sequencing. It excludes general TestNG setup, Selenium workflows, or DataProvider parallelization, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'TestNG group dependency ordering example',
    'TestNG group dependency ordering test cases',
    'TestNG group dependency ordering failure modes',
    'how to verify testng group dependency ordering',
    'TestNG before-groups hooks and dependent group sequencing',
    'TestNG group dependency ordering best practices',
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
      title: 'Build the TestNG group dependency ordering baseline',
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
