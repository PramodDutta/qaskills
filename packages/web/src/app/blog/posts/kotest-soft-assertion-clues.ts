import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 941,
  slug: 'kotest-soft-assertion-clues',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Kotest Soft Assertion Clues',
  description:
    'Kotest soft assertion clues: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified cleanup.',
  primaryKeyword: 'Kotest soft assertion clues',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Kotest soft assertion clues, specifically clue context preserved across accumulated failures?',
  intentBoundary:
    'Owns clue context preserved across accumulated failures. It excludes Kotest setup, Android UI automation, or general MockK tutorials, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Kotest soft assertion clues example',
    'Kotest soft assertion clues test cases',
    'Kotest soft assertion clues failure modes',
    'how to verify kotest soft assertion clues',
    'Kotlin testing clue context preserved across accumulated failures',
    'Kotest soft assertion clues best practices',
  ],
  repoEvidence: [
    'seed-skills/kotlin-testing/SKILL.md',
    'packages/web/src/app/blog/posts/kotest-kotlin-testing-tutorial-2026.ts',
    'packages/web/src/app/blog/posts/mockk-kotlin-mocking-guide-2026.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/kotest-kotlin-testing-tutorial-2026',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'kotest-kotlin-testing-tutorial-2026',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://kotest.io/docs/framework/isolation-mode.html',
    'https://kotest.io/docs/framework/lifecycle-hooks.html',
    'https://kotest.io/docs/assertions/assertions.html',
  ],
  codeExamples: [
    {
      title: 'Build the Kotest soft assertion clues baseline',
      language: 'kotlin',
      path: 'seed-skills/kotlin-testing/SKILL.md',
      snippet:
        '// Example kotlin pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/web/src/app/blog/posts/kotest-kotlin-testing-tutorial-2026.ts',
      snippet:
        'Kotest ships as several modules. At minimum you need \\`kotest-runner-junit5\\` (the engine that plugs into the JUnit Platform) and \\`kotest-assertions-core\\` (the matchers). Add \\`kotest-property\\` when you want property testing.\n\n\\`\\`\\`kotlin\n// build.gradle.kts\nplugins {\n    kotlin("jvm") version "2.1.0"\n}\n\ndependencies {\n    val kotestVersion = "5.9.1"\n    testImplementation("io.kotest:kotest-runner-junit5:$kotestVersion")\n    testImplementation("io.kotest:kotest-assertions-core:$kotestVersion")\n    testImplementation("io.kotest:kotest-property:$kotestVersion")\n}\n\ntasks.test {\n    useJUnitPlatform() // required - Kotest runs on the JUnit 5 Platform',
    },
  ],
});
