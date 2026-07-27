import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 274,
  slug: 'qaskills-sdk-exports-condition-order',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Exports Condition Order',
  description:
    'QASkills SDK exports condition order: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SDK exports condition order',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills SDK exports condition order, including import, require, and types conditions across Node and TypeScript?',
  intentBoundary:
    'Covers import, require, and types conditions across Node and TypeScript. Excludes factory export behavior.',
  secondaryKeywords: [
    'how to test SDK exports condition order',
    'SDK exports condition order test cases',
    'SDK exports condition order edge cases',
    'SDK exports condition order CI validation',
    'SDK exports condition order failure diagnostics',
    'SDK exports condition order regression coverage',
  ],
  repoEvidence: [
    'packages/sdk/package.json',
    'packages/sdk/tsup.config.ts',
    'packages/sdk/src/index.ts',
    'packages/shared/package.json',
  ],
  internalRoutes: [
    '/skills',
    '/blog',
    '/getting-started',
    '/how-to-publish',
    '/blog/qaskills-cli-npm-binary-testing',
    '/blog/mcp-package-registry-version-drift-tests',
    '/blog/mcp-for-qa-engineers-guide',
    '/blog/mcp-testing-automation-guide',
  ],
  relatedSlugs: [
    'qaskills-cli-npm-binary-testing',
    'mcp-package-registry-version-drift-tests',
    'mcp-for-qa-engineers-guide',
    'mcp-testing-automation-guide',
  ],
  sources: [
    'https://docs.npmjs.com/files/package.json/',
    'https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages',
    'https://pnpm.io/continuous-integration',
  ],
  codeExamples: [
    {
      title: 'Build the QASkills SDK exports condition order baseline',
      language: 'json',
      path: 'packages/sdk/package.json',
      snippet:
        '"test": "vitest run --passWithNoTests"\n  },\n  "dependencies": {\n    "@qaskills/shared": "workspace:*"\n  },\n  "devDependencies": {\n    "tsup": "^8.3.0",\n    "typescript": "^5.7.0",\n    "vitest": "^2.1.0"\n  }\n}',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/sdk/tsup.config.ts',
      snippet: '',
    },
  ],
});
