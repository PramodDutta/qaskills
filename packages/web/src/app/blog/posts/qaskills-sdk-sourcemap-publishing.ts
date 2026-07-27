import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 368,
  slug: 'qaskills-sdk-sourcemap-publishing',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Sourcemap Publishing',
  description:
    'QASkills SDK sourcemap publishing: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SDK sourcemap publishing',
  intent: 'informational',
  coreQuestion:
    'What should QA teams verify for QASkills SDK sourcemap publishing, including source map inclusion and paths in the SDK tarball?',
  intentBoundary:
    'Covers source map inclusion and paths in the SDK tarball. Excludes TypeScript declaration publication.',
  secondaryKeywords: [
    'how to test SDK sourcemap publishing',
    'SDK sourcemap publishing test cases',
    'SDK sourcemap publishing edge cases',
    'SDK sourcemap publishing CI validation',
    'SDK sourcemap publishing failure diagnostics',
    'SDK sourcemap publishing regression coverage',
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
      title: 'Build the QASkills SDK sourcemap publishing baseline',
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
