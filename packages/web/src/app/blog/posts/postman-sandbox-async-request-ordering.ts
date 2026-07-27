import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 994,
  slug: 'postman-sandbox-async-request-ordering',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Postman Sandbox Async Request Ordering',
  description:
    'Postman sandbox async request ordering: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Postman sandbox async request ordering',
  intent: 'troubleshooting',
  coreQuestion:
    'How can Postman scripts coordinate multiple pm.sendRequest callbacks without racing assertions or collection flow?',
  intentBoundary:
    'The nearest page covers a broader postman workflow. This candidate owns deterministic ordering for asynchronous sandbox requests.',
  secondaryKeywords: [
    'Postman pm.sendRequest ordering',
    'Postman sandbox async race',
    'await multiple Postman requests',
    'callback assertion timing Postman',
    'collection script concurrency',
  ],
  repoEvidence: [
    'seed-skills/postman-api/SKILL.md',
    'seed-skills/postman-newman-automation/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/api-testing',
    '/blog/postman-api-testing-guide',
    '/blog/newman-postman-ci-automation-guide-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
  ],
  relatedSlugs: [
    'postman-api-testing-guide',
    'newman-postman-ci-automation-guide-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
  ],
  sources: [
    'https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-api-reference/',
    'https://learning.postman.com/docs/collections/running-collections/building-workflows/',
    'https://learning.postman.com/docs/collections/using-newman-cli/newman-options/',
  ],
  codeExamples: [
    {
      title: 'Build the Postman sandbox async request ordering baseline',
      language: 'text',
      path: 'seed-skills/postman-api/SKILL.md',
      snippet:
        'postman/\n  collections/\n    users-api.postman_collection.json\n    products-api.postman_collection.json\n    auth-api.postman_collection.json\n    e2e-workflows.postman_collection.json\n  environments/\n    local.postman_environment.json\n    staging.postman_environment.json\n    production.postman_environment.json\n  globals/\n    global-variables.postman_globals.json\n  data/\n    users.csv\n    products.json\n  scripts/\n    run-tests.sh\n    newman-config.js',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'javascript',
      path: 'seed-skills/postman-newman-automation/SKILL.md',
      snippet: '',
    },
  ],
});
