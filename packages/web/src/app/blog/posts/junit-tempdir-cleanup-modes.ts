import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 934,
  slug: 'junit-tempdir-cleanup-modes',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Junit Tempdir Cleanup Modes',
  description:
    'JUnit TempDir cleanup modes: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'JUnit TempDir cleanup modes',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify JUnit TempDir cleanup modes, specifically temporary directory cleanup success and failure modes?',
  intentBoundary:
    'Owns temporary directory cleanup success and failure modes. It excludes general JUnit setup, JUnit 4 migration, parameterized-test surveys, or E2E use, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'JUnit TempDir cleanup modes example',
    'JUnit TempDir cleanup modes test cases',
    'JUnit TempDir cleanup modes failure modes',
    'how to verify junit tempdir cleanup modes',
    'JUnit temporary directory cleanup success and failure modes',
    'JUnit TempDir cleanup modes best practices',
  ],
  repoEvidence: [
    'seed-skills/junit5-testing/SKILL.md',
    'packages/web/src/app/blog/posts/junit5-testing-java-guide.ts',
    'packages/web/src/app/blog/posts/junit5-parameterized-tests-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/junit5-testing-java-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'junit5-testing-java-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://docs.junit.org/current/user-guide/',
    'https://docs.junit.org/current/api/',
    'https://junit.org/junit5/',
  ],
  codeExamples: [
    {
      title: 'Build the JUnit TempDir cleanup modes baseline',
      language: 'text',
      path: 'seed-skills/junit5-testing/SKILL.md',
      snippet:
        'src/\n  main/java/com/example/\n    service/\n      UserService.java\n      PaymentService.java\n    model/\n      User.java\n      Order.java\n    repository/\n      UserRepository.java\n    util/\n      Validators.java\n  test/java/com/example/\n    service/\n      UserServiceTest.java\n      PaymentServiceTest.java\n    model/\n      UserTest.java',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/junit5-testing-java-guide.ts',
      snippet:
        '- Parameterized tests with \\`@MethodSource\\`, \\`@CsvSource\\`, and \\`@ValueSource\\` eliminate test duplication and improve coverage\n- Nested test classes using \\`@Nested\\` organize related tests into readable hierarchies that mirror your domain logic\n- The Extension API replaces JUnit 4 runners and rules with a composable, annotation-driven model\n- Mockito 5 integrates seamlessly via \\`@ExtendWith(MockitoExtension.class)\\` for clean dependency isolation\n- AI coding agents with QA skills from qaskills.sh generate JUnit 5 tests following modern patterns and conventions\n\n---\n\n## JUnit 5 Architecture\n\nJUnit 5 is fundamentally different from JUnit 4 in its modular design. It consists of three sub-projects:\n\n**JUnit Platform** serves as the foundation for launching testing frameworks on the JVM. It defines the \\`TestEngine\\` API and provides a console launcher and build tool integrations.\n\n**JUnit Jupiter** provides the new programming model and extension model for writing tests. This is where \\`@Test\\`, \\`@BeforeEach\\`, \\`@ParameterizedTest\\`, and all the annotations you use daily live.\n\n**JUnit Vintage** provides backward compatibility, allowing JUnit 3 and JUnit 4 tests to run on the JUnit 5 platform.',
    },
  ],
});
