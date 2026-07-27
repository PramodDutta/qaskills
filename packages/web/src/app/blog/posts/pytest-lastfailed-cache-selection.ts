import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 995,
  slug: 'pytest-lastfailed-cache-selection',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Pytest Lastfailed Cache Selection',
  description:
    'Pytest lastfailed cache selection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Pytest lastfailed cache selection',
  intent: 'troubleshooting',
  coreQuestion:
    'How can QA teams diagnose Pytest lastfailed cache selection, specifically failed-test cache semantics after renames and collection changes?',
  intentBoundary:
    'Owns failed-test cache semantics after renames and collection changes. It excludes pytest installation, general fixture coverage, browser plugins, or infrastructure, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Pytest lastfailed cache selection example',
    'Pytest lastfailed cache selection test cases',
    'Pytest lastfailed cache selection failure modes',
    'how to verify pytest lastfailed cache selection',
    'pytest failed-test cache semantics after renames and collection changes',
    'Pytest lastfailed cache selection best practices',
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
      title: 'Build the Pytest lastfailed cache selection baseline',
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
