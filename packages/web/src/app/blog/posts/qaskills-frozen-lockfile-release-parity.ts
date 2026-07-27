import { createArticleFactory1000Post } from './article-factory-1000-builder';

export const post = createArticleFactory1000Post({
  articleNumber: 340,
  slug: 'qaskills-frozen-lockfile-release-parity',
  campaignCluster: 'cli-sdk-mcp',
  title: 'Qaskills Frozen Lockfile Release Parity',
  description:
    'QASkills frozen lockfile release parity: test the contract with controlled fixtures, exact assertions, clear failure diagnostics, safe evidence, verified.',
  primaryKeyword: 'QASkills frozen lockfile release parity',
  intent: 'troubleshooting',
  coreQuestion:
    'How should QA teams diagnose QASkills frozen lockfile release parity, including CI frozen installs versus release no-frozen installs?',
  intentBoundary:
    'Covers CI frozen installs versus release no-frozen installs. Excludes runtime dependency versions.',
  secondaryKeywords: [
    'how to test frozen lockfile release parity',
    'frozen lockfile release parity test cases',
    'frozen lockfile release parity edge cases',
    'frozen lockfile release parity CI validation',
    'frozen lockfile release parity failure diagnostics',
    'frozen lockfile release parity regression coverage',
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
      title: 'Build the QASkills frozen lockfile release parity baseline',
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
