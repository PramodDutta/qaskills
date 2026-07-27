import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 271,
  slug: 'qaskills-sdk-default-type-resolution',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Default Type Resolution',
  description:
    'QASkills SDK default type resolution: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills SDK default type resolution',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills SDK default type resolution, including default export declarations under package exports?',
  intentBoundary:
    'Covers default export declarations under package exports. Excludes runtime response typing.',
  secondaryKeywords: [
    'how to test SDK default type resolution',
    'SDK default type resolution test cases',
    'SDK default type resolution edge cases',
    'SDK default type resolution CI validation',
    'SDK default type resolution failure diagnostics',
    'SDK default type resolution regression coverage',
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
      title: 'Build the QASkills SDK default type resolution baseline',
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
