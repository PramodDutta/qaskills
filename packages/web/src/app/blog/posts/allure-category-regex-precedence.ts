import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 877,
  slug: 'allure-category-regex-precedence',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Allure Category Regex Precedence',
  description:
    'Allure category regex precedence: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Allure category regex precedence',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Allure category regex precedence, specifically category matching order when multiple rules accept one failure?',
  intentBoundary:
    'Owns category matching order when multiple rules accept one failure. It excludes report hosting infrastructure, vendor comparisons, or browser artifacts, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Allure category regex precedence example',
    'Allure category regex precedence test cases',
    'Allure category regex precedence failure modes',
    'how to verify allure category regex precedence',
    'test reporting and management category matching order when multiple rules accept one failure',
    'Allure category regex precedence best practices',
  ],
  repoEvidence: [
    'seed-skills/allure-report-generator/SKILL.md',
    'seed-skills/testrail-test-management/SKILL.md',
    'seed-skills/jira-qa-workflows/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories',
    '/blog/test-reporting-allure-dashboards-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'test-reporting-allure-dashboards-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://allurereport.org/docs/',
    'https://docs.junit.org/current/user-guide/',
    'https://support.atlassian.com/jira-software-cloud/docs/link-issues/',
  ],
  codeExamples: [
    {
      title: 'Build the Allure category regex precedence baseline',
      language: 'text',
      path: 'seed-skills/allure-report-generator/SKILL.md',
      snippet:
        'project-root/\n tests/\n    e2e/\n       checkout.spec.ts\n       search.spec.ts\n       user-management.spec.ts\n    integration/\n       api-orders.test.ts\n       api-users.test.ts\n    fixtures/\n        allure-fixture.ts\n allure-results/                    # Raw test results (JSON + attachments)\n    *-result.json\n    *-container.json\n    *-attachment.*\n allure-report/                     # Generated HTML report\n    index.html\n    data/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/testrail-test-management/SKILL.md',
      snippet: 'Suite: Release Smoke (15-30 cases, the go/no-go set)',
    },
  ],
});
