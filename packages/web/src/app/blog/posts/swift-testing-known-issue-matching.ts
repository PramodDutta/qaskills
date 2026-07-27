import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 906,
  slug: 'swift-testing-known-issue-matching',
  campaignCluster: 'frameworks-qa-practice',
  title: 'Swift Testing Known Issue Matching',
  description:
    'Swift Testing known issue matching: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'Swift Testing known issue matching',
  intent: 'how-to',
  coreQuestion:
    'How should QA teams verify Swift Testing known issue matching, specifically known-issue matchers that do not hide unrelated failures?',
  intentBoundary:
    'Owns known-issue matchers that do not hide unrelated failures. It excludes XCUITest UI automation, device infrastructure, or Swift testing introductions, plus AI, RAG, MCP, and unrelated infrastructure topics.',
  secondaryKeywords: [
    'Swift Testing known issue matching example',
    'Swift Testing known issue matching test cases',
    'Swift Testing known issue matching failure modes',
    'how to verify swift testing known issue matching',
    'Swift testing known-issue matchers that do not hide unrelated failures',
    'Swift Testing known issue matching best practices',
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
      title: 'Build the Swift Testing known issue matching baseline',
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
