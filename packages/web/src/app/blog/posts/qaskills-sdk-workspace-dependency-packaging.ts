import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 286,
  slug: 'qaskills-sdk-workspace-dependency-packaging',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills SDK Workspace Dependency Packaging',
  description:
    'QASkills SDK workspace dependency packaging: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence.',
  primaryKeyword: 'QASkills SDK workspace dependency packaging',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills SDK workspace dependency packaging, including workspace protocol metadata in a public SDK package?',
  intentBoundary:
    'Covers workspace protocol metadata in a public SDK package. Excludes CLI bundling shared code.',
  secondaryKeywords: [
    'how to test SDK workspace dependency packaging',
    'SDK workspace dependency packaging test cases',
    'SDK workspace dependency packaging edge cases',
    'SDK workspace dependency packaging CI validation',
    'SDK workspace dependency packaging failure diagnostics',
    'SDK workspace dependency packaging regression coverage',
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
      title: 'Build the QASkills SDK workspace dependency packaging baseline',
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
