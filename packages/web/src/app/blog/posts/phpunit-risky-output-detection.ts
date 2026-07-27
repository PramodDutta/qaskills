import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 979,
  slug: 'phpunit-risky-output-detection',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Phpunit Risky Output Detection',
  description:
    'PHPUnit risky output detection: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'PHPUnit risky output detection',
  intent: 'troubleshooting',
  coreQuestion:
    'How can QA teams diagnose PHPUnit risky output detection, specifically unexpected output and tests without assertions?',
  intentBoundary:
    'Owns unexpected output and tests without assertions. It excludes PHPUnit installation, Laravel browser tests, or broad framework tutorials, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'PHPUnit risky output detection example',
    'PHPUnit risky output detection test cases',
    'PHPUnit risky output detection failure modes',
    'how to verify phpunit risky output detection',
    'PHPUnit unexpected output and tests without assertions',
    'PHPUnit risky output detection best practices',
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
      title: 'Build the PHPUnit risky output detection baseline',
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
