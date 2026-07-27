import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 992,
  slug: 'pytest-generate-tests-metafunc-patterns',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Pytest Generate Tests Metafunc Patterns',
  description:
    'Pytest generate tests metafunc patterns: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Pytest generate tests metafunc patterns',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Pytest generate tests metafunc patterns, specifically collection-time parameter generation from configuration?',
  intentBoundary:
    'Owns collection-time parameter generation from configuration. It excludes pytest installation, general fixture coverage, browser plugins, or infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Pytest generate tests metafunc patterns example',
    'Pytest generate tests metafunc patterns test cases',
    'Pytest generate tests metafunc patterns failure modes',
    'how to verify pytest generate tests metafunc patterns',
    'pytest collection-time parameter generation from configuration',
    'Pytest generate tests metafunc patterns best practices',
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
      title: 'Build the Pytest generate tests metafunc patterns baseline',
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
