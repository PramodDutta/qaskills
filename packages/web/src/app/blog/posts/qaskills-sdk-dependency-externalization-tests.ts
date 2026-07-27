import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 272,
  slug: 'qaskills-sdk-dependency-externalization-tests',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Dependency Externalization Tests',
  description:
    'QASkills SDK dependency externalization tests: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills SDK dependency externalization tests',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills SDK dependency externalization tests, including whether private shared imports remain in built SDK output?',
  intentBoundary:
    'Covers whether private shared imports remain in built SDK output. Excludes CJS versus ESM runtime parity.',
  secondaryKeywords: [
    'how to test SDK dependency externalization',
    'SDK dependency externalization test cases',
    'SDK dependency externalization edge cases',
    'SDK dependency externalization CI validation',
    'SDK dependency externalization failure diagnostics',
    'SDK dependency externalization regression coverage',
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
      title: 'Build the QASkills SDK dependency externalization tests baseline',
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
