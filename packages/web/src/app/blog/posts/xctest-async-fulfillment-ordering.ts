import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 913,
  slug: 'xctest-async-fulfillment-ordering',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Xctest Async Fulfillment Ordering',
  description:
    'XCTest async fulfillment ordering: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'XCTest async fulfillment ordering',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify XCTest async fulfillment ordering, specifically ordered expectation fulfillment and timeout diagnostics?',
  intentBoundary:
    'Owns ordered expectation fulfillment and timeout diagnostics. It excludes XCUITest UI automation, device infrastructure, or Swift testing introductions, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'XCTest async fulfillment ordering example',
    'XCTest async fulfillment ordering test cases',
    'XCTest async fulfillment ordering failure modes',
    'how to verify xctest async fulfillment ordering',
    'Swift testing ordered expectation fulfillment and timeout diagnostics',
    'XCTest async fulfillment ordering best practices',
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
      title: 'Build the XCTest async fulfillment ordering baseline',
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
