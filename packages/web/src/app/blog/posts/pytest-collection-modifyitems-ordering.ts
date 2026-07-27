import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 987,
  slug: 'pytest-collection-modifyitems-ordering',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Pytest Collection Modifyitems Ordering',
  description:
    'Pytest collection modifyitems ordering: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Pytest collection modifyitems ordering',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Pytest collection modifyitems ordering, specifically deterministic item reordering and marker application?',
  intentBoundary:
    'Owns deterministic item reordering and marker application. It excludes pytest installation, general fixture coverage, browser plugins, or infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Pytest collection modifyitems ordering example',
    'Pytest collection modifyitems ordering test cases',
    'Pytest collection modifyitems ordering failure modes',
    'how to verify pytest collection modifyitems ordering',
    'pytest deterministic item reordering and marker application',
    'Pytest collection modifyitems ordering best practices',
  ],
  repoEvidence: [
    'seed-skills/pytest-patterns/SKILL.md',
    'seed-skills/pytest-best-practices/SKILL.md',
    'packages/web/src/app/blog/posts/pytest-best-practices-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/pytest-fixtures-conftest-complete-guide-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'pytest-fixtures-conftest-complete-guide-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://docs.pytest.org/en/stable/how-to/index.html',
    'https://docs.pytest.org/en/stable/reference/reference.html',
    'https://docs.pytest.org/en/stable/how-to/writing_hook_functions.html',
  ],
  codeExamples: [
    {
      title: 'Build the Pytest collection modifyitems ordering baseline',
      language: 'text',
      path: 'seed-skills/pytest-patterns/SKILL.md',
      snippet:
        'project/\n  src/\n    myapp/\n      __init__.py\n      services/\n        user_service.py\n        order_service.py\n      models/\n        user.py\n      utils/\n        validators.py\n  tests/\n    __init__.py\n    conftest.py\n    unit/\n      __init__.py\n      test_user_service.py\n      test_validators.py',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/pytest-best-practices/SKILL.md',
      snippet:
        'integration/\n      conftest.py               # db engine, app client\n      test_checkout_flow.py\n  pyproject.toml',
    },
  ],
});
