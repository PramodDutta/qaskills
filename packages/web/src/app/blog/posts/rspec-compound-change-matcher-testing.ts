import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 901,
  slug: 'rspec-compound-change-matcher-testing',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Rspec Compound Change Matcher Testing',
  description:
    'RSpec compound change matcher testing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'RSpec compound change matcher testing',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify RSpec compound change matcher testing, specifically and/or change matchers with block expectations?',
  intentBoundary:
    'Owns and/or change matchers with block expectations. It excludes RSpec setup, Rails system tests, Capybara, or generic mocking coverage, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'RSpec compound change matcher testing example',
    'RSpec compound change matcher testing test cases',
    'RSpec compound change matcher testing failure modes',
    'how to verify rspec compound change matcher testing',
    'RSpec and/or change matchers with block expectations',
    'RSpec compound change matcher testing best practices',
  ],
  repoEvidence: [
    'seed-skills/rspec-testing/SKILL.md',
    'packages/web/src/app/blog/posts/rspec-ruby-testing-guide.ts',
    'packages/web/src/app/blog/posts/rspec-mocks-doubles-stubs-guide-2026.ts',
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
    'https://rspec.info/features/3-13/rspec-core/',
    'https://rspec.info/features/3-13/rspec-mocks/',
    'https://rspec.info/features/3-13/rspec-expectations/',
  ],
  codeExamples: [
    {
      title: 'Build the RSpec compound change matcher testing baseline',
      language: 'text',
      path: 'seed-skills/rspec-testing/SKILL.md',
      snippet:
        'project-root/\n Gemfile\n .rspec                            # RSpec CLI options\n spec/\n    spec_helper.rb                # Core RSpec configuration\n    rails_helper.rb               # Rails-specific config (if Rails)\n    models/\n       user_spec.rb\n       order_spec.rb\n       product_spec.rb\n    services/\n       user_service_spec.rb\n       payment_service_spec.rb\n       notification_service_spec.rb\n    requests/\n       users_spec.rb\n       orders_spec.rb\n    system/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/rspec-ruby-testing-guide.ts',
      snippet:
        "- \\`let\\` and \\`let!\\` provide lazy and eager memoized helpers that keep test setup clean and avoid unnecessary computation\n- RSpec matchers offer a rich vocabulary for assertions, from simple equality checks to complex collection and change matchers\n- Doubles (mocks and stubs) isolate the unit under test from its dependencies with clear, intention-revealing syntax\n- Shared examples and shared contexts eliminate duplication across spec files for common behavior patterns\n- AI coding agents with QA skills from qaskills.sh generate idiomatic RSpec tests following Ruby community conventions\n\n---\n\n## Setting Up RSpec\n\n### Installation\n\n\\`\\`\\`ruby\n# Gemfile\ngroup :development, :test do\n  gem 'rspec-rails', '~> 7.0'    # For Rails projects\n  gem 'factory_bot_rails'\n  gem 'faker'",
    },
  ],
});
