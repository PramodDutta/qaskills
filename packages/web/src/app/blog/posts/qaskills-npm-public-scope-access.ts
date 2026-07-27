import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 363,
  slug: 'qaskills-npm-public-scope-access',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Npm Public Scope Access',
  description:
    'QASkills npm public scope access: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills npm public scope access',
  intent: 'informational',
  coreQuestion:
    'What should QA teams verify for QASkills npm public scope access, including public access flags for scoped CLI, SDK, and MCP packages?',
  intentBoundary:
    'Covers public access flags for scoped CLI, SDK, and MCP packages. Excludes registry authentication.',
  secondaryKeywords: [
    'how to test npm public scope access',
    'npm public scope access test cases',
    'npm public scope access edge cases',
    'npm public scope access CI validation',
    'npm public scope access failure diagnostics',
    'npm public scope access regression coverage',
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
      title: 'Build the QASkills npm public scope access baseline',
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
