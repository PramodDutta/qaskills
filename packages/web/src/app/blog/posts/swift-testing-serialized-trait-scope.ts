import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 907,
  slug: 'swift-testing-serialized-trait-scope',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Swift Testing Serialized Trait Scope',
  description:
    'Swift Testing serialized trait scope: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Swift Testing serialized trait scope',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Swift Testing serialized trait scope, specifically serialization scope across suites and parameterized cases?',
  intentBoundary:
    'Owns serialization scope across suites and parameterized cases. It excludes XCUITest UI automation, device infrastructure, or Swift testing introductions, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Swift Testing serialized trait scope example',
    'Swift Testing serialized trait scope test cases',
    'Swift Testing serialized trait scope failure modes',
    'how to verify swift testing serialized trait scope',
    'Swift testing serialization scope across suites and parameterized cases',
    'Swift Testing serialized trait scope best practices',
  ],
  repoEvidence: [
    'seed-skills/swift-testing/SKILL.md',
    'seed-skills/xcuitest-ios/SKILL.md',
    'packages/web/src/app/blog/posts/software-testing-types-complete-guide.ts',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/categories/unit-testing',
    '/blog/software-testing-types-complete-guide',
    '/blog/test-automation-framework-architecture',
    '/blog/test-case-design-techniques-guide',
    '/blog/regression-testing-strategies-guide',
  ],
  relatedSlugs: [
    'software-testing-types-complete-guide',
    'test-automation-framework-architecture',
    'test-case-design-techniques-guide',
    'regression-testing-strategies-guide',
  ],
  sources: [
    'https://developer.apple.com/documentation/testing',
    'https://developer.apple.com/documentation/xctest',
    'https://github.com/swiftlang/swift-testing',
  ],
  codeExamples: [
    {
      title: 'Build the Swift Testing serialized trait scope baseline',
      language: 'swift',
      path: 'seed-skills/swift-testing/SKILL.md',
      snippet:
        '// Example swift pattern\n// Adapt this pattern to your specific use case and framework',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'swift',
      path: 'seed-skills/xcuitest-ios/SKILL.md',
      snippet: '',
    },
  ],
});
