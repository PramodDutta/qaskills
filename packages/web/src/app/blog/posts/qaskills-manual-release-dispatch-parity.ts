import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 361,
  slug: 'qaskills-manual-release-dispatch-parity',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Manual Release Dispatch Parity',
  description:
    'QASkills manual release dispatch parity: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills manual release dispatch parity',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills manual release dispatch parity, including workflow_dispatch releases enforcing the same gates as tag releases?',
  intentBoundary:
    'Covers workflow_dispatch releases enforcing the same gates as tag releases. Excludes ordinary pull-request CI.',
  secondaryKeywords: [
    'how to test manual release dispatch parity',
    'manual release dispatch parity test cases',
    'manual release dispatch parity edge cases',
    'manual release dispatch parity CI validation',
    'manual release dispatch parity failure diagnostics',
    'manual release dispatch parity regression coverage',
  ],
  repoEvidence: [
    'packages/cli/package.json',
    'packages/cli/tsup.config.ts',
    '.github/workflows/cli-publish.yml',
    'packages/cli/e2e/e2e.mjs',
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
      title: 'Build the QASkills manual release dispatch parity baseline',
      language: 'json',
      path: 'packages/cli/package.json',
      snippet:
        '"test": "vitest run --passWithNoTests",\n    "e2e": "node e2e/e2e.mjs"\n  },\n  "keywords": [\n    "qa",\n    "testing",\n    "ai-agents",\n    "claude-code",\n    "cursor",\n    "skills",\n    "cli"\n  ],\n  "author": "Pramod Dutta <TheTestingAcademy>",\n  "license": "MIT",\n  "repository": {\n    "type": "git",\n    "url": "https://github.com/PramodDutta/qaskills"\n  },',
    },
    {
      title: 'Add negative cases and CI evidence',
      language: 'typescript',
      path: 'packages/cli/tsup.config.ts',
      snippet: '',
    },
  ],
});
