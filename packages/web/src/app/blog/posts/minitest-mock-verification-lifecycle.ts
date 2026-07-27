import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 945,
  slug: 'minitest-mock-verification-lifecycle',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Minitest Mock Verification Lifecycle',
  description:
    'Minitest mock verification lifecycle: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Minitest mock verification lifecycle',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Minitest mock verification lifecycle, specifically expectation verification and teardown ownership?',
  intentBoundary:
    'Owns expectation verification and teardown ownership. It excludes Rails system tests, RSpec comparisons, or general Ruby setup, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Minitest mock verification lifecycle example',
    'Minitest mock verification lifecycle test cases',
    'Minitest mock verification lifecycle failure modes',
    'how to verify minitest mock verification lifecycle',
    'Minitest expectation verification and teardown ownership',
    'Minitest mock verification lifecycle best practices',
  ],
  repoEvidence: [
    'seed-skills/ruby-testunit/SKILL.md',
    'seed-skills/rspec-testing/SKILL.md',
    'packages/web/src/app/blog/posts/rspec-ruby-testing-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/rspec-ruby-testing-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'rspec-ruby-testing-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://github.com/minitest/minitest',
    'https://ruby-doc.org/3.4.1/gems/minitest/Minitest.html',
  ],
  codeExamples: [
    {
      title: 'Build the Minitest mock verification lifecycle baseline',
      language: 'text',
      path: 'seed-skills/ruby-testunit/SKILL.md',
      snippet:
        'project/\n  lib/\n    services/\n      user_service.rb\n      payment_service.rb\n    models/\n      user.rb\n      order.rb\n    utils/\n      validators.rb\n      formatters.rb\n  test/\n    test_helper.rb\n    services/\n      test_user_service.rb\n      test_payment_service.rb\n    models/\n      test_user.rb',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'text',
      path: 'seed-skills/rspec-testing/SKILL.md',
      snippet:
        'services/\n       user_service_spec.rb\n       payment_service_spec.rb\n       notification_service_spec.rb\n    requests/\n       users_spec.rb\n       orders_spec.rb\n    system/\n       login_spec.rb\n       checkout_spec.rb\n    support/\n       shared_examples/\n          validatable.rb\n          timestamped.rb\n       shared_contexts/\n          authenticated_user.rb\n          with_products.rb\n       matchers/',
    },
  ],
});
