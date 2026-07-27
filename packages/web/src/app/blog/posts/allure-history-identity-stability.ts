import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 878,
  slug: 'allure-history-identity-stability',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Allure History Identity Stability',
  description:
    'Allure history identity stability: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Allure history identity stability',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Allure history identity stability, specifically stable history IDs after test renames and parameter changes?',
  intentBoundary:
    'Owns stable history IDs after test renames and parameter changes. It excludes report hosting infrastructure, vendor comparisons, or browser artifacts, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Allure history identity stability example',
    'Allure history identity stability test cases',
    'Allure history identity stability failure modes',
    'how to verify allure history identity stability',
    'test reporting and management stable history IDs after test renames and parameter changes',
    'Allure history identity stability best practices',
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
      title: 'Build the Allure history identity stability baseline',
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
