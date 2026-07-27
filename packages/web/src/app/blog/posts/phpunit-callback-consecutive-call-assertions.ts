import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 973,
  slug: 'phpunit-callback-consecutive-call-assertions',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Phpunit Callback Consecutive Call Assertions',
  description:
    'PHPUnit callback consecutive call assertions: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'PHPUnit callback consecutive call assertions',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify PHPUnit callback consecutive call assertions, specifically per-call argument validation after withConsecutive removal?',
  intentBoundary:
    'Owns per-call argument validation after withConsecutive removal. It excludes PHPUnit installation, Laravel browser tests, or broad framework tutorials, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'PHPUnit callback consecutive call assertions example',
    'PHPUnit callback consecutive call assertions test cases',
    'PHPUnit callback consecutive call assertions failure modes',
    'how to verify phpunit callback consecutive call assertions',
    'PHPUnit per-call argument validation after withConsecutive removal',
    'PHPUnit callback consecutive call assertions best practices',
  ],
  repoEvidence: [
    'seed-skills/phpunit-testing/SKILL.md',
    'packages/web/src/app/blog/posts/phpunit-testing-complete-guide.ts',
    'seed-skills/approval-testing/SKILL.md',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/phpunit-testing-complete-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'phpunit-testing-complete-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://docs.phpunit.de/en/12.4/test-doubles.html',
    'https://docs.phpunit.de/en/12.4/writing-tests-for-phpunit.html',
    'https://docs.phpunit.de/en/12.4/attributes.html',
  ],
  codeExamples: [
    {
      title: 'Build the PHPUnit callback consecutive call assertions baseline',
      language: 'text',
      path: 'seed-skills/phpunit-testing/SKILL.md',
      snippet:
        'project/\n  src/\n    Service/\n      UserService.php\n      PaymentService.php\n    Model/\n      User.php\n      Order.php\n    Repository/\n      UserRepository.php\n    Util/\n      Validators.php\n  tests/\n    Unit/\n      Service/\n        UserServiceTest.php\n        PaymentServiceTest.php\n      Model/',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/phpunit-testing-complete-guide.ts',
      snippet:
        '- PHPUnit 11 is the current stable release and requires PHP 8.2 or higher\n- Test classes extend \\`TestCase\\` and methods are prefixed with \\`test\\` or annotated with \\`#[Test]\\`\n- Data providers let you run the same test logic against multiple input sets without duplicating code\n- Mocking with \\`createMock()\\` and \\`createStub()\\` isolates units from their dependencies\n- Database testing benefits from transactions that roll back after each test\n- Laravel provides \\`RefreshDatabase\\`, HTTP testing helpers, and factory-based seeding out of the box\n\n---\n\n## Setting Up PHPUnit\n\n### Installation\n\nInstall PHPUnit via Composer. For most projects you want it as a dev dependency:\n\n\\`\\`\\`bash\ncomposer require --dev phpunit/phpunit ^11.0',
    },
  ],
});
