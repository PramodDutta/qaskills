import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 914,
  slug: 'xctest-expected-failure-strictness',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Xctest Expected Failure Strictness',
  description:
    'XCTest expected failure strictness: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'XCTest expected failure strictness',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify XCTest expected failure strictness, specifically expected-failure matchers and unexpected pass handling?',
  intentBoundary:
    'Owns expected-failure matchers and unexpected pass handling. It excludes XCUITest UI automation, device infrastructure, or Swift testing introductions, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'XCTest expected failure strictness example',
    'XCTest expected failure strictness test cases',
    'XCTest expected failure strictness failure modes',
    'how to verify xctest expected failure strictness',
    'Swift testing expected-failure matchers and unexpected pass handling',
    'XCTest expected failure strictness best practices',
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
      title: 'Build the XCTest expected failure strictness baseline',
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
