import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 370,
  slug: 'qaskills-npm-token-permission-audit',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Npm Token Permission Audit',
  description:
    'QASkills npm token permission audit: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills npm token permission audit',
  intent: 'how-to',
  coreQuestion:
    'How can QA teams test QASkills npm token permission audit, including NODE_AUTH_TOKEN use alongside id-token permissions?',
  intentBoundary:
    'Covers NODE_AUTH_TOKEN use alongside id-token permissions. Excludes application API bearer tokens.',
  secondaryKeywords: [
    'how to test npm token permission audit',
    'npm token permission audit test cases',
    'npm token permission audit edge cases',
    'npm token permission audit CI validation',
    'npm token permission audit failure diagnostics',
    'npm token permission audit regression coverage',
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
      title: 'Build the QASkills npm token permission audit baseline',
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
